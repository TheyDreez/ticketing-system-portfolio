import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { parseCookie } from 'cookie';
import jwt from 'jsonwebtoken';
import { canAccessTicket } from './authorization';
import { verifySession } from '../middleware/requireAuth';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : [],
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const cookiesStr = socket.request.headers.cookie;
      if (!cookiesStr) {
        return next(new Error('Authentication error: No cookies'));
      }
      const cookies = parseCookie(cookiesStr);
      const token = cookies.cbi_ops_session;
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }
      
      const user = await verifySession(token);
      (socket as any).user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid or revoked token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
    });
  });

  return io;
};

export const emitEvent = (eventName: string, data: any) => {
  if (io) {
    const isTicketEvent = eventName.startsWith('ticket_');
    const ticket = data.ticket || data; // if payload is the ticket itself
    const sockets = io.sockets.sockets;
    sockets.forEach((socket: any) => {
      if (isTicketEvent && ticket && !canAccessTicket(socket.user, ticket)) {
        return; // Don't emit ticket events to this user if they don't have access
      }
      socket.emit(eventName, data);
    });
  }
};
