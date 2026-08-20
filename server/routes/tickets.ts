import { logger } from "../lib/logger";
import { handleError } from '../lib/errorHandler';
import sanitizeHtml from 'sanitize-html';
import { rateLimit } from 'express-rate-limit';
import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/requireAuth';
import { canAccessTicket } from '../lib/authorization';
import { db, supabase } from '../lib/db';
import { logAuditEvent } from '../middleware/auditLog';
import { getSmartSolutions } from '../lib/preventionService';
import { z } from 'zod';
import { Attachment } from '../../src/types';
import crypto from 'crypto';

const router = Router();

const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas detectadas. Por favor, tente novamente após 15 minutos.' }
});


import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import os from 'os';
import path from 'path';
import { validateBody, ticketCreateSchema, ticketUpdateSchema, ticketCommentSchema } from '../validations';

// Local storage logic (disk-based fallback instead of RAM)
const UPLOADS_DIR = path.join(os.tmpdir(), 'AcmeCorp-ops-uploads');

// Ensure the directory exists
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(err => {
  logger.error({ err }, 'Failed to create local uploads directory:');
});

// In-memory store for local upload tokens (we can keep tokens in memory as they are tiny)
const uploadTokens = new Map<string, { token: string; timestamp: number }>();

const EXPIRATION_TTL_MS = 30 * 60 * 1000; // 30 minutos

// Limpeza de itens mortos periodicamente:
setInterval(async () => {
  const now = Date.now();
  for (const [key, val] of uploadTokens.entries()) {
    if (now - val.timestamp > EXPIRATION_TTL_MS) uploadTokens.delete(key);
  }
  // Optional: Clean up old files in UPLOADS_DIR
  try {
    const files = await fs.readdir(UPLOADS_DIR);
    for (const file of files) {
      const filePath = path.join(UPLOADS_DIR, file);
      const stat = await fs.stat(filePath);
      if (now - stat.mtimeMs > EXPIRATION_TTL_MS) {
        await fs.unlink(filePath);
      }
    }
  } catch (err) {
    // ignore
  }
}, 5 * 60 * 1000);

// Whitelist of valid mimetypes
const ALLOWED_MIME_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/zip', 'application/x-zip-compressed',
  'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];

// Whitelist of valid extensions (fallback validation)
const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.zip', '.txt', '.csv', '.doc', '.docx', '.xls', '.xlsx'];

// Validation Schemas
const createTicketSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  category: z.string(),
  priority: z.enum(['Alta', 'Média', 'Baixa']),
  description: z.string().min(1, 'A descrição é obrigatória')
});

const updateTicketSchema = z.object({
  status: z.enum(['Crítico', 'Aguardando', 'Em Análise', 'Resolvido']).optional(),
  deadline: z.string().optional(),
  notes: z.array(z.string()).optional()
});

// GET /api/tickets - Fetch all tickets
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await db.getTickets();
    const allDevices = await db.getDevices().catch(() => []);
    
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
    
    const enrichedList = list.map(ticket => {
      if (!ticket.assetId && allDevices.length > 0) {
        const uName = normalize(ticket.user || '');
        const uEmail = normalize(ticket.authorEmail || '');
        const emailPrefix = uEmail.split('@')[0];
        const matched = allDevices.find(d => {
          const assigned = normalize(d.user || '');
          if (!assigned) return false;
          return assigned === uEmail || 
                 assigned === uName || 
                 (emailPrefix && assigned === emailPrefix) || 
                 (uName && assigned.includes(uName)) || 
                 (uName && uName.includes(assigned));
        });
        if (matched) {
          return { ...ticket, assetId: matched.id };
        }
      }
      return ticket;
    });

    if (req.user?.role === 'Colaborador') {
      const userEmail = req.user.email.toLowerCase().trim();
      const userName = req.user.name.toLowerCase().trim();
      
      const filteredList = enrichedList.filter(t => {
        const matchEmail = (t as any).authorEmail?.toLowerCase().trim() === userEmail;
        const matchName = t.user?.toLowerCase().trim() === userName;
        return matchEmail || matchName; // Mostra se bater o email OU o nome
      });
      
      return res.json(filteredList);
    }
    if (req.user?.role === 'Suporte') {
      const userDepartment = req.user.department;
      const filteredList = enrichedList.filter(t => t.department === userDepartment);
      return res.json(filteredList);
    }
    res.json(enrichedList);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao carregar chamados");
  }
});

