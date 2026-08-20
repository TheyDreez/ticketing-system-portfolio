import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import reportsRouter from '../server/routes/reports';
import { db } from '../server/lib/db';

let mockAuthenticated = true;
let mockUser: any = { id: 'u1', email: 'admin@cbiops.com', name: 'Admin', role: 'Administrador' };

// Mock requireAuth
vi.mock('../server/middleware/requireAuth', async () => {
  return {
    requireAuth: (req: any, res: any, next: any) => {
      if (!mockAuthenticated) {
        return res.status(401).json({ error: 'Não autorizado.' });
      }
      req.user = mockUser;
      next();
    },
    requireRole: (roles: string[]) => (req: any, res: any, next: any) => next()
  };
});

// Mock DB
vi.mock('../server/lib/db', () => ({
  db: {
    createKnowledgeArticle: vi.fn().mockResolvedValue(true),
    getTickets: vi.fn().mockResolvedValue([
      {
        id: 'TKT-1',
        title: 'Mock Ticket 1',
        status: 'Aberto',
        priority: 'Alta',
        department: 'TI',
        authorEmail: 'user@test.com',
        assignedToEmail: 'support@test.com',
        createdAt: new Date().toISOString()
      }
    ])
  }
}));

const app = express();
app.use(express.json());
app.use('/api/reports', reportsRouter);

// Binary parser helper for Supertest
const parseBinary = (res: any, callback: any) => {
  res.setEncoding('binary');
  let data = '';
  res.on('data', (chunk: any) => {
    data += chunk;
  });
  res.on('end', () => {
    callback(null, Buffer.from(data, 'binary'));
  });
};

describe('Reports Route tests', () => {
  beforeEach(() => {
    mockAuthenticated = true;
    mockUser = { id: 'u1', email: 'admin@cbiops.com', name: 'Admin', role: 'Administrador' };
  });

  it('export xlsx returns 200 and has correct Content-Type and ZIP/XLSX magic number PK', async () => {
    const res = await request(app)
      .post('/api/reports/export/xlsx')
      .send({})
      .parse(parseBinary);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    
    // Check that buffer is not empty and has ZIP PK signature
    const body = res.body as Buffer;
    expect(body).toBeDefined();
    expect(body.length).toBeGreaterThan(0);
    
    const firstTwoBytes = body.toString('binary', 0, 2);
    expect(firstTwoBytes).toBe('PK');
  });

  it('export pdf returns 200 and has correct Content-Type and PDF magic number %PDF', async () => {
    const res = await request(app)
      .post('/api/reports/export/pdf')
      .send({})
      .parse(parseBinary);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('pdf');

    // Check that buffer is not empty and has %PDF signature
    const body = res.body as Buffer;
    expect(body).toBeDefined();
    expect(body.length).toBeGreaterThan(0);

    const firstFourBytes = body.toString('binary', 0, 4);
    expect(firstFourBytes).toBe('%PDF');
  });

  it('unauthenticated user is blocked with 401 on xlsx export', async () => {
    mockAuthenticated = false;
    const res = await request(app)
      .post('/api/reports/export/xlsx')
      .send({});

    expect(res.status).toBe(401);
  });

  it('unauthenticated user is blocked with 401 on pdf export', async () => {
    mockAuthenticated = false;
    const res = await request(app)
      .post('/api/reports/export/pdf')
      .send({});

    expect(res.status).toBe(401);
  });
});
