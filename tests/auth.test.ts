import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRouter from '../server/routes/auth';
import { db } from '../server/lib/db';
import bcrypt from 'bcryptjs';

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-secret-that-is-at-least-32-chars-long-for-tests';
}

// Mock DB module
vi.mock('../server/lib/db', () => ({
  db: {
    getUserByEmail: vi.fn(),
    createKnowledgeArticle: vi.fn().mockResolvedValue(true),
    createAuditEvent: vi.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
  it('login fails for non-existent user', async () => {
    (db.getUserByEmail as any).mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fake@test.com', password: 'password123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/inválid/i);
  });

  it('login fails for incorrect password', async () => {
    const hashedPassword = await bcrypt.hash('correctpassword', 10);
    (db.getUserByEmail as any).mockResolvedValueOnce({
      id: 'u1', email: 'test@test.com', password: hashedPassword, role: 'Colaborador'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/inválid/i);
  });

  it('login succeeds with correct credentials', async () => {
    const hashedPassword = await bcrypt.hash('correctpassword', 10);
    (db.getUserByEmail as any).mockResolvedValueOnce({
      id: 'u1', email: 'test@test.com', password: hashedPassword, role: 'Colaborador', name: 'Test User'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('test@test.com');
  });

  it('triggers rate limit after multiple failed attempts', async () => {
    (db.getUserByEmail as any).mockResolvedValue(null);

    // Make 5 requests to reach the limit
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'fake@test.com', password: 'password123' });
    }

    // The 6th request should hit the rate limiter
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fake@test.com', password: 'password123' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/muitas tentativas/i);
  });

  it('triggers rate limit after multiple failed attempts', async () => {
    (db.getUserByEmail as any).mockResolvedValue(null);

    // Make 5 requests to reach the limit
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({ email: 'fake@test.com', password: 'password123' });
    }

    // The 6th request should hit the rate limiter
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'fake@test.com', password: 'password123' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/muitas tentativas/i);
  });
});
