import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../lib/db';



export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: string;
  department?: string;
  mustChangePassword?: boolean;
  csrfToken?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserRecord;
    }
  }
}

export interface AuthenticatedRequest extends Request {}

export async function verifySession(token: string) {
  const decoded = jwt.verify(token, process.env.SESSION_SECRET!, { algorithms: ['HS256'] }) as any;
  
  const isRevoked = await db.isTokenRevoked(token, decoded.id);
  if (isRevoked) {
    throw new Error('Sessão revogada. Faça login novamente.');
  }

  const users = await db.getUsers();
  const dbUser = users.find(u => u.id === decoded.id);
  if (!dbUser || dbUser.active === false) {
    throw new Error('Conta inativa ou não encontrada. Acesso negado.');
  }

  if ((dbUser as any).tokensRevokedAt) {
    const revokedAtTime = new Date((dbUser as any).tokensRevokedAt).getTime();
    const tokenIssuedAt = decoded.iat ? decoded.iat * 1000 : 0;
    if (tokenIssuedAt < revokedAtTime) {
      throw new Error('Sessão revogada globalmente. Faça login novamente.');
    }
  }

  return {
    ...decoded,
    role: dbUser.role,
    department: dbUser.department,
    mustChangePassword: dbUser.mustChangePassword
  };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.cbi_ops_session;
  
  if (!token) {
    return res.status(401).json({ error: 'Não autorizado. Faça login com Microsoft Entra ID.' });
  }

  try {
    const user = await verifySession(token);
    
    // Refresh role and other data with fresh DB value
    req.user = user;

    const dbUser = { mustChangePassword: user.mustChangePassword };

    if (dbUser.mustChangePassword) {
      const isAllowedRoute = 
        (req.method === 'POST' && req.originalUrl === '/api/users/change-password') ||
        (req.method === 'POST' && req.originalUrl === '/api/auth/logout') ||
        (req.method === 'GET' && req.originalUrl.startsWith('/api/auth/session'));
        
      if (!isAllowedRoute) {
        return res.status(403).json({ error: 'Você precisa alterar sua senha temporária antes de continuar', code: 'MUST_CHANGE_PASSWORD' });
      }
    }

    // CSRF validation for state-changing methods
    const method = req.method;
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      const headerToken = req.headers['x-csrf-token'];
      const sessionToken = user.csrfToken;
      
      if (!sessionToken || headerToken !== sessionToken) {
        return res.status(403).json({ error: 'Erro de validação CSRF. Token ausente ou inválido.' });
      }
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autorizado. Usuário não autenticado.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente para esta ação.' });
    }
    next();
  };
}
