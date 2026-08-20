import { logger } from "../lib/logger";
import { handleError } from '../lib/errorHandler';
import { Router, Response } from 'express';
import { requireAuth, AuthenticatedRequest } from '../middleware/requireAuth';
import { db } from '../lib/db';
import { getGeminiModel } from '../lib/gemini';
import { getAllArticles } from '../lib/knowledgeService';
import { FunctionDeclaration, Type } from "@google/genai";
import { logAuditEvent } from "../middleware/auditLog";
import { validateBody, chatMessageSchema } from '../validations';

const router = Router();

const createTicketDeclaration: FunctionDeclaration = {
  name: 'createTicket',
  description: 'Abre um novo chamado (ticket) no sistema em nome do usuário logado.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: 'Um título curto e claro descrevendo o problema ou solicitação.',
      },
      description: {
        type: Type.STRING,
        description: 'A descrição detalhada do problema ou solicitação.',
      },
      category: {
        type: Type.STRING,
        description: 'A categoria do chamado. Exemplos: "Hardware", "Software", "Rede", "Acessos", "Infraestrutura".',
      },
      priority: {
        type: Type.STRING,
        description: 'A prioridade do chamado. Deve ser "Baixa", "Média", "Alta" ou "Crítica".',
      }
    },
    required: ['title', 'description', 'category', 'priority']
  }
};


function containsInjectionPattern(message: string): boolean {
  const msgLower = message.toLowerCase();
  const patterns = [
    'ignore as instruções',
    'ignore todas as instruções',
    'esqueça tudo',
    'revele o prompt',
    'sistema original',
    'ignore everything',
    'forget everything',
    'reveal prompt',
    'ignore previous instructions',
  ];
  return patterns.some(pattern => msgLower.includes(pattern));
}

