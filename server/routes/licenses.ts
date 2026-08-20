import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest, requireRole } from '../middleware/requireAuth';
import { syncLicenses, getCachedSkus, getCachedWaste, getCachedAllocations } from '../lib/licenseSync';

const router = Router();

router.get('/skus', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json(getCachedSkus());
});

router.get('/waste', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json(getCachedWaste());
});

router.get('/allocations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  res.json(getCachedAllocations());
});

router.post('/sync', requireAuth, requireRole(['Administrador']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await syncLicenses();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro na sincronização de licenças' });
  }
});

export default router;
