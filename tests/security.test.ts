import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { db } from '../server/lib/db';
import ticketRoutes from '../server/routes/tickets';
import cors from 'cors';

// Mocks
vi.mock('../server/lib/db', () => ({
  db: {
    createKnowledgeArticle: vi.fn().mockResolvedValue(true),
    getTickets: vi.fn(),
    getAttachments: vi.fn(),
    getKnowledgeArticles: vi.fn().mockResolvedValue([])
  },
  initializeDatabaseSchema: vi.fn().mockResolvedValue(undefined),
  testDbConnection: vi.fn().mockResolvedValue(undefined),
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn()
  }
}));

vi.mock('../server/middleware/requireAuth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    requireAuth: (req: any, res: any, next: any) => {
      // For IDOR test, we will set req.user directly in the test before calling the route
      if (!req.user) {
        req.user = { role: 'Colaborador', email: 'user@test.com' };
      }
      next();
    },
    requireRole: (roles: string[]) => (req: any, res: any, next: any) => next()
  };
});

// Create a test app for the IDOR route
const app = express();
app.use(express.json());

import fs from 'fs';
import path from 'path';
import os from 'os';

app.use('/api/tickets', ticketRoutes);

describe('Security Fixes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IDOR in Attachment Download', () => {
    it('Colaborador cannot download attachment from another user\'s ticket using a valid attachmentId', async () => {
      // Create two tickets
      const ticketA = { id: 'TICKET-A', authorEmail: 'user@test.com' };
      const ticketB = { id: 'TICKET-B', authorEmail: 'other@test.com' };
      
      const attachmentsA = [{ id: 'ATT-A', filename: 'fileA.txt', filePath: 'pathA' }];
      const attachmentsB = [{ id: 'ATT-B', filename: 'fileB.txt', filePath: 'pathB' }];

      (db.getTickets as any).mockResolvedValue([ticketA, ticketB]);
      (db.getAttachments as any).mockImplementation(async (id) => {
        if (id === 'TICKET-A') return attachmentsA;
        if (id === 'TICKET-B') return attachmentsB;
        return [];
      });

      // Insert file B into the local file system so it exists
      const UPLOADS_DIR = path.join(os.tmpdir(), 'AcmeCorp-ops-uploads');
      if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
      fs.writeFileSync(path.join(UPLOADS_DIR, 'ATT-B-fileB.txt'), Buffer.from('secret data'));

      // User tries to access TICKET-A with ATT-B
      // Route is /api/tickets/:id/attachments/:attachmentId/stream
      const res = await request(app)
        .get('/api/tickets/TICKET-A/attachments/ATT-B/stream');

      // The new logic should return 404 because ATT-B is not in TICKET-A's attachments list
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Anexo não encontrado');
    });

    it('Rejects raw upload with path traversal in attachmentId', async () => {
      const res = await request(app)
        .put('/api/tickets/TICKET-A/attachments/upload-raw?filename=test.txt&mimetype=text/plain&attachmentId=../../etc/passwd&token=fakeToken')
        .send('data');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Formato de attachmentId inválido.');
    });
  });
});

import { corsOptions } from '../server';

describe('CORS Restrictions', () => {
  it('allows localhost in development', () => {
    process.env.NODE_ENV = 'development';
    const callback = vi.fn();
    corsOptions.origin('http://localhost:3000', callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });

  it('rejects general cloud run domains and ai.studio substrings that are not exact matches in ALLOWED_ORIGINS', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://my-app-123.run.app,https://aistudio.google.com';
    
    const callback1 = vi.fn();
    corsOptions.origin('https://evil.run.app', callback1);
    expect(callback1).toHaveBeenCalledWith(expect.any(Error));

    const callback2 = vi.fn();
    corsOptions.origin('https://xai.studioevil.com', callback2);
    expect(callback2).toHaveBeenCalledWith(expect.any(Error));
  });

  it('allows exact matches from ALLOWED_ORIGINS', () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOWED_ORIGINS = 'https://my-app-123.run.app,https://aistudio.google.com';
    
    const callback = vi.fn();
    corsOptions.origin('https://my-app-123.run.app', callback);
    expect(callback).toHaveBeenCalledWith(null, true);
  });
});
