import { logger } from '../lib/logger';
import { PreventionResponse } from "../../src/types";
import { buildRAGContextAndSolve } from "./contextBuilder";

// In-memory cache for full prevention results (Key: trimmed, lowercase query text, Value: PreventionResponse)
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const preventionCache = new Map<string, { data: PreventionResponse, timestamp: number }>();

/**
 * Service to consult the RAG-enabled Context Builder for intelligent, real-time ticket prevention suggestions.
 * Integrates local enterprise knowledge articles first, with fallback to general LLM reasoning.
 */
export async function getSmartSolutions(description: string, title: string = ""): Promise<PreventionResponse> {
  const trimmed = description.trim();
  if (trimmed.length < 5) {
    return { solutions: [] };
  }

  const cacheKey = `${title.toLowerCase().trim()}:${trimmed.toLowerCase()}`;
  if (preventionCache.has(cacheKey)) {
    const cached = preventionCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      logger.info("⚡ [Smart Prevention Cache] Retornando sugestões RAG cacheadas.");
      return cached.data;
    } else {
      preventionCache.delete(cacheKey); // Expira registro antigo
    }
  }

  try {
    logger.info(`🤖 [Smart Prevention API] Executando pipeline RAG para: "${trimmed.substring(0, 60)}..."`);
    
    const result = await buildRAGContextAndSolve(trimmed, title);

    if (preventionCache.size >= MAX_CACHE_SIZE) {
      const firstKey = preventionCache.keys().next().value;
      if (firstKey) preventionCache.delete(firstKey);
    }
    preventionCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return result;
  } catch (error) {
    logger.error({ err: error }, "❌ Erro ao consultar o RAG Pipeline no Smart Ticket Prevention:");
    // Graceful error handling (hide card silently as requested)
    return { solutions: [] };
  }
}