// POST /api/tickets/prevent-check - Intelligent ticket prevention check
router.post('/prevent-check', requireAuth, sensitiveRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { description, title } = req.body;
    if (!description || typeof description !== 'string') {
      return res.status(400).json({ error: 'A descrição é obrigatória.' });
    }
    const result = await getSmartSolutions(description, title || '');
    res.json(result);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao gerar soluções preventivas");
  }
});

// POST /api/tickets/prevent-log - Register a "Ticket Prevented" metric
router.post('/prevent-log', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Título e descrição são obrigatórios para registrar o evento.' });
    }

    const userId = req.user?.email || 'usr-anon';
    const userName = req.user?.name || 'Usuário Colaborador';
    const userEmail = req.user?.email || 'colaborador@cbiops.com';

    // Save as audit event
    const event = await db.createAuditEvent({
      ticketId: 'N/A',
      userId,
      userName,
      userEmail,
      action: 'Ticket Prevented',
      details: `Chamado sobre "${title}" evitado com sucesso pelo Smart Ticket Prevention. Descrição do problema: "${description.substring(0, 120)}..."`
    });

    res.status(201).json({ success: true, event });
  } catch (err: unknown) {
    handleError(res, err, "Erro ao registrar métrica de chamado prevenido");
  }
});

