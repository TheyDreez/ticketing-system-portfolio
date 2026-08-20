import { logger } from '../lib/logger';
import { Response } from 'express';

export function handleError(res: Response, err: any, customMessage: string) {
  if (process.env.NODE_ENV === 'production') {
    logger.error({ err: (err instanceof Error ? err.message : String(err)) || err }, `[ERROR] ${customMessage}:`);
    res.status(500).json({ error: `${customMessage}. Por favor, tente novamente mais tarde.` });
  } else {
    res.status(500).json({ error: `${customMessage}: ${(err instanceof Error ? err.message : String(err))}` });
  }
}
