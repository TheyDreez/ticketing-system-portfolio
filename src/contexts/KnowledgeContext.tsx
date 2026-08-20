import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { KnowledgeArticle } from '../types';
import { useAuthContext } from './AuthContext';

export interface ExtendedKnowledgeArticle extends KnowledgeArticle {
  views: number;
  aiUsageCount: number;
  confidenceScore: number;
  lastUpdated: string;
}

interface KnowledgeFilters {
  search: string;
  category: string;
  status: string;
  tags: string[];
  author: string;
  difficulty: string;
  criticality: string;
}

interface KnowledgeContextType {
  articles: ExtendedKnowledgeArticle[];
  loadingArticles: boolean;
  fetchArticles: () => Promise<void>;
  createArticle: (article: Partial<ExtendedKnowledgeArticle>) => Promise<boolean>;
  addArticle: (article: Partial<ExtendedKnowledgeArticle>) => Promise<boolean>;
  updateArticle: (id: string, article: Partial<ExtendedKnowledgeArticle>) => Promise<boolean>;
  deleteArticle: (id: string) => Promise<boolean>;
  duplicateArticle: (id: string) => Promise<boolean>;
  archiveArticle: (id: string) => Promise<boolean>;
  restoreArticle: (id: string) => Promise<boolean>;
  incrementViewCount: (id: string) => Promise<void>;
  recordFeedback: (id: string, isHelpful: boolean) => Promise<void>;
  exportArticlesJSON: () => void;
  importArticlesJSON: (fileContent: string) => Promise<boolean>;
  
  filters: KnowledgeFilters;
  setFilters: React.Dispatch<React.SetStateAction<KnowledgeFilters>>;
  
  selectedArticle: ExtendedKnowledgeArticle | null;
  setSelectedArticle: (article: ExtendedKnowledgeArticle | null) => void;
  
  categories: string[];
  allTags: string[];
  analytics: {
    total: number;
    published: number;
    inReview: number;
    mostViewed: string;
    mostUsedAI: string;
    avgConfidence: number;
  };
}

const KnowledgeContext = createContext<KnowledgeContextType | undefined>(undefined);

