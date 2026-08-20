import React, { useRef } from 'react';
import { useKnowledge } from '../../contexts/KnowledgeContext';
import { navigate } from '../../lib/router';
import { ArticleStatsCards } from './components/ArticleStatsCards';
import { ArticleFilters } from './components/ArticleFilters';
import { ArticleStatusBadge } from './components/ArticleStatusBadge';
import { Plus, Download, Upload, Edit, Eye, Copy, Trash2, Archive, Bot, RotateCcw, ChevronLeft } from 'lucide-react';

export function KnowledgeAdminTab() {
  const { 
    articles, 
    analytics, 
    filters, 
    setFilters, 
    categories, 
    allTags,
    deleteArticle,
    duplicateArticle,
    archiveArticle,
    restoreArticle,
    exportArticlesJSON,
    importArticlesJSON,
  } = useKnowledge();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredArticles = articles.filter(a => {
    const searchLower = (filters.search || '').toLowerCase();
    const matchSearch = !searchLower || 
                        a.title.toLowerCase().includes(searchLower) || 
                        (a.content || '').toLowerCase().includes(searchLower) ||
                        (a.keywords || []).some(k => k.toLowerCase().includes(searchLower)) ||
                        (a.tags || []).some(t => t.toLowerCase().includes(searchLower));
    
    const matchCategory = filters.category === 'Todos' || a.category === filters.category;
    const matchStatus = filters.status === 'Todos' || a.status === filters.status;
    const matchDifficulty = filters.difficulty === 'Todos' || a.difficulty === filters.difficulty;
    const matchCriticality = filters.criticality === 'Todos' || a.criticality === filters.criticality;
    
    return matchSearch && matchCategory && matchStatus && matchDifficulty && matchCriticality;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        const success = await importArticlesJSON(text);
        if (success) {
          alert('Artigos importados com sucesso!');
        } else {
          alert('Erro ao importar JSON. Verifique a sintaxe do arquivo.');
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto py-8 px-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept=".json" 
        className="hidden" 
      />

      {/* Botão de Voltar ao Sistema */}
      <div className="mb-2">
        <button 
          onClick={() => navigate('#/')}
          className="group flex items-center gap-2 text-text-muted hover:text-brand transition-colors cursor-pointer bg-transparent border-none p-0"
        >
          <div className="bg-surface border border-border group-hover:border-brand/30 p-1.5 rounded-lg transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm">Voltar ao Sistema AcmeCorp</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Base de Conhecimento Enterprise</h1>
          <p className="text-text-secondary text-sm">Gerencie procedimentos operacionais, artigos de suporte e inteligência ITIL.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="btn-premium-secondary px-4 py-2 flex items-center gap-2 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            title="Importar base em formato JSON"
          >
            <Upload className="w-4 h-4" />
            <span>Importar</span>
          </button>
          <button 
            className="btn-premium-secondary px-4 py-2 flex items-center gap-2 cursor-pointer"
            onClick={exportArticlesJSON}
            title="Exportar base completa em formato JSON"
          >
            <Download className="w-4 h-4" />
            <span>Exportar</span>
          </button>
          <button 
            className="btn-premium-primary px-4 py-2 flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('#/base-conhecimento/novo')}
          >
            <Plus className="w-4 h-4" />
            <span>Novo Artigo</span>
          </button>
        </div>
      </div>

      <ArticleStatsCards analytics={analytics} />

      <ArticleFilters 
        filters={filters} 
        setFilters={setFilters} 
        categories={categories} 
        allTags={allTags} 
      />

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-background-subtle text-text-muted text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Artigo</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Autor & Data</th>
                <th className="px-6 py-4 text-center">IA / Views</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-text-muted">
                    Nenhum artigo encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                filteredArticles.map(article => (
                  <tr key={article.id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-text-primary mb-1">{article.title}</span>
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <span className="font-data bg-background px-1.5 py-0.5 rounded border border-border">v{article.version}</span>
                          <span>•</span>
                          <span>{article.difficulty || 'Médio'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-brand-light text-brand px-2 py-1 rounded-full text-xs font-semibold">
                        {article.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <ArticleStatusBadge status={article.status || 'published'} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs">
                        <span className="font-semibold text-text-secondary">{article.author || article.createdBy || 'Sistema'}</span>
                        <span className="text-text-muted">{new Date(article.lastUpdated || article.updatedAt || Date.now()).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-4 text-xs font-data">
                        <div className="flex items-center gap-1 text-brand" title="Usos pela IA">
                          <Bot className="w-3.5 h-3.5" />
                          <span>{article.aiUsageCount || article.useCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1 text-text-muted" title="Visualizações">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{article.views || article.viewCount || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="p-1.5 text-text-muted hover:text-brand bg-transparent border-none cursor-pointer rounded hover:bg-brand-light transition-colors"
                          title="Visualizar Artigo"
                          onClick={() => navigate(`#/base-conhecimento/artigo/${article.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-text-muted hover:text-accent bg-transparent border-none cursor-pointer rounded hover:bg-accent-light transition-colors"
                          title="Editar Artigo"
                          onClick={() => navigate(`#/base-conhecimento/editar/${article.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          className="p-1.5 text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer rounded hover:bg-border transition-colors"
                          title="Duplicar Artigo"
                          onClick={() => duplicateArticle(article.id)}
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {article.status !== 'archived' ? (
                          <button 
                            className="p-1.5 text-text-muted hover:text-warning bg-transparent border-none cursor-pointer rounded hover:bg-warning-light transition-colors"
                            title="Arquivar Artigo"
                            onClick={() => archiveArticle(article.id)}
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <>
                            <button 
                              className="p-1.5 text-text-muted hover:text-success bg-transparent border-none cursor-pointer rounded hover:bg-success-light transition-colors"
                              title="Restaurar Artigo"
                              onClick={() => restoreArticle(article.id)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-1.5 text-text-muted hover:text-danger bg-transparent border-none cursor-pointer rounded hover:bg-danger-light transition-colors"
                              title="Excluir Permanentemente"
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir permanentemente este artigo?')) {
                                  deleteArticle(article.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