// POST /api/tickets - Create a new ticket
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.issues });
    }

    const ticketData = parseResult.data as any;
    
    // Gerar metadados controlados SOMENTE no servidor
    const ticketId = `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    ticketData.id = ticketId;
    ticketData.status = ticketData.priority === 'Alta' ? 'Crítico' : 'Aguardando';
    ticketData.createdAt = new Date().toISOString();
    ticketData.notes = [];
    ticketData.deadline = ticketData.priority === 'Alta' ? '45m restante' : '4h 00m';

    // Override user with the actual authenticated user to prevent spoofing
    if (req.user) {
      ticketData.user = req.user.name;
      ticketData.authorEmail = req.user.email;
      ticketData.department = req.user.department;
      
      // NEW: Auto-assign user's device
      try {
        const allDevices = await db.getDevices();
        
        const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
        const userEmail = normalize(req.user!.email);
        const userName = normalize(req.user!.name);
        const emailPrefix = userEmail.split('@')[0];
        const userDevice = allDevices.find(d => {
          const assignedUser = normalize(d.user);
          if (!assignedUser) return false;
          return assignedUser === userEmail || 
                 assignedUser === userName || 
                 assignedUser === emailPrefix || 
                 assignedUser.includes(userName) || 
                 userName.includes(assignedUser);
        });
        if (userDevice) {
          ticketData.assetId = userDevice.id;
        }
      } catch (err) {
        logger.warn({ err }, 'Erro ao buscar dispositivo do usuário');
      }
    } else {
      ticketData.user = ticketData.user || 'Desconhecido';
      (ticketData as any).authorEmail = 'unknown@example.com';
      (ticketData as any).department = 'Desconhecido';
    }

    const newTicket = await db.createTicket(ticketData as any);
    
    // Log creation event
    await logAuditEvent(
      req, 
      'Criar Ticket', 
      newTicket.id, 
      `Chamado ${newTicket.id} criado com categoria ${newTicket.category} e prioridade ${newTicket.priority}.`
    );

    const afterAssigned = (newTicket as any).assignedToEmail;
    if (afterAssigned) {
      try {
        const { notifyTicketAssigned } = await import('../lib/teamsNotifications');
        await notifyTicketAssigned(newTicket, afterAssigned);
      } catch(e) {
        logger.error({ err: e }, 'Error notifying Teams:');
      }
    }
    
    try {
      const { broadcastTicketEvent } = await import('../lib/sse');
      broadcastTicketEvent({ type: 'TICKET_CREATED', ticket: newTicket });
    } catch(e) { logger.error({ err: e }, 'SSE Broadcast error'); }

    try {
      const { emitEvent } = await import('../lib/socket');
      emitEvent('ticket_created', newTicket);
    } catch(e) { logger.error({ err: e }, 'Socket.io emit error'); }

    res.status(201).json(newTicket);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao cadastrar chamado");
  }
});

// GET /api/tickets/:id/sensitive-info - Access sensitive fields
router.get('/:id/sensitive-info', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });

    if (!canAccessTicket(req.user, ticket)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    
    const { canViewSensitiveFields } = await import('../lib/authorization');
    if (!canViewSensitiveFields(req.user, ticket)) {
      return res.status(403).json({ error: 'Acesso negado a campos sensíveis' });
    }

    await logAuditEvent(
      req,
      'Acesso a Campo Sensível',
      id,
      `Usuário acessou informações sensíveis do chamado ${id}.`,
      { ticketInfo: { id: ticket.id, title: ticket.title } }
    );


    const sensitiveData = {
      internalNotes: ticket.notes,
      creatorIp: req.ip || req.connection.remoteAddress || 'unknown',
      auditTrail: 'Detailed audit trail...'
    };

    await logAuditEvent(
      req,
      'Acesso a Dados Sensíveis',
      id,
      `Usuário acessou informações sensíveis do chamado ${id}.`,
      { sensitiveDataAccessed: Object.keys(sensitiveData) }
    );

    res.json(sensitiveData);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao buscar dados sensíveis");
  }
});

// PATCH /api/tickets/:id - Update ticket details (status or notes)
router.patch('/:id', requireAuth, validateBody(ticketUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ error: 'Acesso negado.' });
    const parseResult = updateTicketSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Dados de atualização inválidos', details: parseResult.error.issues });
    }

    // Get ticket before update for diff logging
    const beforeTicket = ticket;

    if (req.user?.role === 'Colaborador') {
      return res.status(403).json({ error: 'Acesso negado. Colaboradores não podem editar chamados.' });
    }

    // Validate ownership restriction if enabled
    const restrictUpdates = process.env.RESTRICT_TICKET_UPDATES_TO_OWNER === 'true';
    if (restrictUpdates && req.user) {
      const userRole = req.user.role;
      if (userRole !== 'Administrador') {
        const loggedInEmail = req.user.email.toLowerCase();
        const ticketAuthorEmail = (beforeTicket as any).authorEmail?.toLowerCase() || '';
        const assignedToEmail = (beforeTicket as any).assignedToEmail?.toLowerCase() || '';
        
        // Fallback for older tickets that might not have authorEmail
        const ticketAuthor = beforeTicket.user.toLowerCase();
        const loggedInName = req.user.name.toLowerCase();

        const isAuthor = ticketAuthorEmail === loggedInEmail || (!ticketAuthorEmail && ticketAuthor === loggedInName);
        const isAssigned = assignedToEmail === loggedInEmail || (!assignedToEmail && (beforeTicket as any).assignedTo?.toLowerCase() === loggedInName);

        if (!isAuthor && !isAssigned) {
          return res.status(403).json({ error: 'Acesso negado. Você não é o autor nem está designado para este chamado.' });
        }
      }
    }

    const updated = await db.updateTicket(id, parseResult.data);
    if (!updated) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    // Calculate diff and log
    const updates = parseResult.data;
    if (updates.status && updates.status !== beforeTicket.status) {
      await logAuditEvent(
        req,
        'Mudança de Status',
        id,
        `Status alterado de "${beforeTicket.status}" para "${updates.status}".`
      );
    }
    if (updates.notes && updates.notes.length > beforeTicket.notes.length) {
      const newNote = updates.notes[updates.notes.length - 1];
      await logAuditEvent(
        req,
        'Adição de Nota',
        id,
        `Nota técnica adicionada: "${newNote.slice(0, 60)}${newNote.length > 60 ? '...' : ''}"`
      );
    }
    const beforeAssigned = (beforeTicket as any).assignedToEmail;
    const afterAssigned = (updates as any).assignedToEmail;
    if (afterAssigned && afterAssigned !== beforeAssigned) {
      await logAuditEvent(
        req,
        'Atribuição de Ticket',
        id,
        `Ticket atribuído para: "${afterAssigned}"`
      );
      try {
        const { notifyTicketAssigned } = await import('../lib/teamsNotifications');
        await notifyTicketAssigned(updated, afterAssigned);
      } catch(e) {
        logger.error({ err: e }, 'Error notifying Teams:');
      }
    }

    try {
      const { broadcastTicketEvent } = await import('../lib/sse');
      broadcastTicketEvent({ type: 'TICKET_UPDATED', ticket: updated });
    } catch(e) { logger.error({ err: e }, 'SSE Broadcast error'); }

    try {
      const { emitEvent } = await import('../lib/socket');
      emitEvent('ticket_updated', updated);
    } catch(e) { logger.error({ err: e }, 'Socket.io emit error'); }

    res.json(updated);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao atualizar chamado");
  }
});

// DELETE /api/tickets/:id - Remove a ticket
router.delete('/:id', requireAuth, requireRole(['Administrador']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get info for audit
    const tickets = await db.getTickets();
    const ticketInfo = tickets.find(t => t.id === id);

    const success = await db.deleteTicket(id);
    if (!success) {
      return res.status(404).json({ error: 'Chamado não encontrado' });
    }

    await logAuditEvent(
      req,
      'Excluir Ticket',
      id,
      `Chamado ${id} "${ticketInfo?.title || ''}" removido permanentemente por Administrador.`,
      { ticketInfo }
    );

    res.json({ success: true, message: 'Chamado deletado com sucesso.' });
  } catch (err: unknown) {
    handleError(res, err, "Erro ao remover chamado");
  }
});

// --- ATTACHMENTS ROUTES ---

// GET /api/tickets/:id/attachments - Get all attachments for a ticket
router.get('/:id/attachments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado.' });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ error: 'Acesso negado.' });
    
    const attachments = await db.getAttachments(id);
    res.json(attachments);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao carregar anexos");
  }
});

// POST /api/tickets/:id/attachments - Request a signed upload URL & register attachment metadata
router.post('/:id/attachments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: ticketId } = req.params;
    
    // Ticket access check (IDOR fix)
    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado.' });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ error: 'Acesso negado.' });
    
    // Path traversal fix
    if (!/^[a-zA-Z0-9_-]+$/.test(ticketId)) return res.status(400).json({ error: 'ID de chamado inválido.' });
    const { filename, mimetype, size } = req.body;

    if (!filename || !mimetype || !size) {
      return res.status(400).json({ error: 'Metadados filename, mimetype e size são obrigatórios.' });
    }

    // 1. Validar tipo de arquivo
    const fileExt = '.' + filename.split('.').pop()?.toLowerCase();
    const isMimetypeAllowed = ALLOWED_MIME_TYPES.includes(mimetype);
    const isExtensionAllowed = ALLOWED_EXTENSIONS.includes(fileExt);

    if (!isMimetypeAllowed || !isExtensionAllowed) {
      return res.status(400).json({ 
        error: `Tipo de arquivo não permitido (${mimetype}). Formatos aceitos: Imagens, PDF, ZIP, TXT, CSV, DOCX, XLSX.` 
      });
    }

    // 2. Validar tamanho máximo (10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (size > MAX_SIZE) {
      return res.status(400).json({ error: 'O tamanho do arquivo excede o limite máximo de 10MB.' });
    }

    const uniqueId = `att-${crypto.randomUUID().slice(0, 8).toLowerCase()}`;
    const storagePath = `attachments/${ticketId}/${uniqueId}${fileExt}`;

    let signedUrl = '';
    let token = '';

    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('attachments')
          .createSignedUploadUrl(storagePath);
        // To force content disposition we will do it on download side via createSignedUrl options
        // To force content disposition we will do it on download side via createSignedUrl options
        
        if (error) throw error;
        signedUrl = data.signedUrl;
        token = data.token;
      } catch (storageErr: any) {
        logger.error({ err: storageErr.message }, 'Falha ao gerar URL de upload no Supabase Storage:');
        return res.status(500).json({ error: 'Falha de comunicação com o Storage.' });
      }
    } else {
      logger.warn('⚠️ AVISO: Supabase não está configurado. Usando fallback em memória para upload de anexo. Isso NÃO deve ser usado em produção.');
      token = crypto.randomBytes(16).toString('hex');
      uploadTokens.set(uniqueId, { token, timestamp: Date.now() });
      signedUrl = `${req.protocol}://${req.get('host')}/api/tickets/${ticketId}/attachments/upload-raw?filename=${encodeURIComponent(filename)}&mimetype=${encodeURIComponent(mimetype)}&attachmentId=${uniqueId}&token=${token}`;
    }

    // Register attachment in DB
    const attachmentObj: Attachment = {
      id: uniqueId,
      ticketId,
      filename,
      mimetype,
      size,
      filePath: storagePath,
      uploadedBy: req.user?.name || 'Anonymous',
      createdAt: new Date().toISOString()
    };

    const registered = await db.createAttachment(attachmentObj);

    res.status(200).json({
      success: true,
      attachment: registered,
      uploadUrl: signedUrl,
      token
    });
  } catch (err: unknown) {
    handleError(res, err, "Erro ao registrar anexo para upload");
  }
});

