import { handleError } from '../lib/errorHandler';
import { Router } from 'express';
import { db } from '../lib/db';
import { logger } from '../lib/logger';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import { executeHealingAction } from '../lib/intuneSync';
import { logAuditEvent } from '../middleware/auditLog';

export const devicesRouter = Router();

// Protect all device routes with authentication
devicesRouter.use(requireAuth);

devicesRouter.get('/', requireRole(['Administrador', 'Suporte']), async (req, res) => {
  try {
    const devices = await db.getDevices();
    res.json(devices);
  } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
    logger.error({ err: error }, 'Erro ao buscar dispositivos');
    res.status(500).json({ error: 'Erro interno ao buscar dispositivos' });
  }
});

devicesRouter.get('/insights', requireRole(['Administrador', 'Suporte']), async (req, res) => {
  try {
    const insights = await db.getDeviceInsights();
    res.json(insights);
  } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
    logger.error({ err: error }, 'Erro ao buscar insights de dispositivos');
    res.status(500).json({ error: 'Erro interno ao buscar insights' });
  }
});

devicesRouter.get('/:id/events', requireRole(['Administrador', 'Suporte']), async (req, res) => {
  try {
    const events = await db.getDeviceEvents(req.params.id);
    res.json(events);
  } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
    logger.error({ err: error }, 'Erro ao buscar eventos do dispositivo');
    res.status(500).json({ error: 'Erro interno ao buscar eventos' });
  }
});

devicesRouter.post('/:id/heal', requireRole(['Administrador', 'Suporte']), async (req: any, res: any) => {
  try {
    const { action } = req.body;
    const deviceId = req.params.id;
    const userEmail = req.user?.email || 'unknown';

    if (!action) {
      return res.status(400).json({ error: 'Ação é obrigatória (ex: restart_teams, clear_cache).' });
    }

    const result = await executeHealingAction(deviceId, action, userEmail);

    // Audit Log
    await logAuditEvent(
      req,
      'Self-Healing Executado',
      deviceId,
      `Ação '${action}' executada via Intune no dispositivo.`
    );

    res.json(result);
  } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
    logger.error({ err: error }, 'Erro ao executar self-healing');
    res.status(500).json({ error: 'Erro interno na auto-correção' });
  }
});
