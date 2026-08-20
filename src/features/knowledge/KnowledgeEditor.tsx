import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Sparkles, Check, Plus, Trash2, HelpCircle } from 'lucide-react';
import { useKnowledge } from '../../contexts/KnowledgeContext';
import { navigate } from '../../lib/router';
import { KnowledgeArticle } from '../../types';

interface KnowledgeEditorProps {
  articleId?: string;
}

export const KnowledgeEditor: React.FC<KnowledgeEditorProps> = ({ articleId }) => {
  const { articles, addArticle, updateArticle } = useKnowledge();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const existingArticle = articles.find((a) => a.id === articleId);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Sistemas / M335');
  const [subcategory, setSubcategory] = useState('');
  const [content, setContent] = useState('');
  const [procedure, setProcedure] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<'draft' | 'in_review' | 'published'>('published');
  const [criticality, setCriticality] = useState<'Baixa' | 'Média' | 'Alta' | 'Crítica'>('Média');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [newCheckitem, setNewCheckitem] = useState('');

  useEffect(() => {
    if (existingArticle) {
      setTitle(existingArticle.title || '');
      setCategory(existingArticle.category || 'Sistemas / M335');
      setSubcategory(existingArticle.subcategory || '');
      setContent(existingArticle.content || '');
      setProcedure(existingArticle.procedure || '');
      setKeywords(Array.isArray(existingArticle.keywords) ? existingArticle.keywords.join(', ') : '');
      setTags(Array.isArray(existingArticle.tags) ? existingArticle.tags.join(', ') : '');
      setStatus((existingArticle.status as any) || 'published');
      setCriticality((existingArticle.criticality as any) || 'Média');
      setChecklist(existingArticle.checklist || []);
    }
  }, [existingArticle]);

  const handleAddCheckitem = () => {
    if (!newCheckitem.trim()) return;
    setChecklist([...checklist, newCheckitem.trim()]);
    setNewCheckitem('');
  };

  const handleRemoveCheckitem = (index: number) => {
    setChecklist(checklist.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setMessage({ type: 'error', text: 'Título e conteúdo são obrigatórios.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const articleData: Partial<KnowledgeArticle> = {
      title: title.trim(),
      category: category.trim(),
      subcategory: subcategory.trim() || undefined,
      content: content.trim(),
      procedure: procedure.trim() || undefined,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      status,
      criticality,
      checklist,
      version: existingArticle ? `1.${(parseInt(existingArticle.version.split('.')[1] || '0') + 1)}` : '1.0',
    };

    try {
      if (existingArticle) {
        await updateArticle(existingArticle.id, articleData);
        setMessage({ type: 'success', text: 'Artigo atualizado com sucesso!' });
      } else {
        await addArticle(articleData);
        setMessage({ type: 'success', text: 'Artigo criado com sucesso!' });
      }
      setTimeout(() => {
        navigate('#/base-conhecimento');
      }, 1000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar o artigo.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <button
            onClick={() => navigate('#/base-conhecimento')}
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar para a Base de Conhecimento</span>
          </button>
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/50 px-3 py-1 rounded-full">
              Enterprise Knowledge Editor
            </span>
          </div>
        </div>

        {message && (
          <div
            className={`p-4 rounded-xl border ${
              message.type === 'success'
                ? 'bg-emerald-950/50 border-emerald-800/50 text-emerald-300'
                : 'bg-rose-950/50 border-rose-800/50 text-rose-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 space-y-5 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              {existingArticle ? 'Editar Artigo' : 'Novo Artigo de Conhecimento'}
            </h2>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Título do Artigo *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Como redefinir senha do M365 via Portal Self-Service"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            {/* Category & Subcategory */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Categoria *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Sistemas / M335">Sistemas / M365</option>
                  <option value="Redes & Conectividade">Redes & Conectividade</option>
                  <option value="Segurança & Compliance">Segurança & Compliance</option>
                  <option value="Hardware & Periféricos">Hardware & Periféricos</option>
                  <option value="Geral / Onboarding">Geral / Onboarding</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Subcategoria
                </label>
                <input
                  type="text"
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  placeholder="Ex: Autenticação, VPN, Teams"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Status & Criticality */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="published">Publicado</option>
                  <option value="in_review">Em Revisão</option>
                  <option value="draft">Rascunho</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Criticidade
                </label>
                <select
                  value={criticality}
                  onChange={(e) => setCriticality(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Média">Média</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítica">Crítica</option>
                </select>
              </div>
            </div>

            {/* Content / Explanation */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Conteúdo / Conceitos Principais *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                placeholder="Descreva o problema, contexto e solução técnica resumida..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-sm"
                required
              />
            </div>

            {/* Step-by-Step Procedure */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Procedimento Passo a Passo (Passos Sequenciais)
              </label>
              <textarea
                value={procedure}
                onChange={(e) => setProcedure(e.target.value)}
                rows={5}
                placeholder="1. Acesse o portal&#10;2. Clique em Segurança&#10;3. Selecione Redefinir Senha"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-sm"
              />
            </div>

            {/* Checklist */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Checklist de Verificação / Requisitos
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newCheckitem}
                  onChange={(e) => setNewCheckitem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCheckitem())}
                  placeholder="Ex: Verificar se usuário tem MFA ativo"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="button"
                  onClick={handleAddCheckitem}
                  className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl text-white flex items-center gap-1 text-sm font-medium"
                >
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>

              {checklist.length > 0 && (
                <ul className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  {checklist.map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between text-sm text-slate-300">
                      <span className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-cyan-400" />
                        {item}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCheckitem(idx)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Keywords & Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Palavras-chave (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="senha, m365, reset, login, auth"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Tags de Indexação (separadas por vírgula)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="m365, vpn, mfa, active_directory"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('#/base-conhecimento')}
              className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-6 py-2.5 rounded-xl flex items-center space-x-2 transition-colors disabled:opacity-50 text-sm shadow-lg shadow-cyan-900/30"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Salvando...' : 'Salvar Artigo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
