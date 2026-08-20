import { logger } from "../lib/logger";
import { handleError } from '../lib/errorHandler';
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { db } from '../lib/db';
import Redis from 'ioredis';
import { validateBody, loginSchema } from '../validations';

const RouterInstance = Router();

// Configuração centralizada de política de SameSite para cookies de sessão e OAuth.
// Nota de Arquitetura & Segurança:
// - Em ambiente de iFrame / preview (AI Studio, Cloud Run embutido), 'none' é exigido para transmissão do cookie.
// - Em produção standalone, pode ser configurado via COOKIE_SAME_SITE ('lax' | 'strict').
// - A proteção CSRF é garantida em nível de API via verificação obrigatória do header 'x-csrf-token' em requisições mutativas.
const getSameSitePolicy = (): 'lax' | 'none' | 'strict' => {
  if (process.env.COOKIE_SAME_SITE === 'lax' || process.env.COOKIE_SAME_SITE === 'strict' || process.env.COOKIE_SAME_SITE === 'none') {
    return process.env.COOKIE_SAME_SITE;
  }
  // Padrão: 'lax' para produção pura, 'none' em dev/iframe
  return process.env.NODE_ENV === 'production' && process.env.EMBEDDED_IFRAME_MODE !== 'true' ? 'lax' : 'none';
};

// Rate limiter por IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas de login. Tente novamente após 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

interface RateLimitRecord {
  count: number;
  expiresAt: number;
}

interface RateLimitStore {
  get(key: string): Promise<RateLimitRecord | null>;
  set(key: string, record: RateLimitRecord): Promise<void>;
  delete(key: string): Promise<void>;
}

// Map em memória para rate limiter por email (fallback dev)
class MemoryRateLimitStore implements RateLimitStore {
  private map = new Map<string, RateLimitRecord>();

  constructor() {
    logger.warn('⚠️ AVISO: Usando rate limiter por email em memória. Esse comportamento não é seguro para ambientes multi-instância sem Redis.');
  }

  async get(key: string): Promise<RateLimitRecord | null> {
    return this.map.get(key) || null;
  }

  async set(key: string, record: RateLimitRecord): Promise<void> {
    this.map.set(key, record);
  }

  async delete(key: string): Promise<void> {
    this.map.delete(key);
  }
}

// Redis Store Implementation (usando ioredis)
class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;

  constructor(redisUrl: string) {
    logger.info('🔌 Conectando ao Redis para rate limiter por email...');
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true
    });
    this.redis.on('error', (err: any) => {
      logger.error({ err }, '❌ Erro de conexão com o Redis');
    });
  }

  private getKey(key: string): string {
    return `rl:email:${key}`;
  }

  async get(key: string): Promise<RateLimitRecord | null> {
    try {
      const data = await this.redis.get(this.getKey(key));
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      logger.error({ err }, 'Erro ao ler do Redis');
      return null;
    }
  }

  async set(key: string, record: RateLimitRecord): Promise<void> {
    try {
      const keyStr = this.getKey(key);
      const ttlMs = Math.max(0, record.expiresAt - Date.now());
      if (ttlMs > 0) {
        await this.redis.set(keyStr, JSON.stringify(record), 'PX', ttlMs);
      } else {
        await this.redis.del(keyStr);
      }
    } catch (err) {
      logger.error({ err }, 'Erro ao gravar no Redis');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(this.getKey(key));
    } catch (err) {
      logger.error({ err }, 'Erro ao deletar do Redis');
    }
  }
}

let rateLimitStore: RateLimitStore;
if (process.env.REDIS_URL) {
  rateLimitStore = new RedisRateLimitStore(process.env.REDIS_URL);
} else {
  rateLimitStore = new MemoryRateLimitStore();
}

const EMAIL_MAX_ATTEMPTS = parseInt(process.env.LOGIN_MAX_ATTEMPTS || '5', 10);
const EMAIL_LOCKOUT_MS = parseInt(process.env.LOGIN_LOCKOUT_MS || String(15 * 60 * 1000), 10);

