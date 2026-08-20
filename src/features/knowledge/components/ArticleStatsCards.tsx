import React from 'react';
import { FileText, CheckCircle2, TrendingUp } from 'lucide-react';

export function ArticleStatsCards({ analytics }: { analytics: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Total Articles */}
      <div className="surface-card p-6 flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <FileText className="w-16 h-16 text-brand" />
        </div>
        <h3 className="font-data text-xs uppercase tracking-widest text-text-muted mb-2">Total de Artigos</h3>
        <div className="flex items-end gap-3 mt-auto">
          <span className="text-4xl font-display font-bold text-text-primary">{analytics?.total || 0}</span>
          <span className="text-xs text-brand font-semibold mb-1">Base Ativa</span>
        </div>
      </div>
      {/* Published */}
      <div className="surface-card p-6 flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <CheckCircle2 className="w-16 h-16 text-success" />
        </div>
        <h3 className="font-data text-xs uppercase tracking-widest text-text-muted mb-2">Publicados</h3>
        <div className="flex items-end gap-3 mt-auto">
          <span className="text-4xl font-display font-bold text-text-primary">{analytics?.published || 0}</span>
          <span className="text-xs text-success font-semibold mb-1">Visíveis para IA</span>
        </div>
      </div>
      {/* Avg Confidence */}
      <div className="surface-card p-6 flex flex-col relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <TrendingUp className="w-16 h-16 text-accent" />
        </div>
        <h3 className="font-data text-xs uppercase tracking-widest text-text-muted mb-2">Confiança Média da IA</h3>
        <div className="flex items-end gap-3 mt-auto">
          <span className="text-4xl font-display font-bold text-text-primary">{analytics?.avgConfidence || 0}%</span>
          <span className="text-xs text-accent font-semibold mb-1">Precisão no RAG</span>
        </div>
      </div>
    </div>
  );
}
