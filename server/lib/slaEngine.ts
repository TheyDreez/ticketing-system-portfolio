import { logger } from '../lib/logger';
import { Ticket, SlaConfig } from '../../src/types';
import { db } from './db';
import { sendSlaBreachAlert } from './notifications';
import { notifySlaBreach } from './teamsNotifications';

export let defaultSlaConfigs: SlaConfig[] = [
  { id: 'Alta_Infraestrutura', priority: 'Alta', category: 'Infraestrutura', hours: 0.5 },
  { id: 'Alta_Rede', priority: 'Alta', category: 'Rede', hours: 1 },
  { id: 'Alta_Permissões', priority: 'Alta', category: 'Permissões', hours: 2 },
  { id: 'Alta_Software', priority: 'Alta', category: 'Software', hours: 2 },
  { id: 'Alta_Hardware', priority: 'Alta', category: 'Hardware', hours: 4 },
  
  { id: 'Média_Infraestrutura', priority: 'Média', category: 'Infraestrutura', hours: 2 },
  { id: 'Média_Rede', priority: 'Média', category: 'Rede', hours: 4 },
  { id: 'Média_Permissões', priority: 'Média', category: 'Permissões', hours: 4 },
  { id: 'Média_Software', priority: 'Média', category: 'Software', hours: 8 },
  { id: 'Média_Hardware', priority: 'Média', category: 'Hardware', hours: 8 },
  
  { id: 'Baixa_Infraestrutura', priority: 'Baixa', category: 'Infraestrutura', hours: 4 },
  { id: 'Baixa_Rede', priority: 'Baixa', category: 'Rede', hours: 8 },
  { id: 'Baixa_Permissões', priority: 'Baixa', category: 'Permissões', hours: 12 },
  { id: 'Baixa_Software', priority: 'Baixa', category: 'Software', hours: 24 },
  { id: 'Baixa_Hardware', priority: 'Baixa', category: 'Hardware', hours: 24 },
];

export function calculateSla(ticket: Ticket, configs: SlaConfig[]): Ticket {
  const config = configs.find(c => c.priority === ticket.priority && c.category === ticket.category) 
    || { hours: 4 };

  const baseDateStr = ticket.createdAtIso || new Date().toISOString();
  const baseDate = new Date(baseDateStr);
  const deadlineDate = new Date(baseDate.getTime() + config.hours * 60 * 60 * 1000);

  let status: 'dentro_prazo' | 'em_risco' | 'estourado' = 'dentro_prazo';
  if (ticket.status === 'Resolvido') {
    status = 'dentro_prazo';
  } else {
    const now = new Date();
    const timeRemaining = deadlineDate.getTime() - now.getTime();
    if (timeRemaining <= 0) {
      status = 'estourado';
    } else if (timeRemaining < 30 * 60 * 1000) { // < 30 minutes remaining
      status = 'em_risco';
    }
  }

  return {
    ...ticket,
    createdAtIso: baseDateStr,
    slaDeadline: deadlineDate.toISOString(),
    slaStatus: status
  };
}

import { runWithLock } from './jobLock';

export function startSlaJob() {
  logger.info('⏰ Monitor de SLA Ativado (Verificações periódicas a cada 1 min para testes rápidos)');
  
  // Run an initial scan after 5 seconds to generate alerts on startup if any ticket is already breached
  setTimeout(() => {
    runWithLock('slaScan', 50, async () => {
      await scanAndTriggerSlaBreaches();
    });
  }, 5000);

  setInterval(() => {
    runWithLock('slaScan', 50, async () => {
      await scanAndTriggerSlaBreaches();
    });
  }, 60 * 1000); // check every 1 minute
}

async function scanAndTriggerSlaBreaches() {
  try {
    const tickets = await db.getTickets();
    const openTickets = tickets.filter(t => t.status !== 'Resolvido');
    
    for (const ticket of openTickets) {
      if (ticket.slaStatus === 'estourado') {
        const audits = await db.getAuditEvents(ticket.id);
        const alreadyBreached = audits.some(a => a.action === 'Estouro de SLA');
        
        if (!alreadyBreached) {
          await db.createAuditEvent({
            ticketId: ticket.id,
            userId: 'usr-system',
            userName: 'Sistema AcmeCorp (SLA)',
            userEmail: 'sistema@cbiops.com',
            action: 'Estouro de SLA',
            details: `O chamado ${ticket.id} "${ticket.title}" estourou o prazo limite de SLA às ${new Date(ticket.slaDeadline!).toLocaleString('pt-BR')}.`
          });
          logger.warn(`🚨 SLA estourado para o chamado ${ticket.id}! Evento registrado em audit_events.`);
          await sendSlaBreachAlert(ticket);
          await notifySlaBreach(ticket);
        }
      }
    }
  } catch (err) {
    logger.error({ err: err }, 'Erro ao processar varredura de SLA:');
  }
}
