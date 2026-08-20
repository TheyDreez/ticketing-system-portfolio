import { KnowledgeArticle } from "../../src/types";

export interface ConversationMemoryContext {
  userName?: string;
  department?: string;
  equipment?: string;
  operatingSystem?: string;
  software?: string;
  errorMessage?: string;
  symptoms?: string[];
  attemptedSolutions?: string[];
  consultedArticles?: string[];
}

export class PromptEngineering {
  private personaPrompt = `
Você é o Analista Sênior de Service Desk Enterprise da AcmeCorp Ops Center.
Sua postura é a de um especialista em suporte corporativo (Tier 2/3), altamente capacitado em ecossistemas Microsoft 365, Azure, Entra ID, Intune, Defender, Redes e Segurança.

CARACTERÍSTICAS DA SUA ATUAÇÃO:
- Transmita autoridade técnica, empatia e clareza absoluta.
- Investigue antes de responder. Formule hipóteses fundamentadas e colete evidências antes de concluir.
- Lembre-se de todas as informações já fornecidas no histórico da conversa (nome, setor, SO, erros). NUNCA pergunte novamente algo que o usuário já informou.
- Ao apresentar diagnósticos ou soluções, utilize formatação estruturada com títulos, passos numerados, trechos de código/comandos (PowerShell/CMD) quando aplicável e checklists.
- Se o problema for resolvido com um artigo da Base de Conhecimento, explique com suas próprias palavras sintetizando o procedimento.
- Se o problema necessitar de intervenção presencial ou acesso privilegiado, prepare e abra o chamado automaticamente gerando o resumo técnico e checklist.
`;

  private rulesPrompt = `
REGRAS CRÍTICAS DE ENGENHARIA DE PROMPT & SEGURANÇA:
1. Sintetize o conteúdo dos artigos da Base de Conhecimento. Nunca apenas copie o texto bruto.
2. Não aja como um chatbot genérico ou modelo de linguagem comum. Aja como um Engenheiro/Analista Sênior de Suporte.
3. Respeite os princípios do ITIL v4: Foco no valor, Começar de onde você está, Progredir iterativamente com feedback.
4. Mantenha os padrões de segurança NIST / CIS Benchmarks: nunca solicite ou aceite senhas de usuários em texto simples.
5. Quando identificar dados faltantes para diagnóstico, faça perguntas objetivas (máximo 2 por mensagem) direcionadas ao sintoma.
`;

  public buildSystemPrompt(
    phase: string,
    memory: ConversationMemoryContext,
    articles: KnowledgeArticle[],
    classification?: any
  ): string {
    let prompt = this.personaPrompt + "\n" + this.rulesPrompt + "\n";

    prompt += `### MEMÓRIA DA CONVERSA (DADOS JÁ COLETADOS):\n`;
    if (memory.userName) prompt += `- **Usuário**: ${memory.userName}\n`;
    if (memory.department) prompt += `- **Setor/Departamento**: ${memory.department}\n`;
    if (memory.equipment) prompt += `- **Equipamento/Ativo**: ${memory.equipment}\n`;
    if (memory.operatingSystem) prompt += `- **Sistema Operacional**: ${memory.operatingSystem}\n`;
    if (memory.errorMessage) prompt += `- **Código/Mensagem de Erro**: ${memory.errorMessage}\n`;
    if (memory.symptoms && memory.symptoms.length > 0) prompt += `- **Sintomas Identificados**: ${memory.symptoms.join(', ')}\n`;
    if (memory.attemptedSolutions && memory.attemptedSolutions.length > 0) prompt += `- **Tentativas Anteriores**: ${memory.attemptedSolutions.join(', ')}\n`;
    prompt += `- **Fase de Investigação Atual**: ${phase.toUpperCase()}\n\n`;

    if (articles && articles.length > 0) {
      prompt += `### BASE DE CONHECIMENTO CORPORATIVA CONSULTADA (RAG HÍBRIDO):\n`;
      articles.forEach((art, idx) => {
        prompt += `--- ARTIGO ${idx + 1} [ID: ${art.id}] ---\n`;
        prompt += `Título: ${art.title}\n`;
        prompt += `Categoria: ${art.category} / ${art.subcategory || ''}\n`;
        if (art.procedure) prompt += `Procedimento Oficial: ${art.procedure}\n`;
        prompt += `Conteúdo: ${art.content}\n\n`;
      });
    } else {
      prompt += `### BASE DE CONHECIMENTO: Nenhum artigo diretamente aplicável encontrado para a busca exata. Proceda com a investigação analítica.\n\n`;
    }

    if (classification) {
      prompt += `### CLASSIFICAÇÃO AUTOMÁTICA DO CHAMADO:\n${JSON.stringify(classification, null, 2)}\n\n`;
    }

    return prompt;
  }

  public buildUserPrompt(message: string, context?: string): string {
    return `SOLICITAÇÃO DO COLABORADOR: ${message}${context ? `\n\nCONTEXTO DO SISTEMA: ${context}` : ''}`;
  }
}

export const promptEngineering = new PromptEngineering();
