import { logger } from "../lib/logger";
import { handleError } from '../lib/errorHandler';
import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/requireAuth';
import { db } from '../lib/db';
import { logAuditEvent } from '../middleware/auditLog';
import { z } from 'zod';
import { validateBody, slaConfigUpdateSchema } from '../validations';

const router = Router();

const updateSlaSchema = z.object({
  hours: z.number().positive('As horas do SLA devem ser positivas')
});

// GET /api/sla-configs - Get all configs
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.getSlaConfigs();
    res.json(list);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao carregar configurações de SLA");
  }
});

// PATCH /api/sla-configs/:id - Update specific config (Admin only)
router.patch('/:id', requireAuth, requireRole(['Administrador']), validateBody(slaConfigUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = updateSlaSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Valores inválidos', details: parseResult.error.issues });
    }

    const { hours } = parseResult.data;
    const updated = await db.updateSlaConfig(id, hours);
    if (!updated) {
      return res.status(404).json({ error: 'Configuração de SLA não encontrada.' });
    }

    await logAuditEvent(
      req,
      'Configuração SLA',
      null,
      `Configuração de SLA para prioridade ${updated.priority} / categoria ${updated.category} atualizada para ${hours}h.`
    );

    res.json(updated);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao atualizar configuração de SLA");
  }
});

export default router;
