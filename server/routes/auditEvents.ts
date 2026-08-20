import { logger } from "../lib/logger";
import { handleError } from '../lib/errorHandler';
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { canAccessTicket } from '../lib/authorization';
import { db } from '../lib/db';

const router = Router();

// GET /api/audit-events - Fetch audit events (optional ticket_id filter)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = req.query.ticket_id as string | undefined;
    
    if (req.user?.role !== 'Administrador') {
      if (!ticketId) {
        return res.status(403).json({ error: 'Acesso negado. A visualização global de auditoria é restrita a Administradores.' });
      }
      
      const tickets = await db.getTickets();
      const ticket = tickets.find(t => t.id === ticketId);
      if (!ticket || !canAccessTicket(req.user, ticket)) {
        return res.status(403).json({ error: 'Acesso negado ao histórico deste chamado.' });
      }
    }

    const list = await db.getAuditEvents(ticketId);
    res.json(list);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao carregar histórico de auditoria");
  }
});

export default router;