// PUT /api/tickets/:id/attachments/upload-raw - Direct raw binary body stream receiver for local testing
router.put('/:id/attachments/upload-raw', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const filename = req.query.filename as string;
    const mimetype = req.query.mimetype as string;
    const attachmentId = req.query.attachmentId as string;
    const token = req.query.token as string;

    if (!filename || !attachmentId || !token) {
      return res.status(400).json({ error: 'filename, attachmentId e token são obrigatórios' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(attachmentId)) {
      return res.status(400).json({ error: 'Formato de attachmentId inválido.' });
    }

    if (uploadTokens.get(attachmentId)?.token !== token) {
      return res.status(403).json({ error: 'Token de upload inválido ou expirado' });
    }
    uploadTokens.delete(attachmentId); // One-time use

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', async () => {
      try {
        const fileBuffer = Buffer.concat(chunks);
        
        // Verificação de Magic Bytes
        const { fileTypeFromBuffer } = await import('file-type');
        const typeInfo = await fileTypeFromBuffer(fileBuffer);
        
        // Se a lib file-type detectou um tipo, comparar com o mimetype declarado.
        if (typeInfo) {
          if (typeInfo.mime !== mimetype && !(mimetype === 'application/x-zip-compressed' && typeInfo.mime === 'application/zip')) {
            return res.status(400).json({ error: `Conteúdo do arquivo não corresponde ao mimetype declarado. Detectado: ${typeInfo.mime}, Declarado: ${mimetype}` });
          }
        } else if (!mimetype.startsWith('text/') && mimetype !== 'application/csv') {
          // file-type didn't detect magic bytes but it's claiming to be a non-text format
          return res.status(400).json({ error: 'Não foi possível validar o tipo real do arquivo.' });
        }

        const filePath = path.join(UPLOADS_DIR, attachmentId);
        await fs.writeFile(filePath, fileBuffer);

        // Store metadata in a separate file or alongside
        const metaPath = path.join(UPLOADS_DIR, `${attachmentId}.meta.json`);
        await fs.writeFile(metaPath, JSON.stringify({ filename, mimetype }));

        await logAuditEvent(req, 'Upload de Anexo', id, `Anexo "${filename}" (${(fileBuffer.length/1024).toFixed(1)} KB) carregado.`);

        res.json({ success: true, message: 'Arquivo carregado com sucesso.' });
      } catch (err: unknown) {
        handleError(res, err, "Erro ao processar stream de arquivo");
      }
    });
  } catch (err: unknown) {
    handleError(res, err, "Falha no processamento de upload");
  }
});


