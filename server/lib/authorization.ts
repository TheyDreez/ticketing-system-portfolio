import { Ticket, UserRecord } from '../../src/types';

/**
 * Verifica se um usuário pode acessar/visualizar um ticket.
 * Regra:
 * - Administrador acessa todos os tickets.
 * - Suporte acessa apenas os tickets do seu departamento.
 * - Colaborador acessa apenas tickets que ele mesmo criou (authorEmail).
 */
export function canAccessTicket(user: any, ticket: any): boolean {
  if (!user || !ticket) return false;
  
  if (user.role === 'Administrador') return true;
  
  if (user.role === 'Suporte') {
    // SECURITY FIX: Fail-closed if department is missing on either side
    if (!user.department || !ticket.department) return false;
    return user.department === ticket.department;
  }
  
  if (user.role === 'Colaborador') {
    // SECURITY FIX: Fail-closed if email is missing
    if (!ticket.authorEmail || !user.email) return false;
    return ticket.authorEmail?.toLowerCase() === user.email?.toLowerCase();
  }
  
  return false;
}

/**
 * Verifica se um usuário pode reatribuir um ticket.
 * Regra:
 * - Administrador pode reatribuir qualquer ticket.
 * - Suporte só pode reatribuir tickets do mesmo departamento que o seu.
 */
export function canReassignTicket(user: any, ticket: any): boolean {
  if (!user || !ticket) return false;
  
  if (user.role === 'Administrador') return true;
  
  if (user.role === 'Suporte') {
    return user.department === ticket.department;
  }
  
  return false;
}

/**
 * Verifica se um usuário pode ver campos sensíveis do ticket.
 * Regra de negócio:
 * Considera-se campos sensíveis os dados de custo interno ou anotações privadas.
 * - Somente o Administrador pode visualizar esses campos.
 */
export function canViewSensitiveFields(user: any, ticket: any): boolean {
  if (!user || !ticket) return false;
  
  if (user.role === 'Administrador') return true;
  
  return false;
}
