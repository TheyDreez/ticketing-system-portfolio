import { z, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Reusable middleware for body validation
export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: 'Dados inválidos',
          details: err.issues
        });
      }
      next(err);
    }
  };
};

export const ticketCreateSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  category: z.string().min(1, 'Categoria é obrigatória'),
  authorEmail: z.string().email('Email do autor inválido'),
  department: z.string().optional(),
  priority: z.enum(['Baixa', 'Média', 'Alta']),
  description: z.string().min(1, 'Descrição é obrigatória'),
});

export const ticketUpdateSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['Crítico', 'Aguardando', 'Em Análise', 'Resolvido']).optional(),
  priority: z.enum(['Baixa', 'Média', 'Alta']).optional(),
  description: z.string().optional(),
  assignedToEmail: z.string().optional(),
  deadline: z.string().optional(),
  notes: z.array(z.string()).optional(),
}).strict(); // Prevents mass assignment

export const ticketCommentSchema = z.object({
  content: z.string().min(1, 'Conteúdo do comentário é obrigatório')
});

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha é obrigatória')
});

export const userCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['Colaborador', 'Agente N1', 'Agente N2', 'Coordenador', 'Administrador']),
  department: z.string().optional()
});

export const userUpdateSchema = z.object({
  name: z.string().optional(),
  role: z.enum(['Colaborador', 'Agente N1', 'Agente N2', 'Coordenador', 'Administrador']).optional(),
  department: z.string().optional(),
  forcePasswordChange: z.boolean().optional(),
}).strict(); // strict to prevent editing email or password directly through this schema

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Mensagem não pode ser vazia').max(1000, 'Mensagem muito longa, limite de 1000 caracteres'),
  history: z.array(z.any()).optional(),
});

export const slaConfigUpdateSchema = z.object({
  response_time_hours: z.number().min(0).optional(),
  resolution_time_hours: z.number().min(0).optional(),
  active: z.boolean().optional(),
}).strict();

export type TicketCreatePayload = z.infer<typeof ticketCreateSchema>;
export type TicketUpdatePayload = z.infer<typeof ticketUpdateSchema>;
export type TicketCommentPayload = z.infer<typeof ticketCommentSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;
export type UserCreatePayload = z.infer<typeof userCreateSchema>;
export type UserUpdatePayload = z.infer<typeof userUpdateSchema>;
export type ChatMessagePayload = z.infer<typeof chatMessageSchema>;
export type SlaConfigUpdatePayload = z.infer<typeof slaConfigUpdateSchema>;
