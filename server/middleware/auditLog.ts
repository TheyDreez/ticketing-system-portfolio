import { logger } from '../lib/logger';
import { AuthenticatedRequest } from './requireAuth';
import { db } from '../lib/db';

export async function logAuditEvent(
  req: AuthenticatedRequest,
  action: string,
  ticketId: string | null,
  details: string,
  metadata?: any
) {
  try {
    const user = req.user;
    if (user) {
      await db.createAuditEvent({
        ticketId,
        userId: user.id || 'usr-unknown',
        userName: user.name || 'Anonymous User',
        userEmail: user.email || 'unknown@cbiops.com',
        action,
        details,
        metadata
      });
    }
  } catch (err) {
    logger.error({ err: err }, 'Failed to log audit event:');
  }
}
