import { logger } from '../lib/logger';
import { Ticket } from '../../src/types';

const TEAMS_WEBHOOK_URL = process.env.TEAMS_WEBHOOK_URL;

async function sendTeamsCard(title: string, themeColor: string, ticket: Ticket, text: string) {
  if (!TEAMS_WEBHOOK_URL) {
    logger.warn('⚠️ TEAMS_WEBHOOK_URL não configurado. Notificação do Teams ignorada.');
    return;
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const ticketUrl = `${appUrl}/tickets/${ticket.id}`;

  const payload = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    "themeColor": themeColor,
    "summary": title,
    "sections": [{
      "activityTitle": title,
      "activitySubtitle": `Ticket #${ticket.id}`,
      "text": text,
      "facts": [
        { "name": "Categoria", "value": ticket.category },
        { "name": "Prioridade", "value": ticket.priority },
        { "name": "Status", "value": ticket.status }
      ],
      "markdown": true
    }],
    "potentialAction": [{
      "@type": "OpenUri",
      "name": "Ver Ticket no Painel",
      "targets": [{ "os": "default", "uri": ticketUrl }]
    }]
  };

  try {
    const response = await fetch(TEAMS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      logger.error(`❌ Erro ao enviar notificação para o Teams: ${response.statusText}`);
    } else {
      logger.info(`✅ Notificação Teams enviada para o ticket ${ticket.id}`);
    }
  } catch (error) {
    logger.error({ err: error }, '❌ Erro na requisição para o webhook do Teams:');
  }
}

export async function notifyTicketAssigned(ticket: Ticket, assigneeEmail: string) {
  await sendTeamsCard(
    "🎫 Novo Ticket Atribuído",
    "0078D7", // Azul
    ticket,
    `Um novo ticket foi atribuído a **${assigneeEmail}**.\n\n**Título:** ${ticket.title}`
  );
}

export async function notifySlaBreach(ticket: Ticket) {
  await sendTeamsCard(
    "🚨 Estouro de SLA Detectado",
    "E81123", // Vermelho
    ticket,
    `O SLA para o ticket **${ticket.title}** acaba de estourar. Ação imediata é necessária!`
  );
}
