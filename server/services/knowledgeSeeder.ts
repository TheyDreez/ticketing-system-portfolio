import { getAllArticles, createKnowledgeArticle } from '../lib/knowledgeService';
import { knowledgeArticles } from '../data/knowledge-articles';
import { logger } from '../lib/logger';

export async function seedKnowledgeBase() {
  try {
    const existing = await getAllArticles();
    if (existing.length === 0 && knowledgeArticles && knowledgeArticles.length > 0) {
      logger.info('Seeding initial enterprise knowledge articles...');
      for (const article of knowledgeArticles) {
        await createKnowledgeArticle({
          title: article.title,
          category: article.category,
          subcategory: article.subcategory,
          keywords: article.keywords || [],
          content: article.content,
          procedure: article.procedure,
          checklist: article.checklist,
          createdBy: (article as any).createdBy || article.author || 'system@cbiops.com',
          version: article.version || '1.0.0',
          criticality: article.criticality || 'Média',
          difficulty: article.difficulty || 'Médio',
        } as any);
      }
      logger.info(`Successfully seeded ${knowledgeArticles.length} initial knowledge articles.`);
    } else {
      logger.info(`Knowledge base already populated (${existing.length} articles). Skipping seed.`);
    }
  } catch (err: any) {
    logger.error({ err }, 'Failed to seed knowledge base');
  }
}
