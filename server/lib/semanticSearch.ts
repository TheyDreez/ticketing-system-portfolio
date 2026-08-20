import { logger } from '../lib/logger';
import { KnowledgeArticle } from "../../src/types";
import { getEmbedding } from "./embeddingService";
import { getAllArticles } from "./knowledgeService";

export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SemanticSearchResult {
  article: KnowledgeArticle;
  similarity: number;
  matchScore?: number;
  matchType?: 'vector' | 'keyword' | 'hybrid';
}

const CONCEPT_EXPANSION_MAP: Record<string, string[]> = {
  'conecta': ['wifi', 'vpn', 'dns', 'dhcp', 'ethernet', 'proxy', 'firewall', 'intune', 'defender', 'windows', 'ipconfig', 'rede'],
  'conexao': ['wifi', 'vpn', 'dns', 'dhcp', 'ethernet', 'proxy', 'firewall', 'intune', 'defender', 'windows', 'ipconfig', 'rede'],
  'internet': ['wifi', 'vpn', 'dns', 'dhcp', 'ethernet', 'proxy', 'firewall', 'gateway', 'rede'],
  'notebook': ['windows', 'hardware', 'bateria', 'driver', 'wifi', 'bitlocker', 'intune', 'dispositivo'],
  'computador': ['windows', 'hardware', 'driver', 'sfc', 'dism', 'disco', 'memoria'],
  'email': ['outlook', 'exchange', 'autodiscover', 'm365', 'ost', 'scanpst', 'perfil', 'smtp'],
  'e-mail': ['outlook', 'exchange', 'autodiscover', 'm365', 'ost', 'scanpst', 'perfil', 'smtp'],
  'outlook': ['exchange', 'autodiscover', 'm365', 'ost', 'scanpst', 'perfil', 'modo cache'],
  'senha': ['sspr', 'entra', 'mfa', 'active directory', 'ad', 'autenticacao', 'reset', 'password'],
  'esqueceu': ['sspr', 'entra', 'mfa', 'active directory', 'ad', 'reset', 'senha'],
  'bloqueado': ['sspr', 'entra', 'mfa', 'active directory', 'ad', 'lockout', 'senha'],
  'mfa': ['authenticator', 'totp', 'securityinfo', 'entra id', '2fa', 'token', 'sms'],
  'authenticator': ['mfa', 'totp', 'securityinfo', 'entra id', '2fa', 'notificacao'],
  'teams': ['m365', 'reuniao', 'cache', 'chamada', 'video', 'microfone', 'camera'],
  'reuniao': ['teams', 'm365', 'audio', 'video'],
  'tela azul': ['bsod', 'sfc', 'dism', 'driver', 'memoria', 'dump', 'minidump'],
  'bsod': ['sfc', 'dism', 'driver', 'memoria', 'dump', 'minidump', 'crash'],
  'impressora': ['spooler', 'driver', 'ip', 'queue', 'impressao', 'print'],
  'imprimir': ['spooler', 'driver', 'ip', 'queue', 'impressao', 'print'],
  'vpn': ['cisco', 'anyconnect', 'tunel', 'home office', 'mtu', 'rotas'],
  'bitlocker': ['tpm', 'chave de recuperacao', 'entra id', 'azure', 'criptografia'],
  'defender': ['antivirus', 'endpoint', 'quarentena', 'rtp', 'intune', 'ameaca'],
  'intune': ['enrollment', 'compliance', 'mdm', 'company portal', 'portal da empresa'],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2);
}

function calculateKeywordScore(queryTokens: string[], expandedTokens: string[], article: KnowledgeArticle): number {
  const titleTokens = tokenize(article.title);
  const keywordTokens = (article.keywords || []).flatMap(tokenize);
  const tagTokens = (article.tags || []).flatMap(tokenize);
  const productTokens = (article.products || []).flatMap(tokenize);
  const systemTokens = (article.systems || []).flatMap(tokenize);
  const procedureTokens = article.procedure ? tokenize(article.procedure) : [];
  const contentTokens = tokenize(article.content);

  let score = 0;

  for (const token of queryTokens) {
    if (titleTokens.includes(token)) score += 3.5;
    if (tagTokens.includes(token)) score += 3.0;
    if (keywordTokens.includes(token)) score += 2.5;
    if (productTokens.includes(token) || systemTokens.includes(token)) score += 2.0;
    if (procedureTokens.includes(token)) score += 1.5;
    if (contentTokens.includes(token)) score += 1.0;
  }

  for (const expToken of expandedTokens) {
    if (titleTokens.includes(expToken)) score += 2.0;
    if (tagTokens.includes(expToken) || keywordTokens.includes(expToken)) score += 1.5;
    if (productTokens.includes(expToken) || systemTokens.includes(expToken)) score += 1.2;
    if (contentTokens.includes(expToken)) score += 0.5;
  }

  return score;
}

export async function searchSemanticKnowledge(
  query: string,
  limit: number = 5,
  minThreshold: number = 0.35
): Promise<SemanticSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return [];
  }

  try {
    const articles = await getAllArticles();
    if (articles.length === 0) {
      return [];
    }

    let queryEmbedding: number[] | null = null;
    try {
      queryEmbedding = await getEmbedding(trimmed);
    } catch (e) {
      logger.warn(`🔍 [SemanticSearch] Vector embedding falhou. Usando motor léxico com expansão de conceitos.`);
    }

    const queryTokens = tokenize(trimmed);
    const expandedTokens: string[] = [];

    for (const qToken of queryTokens) {
      if (CONCEPT_EXPANSION_MAP[qToken]) {
        expandedTokens.push(...CONCEPT_EXPANSION_MAP[qToken]);
      }
    }

    const scoredResults: SemanticSearchResult[] = [];

    for (const article of articles) {
      let vectorSim = 0;
      if (queryEmbedding && article.embedding && article.embedding.length > 0) {
        vectorSim = calculateCosineSimilarity(queryEmbedding, article.embedding);
      }

      const keywordRawScore = calculateKeywordScore(queryTokens, expandedTokens, article);
      const normalizedKeywordScore = Math.min(keywordRawScore / 10, 1.0);

      let finalScore = 0;
      let matchType: 'vector' | 'keyword' | 'hybrid' = 'keyword';

      if (vectorSim > 0) {
        finalScore = (vectorSim * 0.6) + (normalizedKeywordScore * 0.4);
        matchType = 'hybrid';
      } else {
        finalScore = normalizedKeywordScore;
        matchType = 'keyword';
      }

      if (finalScore >= minThreshold) {
        scoredResults.push({
          article,
          similarity: Number(finalScore.toFixed(4)),
          matchScore: Number(finalScore.toFixed(4)),
          matchType
        });
      }
    }

    scoredResults.sort((a, b) => b.similarity - a.similarity);

    const topResults = scoredResults.slice(0, limit);
    logger.info(`🔍 [SemanticSearch] Busca híbrida retornou ${topResults.length} documentos corporativos (query: "${trimmed}").`);
    return topResults;

  } catch (err) {
    logger.error({ err }, "❌ [SemanticSearch] Erro fatal no motor de busca híbrido:");
    return [];
  }
}