// POST /api/tickets/:id/attachments/:attachmentId/verify - Verify magic bytes in Supabase Storage post-upload
router.post('/:id/attachments/:attachmentId/verify', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, attachmentId } = req.params;

    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ error: 'Acesso negado.' });

    const attachments = await db.getAttachments(id);
    const attachment = attachments.find(a => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    if (!supabase) {
      return res.json({ success: true, message: 'Supabase não configurado, bypass' });
    }

    // Download the file from Supabase Storage
    const { data, error } = await supabase.storage.from('attachments').download(attachment.filePath);
    if (error || !data) {
      return res.status(500).json({ error: 'Falha ao baixar arquivo para verificação.' });
    }

    const fileBuffer = Buffer.from(await data.arrayBuffer());

    const { fileTypeFromBuffer } = await import('file-type');
    const typeInfo = await fileTypeFromBuffer(fileBuffer);

    let spoofed = false;
    let detectedMime = 'unknown';

    if (typeInfo) {
      detectedMime = typeInfo.mime;
      if (typeInfo.mime !== attachment.mimetype && !(attachment.mimetype === 'application/x-zip-compressed' && typeInfo.mime === 'application/zip')) {
        spoofed = true;
      }
    } else if (!attachment.mimetype.startsWith('text/') && attachment.mimetype !== 'application/csv') {
      // file-type didn't detect magic bytes but it's claiming to be a non-text format
      spoofed = true;
    }

    if (spoofed) {
      // Delete the malicious file from storage
      await supabase.storage.from('attachments').remove([attachment.filePath]);
      // (Optional) also delete from DB or mark as invalid, but deleting from storage at least removes the threat
      // db.deleteAttachment(attachmentId) if that method exists... For now, we will leave it in DB or you can assume it will fail on download
      await logAuditEvent(req, 'Tentativa de Spoofing (Bloqueado)', id, `Usuário tentou fazer upload de arquivo falso. Detectado: ${detectedMime}, Declarado: ${attachment.mimetype}`);
      return res.status(400).json({ error: `Conteúdo do arquivo não corresponde ao mimetype declarado. Detectado: ${detectedMime}, Declarado: ${attachment.mimetype}` });
    }

    await logAuditEvent(req, 'Verificação de Anexo', id, `Arquivo ${attachment.filename} validado com sucesso.`);
    return res.json({ success: true });

  } catch (err: unknown) {
    return handleError(res, err, "Erro ao verificar arquivo");
  }
});


