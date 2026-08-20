// AVISO: Script manual de utilidade/debug. Não deve ser importado ou executado pelo servidor em produção.


import { z } from 'zod';
const createTicketSchema = z.object({
  title: z.string().min(3, 'Título deve conter ao menos 3 caracteres'),
  category: z.string(),
  user: z.string().optional(),
  status: z.enum(['Crítico', 'Aguardando', 'Em Análise', 'Resolvido']),
  deadline: z.string(),
  priority: z.enum(['Alta', 'Média', 'Baixa']),
  description: z.string().min(5, 'A descrição deve conter detalhes do problema'),
  createdAt: z.string(),
  notes: z.array(z.string()).default([])
});

const res = createTicketSchema.safeParse({
      id: '#12345',
      title: 'Test',
      category: 'Rede',
      user: 'User',
      status: 'Aguardando',
      deadline: '4h',
      priority: 'Média',
      description: 'Desc',
      createdAt: '10:00',
      notes: []
});
console.log(res.success ? 'Success' : JSON.stringify(res.error.issues, null, 2));

