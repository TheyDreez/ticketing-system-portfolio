import { logger } from "../lib/logger";
import express, { Response } from "express";
import { requireAuth, requireRole, AuthenticatedRequest } from "../middleware/requireAuth";
import { handleError } from "../lib/errorHandler";
import { 
  getAllArticles, 
  createKnowledgeArticle, 
  updateKnowledgeArticle,
  deleteKnowledgeArticle,
  getKnowledgeAnalytics 
} from "../lib/knowledgeService";
import { logAuditEvent } from "../middleware/auditLog";

const router = express.Router();

// GET /api/knowledge/articles - Get all articles
router.get("/articles", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const list = await getAllArticles();
    res.json(list);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao carregar base de conhecimento");
  }
});

// POST /api/knowledge/articles - Add a new solution to the knowledge base (Continuous Learning)
router.post("/articles", requireAuth, requireRole(['Administrador', 'Suporte']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, category, keywords, content, confidence, source } = req.body;
    if (!title || !category || !content) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes: title, category e content." });
    }

    const createdBy = req.user?.email || "usr-anon";
    const userName = req.user?.name || "Colaborador";

    const article = await createKnowledgeArticle({
      title,
      category,
      keywords: Array.isArray(keywords) ? keywords : [keywords].filter(Boolean),
      content,
      createdBy,
      source: source || "ticket_resolution",
      version: "1.0.0",
      confidence: typeof confidence === "number" ? confidence : 95,
    });

    // Log this action to Audit Events
    await logAuditEvent(
      req,
      "Knowledge Base Extended",
      null,
      `Novo artigo de conhecimento adicionado: "${title}" (${category}). Fonte: ${source || "Resolução de Ticket"}`
    );

    res.status(201).json(article);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao criar artigo de conhecimento");
  }
});

// PUT /api/knowledge/articles/:id - Update an existing article
router.put("/articles/:id", requireAuth, requireRole(['Administrador', 'Suporte']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    await updateKnowledgeArticle(id, updates);

    await logAuditEvent(
      req,
      "Knowledge Article Updated",
      null,
      `Artigo de conhecimento alterado: "${updates.title || id}"`
    );

    res.json({ success: true, id });
  } catch (err: unknown) {
    handleError(res, err, "Erro ao atualizar artigo de conhecimento");
  }
});

// DELETE /api/knowledge/articles/:id - Delete an article
router.delete("/articles/:id", requireAuth, requireRole(['Administrador', 'Suporte']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    await deleteKnowledgeArticle(id);

    await logAuditEvent(
      req,
      "Knowledge Article Deleted",
      null,
      `Artigo de conhecimento excluído: ID ${id}`
    );

    res.json({ success: true, id });
  } catch (err: unknown) {
    handleError(res, err, "Erro ao excluir artigo de conhecimento");
  }
});

// GET /api/knowledge/analytics - Get metrics and reuse statistics for Knowledge Base
router.get("/analytics", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const analytics = await getKnowledgeAnalytics();
    res.json(analytics);
  } catch (err: unknown) {
    handleError(res, err, "Erro ao calcular analytics da base de conhecimento");
  }
});

export default router;
