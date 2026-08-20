import { logger } from "./server/lib/logger";
import 'dotenv/config';
import express from 'express';
import path from 'path';
import http from 'http';
import { initSocket } from './server/lib/socket';

import authRoutes from './server/routes/auth';
import ticketRoutes from './server/routes/tickets';
import userRoutes from './server/routes/users';
import slaConfigsRouter from './server/routes/slaConfigs';
import analyticsRouter from './server/routes/analytics';
import auditEventsRouter from './server/routes/auditEvents';
import chatRouter from './server/routes/chatEnterprise.js';
import knowledgeRouter from './server/routes/knowledgeEnterprise.js';
import reportsRouter from './server/routes/reports';
import webhookRouter from './server/routes/webhook';
import licensesRouter from './server/routes/licenses';
import { db } from './server/lib/db';
import eventsRouter from './server/routes/events';
import { devicesRouter } from './server/routes/devices';

import { validateEnv } from './server/lib/validateEnv';
import { seedKnowledgeBase } from './server/services/knowledgeSeeder';

// --- Clean Architecture Setup Modules ---
import { setupSecurity, corsOptions } from './server/setup/security';
import { setupDatabase } from './server/setup/database';
import { setupJobs } from './server/setup/jobs';
import pinoHttp from 'pino-http';
import crypto from 'crypto';

validateEnv();

// Exported for testing purposes to avoid breaking existing imports
export { corsOptions };

/**
 * Initializes and starts the Express HTTP server.
 * 
 * Architecture Decision: server.ts is now purely an entry point that orchestrates 
 * setup modules, mounts routers, and manages the HTTP server lifecycle.
 * Heavy configurations (Security, DB, Jobs) have been moved to server/setup/*.
 */
async function startServer() {
  logger.info(`Boot: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT || 3000}`);
  
  const app = express();
  app.set('trust proxy', 1);
  const httpServer = http.createServer(app);
  
  initSocket(httpServer);
  
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // --- 1. Database & Jobs Setup ---
  await setupDatabase();
  await seedKnowledgeBase();
  await setupJobs();

  // --- 2. Security Middlewares ---
  
  // Observability: Pino HTTP logger with Correlation ID
  app.use(pinoHttp({
    logger,
    genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
    autoLogging: {
      ignore: (req) => req.url === '/api/health'
    }
  }));
setupSecurity(app);

  // --- 3. API Routes ---
  // Attach API routes (auth gets stricter authRateLimiter additionally in its own file)
  app.use('/api/auth', authRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/sla-configs', slaConfigsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/audit-events', auditEventsRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/knowledge', knowledgeRouter);
  app.use('/api/devices', devicesRouter);
  app.use('/api/webhook', webhookRouter);
  
  const intuneSyncRouteModule = await import('./server/routes/intuneSyncRoute.js');
  const intuneSyncRouter = intuneSyncRouteModule.default;
  app.use('/api/intune', intuneSyncRouter);
  
  app.use('/api/events', eventsRouter);
  app.use('/api/licenses', licensesRouter);

  // Health endpoint for basic observability
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'ok';
    try {
      await db.getTickets();
    } catch (e) {
      dbStatus = 'error';
    }
    res.json({
      status: 'ok',
      db: dbStatus,
      uptime: process.uptime()
    });
  });

  // Handle 404 for /api routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint não encontrado' });
  });

  // Global error handler
  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const correlationId = req.id || 'unknown';
    logger.error({ err, correlationId }, 'Unhandled server error:');
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({ error: 'Erro interno do servidor', correlationId });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor', message: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined, correlationId });
    }
  });
    

  // --- 4. Frontend / Static Assets Serving ---
  // Vite integration as middleware (or static serving in production)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // --- 5. Start Server ---
  httpServer.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 AcmeCorp Operations Center running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  logger.error({ err: err }, 'Fatal Server Error:');
});