export function KnowledgeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [articles, setArticles] = useState<ExtendedKnowledgeArticle[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ExtendedKnowledgeArticle | null>(null);
  
  const [filters, setFilters] = useState<KnowledgeFilters>({
    search: '',
    category: 'Todos',
    status: 'Todos',
    tags: [],
    author: 'Todos',
    difficulty: 'Todos',
    criticality: 'Todos',
  });

  const normalizeArticle = (raw: any): ExtendedKnowledgeArticle => ({
    id: raw.id || `kb-${Date.now()}`,
    title: raw.title || 'Sem título',
    category: raw.category || 'Geral',
    subcategory: raw.subcategory || '',
    tags: raw.tags || raw.keywords || [],
    keywords: raw.keywords || raw.tags || [],
    products: raw.products || [],
    systems: raw.systems || [],
    author: raw.author || raw.createdBy || 'system@cbiops.com',
    createdBy: raw.createdBy || raw.author || 'system@cbiops.com',
    status: raw.status || 'published',
    version: raw.version || '1.0.0',
    criticality: raw.criticality || 'Média',
    difficulty: raw.difficulty || 'Médio',
    content: raw.content || '',
    procedure: raw.procedure || '',
    checklist: raw.checklist || [],
    officialLinks: raw.officialLinks || raw.official_links || [],
    relatedArticleIds: raw.relatedArticleIds || raw.related_article_ids || [],
    views: raw.viewCount || raw.views || 0,
    viewCount: raw.viewCount || raw.views || 0,
    aiUsageCount: raw.useCount || raw.aiUsageCount || 0,
    useCount: raw.useCount || raw.aiUsageCount || 0,
    confidenceScore: raw.confidenceScore || raw.confidence || 95,
    confidence: raw.confidence || 95,
    createdAt: raw.createdAt || raw.created_at || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.updated_at || new Date().toISOString(),
    lastUpdated: raw.updatedAt || raw.lastUpdated || raw.updated_at || new Date().toISOString(),
    history: raw.history || [],
  });

  const fetchArticles = useCallback(async () => {
    setLoadingArticles(true);
    try {
      const res = await fetch('/api/knowledge/articles', { credentials: 'omit' });
      if (res.ok) {
        const data = await res.json();
        const articlesList = Array.isArray(data) ? data : (data.articles || []);
        setArticles(articlesList.map(normalizeArticle));
      }
    } catch (err) {
      console.warn('Erro ao buscar artigos do backend.', err);
    } finally {
      setLoadingArticles(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const createArticle = async (articleData: Partial<ExtendedKnowledgeArticle>): Promise<boolean> => {
    try {
      const res = await fetch('/api/knowledge/articles', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': user?.csrfToken || ''
        },
        body: JSON.stringify(articleData),
      });
      if (res.ok) {
        await fetchArticles();
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Erro ao criar artigo na API:', errData.error || res.statusText);
        return false;
      }
    } catch (e) {
      console.error('Erro ao criar artigo na API:', e);
      return false;
    }
  };

  const updateArticle = async (id: string, data: Partial<ExtendedKnowledgeArticle>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/knowledge/articles/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': user?.csrfToken || ''
        },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await fetchArticles();
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Erro ao atualizar artigo na API:', errData.error || res.statusText);
        return false;
      }
    } catch (e) {
      console.error('Erro ao atualizar artigo na API:', e);
      return false;
    }
  };

  const deleteArticle = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/knowledge/articles/${id}`, { 
        method: 'DELETE',
        headers: {
          'x-csrf-token': user?.csrfToken || ''
        }
      });
      if (res.ok) {
        setArticles(prev => prev.filter(a => a.id !== id));
        if (selectedArticle?.id === id) setSelectedArticle(null);
        return true;
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error('Erro ao deletar artigo na API:', errData.error || res.statusText);
        return false;
      }
    } catch (e) {
      console.error('Erro ao deletar artigo na API:', e);
      return false;
    }
  };

  const duplicateArticle = async (id: string): Promise<boolean> => {
    const target = articles.find(a => a.id === id);
    if (!target) return false;
    
    return createArticle({
      ...target,
      id: undefined,
      title: `${target.title} (Cópia)`,
      status: 'draft',
      views: 0,
      aiUsageCount: 0,
    });
  };

  const archiveArticle = async (id: string): Promise<boolean> => {
    return updateArticle(id, { status: 'archived' });
  };

  const restoreArticle = async (id: string): Promise<boolean> => {
    return updateArticle(id, { status: 'published' });
  };

  const exportArticlesJSON = () => {
    const jsonStr = JSON.stringify(articles, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-base-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importArticlesJSON = async (fileContent: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(fileContent);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        await createArticle(item);
      }
      await fetchArticles();
      return true;
    } catch (e) {
      console.error('Erro ao importar JSON:', e);
      return false;
    }
  };

  const incrementViewCount = async (id: string) => {
    setArticles(prev =>
      prev.map(a =>
        a.id === id
          ? { ...a, views: (a.views || 0) + 1, viewCount: (a.viewCount || 0) + 1 }
          : a
      )
    );
  };

  const recordFeedback = async (id: string, isHelpful: boolean) => {
    setArticles(prev =>
      prev.map(a =>
        a.id === id
          ? {
              ...a,
              helpfulCount: isHelpful ? (a.helpfulCount || 0) + 1 : a.helpfulCount,
              notHelpfulCount: !isHelpful ? (a.notHelpfulCount || 0) + 1 : a.notHelpfulCount,
            }
          : a
      )
    );
  };

  const categories = Array.from(new Set(articles.map(a => a.category))).filter(Boolean);
  const allTags = Array.from(new Set(articles.flatMap(a => a.tags || []))).filter(Boolean);

  const analytics = {
    total: articles.length,
    published: articles.filter(a => a.status === 'published').length,
    inReview: articles.filter(a => a.status === 'in_review' || a.status === 'draft').length,
    mostViewed: articles.slice().sort((a, b) => (b.views || 0) - (a.views || 0))[0]?.title || 'N/A',
    mostUsedAI: articles.slice().sort((a, b) => (b.aiUsageCount || 0) - (a.aiUsageCount || 0))[0]?.title || 'N/A',
    avgConfidence: articles.length ? Math.round(articles.reduce((acc, a) => acc + (a.confidenceScore || 95), 0) / articles.length) : 95
  };

  const value = {
    articles,
    loadingArticles,
    fetchArticles,
    createArticle,
    addArticle: createArticle,
    updateArticle,
    deleteArticle,
    duplicateArticle,
    archiveArticle,
    restoreArticle,
    incrementViewCount,
    recordFeedback,
    exportArticlesJSON,
    importArticlesJSON,
    filters,
    setFilters,
    selectedArticle,
    setSelectedArticle,
    categories,
    allTags,
    analytics,
  };

  return <KnowledgeContext.Provider value={value}>{children}</KnowledgeContext.Provider>;
}

export function useKnowledge() {
  const context = useContext(KnowledgeContext);
  if (context === undefined) {
    throw new Error('useKnowledge must be used within a KnowledgeProvider');
  }
  return context;
}
