import { handleError } from '../lib/errorHandler';
import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/requireAuth';
import { syncIntuneDevices } from '../lib/intuneSync';

const router = Router();

// Protegida por requireAuth e apenas 'Admin' ou 'Administrador' (dependendo de como tá o banco)
router.post('/sync', requireAuth, requireRole(['Administrador', 'admin']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await syncIntuneDevices();
    return res.json(result);
  } catch (err: unknown) {
    return res.status(500).json({ error: (err instanceof Error ? err.message : String(err)) || 'Erro interno na sincronização com Intune' });
  }
});

export default router;
