import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, RefreshCw, BookOpen, ExternalLink, HelpCircle, ArrowLeft } from 'lucide-react';
import { navigate } from '../../lib/router';
import { useAuth } from '../../shared/hooks/useAuth';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: { id: string; title: string; category: string }[];
}

export const EnterpriseChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      content: 'Olá! Sou o Assistente Virtual Enterprise de Suporte TI. Como posso ajudar com seus sistemas, licenças, redes ou chamados hoje?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageText = input.trim();
    setInput('');

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: userMessageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': user?.csrfToken || ''
        },
        body: JSON.stringify({ 
          message: userMessageText,
          history: [...messages, userMsg]
            .filter(m => m.id !== 'welcome')
            .map(m => ({
              role: m.sender === 'user' ? 'user' : 'model',
              parts: [{ text: m.content }]
            }))
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: data.response || data.answer || data.message || 'Desculpe, não consegui obter uma resposta adequada.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: data.sources || data.matchedArticles || [],
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        throw new Error('Falha ao se comunicar com o serviço de IA.');
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: 'Desculpe, ocorreu um erro ao se comunicar com o assistente IA. Por favor, tente novamente.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-800/80 border-b border-slate-700/80 px-6 py-4 flex items-center justify-between backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('#/')}
            className="text-slate-400 hover:text-white transition-colors p-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-950/50">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                Assistente de IA Enterprise
                <span className="text-[10px] bg-cyan-950 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded-full font-mono uppercase">
                  RAG Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">Suporte Técnico Inteligente integrado à Base de Conhecimento</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('#/base-conhecimento')}
          className="flex items-center space-x-2 text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 px-3.5 py-2 rounded-xl transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          <span>Ver Base de Conhecimento</span>
        </button>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl mx-auto w-full space-y-6">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3.5 ${
              msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                msg.sender === 'user'
                  ? 'bg-slate-700 text-slate-200'
                  : 'bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-md'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            <div
              className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white rounded-tr-none'
                  : 'bg-slate-800/90 border border-slate-700/70 text-slate-100 rounded-tl-none shadow-lg'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Sources / References if available */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/60 space-y-2">
                  <span className="text-[11px] font-semibold uppercase text-cyan-400 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Fontes Recomendadas
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((src) => (
                      <button
                        key={src.id}
                        onClick={() => navigate(`#/base-conhecimento/artigo/${src.id}`)}
                        className="text-xs bg-slate-900/80 hover:bg-slate-900 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
                      >
                        <span>{src.title}</span>
                        <ExternalLink className="w-3 h-3 text-cyan-400" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <span className="text-[10px] text-slate-400 mt-2 block text-right">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-3 text-slate-400 text-xs">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center animate-pulse">
              <Bot className="w-4 h-4 text-cyan-400" />
            </div>
            <span className="flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              Processando com IA Enterprise...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-slate-800/80 border-t border-slate-700/80 p-4 sticky bottom-0 backdrop-blur-md">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua dúvida de suporte (ex: Como redefinir senha do M365?)..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white p-3 rounded-xl transition-colors shadow-lg shadow-cyan-950/40"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