// GET /api/tickets/:id/attachments/:attachmentId/download - Generate a signed URL or stream file directly


router.get('/:id/attachments/:attachmentId/download', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, attachmentId } = req.params;

    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado.' });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ error: 'Acesso negado.' });
    
    const attachments = await db.getAttachments(id);
    const attachment = attachments.find(a => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    await logAuditEvent(req, 'Download de Anexo', id, `Download do anexo "${attachment.filename}" iniciado.`);

    if (supabase) {
      try {
        const { data, error } = await supabase.storage
          .from('attachments')
          .createSignedUrl(attachment.filePath, 300, { download: attachment.filename }); // Expirável em 5 minutos
        
        if (!error && data?.signedUrl) {
          return res.json({ downloadUrl: data.signedUrl });
        } else {
          logger.error({ err: error }, 'Erro Supabase createSignedUrl:');
          return res.status(500).json({ error: 'Falha ao gerar link de download' });
        }
      } catch (err) {
        return res.status(500).json({ error: 'Erro de comunicação com Storage' });
      }
    }

    logger.warn('⚠️ AVISO: Supabase não está configurado. Usando fallback em memória para download de anexo.');
    // Local stream download URL fallback
    res.json({ downloadUrl: `/api/tickets/${id}/attachments/${attachmentId}/stream` });
  } catch (err: unknown) {
    handleError(res, err, "Erro ao obter link de download");
  }
});

// GET /api/tickets/:id/attachments/:attachmentId/stream - Stream local uploaded files
router.get('/:id/attachments/:attachmentId/stream', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, attachmentId } = req.params;

    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado.' });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ error: 'Acesso negado.' });

    const attachments = await db.getAttachments(id);
    const attachment = attachments.find(a => a.id === attachmentId);
    if (!attachment) {
      return res.status(404).json({ error: 'Anexo não encontrado' });
    }

    try {
      const metaPath = path.join(UPLOADS_DIR, `${attachmentId}.meta.json`);
      const metaContent = await fs.readFile(metaPath, 'utf8');
      const meta = JSON.parse(metaContent);

      const filePath = path.join(UPLOADS_DIR, attachmentId);
      const fileBuffer = await fs.readFile(filePath);

      res.setHeader('Content-Type', meta.mimetype);
      res.setHeader('Content-Disposition', `attachment; filename="${meta.filename}"`);
      res.send(fileBuffer);
    } catch (e) {
      return res.status(404).json({ error: 'Arquivo do anexo não encontrado no servidor local.' });
    }
  } catch (err: unknown) {
    handleError(res, err, "Erro ao realizar o stream do anexo");
  }
});

// --- COMMENTS ROUTES ---

// GET /api/tickets/:id/comments - Get all comments for a ticket
router.get('/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado.' });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ error: 'Acesso negado.' });
    
    const comments = await db.getComments(id);
    res.json(comments);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao carregar comentários");
  }
});

// POST /api/tickets/:id/comments - Create a new comment
router.post('/:id/comments', requireAuth, validateBody(ticketCommentSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const tickets = await db.getTickets();
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return res.status(404).json({ error: 'Chamado não encontrado' });
    if (!canAccessTicket(req.user, ticket)) return res.status(403).json({ error: 'Acesso negado.' });

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Conteúdo do comentário é obrigatório' });
    }

    // Sanitize content minimally (prevent basic HTML injection)
    const sanitizedContent = sanitizeHtml(content, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'escape'
    });

    const newComment = await db.createComment({
      ticketId: id,
      authorId: req.user!.id, // Usando o ID real do banco
      authorName: req.user!.name,
      content: sanitizedContent
    });

    await logAuditEvent(
      req,
      'Adição de Comentário',
      id,
      `Comentário adicionado: "${sanitizedContent.slice(0, 60)}${sanitizedContent.length > 60 ? '...' : ''}"`
    );

    res.status(201).json(newComment);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao adicionar comentário");
  }
});

export default router;
