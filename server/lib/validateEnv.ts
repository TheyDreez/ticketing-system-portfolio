import { logger } from '../lib/logger';
import crypto from 'crypto';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET deve ter no mínimo 32 caracteres').optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  TEAMS_OUTGOING_WEBHOOK_SECRET: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),
  ALLOW_DEMO_LOGIN: z.string().optional(),
}).refine(data => {
  if (data.NODE_ENV === 'production' && !data.SESSION_SECRET) return false;
  return true;
}, {
  message: "SESSION_SECRET é obrigatório em produção e deve ter pelo menos 32 caracteres.",
  path: ['SESSION_SECRET']
}).refine(data => {
  if (data.NODE_ENV === 'production' && !data.TEAMS_OUTGOING_WEBHOOK_SECRET) return false;
  return true;
}, {
  message: "TEAMS_OUTGOING_WEBHOOK_SECRET é obrigatório em produção.",
  path: ['TEAMS_OUTGOING_WEBHOOK_SECRET']
}).refine(data => {
  if (data.NODE_ENV === 'production' && !data.ALLOWED_ORIGINS) return false;
  return true;
}, {
  message: "ALLOWED_ORIGINS é obrigatório em produção.",
  path: ['ALLOWED_ORIGINS']
}).refine(data => {
  if (data.NODE_ENV === 'production' && data.ALLOW_DEMO_LOGIN === 'true') return false;
  return true;
}, {
  message: "ALLOW_DEMO_LOGIN=true é estritamente proibido em produção.",
  path: ['ALLOW_DEMO_LOGIN']
}).refine(data => {
  const hasUrl = !!data.SUPABASE_URL;
  const hasKey = !!data.SUPABASE_SERVICE_ROLE_KEY;
  return hasUrl === hasKey;
}, {
  message: "Configuração do Supabase incompleta. SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem ser configurados juntos.",
  path: ['SUPABASE_URL']
});

export function validateEnv() {
  if (process.env.SESSION_SECRET === 'some-secure-long-random-string-goes-here' && process.env.NODE_ENV === 'production') {
    logger.error('❌ ERRO FATAL: SESSION_SECRET está usando o valor padrão inseguro do .env.example em produção.');
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    result.error.issues.forEach(err => {
      logger.error(`❌ ERRO DE CONFIGURAÇÃO: ${err.message}`);
    });
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    logger.warn('⚠️ AVISO: A variável de ambiente SESSION_SECRET não está definida ou é muito fraca. Usando um segredo temporário em memória para permitir o boot.');
    process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  }

  if (process.env.ALLOW_DEMO_LOGIN === 'true') {
    logger.warn('⚠️ AVISO DE SEGURANÇA: O MODO DEMO ESTÁ ATIVO (ALLOW_DEMO_LOGIN=true). Contas fictícias podem ser acessadas sem credenciais Microsoft reais.');
  }

  if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
    logger.warn('⚠️ AVISO DE SEGURANÇA: REDIS_URL não configurado em produção. O rate limiter de login funcionará em memória local (não compartilhado entre réplicas multi-instância).');
  }

  // Validação do Azure (Obrigatório vir a tripla completa)
  const hasAzureClientId = !!process.env.AZURE_CLIENT_ID;
  const hasAzureClientSecret = !!process.env.AZURE_CLIENT_SECRET;
  const hasAzureTenantId = !!process.env.AZURE_TENANT_ID;
  
  if (
    (hasAzureClientId || hasAzureClientSecret || hasAzureTenantId) &&
    !(hasAzureClientId && hasAzureClientSecret && hasAzureTenantId)
  ) {
    logger.error('❌ Configuração do Azure incompleta. AZURE_CLIENT_ID, AZURE_CLIENT_SECRET e AZURE_TENANT_ID devem ser configurados juntos.');
  }

  const isSupabaseConfigured = !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isAzureConfigured = hasAzureClientId && hasAzureClientSecret && hasAzureTenantId;

  logger.info(`Integrações ativas: Supabase=${isSupabaseConfigured}, Azure=${isAzureConfigured}`);
}
