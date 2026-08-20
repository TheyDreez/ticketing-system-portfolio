import { Response } from 'express';
import { canAccessTicket } from './authorization';
import { verifySession } from '../middleware/requireAuth';
import { parseCookie } from 'cookie';

interface SseClient {
  res: Response;
  user: any;
  req?: any; // Hold req strictly to grab cookie to verify later
}

// Store all active SSE connections
let clients: SseClient[] = [];

// Validação periódica de Tokens nas Conexões Vivas (Impede Bypass em Streams)
setInterval(async () => {
  for (const client of clients) {
    try {
      if (!client.req || !client.req.headers.cookie) {
        client.res.end();
        continue;
      }
      const cookies = parseCookie(client.req.headers.cookie);
      const token = cookies.cbi_ops_session;
      if (!token) {
        client.res.end();
        continue;
      }
      // Validação estrita do token via função unificada. Se revogado ou conta desativada, desliga a stream.
      await verifySession(token); 
    } catch (err) {
      // Token é inválido ou a conta foi revogada -> Matar a stream
      client.res.end();
    }
  }
}, 60000); // Check all streams once a minute

// Broadcast an event to all connected clients
export function broadcastTicketEvent(eventData: any) {
  const data = `data: ${JSON.stringify(eventData)}\n\n`;
  const isTicketEvent = eventData.type && eventData.type.startsWith('ticket_');
  const ticket = eventData.ticket || eventData.data; // Usually payload has .ticket or .data
  
  clients.forEach(client => {
    try {
      // Avoid leaking tickets to users who shouldn't see them
      if (isTicketEvent && ticket && !canAccessTicket(client.user, ticket)) {
        return;
      }
      client.res.write(data);
    } catch (e) {
      // Ignore write errors, they will be cleaned up on close
    }
  });
}

// Add a new client
export function addSseClient(req: any, res: Response, user: any) {
  const client: SseClient = { res, user, req };
  clients.push(client);
  
  res.on('close', () => {
    clients = clients.filter(c => c.res !== res);
  });
}
