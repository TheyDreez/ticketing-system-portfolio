import { logger } from "../lib/logger";
import { handleError } from '../lib/errorHandler';
import { rateLimit } from 'express-rate-limit';
import { Router, Response } from 'express';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/requireAuth';
import { db } from '../lib/db';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { UserRecord } from '../../src/types';
import { validateBody, userCreateSchema, userUpdateSchema } from '../validations';

const router = Router();

const sensitiveRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas detectadas. Por favor, tente novamente após 15 minutos.' }
});


function sanitizeUser(user: UserRecord) {
  const { password, ...rest } = user;
  return rest;
}

function sanitizeUsers(users: UserRecord[]): Omit<UserRecord, 'password'>[] {
  return users.map(sanitizeUser);
}

const updateMeSchema = z.object({
  name: z.string().min(2, 'Nome deve conter pelo menos 2 caracteres'),
  department: z.string().min(2, 'Departamento deve conter pelo menos 2 caracteres'),
});

// PATCH /api/users/me - Update authenticated user profile info
router.patch('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = updateMeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }

    const email = req.user!.email;
    const allUsers = await db.getUsers();
    const dbUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!dbUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updated = await db.updateUser(dbUser.id, {
      name: result.data.name,
      department: result.data.department,
    });

    res.json(updated ? sanitizeUser(updated) : null);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao atualizar perfil' });
  }
});

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z.string()
    .min(8, 'Nova senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter ao menos 1 letra maiúscula')
    .regex(/[a-z]/, 'Deve conter ao menos 1 letra minúscula')
    .regex(/[0-9]/, 'Deve conter ao menos 1 número')
    .regex(/[^a-zA-Z0-9]/, 'Deve conter ao menos 1 caractere especial'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Confirmação de senha não confere',
  path: ['confirmPassword']
});

// POST /api/users/change-password - Change authenticated user password
router.post('/change-password', requireAuth, sensitiveRateLimiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      const errorsMap: Record<string, string> = {};
      result.error.issues.forEach(err => {
        const field = err.path[0];
        if (typeof field === 'string' || typeof field === 'number') {
          errorsMap[String(field)] = (err instanceof Error ? err.message : String(err));
        }
      });
      return res.status(400).json({ errors: errorsMap });
    }

    const email = req.user!.email;
    const allUsers = await db.getUsers();
    const dbUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!dbUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const expectedPasswordHash = dbUser.password || '';
    const isMatch = expectedPasswordHash ? bcrypt.compareSync(result.data.currentPassword, expectedPasswordHash) : false;
    if (!isMatch) {
      return res.status(400).json({
        errors: { currentPassword: 'A senha atual está incorreta' }
      });
    }

    const hashedNewPassword = bcrypt.hashSync(result.data.newPassword, BCRYPT_ROUNDS);
    await db.updateUser(dbUser.id, {
      password: hashedNewPassword,
      mustChangePassword: false
    });

    // Invalidate old sessions to enforce security
    await db.revokeUser(dbUser.id);

    res.json({ success: true, message: 'Senha atualizada com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao atualizar a senha' });
  }
});

const preferencesSchema = z.object({
  ticketAssigned: z.boolean(),
  newComments: z.boolean(),
  slaAlerts: z.boolean(),
  statusChange: z.boolean(),
});

// PATCH /api/users/me/preferences - Update notification preferences
router.patch('/me/preferences', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = preferencesSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Preferências inválidas' });
    }

    const email = req.user!.email;
    const allUsers = await db.getUsers();
    const dbUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!dbUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const updated = await db.updateUser(dbUser.id, {
      notificationPreferences: result.data
    });

    res.json(updated ? sanitizeUser(updated) : null);
  } catch (err) {
    res.status(500).json({ error: 'Falha ao salvar preferências' });
  }
});

// GET /api/users/me/data-export - Export user's own data in compliance with LGPD
router.get('/me/data-export', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.user!.email;
    const name = req.user!.name;

    // 1. Fetch tickets created by this user
    const tickets = await db.getTickets();
    const myTickets = tickets.filter(t => 
      t.user.toLowerCase() === name.toLowerCase() || 
      t.user.toLowerCase() === email.toLowerCase()
    );

    // 2. Fetch comments created by this user
    const myComments = await (db as any).getCommentsByAuthor(req.user!.id);

    // 3. Fetch audit events triggered by this user
    const auditEvents = await db.getAuditEvents();
    const myEvents = auditEvents.filter(e => 
      (e.userEmail && e.userEmail.toLowerCase() === email.toLowerCase()) || 
      (e.userId && e.userId.toLowerCase() === email.toLowerCase())
    );

    // 4. Return structured JSON data package
    res.json({
      exportDate: new Date().toISOString(),
      user: {
        name: req.user!.name,
        email: req.user!.email,
        role: req.user!.role,
      },
      tickets: myTickets,
      comments: myComments,
      auditEvents: myEvents
    });
  } catch (err: unknown) {
    handleError(res, err, "Falha ao exportar dados pessoais");
  }
});