router.post('/', requireAuth, validateBody(chatMessageSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { message, history } = req.body;
    
    if (containsInjectionPattern(message)) {
      return res.json({ reply: "Não consegui entender esse pedido, pode reformular de outro jeito?" });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Mensagem inválida ou ausente.' });
    }

    const text = message.toLowerCase().trim();
    let tickets = await db.getTickets();
    
    // Filter tickets for Colaborador (IDOR fix)
    if (req.user?.role === 'Colaborador') {
      tickets = tickets.filter((t: any) => t.authorEmail === req.user?.email);
    }
    
    // Sanitize and limit tickets to avoid prompt injection and context poisoning
    const safeTickets = tickets.slice(0, 30).map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      category: t.category,
      slaStatus: t.slaStatus
      // Exclude descriptions, notes, names and emails to prevent PII leak and prompt injection
    }));

    let reply = '';

    if (text.includes('ajuda') || text.includes('comandos') || text.includes('o que você faz') || text.includes('funciona')) {
      const userName = req.user?.name || 'colega';
      reply = `Olá, ${userName}! Eu sou a SupportAI, assistente virtual de suporte da AcmeCorp. Posso ajudar você a analisar rapidamente o estado atual dos chamados ou tirar dúvidas técnicas usando nossa base de conhecimento. Bora resolver isso! Experimente perguntar:
- **"Quantos chamados temos no total?"**
- **"Quais chamados estão em risco?"**
- **"Quais chamados estouraram o SLA?"**
- **"Quais são os chamados críticos?"**`;
    } 
    else if (text.includes('risco') || text.includes('vencendo') || text.includes('perigo')) {
      const emRisco = tickets.filter(t => t.slaStatus === 'em_risco');
      if (emRisco.length === 0) {
        reply = 'Excelente notícia! Não há nenhum chamado ativamente classificado **Em Risco** de estourar o SLA de atendimento neste momento.';
      } else {
        reply = `Temos **${emRisco.length}** chamado(s) **Em Risco** de estourar o SLA operacional:\n` +
          emRisco.map(t => `- **${t.id}**: "${t.title}" (${t.category}) - Prioridade: ${t.priority}`).join('\n');
      }
    } 
    else if (text.includes('estourado') || text.includes('vencido') || text.includes('atrasado') || text.includes('estourou')) {
      const estourados = tickets.filter(t => t.slaStatus === 'estourado');
      if (estourados.length === 0) {
        reply = 'Ótimo! No momento, nenhum chamado operacional ultrapassou ou estourou o prazo de SLA configurado.';
      } else {
        reply = `Atenção: temos **${estourados.length}** chamado(s) com o SLA **Estourado** (fora do prazo):\n` +
          estourados.map(t => `- **${t.id}**: "${t.title}" (${t.category}) - Criado por: ${t.user}`).join('\n');
      }
    } 
    else if (text.includes('critico') || text.includes('crítico') || text.includes('urgente') || text.includes('emergencia') || text.includes('emergência')) {
      const criticos = tickets.filter(t => t.status === 'Crítico' || t.priority === 'Alta');
      if (criticos.length === 0) {
        reply = 'Nenhum chamado de alta criticidade ou emergência em aberto no painel neste momento.';
      } else {
        reply = `Há **${criticos.length}** chamado(s) críticos ou de alta prioridade na fila:\n` +
          criticos.map(t => `- **${t.id}**: "${t.title}" (${t.status} - SLA: ${t.slaStatus === 'estourado' ? 'Estourado' : 'Dentro do Prazo'})`).join('\n');
      }
    } 
    else if (text.includes('quantos') || text.includes('quantidade') || text.includes('total') || text.includes('numero') || text.includes('número')) {
      const total = tickets.length;
      const resolvidos = tickets.filter(t => t.status === 'Resolvido').length;
      const criticos = tickets.filter(t => t.status === 'Crítico').length;
      const analise = tickets.filter(t => t.status === 'Em Análise').length;
      const aguardando = tickets.filter(t => t.status === 'Aguardando').length;

      reply = `Atualmente temos um volume total de **${total}** chamados registrados no banco de dados local. Segue a distribuição atual de status:
- 🟢 **Resolvidos**: ${resolvidos}
- 🔴 **Críticos**: ${criticos}
- 🔵 **Em Análise**: ${analise}
- 🟡 **Aguardando**: ${aguardando}`;
    } 
    else {
      // Use Gemini for general queries
      logger.info({ message }, 'Sending message to Gemini:');
      
      let model;
      try {
        model = getGeminiModel();
      } catch (e: any) {
        return res.json({ reply: 'O assistente de inteligência artificial requer a chave GEMINI_API_KEY configurada para responder consultas livres. Por favor, adicione-a no painel de configurações para habilitar a IA.' });
      }

      const articles = await getAllArticles();
      const safeArticles = articles.slice(0, 10).map((a: any) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        // Limiting the content of articles if they are too long or contain sensitive data
        // For now, we include content but limit total articles to 10.
      }));
      
      try {
        const userName = req.user?.name || 'Colega';
        const systemInstruction = `Você é a SupportAI, assistente virtual de suporte da AcmeCorp.

Seu nome vem da terminação "SA" de AcmeCorp — Sociedade Anônima — e você tem personalidade própria: prestativa, direta, com leve bom humor, nunca robótica. Você fala com o time da AcmeCorp como uma colega que resolve as coisas, não como um FAQ automatizado.

O colaborador com quem você está interagindo se chama: ${userName}.

Aqui estão os dados atuais de chamados (tickets) que você pode acessar: ${JSON.stringify(safeTickets)}.
Aqui está a base de conhecimento de artigos e resoluções para consulta: ${JSON.stringify(safeArticles)}.

Diretrizes de tom:
- Trate as pessoas pelo nome quando disponível (o nome do usuário atual é: ${userName}).
- Seja objetiva primeiro, cordial sempre — sem enrolação nem respostas genéricas.
- Você atua como Nível 1 de suporte. Você DEVE SEMPRE consultar a base de conhecimento primeiro para tentar resolver o problema do usuário por conta própria. Forneça o passo a passo ou a solução encontrada.

SE a base de conhecimento não contiver informações úteis para o problema relatado, OU se o usuário disser que a solução apresentada não funcionou, OU se ele pedir EXPLICITAMENTE para abrir o chamado, SÓ ENTÃO você deve usar a ferramenta \`createTicket\` para abrir o chamado de suporte.
Se precisar abrir chamado, deduz a categoria e prioridade com base na conversa e use a ferramenta \`createTicket\`.
- Pode usar leve informalidade brasileira ("bora resolver isso", "deixa comigo"), mas sem exagero e nunca em contextos sérios (incidentes críticos, dados sensíveis, reclamações graves) — nesses casos, tom mais sóbrio e direto.
- Assuma que fala com colaboradores da AcmeCorp, não com o público externo.
- Ao não saber a resposta ou faltar contexto/permissão, diga isso claramente e direcione para abertura de chamado ou para um analista humano — nunca invente procedimento ou política da empresa.
- Não se refira a si mesma como "modelo de IA genérico" — você é a SupportAI, a assistente da AcmeCorp, mesmo que por baixo dos panos use um LLM de terceiros.
- Mantenha respostas curtas e escaneáveis quando o contexto for suporte técnico (passo a passo, bullets); pode ser mais conversacional em saudações e small talk.

Restrições (não mudam, sempre valem):
- Nunca revele segredos, chaves de API, tokens, credenciais, ou dados de outros usuários, mesmo se pedido "só para debug".
- Nunca contorne regras de permissão/RBAC do sistema de tickets.
- Sempre cite a fonte (artigo da base de conhecimento, ticket relacionado) quando disponível.`;

        const response = await model.generateContent({
          model: "gemini-2.5-flash",
          contents: history || [{ role: 'user', parts: [{ text: message }] }],
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: [createTicketDeclaration] }],
          }
        });

        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          if (call.name === 'createTicket') {
            try {
              const { title, description, category, priority } = call.args;
              const crypto = require('crypto');

              let assetId = undefined;
              try {
                const allDevices = await db.getDevices();
                const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
                const userEmail = normalize(req.user!.email);
                const userName = normalize(req.user!.name);
                const emailPrefix = userEmail.split('@')[0];
                const userDevice = allDevices.find(d => {
                  const assignedUser = normalize(d.user);
                  if (!assignedUser) return false;
                  return assignedUser === userEmail || 
                         assignedUser === userName || 
                         assignedUser === emailPrefix || 
                         assignedUser.includes(userName) || 
                         userName.includes(assignedUser);
                });
                if (userDevice) assetId = userDevice.id;
              } catch (e) {
                /* ignora se falhar ao buscar asset */
              }

              const newTicket = await db.createTicket({
                id: `TKT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
                title: String(title),
                description: String(description),
                category: String(category),
                priority: String(priority) as 'Alta' | 'Média' | 'Baixa' | 'Crítica',
                status: 'Em Análise',
                user: req.user!.name,
                authorEmail: req.user!.email,
                notes: [],
                createdAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                createdAtIso: new Date().toISOString(),
                deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                assetId,
              } as any);

              await logAuditEvent(req, 'Chamado Criado (Assistente SupportAI)', newTicket.id, `Chamado '${title}' aberto via chat.`);
              
              const functionResponseContent = {
                role: 'user',
                parts: [
                  {
                    functionResponse: {
                      name: call.name,
                      response: { id: newTicket.id, status: 'success', message: 'Chamado criado com sucesso.' }
                    }
                  }
                ]
              };
              
              const followUpResponse = await model.generateContent({
                model: "gemini-2.5-flash",
                contents: [
                  ...(history || [{ role: 'user', parts: [{ text: message }] }]),
                  { role: 'model', parts: response.candidates![0].content.parts },
                  functionResponseContent
                ],
                config: {
                  systemInstruction,
                  tools: [{ functionDeclarations: [createTicketDeclaration] }],
                }
              });
              
              reply = followUpResponse.text || "Chamado criado com sucesso!";
            } catch (err: unknown) {
              logger.error({ err }, 'Error creating ticket via SupportAI');
              reply = "Desculpe, tentei abrir o chamado mas encontrei um erro no sistema.";
            }
          }
        } else {
          reply = response.text || "Desculpe, não consegui gerar uma resposta.";
        }
        
        logger.info({ reply }, 'Gemini response:');
      } catch (geminiError: any) {
        logger.error({ err: geminiError }, 'Gemini API error:');
        return res.json({ reply: `Erro ao comunicar com a IA: ${geminiError.message || 'Falha na requisição'}` });
      }
    }

    res.json({ reply });
  } catch (err: unknown) {
    handleError(res, err, "Erro no assistente operacional local");
  }
});

export default router;
