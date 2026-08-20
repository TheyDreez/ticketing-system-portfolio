import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import crypto from 'crypto';

/**
 * corsOptions definition extracted to be imported if needed by tests or other modules.
 */
export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);
    
    const originStr = String(origin || '');
    const isDev = process.env.NODE_ENV !== 'production';
    const isLocalhost = originStr.startsWith('http://localhost:') || originStr.startsWith('http://127.0.0.1:');
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
      : [];
      
    if ((isDev && isLocalhost) || allowedOrigins.includes(originStr)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

/**
 * Configures all security-related middlewares for the Express application.
 * This includes CSP (via Helmet), CORS, request body parsers, cookie parsers, and rate limiting.
 *
 * Architecture Decision: By extracting this from server.ts, we decouple the core HTTP server setup
 * from the specific security policies, making both easier to test and maintain.
 *
 * @param app The Express application instance
 */
export function setupSecurity(app: express.Application) {
  // Trust proxy is required if the app runs behind a load balancer/reverse proxy
  app.set('trust proxy', 1);

  // Generate a dynamic nonce for inline scripts to improve XSS protection
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    next();
  });

  // Basic Security Middlewares with Strict Content Security Policy (CSP)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req: Request, res: Response) => `'nonce-${res.locals.nonce}'`,
          process.env.NODE_ENV === 'production' ? '' : "'unsafe-inline'"
        ].filter(Boolean),
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: [
          "'self'",
          "data:",
          "https://images.unsplash.com",
          "https://*.githubusercontent.com",
          "https://*.googleusercontent.com",
          "https://*.microsoft.com",
          "https://*.microsoftonline.com"
        ],
        connectSrc: [
          "'self'",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          "https://login.microsoftonline.com",
          "https://graph.microsoft.com",
          "https://*.run.app",
          "wss://*.run.app",
          "http://localhost:*",
          "ws://localhost:*"
        ],
        frameAncestors: [
          "'self'",
          "https://*.google.com",
          "https://*.run.app",
          "https://ai.studio",
          "https://*.studio",
          "https://aistudio.google.com"
        ],
        frameSrc: ["'self'", "https://*.google.com", "https://*.run.app", "https://ai.studio", "https://*.studio"]
      }
    },
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  app.use(cors(corsOptions));

  // Express JSON parser must be here to configure rawBody for webhooks
  app.use(express.json({
    limit: '2mb',
    verify: (req: Request & { rawBody?: Buffer }, res: Response, buf: Buffer) => {
      req.rawBody = buf;
    }
  }));

  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(cookieParser());

  // General Rate Limiter for all /api requests
  const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // limit each IP to 300 requests per windowMs
    message: { error: 'Muitas solicitações a partir deste IP para a API. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => req.originalUrl.startsWith('/api/events')
  });

  // Apply general rate limiting to all /api routes
  app.use('/api', generalRateLimiter);
}