RouterInstance.post('/login', loginLimiter, validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();
    const record = await rateLimitStore.get(normalizedEmail);

    if (record && now < record.expiresAt) {
      if (record.count >= EMAIL_MAX_ATTEMPTS) {
        logger.warn({ email: normalizedEmail }, 'Rate limit alcançado para o email de login.');
        return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente após 15 minutos.' });
      }
    } else if (record && now >= record.expiresAt) {
      // Expirou, limpar
      await rateLimitStore.delete(normalizedEmail);
    }

    const registerFailure = async () => {
      const current = await rateLimitStore.get(normalizedEmail);
      if (current && now < current.expiresAt) {
        current.count += 1;
        await rateLimitStore.set(normalizedEmail, current);
      } else {
        await rateLimitStore.set(normalizedEmail, { count: 1, expiresAt: now + EMAIL_LOCKOUT_MS });
      }
    };

    const user = await db.getUserByEmail(email);
    if (!user || !user.password) {
      await registerFailure();
      await db.createAuditEvent({
        ticketId: null,
        userId: 'system',
        userName: 'System',
        userEmail: 'system',
        action: 'Login com falha',
        details: `Tentativa de login falha para o email: ${email}`
      });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await registerFailure();
      await db.createAuditEvent({
        ticketId: null,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        action: 'Login com falha',
        details: `Senha incorreta para o email: ${email}`,
        metadata: { email, reason: 'Senha incorreta', ip: req.ip }
      });
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    // Login bem-sucedido, reseta o contador
    await rateLimitStore.delete(normalizedEmail);

    const csrfToken = crypto.randomBytes(24).toString('hex');
    const sessionUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      department: user.department,
      csrfToken
    };

    const sessionToken = jwt.sign(sessionUser, process.env.SESSION_SECRET!, { expiresIn: '24h' });
    
    res.cookie('cbi_ops_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: getSameSitePolicy(),
      maxAge: 24 * 60 * 60 * 1000
    });

      res.json({ token: csrfToken, user: sessionUser });
  } catch (error) {
    handleError(res, error, 'Erro ao realizar login.');
  }
});

const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || 'common';

