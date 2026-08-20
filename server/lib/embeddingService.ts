import { logger } from '../lib/logger';
import { GoogleGenAI } from "@google/genai";

// In-memory cache for embeddings (Key: trimmed, lowercase text, Value: number[])
const embeddingCache = new Map<string, number[]>();

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      logger.error("❌ [EmbeddingService] GEMINI_API_KEY não configurada no ambiente. Integração de embeddings falhará.");
      return null;
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

/**
 * Generates an embedding vector of 768 dimensions for the given text.
 * Caches the results to optimize performance and prevent duplicate API calls.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  let trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Texto vazio para geração de embedding.");
  }

  // Sanitize and limit length to prevent payload abuse/billing attacks
  if (trimmedText.length > 8000) {
    trimmedText = trimmedText.substring(0, 8000);
  }

  const cacheKey = trimmedText.toLowerCase();
  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const ai = getGeminiClient();
  if (!ai) {
    throw new Error("API de Embeddings não configurada (GEMINI_API_KEY). Não é possível buscar resultados baseados em IA.");
  }

  try {
    const response = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: trimmedText,
    });
    const resAny = response as any;
    
    // Suporte para o retorno do SDK novo @google/genai
    let vector: number[] | undefined;
    if (resAny.embeddings && resAny.embeddings.length > 0 && resAny.embeddings[0].values) {
      vector = resAny.embeddings[0].values;
    } else if (resAny.embedding?.values) {
      vector = resAny.embedding.values;
    }

    if (vector) {
      embeddingCache.set(cacheKey, vector);
      return vector;
    }

    throw new Error("Formato de resposta de embedding inválido.");
  } catch (err: unknown) {
    logger.error({ err: err }, "❌ [EmbeddingService] Erro ao gerar embedding corporativo:");
    throw new Error(`Erro na API de Embedding: ${(err instanceof Error ? err.message : String(err))}`);
  }
}
