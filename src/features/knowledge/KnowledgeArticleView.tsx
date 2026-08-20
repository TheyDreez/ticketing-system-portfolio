import React, { useEffect, useState } from 'react';
import { ArrowLeft, Edit3, ThumbsUp, ThumbsDown, Eye, CheckSquare, BookOpen, Clock, Tag, Share2, Layers } from 'lucide-react';
import { useKnowledge } from '../../contexts/KnowledgeContext';
import { navigate } from '../../lib/router';
import { KnowledgeArticle } from '../../types';

interface KnowledgeArticleViewProps {
  articleId: string;
}

export const KnowledgeArticleView: React.FC<KnowledgeArticleViewProps> = ({ articleId }) => {
  const { articles, recordFeedback, incrementViewCount } = useKnowledge();
  const [copied, setCopied] = useState(false);

  const article = articles.find((a) => a.id === articleId);

  useEffect(() => {
    if (articleId) {
      incrementViewCount(articleId);
    }
  }, [articleId]);

  if (!article) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 p-8 flex flex-col items-center justify-center">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-8 max-w-md text-center space-y-4">
          <BookOpen className="w-12 h-12 text-slate-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Artigo não encontrado</h2>
          <p className="text-sm text-slate-400">
            O artigo solicitado não existe ou foi removido.
          </p>
          <button
            onClick={() => navigate('#/base-conhecimento')}
            className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-5 py-2 rounded-xl transition-colors text-sm"
          >
            Voltar para a Base de Conhecimento
          </button>
        </div>
      </div>
    );
  }

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <button
            onClick={() => navigate('#/base-conhecimento')}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para a Base</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleShare}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-xs text-slate-300 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{copied ? 'Link Copiado!' : 'Compartilhar'}</span>
            </button>

            <button
              onClick={() => navigate(`#/base-conhecimento/editar/${article.id}`)}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-600 text-xs font-medium text-white transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Artigo</span>
            </button>
          </div>
        </div>

        {/* Main Article Content */}
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 space-y-6 backdrop-blur-sm">
          {/* Article Title & Metadata */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 px-2.5 py-1 rounded-md font-medium">
                {article.category}
              </span>
              {article.subcategory && (
                <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-md">
                  {article.subcategory}
                </span>
              )}
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> v{article.version}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {article.views || article.viewCount || 0} visualizações
              </span>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
              {article.title}
            </h1>
          </div>

          {/* Description / Content */}
          <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Visão Geral & Solução
            </h3>
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
              {article.content}
            </div>
          </div>

          {/* Step-by-Step Procedure if available */}
          {article.procedure && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Procedimento Passo a Passo
              </h3>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-sm leading-relaxed whitespace-pre-wrap font-mono text-slate-200">
                {article.procedure}
              </div>
            </div>
          )}

          {/* Checklist if available */}
          {article.checklist && article.checklist.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Checklist de Validação
              </h3>
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
                {article.checklist.map((item, idx) => (
                  <label key={idx} className="flex items-center space-x-3 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" className="rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500" />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Tags & Keywords */}
          {((article.keywords && article.keywords.length > 0) || (article.tags && article.tags.length > 0)) && (
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-slate-500" />
              {[...(article.keywords || []), ...(article.tags || [])].map((term, idx) => (
                <span key={idx} className="text-xs bg-slate-800 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700">
                  #{term}
                </span>
              ))}
            </div>
          )}

          {/* Useful Feedback Section */}
          <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Este artigo foi útil para você?</span>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => recordFeedback(article.id, true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
              >
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sim ({article.helpfulCount || 0})</span>
              </button>
              <button
                onClick={() => recordFeedback(article.id, false)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
              >
                <ThumbsDown className="w-3.5 h-3.5 text-rose-400" />
                <span>Não ({article.notHelpfulCount || 0})</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