RouterInstance.get('/url', (req: Request, res: Response) => {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const redirectUri = `${appUrl}/api/auth/callback`;

  const randomState = crypto.randomBytes(32).toString('hex');
  res.cookie('cbi_oauth_state', randomState, {
    httpOnly: true,
    secure: true,
    sameSite: getSameSitePolicy(),
    maxAge: 10 * 60 * 1000 // 10 minutes
  });

  if (!AZURE_CLIENT_ID) {
    return res.status(500).json({ error: 'Autenticação Microsoft não configurada' });
  }

  const params = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email User.Read',
    state: randomState
  });

  const authUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/authorize?${params.toString()}`;
  res.json({ url: authUrl, configured: true });
});

RouterInstance.get('/callback', async (req: Request, res: Response) => {
  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send('Código de autorização ausente.');
  }

  const storedState = req.cookies?.cbi_oauth_state;

  if (!state || !storedState || state !== storedState) {
    logger.error('❌ ERRO CSRF: State recebido no OAuth callback não bate com o gravado em cookie.');
    return res.status(403).send('Falha de segurança OAuth: State de verificação inválido ou expirado (CSRF Detectado).');
  }

  res.clearCookie('cbi_oauth_state', {
    httpOnly: true,
    secure: true,
    sameSite: getSameSitePolicy()
  });

  if (!AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET) {
    return res.status(500).send('Autenticação Microsoft não configurada.');
  }

  let userProfile;
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/auth/callback`;

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: AZURE_CLIENT_ID,
        client_secret: AZURE_CLIENT_SECRET,
        code: String(code),
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email User.Read'
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      throw new Error(`Microsoft Token Error: ${errorData}`);
    }

    const tokens = await tokenResponse.json();
    let userEmail = '';
    if (tokens.id_token) {
      const decoded = jwt.decode(tokens.id_token) as any;
      userEmail = decoded?.email || decoded?.preferred_username || decoded?.upn;
    }

    if (!userEmail) {
      if (!tokens.access_token) { throw new Error('Falha na autenticação: Não foi possível obter o e-mail do token e nenhum access_token foi retornado.'); }
      const graphResponse = await fetch('https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName', {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
      });
      if (!graphResponse.ok) {
        throw new Error('Falha ao obter perfil do Microsoft Graph API: ' + await graphResponse.text());
      }
      const profile = await graphResponse.json();
      userEmail = profile.mail || profile.userPrincipalName;
    }

    if (!userEmail) {
      throw new Error('Não foi possível identificar o e-mail do usuário autenticado.');
    }

    const { db } = await import('../lib/db');
    const allUsers = await db.getUsers();
    let dbUser = allUsers.find((u: any) => u.email.toLowerCase() === userEmail.toLowerCase());

    if (!dbUser) {
      throw new Error(`Acesso negado: O e-mail ${userEmail} não está cadastrado no sistema.`);
    }

    if (!dbUser.active) {
      throw new Error(`Acesso negado: O usuário ${userEmail} está desativado.`);
    }

    userProfile = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      department: dbUser.department
    };
  } catch (err: unknown) {
    logger.error({ err: (err instanceof Error ? err.message : String(err)) }, '⚠️ OAuth Flow failed:');
    return res.status(401).send(`Falha na autenticação com Microsoft Entra ID: ${(err instanceof Error ? err.message : String(err))}`);
  }

  const csrfToken = crypto.randomBytes(24).toString('hex');
  const sessionUser = {
    ...userProfile,
    csrfToken
  };

  const sessionToken = jwt.sign(sessionUser, process.env.SESSION_SECRET!, { expiresIn: '24h' });

  res.cookie('cbi_ops_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: getSameSitePolicy(),
    maxAge: 24 * 60 * 60 * 1000
  });

  // Return the pop-up communication HTML template specified by oauth-integration skill
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Autenticação Concluída</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 40px; background-color: #F5F7F6; color: #0D5A46; }
          .loader { border: 4px solid #f3f3f3; border-top: 4px solid #159A65; border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: 20px auto; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <h3>Conexão efetuada com sucesso!</h3>
        <p>Sincronizando suas credenciais com o AcmeCorp Ops Center...</p>
        <div class="loader"></div>
        <script>
          const targetOrigin = '${process.env.APP_URL || "http://localhost:3000"}';
          setTimeout(() => {
            if (window.opener) {
              const safeUser = Object.assign({}, ${JSON.stringify(sessionUser)});
              delete safeUser.csrfToken; // Exclude CSRF token from postMessage
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS',
                user: safeUser
              }, targetOrigin);
              window.close();
            } else {
              window.location.href = '/';
            }
          }, 1000);
        </script>
      </body>
    </html>
  `);
});

// Returns currently authenticated user session
RouterInstance.get('/me', async (req: Request, res: Response) => {
  const token = req.cookies?.cbi_ops_session;
  if (!token) {
    return res.status(401).json({ error: 'Nenhuma sessão ativa encontrada.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET!, { algorithms: ['HS256'] }) as any;
    const { db } = await import('../lib/db');
    const allUsers = await db.getUsers();
    const dbUser = allUsers.find(u => u.email.toLowerCase() === decoded.email.toLowerCase());
    
    if (dbUser) {
      return res.json({
        ...decoded,
        name: dbUser.name,
        role: dbUser.role,
        department: dbUser.department || 'Operações',
        notificationPreferences: dbUser.notificationPreferences || {
          ticketAssigned: true,
          newComments: true,
          slaAlerts: true,
          statusChange: true
        }
      });
    }
    res.json(decoded);
  } catch (err) {
    res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
});

// Clean logout endpoint
RouterInstance.post('/logout', async (req: Request, res: Response) => {
  const token = req.cookies?.cbi_ops_session;
  if (token) {
    try {
      const { db } = await import('../lib/db');
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.id) {
        await db.revokeToken(token, decoded.id);
      } else {
        await db.revokeToken(token, 'unknown');
      }
    } catch (err) {
      logger.error({ err: err }, 'Failed to revoke token on logout');
    }
  }

  res.clearCookie('cbi_ops_session', {
    httpOnly: true,
    secure: true,
    sameSite: getSameSitePolicy()
  });
  res.json({ success: true, message: 'Logout concluído.' });
});

export default RouterInstance;
