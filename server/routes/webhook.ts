import { logger } from '../lib/logger';
import { Router, Response, Request } from 'express';
import { rateLimit } from 'express-rate-limit';
import { db } from '../lib/db';
import { getSmartSolutions } from '../lib/preventionService';
import crypto from 'crypto';
import { z } from 'zod';

const router = Router();

if (process.env.NODE_ENV === 'production' && !process.env.TEAMS_OUTGOING_WEBHOOK_SECRET) {
  logger.warn('⚠️ AVISO: TEAMS_OUTGOING_WEBHOOK_SECRET não configurado. Em produção, isso pode permitir webhooks não autenticados.');
}

const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 50, // max 50 webhook calls per 15 min
  message: { error: 'Too many webhook requests, please try again later.' }
});

const TEAMS_WEBHOOK_SECRET = process.env.TEAMS_OUTGOING_WEBHOOK_SECRET;

function validateTeamsHmac(req: any): boolean {
  if (!TEAMS_WEBHOOK_SECRET) {
    if (process.env.NODE_ENV === 'production') {
      return false; // Fail closed
    }
    logger.warn('⚠️ TEAMS_OUTGOING_WEBHOOK_SECRET não configurado. Aceitando webhook sem validação HMAC por conveniência (apenas dev).');
    return true; 
  }
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('HMAC ')) return false;
  
  try {
    const providedHmac = authHeader.substring(5);
    const bufSecret = Buffer.from(TEAMS_WEBHOOK_SECRET, 'base64');
    
    // Use rawBody captured by express.json middleware
    const msgBuf = req.rawBody || Buffer.from(JSON.stringify(req.body), 'utf-8');
    const expectedHmac = crypto.createHmac('sha256', bufSecret).update(msgBuf).digest('base64');
    
    return crypto.timingSafeEqual(Buffer.from(providedHmac, 'base64'), Buffer.from(expectedHmac, 'base64'));
  } catch (err) {
    return false;
  }
}

const webhookSchema = z.object({
  message: z.string().min(1).max(5000).optional(),
  text: z.string().min(1).max(5000).optional(),
  userEmail: z.string().email().optional(),
  from: z.object({ name: z.string() }).optional()
}).refine(d => d.message || d.text, { message: 'message ou text é obrigatório' });

router.post('/teams', webhookRateLimiter, async (req: Request, res: Response) => {
  try {
    if (!validateTeamsHmac(req)) {
      return res.status(401).json({ error: 'HMAC inválido' });
    }

    const parseResult = webhookSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Payload inválido', details: parseResult.error.issues });
    }

    const validData = parseResult.data;

    // Support both our custom payload and native Microsoft Teams Outgoing Webhook payload
    const userEmail = validData.userEmail || (validData.from ? validData.from.name : null) || 'usuario.teams@empresa.com';
    let message = validData.message || validData.text || '';

    if (!message) {
      return res.status(400).json({ error: 'message (ou text) é obrigatório' });
    }

    // Clean up Teams message format (removes the bot mention like <at>Suporte</at>)
    message = message.replace(/<at>.*<\/at>/g, '').trim();

    // Pass message as description, maybe extract a short title
    const title = message.substring(0, 50);
    const analysis = await getSmartSolutions(message, title);

    if (analysis && analysis.confidenceScore && analysis.confidenceScore > 80 && analysis.solutions && analysis.solutions.length > 0) {
      const solution = analysis.solutions[0];
      
      const stepsText = solution.steps.map((step, i) => `${i + 1}. ${step}`).join('\n');
      
      return res.json({
        type: 'message',
        text: `**Solução encontrada!** Tente o seguinte passo a passo para: **${solution.title}**\n\n${solution.explanation}\n\n**Passos:**\n${stepsText}\n\n*Tempo estimado: ${solution.estimatedTime} | Dificuldade: ${solution.difficulty}*`
      });
    }

    // Confidence low, create a ticket
    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const newTicket = {
      id: ticketId,
      title: `[Teams] ${title}...`,
      description: message,
      status: 'Aberto',
      priority: 'Média',
      category: 'Software', // default fallback
      department: 'TI',
      user: userEmail.split('@')[0] || 'Usuário Teams',
      authorEmail: userEmail,
      createdAt: new Date().toISOString()
    };

    const createdTicket = await db.createTicket(newTicket as any);

    try {
      const { emitEvent } = await import('../lib/socket');
      emitEvent('ticket_created', createdTicket);
    } catch(e) { /* ignore */ }

    return res.json({
      type: 'message',
      text: `Não consegui resolver sozinho. Abri o chamado **#${ticketId}** para os técnicos.`
    });

  } catch (error: unknown) {
      if (!(error instanceof Error)) throw error;
    logger.error({ err: error }, 'Webhook error:');
    res.status(500).json({ error: 'Erro interno no webhook' });
  }
});

export default router;
