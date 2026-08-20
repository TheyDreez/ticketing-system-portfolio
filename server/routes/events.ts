import { Router, Request, Response } from 'express';
import { addSseClient } from '../lib/sse';
import { requireAuth } from '../middleware/requireAuth';

const router = Router();

// GET /api/events
router.get('/', requireAuth, (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Flush headers immediately
  res.flushHeaders();

  // Send initial connected event
  res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

  addSseClient(req, res, (req as any).user);
});

export default router;