// POST /api/users/me/deactivate - Deactivate own account with optional LGPD anonymization
router.post('/me/deactivate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const email = req.user!.email;
    const allUsers = await db.getUsers();
    const dbUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!dbUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const anonymize = req.body.anonymize === true;

    if (anonymize) {
      const anonId = Math.floor(1000 + Math.random() * 9000);
      const anonName = `Operador Anonimizado ${anonId}`;
      const anonEmail = `anon_${anonId}@cbiops.com`;

      await db.updateUser(dbUser.id, {
        name: anonName,
        email: anonEmail,
        active: false,
        avatar: 'AN',
        password: 'ANONYMIZED_PASSWORD_HASH_THAT_PREVENTS_LOGIN'
      });

      // Cascade anonymization (LGPD Requirement)
      await db.anonymizeUserReferences(dbUser.id, dbUser.email, anonEmail, anonName);

      await db.createAuditEvent({
        ticketId: 'N/A',
        userId: anonEmail,
        userName: anonName,
        userEmail: anonEmail,
        action: 'Anonimização de Conta',
        details: `Um usuário desativou e anonimizou irreversivelmente sua própria conta em conformidade com a LGPD.`
      });
    } else {
      await db.updateUser(dbUser.id, { active: false });

      await db.createAuditEvent({
        ticketId: 'N/A',
        userId: email,
        userName: dbUser.name,
        userEmail: email,
        action: 'Auto-desativação',
        details: `O usuário ${dbUser.name} desativou sua própria conta.`
      });
    }

    const token = req.cookies?.cbi_ops_session;
    if (token && dbUser.id) {
      await db.revokeToken(token, dbUser.id);
    }

    res.clearCookie('cbi_ops_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'none'
    });

    res.json({ success: true, message: anonymize ? 'Conta anonimizada e desativada com sucesso.' : 'Conta desativada com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: 'Falha ao desativar conta' });
  }
});

// GET /api/users - Fetch active console operators (Admin only)
router.get('/', requireAuth, requireRole(['Administrador']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await db.getUsers();
    res.json(sanitizeUsers(users));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/directory - Basic directory for assignment (Any authenticated user)
router.get('/directory', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await db.getUsers();
    // Return only name, id and department for active users
    const directory = users
      .filter(u => u.active)
      .map(u => ({
        id: u.id,
        name: u.name,
        department: u.department
      }));
    res.json(directory);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch directory' });
  }
});

const createUserSchema = z.object({
  name: z.string().min(2, 'Nome deve conter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  role: z.enum(['Administrador', 'Suporte', 'Colaborador']),
  active: z.boolean().optional(),
  avatar: z.string().optional()
});

// POST /api/users - Create new user (Admin only)
router.post('/', requireAuth, requireRole(['Administrador']), validateBody(userCreateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Dados inválidos', details: parseResult.error.issues });
    }

    const { name, email, role, active = true, avatar } = parseResult.data;

    const newUser = await db.createUser({
      name,
      email,
      role,
      active,
      avatar: avatar || name.substring(0, 2).toUpperCase()
    });

    await db.createAuditEvent({
      ticketId: 'N/A', // System level audit
      userId: req.user!.email,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: 'Criar Usuário',
      details: `Novo usuário criado: ${name} (${email}) - ${role}`
    });

    res.status(201).json(sanitizeUser(newUser));
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

const patchUserSchema = z.object({
  name: z.string().min(2, 'Nome deve conter pelo menos 2 caracteres').optional(),
  role: z.enum(['Administrador', 'Suporte', 'Colaborador']).optional(),
  active: z.boolean().optional(),
  avatar: z.string().nullable().optional(),
  department: z.string().optional(),
});

// PATCH /api/users/:id - Update user (Admin only)
router.patch('/:id', requireAuth, requireRole(['Administrador']), validateBody(userUpdateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = patchUserSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error.issues[0].message });
    }

    const updates = result.data;
    
    const updatedUser = await db.updateUser(id, updates);
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (updates.active === false) {
      await db.revokeUser(id);
    }

    await db.createAuditEvent({
      ticketId: 'N/A',
      userId: req.user!.email,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: updates.role ? 'Mudança de Papel/Permissão' : 'Editar Usuário',
      details: `Usuário ${updatedUser.name} (${updatedUser.email}) atualizado. Campos: ${Object.keys(updates).join(', ')}`,
      metadata: { targetUserId: updatedUser.id, targetUserEmail: updatedUser.email, updates }
    });

    res.json(updatedUser ? sanitizeUser(updatedUser) : null);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Soft delete user (Admin only)
router.delete('/:id', requireAuth, requireRole(['Administrador']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const updatedUser = await db.updateUser(id, { active: false });
    if (!updatedUser) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Revoke all sessions for this user
    await db.revokeUser(id);

    await db.createAuditEvent({
      ticketId: 'N/A',
      userId: req.user!.email,
      userName: req.user!.name,
      userEmail: req.user!.email,
      action: 'Desativar Usuário',
      details: `Usuário ${updatedUser.name} (${updatedUser.email}) desativado no sistema.`
    });

    res.json({ success: true, message: 'User deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
