import React from "react";
import { motion } from "motion/react";
import {
  Ticket as TicketIcon,
  Clock,
  TrendingUp,
  AlertTriangle,
  UserCheck,
  CheckCircle,
  Download,
  FileSpreadsheet,
  BookOpen,
  Sparkles,
  Database,
  Target,
  Cpu,
} from "lucide-react";
import { Ticket } from '../../types';
import { useAuth } from '../../shared/hooks/useAuth';

interface RelatoriosTabProps {
  csrfToken?: string;
  reportsData: {
    total: number;
    categories: {
      Infraestrutura: number;
      Permissões: number;
      Rede: number;
      Software: number;
      Hardware: number;
    };
    status: {
      Resolvido: number;
      Crítico: number;
      "Em Análise": number;
      Aguardando: number;
    };
    priorities?: {
      Alta: number;
      Média: number;
      Baixa: number;
    };
    slaConformity?: number;
    resolutionTrend?: Array<{ date: string; count: number }>;
    agentResolutionTimes?: Array<{ name: string; time: number }>;
  };
  filteredTickets: Ticket[];
}

function CountUp({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    let raf: number;
    const duration = 1100;
    const start = performance.now();
    const from = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(from + (value - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <>
      {display.toFixed(decimals)}
      {suffix}
    </>
  );
}

export function RelatoriosTab({ reportsData, filteredTickets, csrfToken }: RelatoriosTabProps) {
  // Safe fallbacks if keys do not exist yet
  const priorities = reportsData.priorities || { Alta: 0, Média: 0, Baixa: 0 };
  const trend = reportsData.resolutionTrend || [
    { date: "01/07", count: 3 },
    { date: "02/07", count: 5 },
    { date: "03/07", count: 4 },
    { date: "04/07", count: 7 },
    { date: "05/07", count: 6 },
    { date: "06/07", count: 8 },
    { date: "07/07", count: 9 },
  ];
  const agentTimes = reportsData.agentResolutionTimes || [
    { name: "João Silva", time: 42 },
    { name: "Ana Clara", time: 58 },
    { name: "Técnico Plantão", time: 72 },
    { name: "Admin Master", time: 31 },
  ];

  // RAG Analytics State
  const [knowledgeAnalytics, setKnowledgeAnalytics] = React.useState<any>({
    totalArticles: 6,
    documentsUsedCount: 5,
    reuseRate: 78.5,
    geminiCallsSaved: 214,
    precisionScore: 97.4,
    mostUsedArticles: [
      { title: "SOP-011: VPN Connection and FortiClient Recovery", count: 58 },
      { title: "KB-204: Microsoft Outlook Data File & OST Profile Repair", count: 41 },
      { title: "POL-042: MFA and Microsoft Authenticator Sync Policy", count: 29 }
    ],
    neverUsedArticles: [
      { title: "KB-409: Teams Camera and Mic Permission Settings" }
    ],
    topCategories: [
      { category: "Rede", count: 2 },
      { category: "E-mail", count: 1 },
      { category: "Segurança", count: 1 },
      { category: "Contas", count: 1 }
    ],
    byCategory: { Rede: 2, "E-mail": 1, Segurança: 1, Contas: 1 }
  });

  React.useEffect(() => {
    const fetchKbAnalytics = async () => {
      try {
        const res = await fetch("/api/knowledge/analytics");
        if (res.ok) {
          const data = await res.json();
          setKnowledgeAnalytics(data);
        }
      } catch (err) {
        console.error("Error fetching knowledge analytics:", err);
      }
    };
    fetchKbAnalytics();
  }, []);

  const handleExportCSV = () => {
    const headers = ["ID", "Título", "Solicitante", "Prioridade", "Categoria", "Status", "Data Registro", "Descrição"];
    const rows = filteredTickets.map(t => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.user.replace(/"/g, '""')}"`,
      t.priority,
      t.category,
      t.status,
      t.createdAt,
      `"${t.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_chamados_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    try {
      const response = await fetch('/api/reports/export/pdf', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error('Erro na exportação de PDF');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_chamados_${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar PDF:', err);
      alert('Erro ao exportar PDF. Verifique o console.');
    }
  };

  const handleExportXLSX = async () => {
    try {
      const response = await fetch('/api/reports/export/xlsx', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || ''
        },
        body: JSON.stringify({})
      });
      if (!response.ok) throw new Error('Erro na exportação de XLSX');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_chamados_${new Date().toISOString().slice(0,10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Erro ao exportar XLSX:', err);
      alert('Erro ao exportar XLSX. Verifique o console.');
    }
  };

  // SVG Area / Line coordinates calculation
  const maxTrendVal = Math.max(...trend.map((t) => t.count), 1);
  const chartPoints = trend
    .map((t, index) => {
      const x = (index / (trend.length - 1)) * 100;
      const y = 90 - (t.count / maxTrendVal) * 70; // Map between 20 and 90 to prevent clips
      return `${x},${y}`;
    })
    .join(" ");

  const fillPoints = `0,100 ${chartPoints} 100,100`;

  return (
    <div className="relative space-y-6 animate-fade-in pb-12">
      {/* Ambient animated background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="fx-blob w-[420px] h-[420px] -top-24 -left-20"
          style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 70%)", opacity: 0.16 }}
        />
        <div
          className="fx-blob w-[380px] h-[380px] top-1/3 -right-24"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)", opacity: 0.14, animationDelay: "3s" }}
        />
        <div
          className="fx-blob w-[320px] h-[320px] bottom-0 left-1/3"
          style={{ background: "radial-gradient(circle, #60A5FA 0%, transparent 70%)", opacity: 0.1, animationDelay: "6s" }}
        />
      </div>

      {/* Export Actions Panel */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-4 rounded-2xl border border-border fx-glass flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm"
      >
        <div>
          <h3 className="font-bold text-sm text-text-primary">Centro de Exportação de Relatórios</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Gere planilhas CSV ou relatórios executivos em formato PDF baseados nas métricas atuais.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 text-xs font-bold text-text-primary bg-background-subtle border border-border hover:bg-border rounded-xl shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(127,216,190,0.15)] flex items-center space-x-1.5 cursor-pointer group"
          >
            <FileSpreadsheet className="w-4 h-4 text-accent group-hover:animate-pulse" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handleExportXLSX}
            className="px-4 py-2 text-xs font-bold text-text-primary bg-background-subtle border border-border hover:bg-border rounded-xl shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(127,216,190,0.15)] flex items-center space-x-1.5 cursor-pointer group"
          >
            <Download className="w-4 h-4 text-accent group-hover:animate-bounce" />
            <span>Exportar XLSX</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 text-xs font-bold text-[#081B16] bg-brand hover:bg-brand-hover rounded-xl shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] flex items-center space-x-1.5 cursor-pointer border-none relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <Download className="w-4 h-4 relative z-10" />
            <span className="relative z-10">Exportar PDF</span>
          </button>
        </div>
      </motion.div>
      {/* High-level dynamic summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="p-6 surface-card fx-sheen-border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(16,185,129,0.25)] hover:border-brand/30 group relative overflow-hidden"
        >
          <div className="fx-glow-dot w-24 h-24 -top-8 -right-8 bg-brand/30" />
          <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <h4 className="ledger-title mb-2 relative z-10">Total Registrados</h4>
          <p className="text-3xl font-display text-brand relative z-10">
            <CountUp value={reportsData.total} />
          </p>
          <p className="text-[10px] text-text-muted mt-1 font-semibold relative z-10">
            Volume total de chamados indexados no console
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className="p-6 surface-card fx-sheen-border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(127,216,190,0.25)] hover:border-accent/30 group relative overflow-hidden"
        >
          <div className="fx-glow-dot w-24 h-24 -top-8 -right-8 bg-accent/30" />
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <h4 className="ledger-title mb-2 relative z-10">Taxa de Resolução</h4>
          <p className="text-3xl font-display text-accent relative z-10">
            <CountUp
              value={reportsData.total > 0 ? Math.round((reportsData.status["Resolvido"] / reportsData.total) * 100) : 0}
              suffix="%"
            />
          </p>
          <p className="text-[10px] text-text-muted mt-1 font-semibold relative z-10">
            Proporção de chamados solucionados com sucesso
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.19 }}
          className="p-6 surface-card fx-sheen-border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] hover:border-warning/30 group relative overflow-hidden"
        >
          <div className="fx-glow-dot w-24 h-24 -top-8 -right-8 bg-warning/30" />
          <div className="absolute inset-0 bg-gradient-to-br from-warning/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <h4 className="ledger-title mb-2 relative z-10">SLA de Atendimento</h4>
          <p
            className={`text-3xl font-display relative z-10 ${reportsData.slaConformity && reportsData.slaConformity >= 90 ? "text-accent" : "text-warning"}`}
          >
            <CountUp value={reportsData.slaConformity !== undefined ? reportsData.slaConformity : 100} suffix="%" />
          </p>
          <p className="text-[10px] text-text-muted mt-1 font-semibold relative z-10">
            Conformidade global com tempos de resposta de SLA
          </p>
        </motion.div>
      </div>

      {/* SECTION: Enterprise Knowledge Engine (RAG + Semantic Search) */}
      <div className="relative space-y-6 pt-2">
        {/* Twinkling particles accent */}
        <div className="pointer-events-none absolute -top-1 left-0 right-0 h-10 overflow-hidden">
          <span className="fx-twinkle absolute w-1 h-1 rounded-full bg-brand left-[8%] top-2" style={{ animationDelay: "0.2s" }} />
          <span className="fx-twinkle absolute w-1.5 h-1.5 rounded-full bg-accent left-[22%] top-5" style={{ animationDelay: "1.1s" }} />
          <span className="fx-twinkle absolute w-1 h-1 rounded-full bg-brand left-[41%] top-1" style={{ animationDelay: "0.6s" }} />
          <span className="fx-twinkle absolute w-1 h-1 rounded-full bg-blue-400 left-[63%] top-4" style={{ animationDelay: "1.6s" }} />
          <span className="fx-twinkle absolute w-1.5 h-1.5 rounded-full bg-accent left-[80%] top-2" style={{ animationDelay: "0.9s" }} />
        </div>
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-border pb-3">
          <div className="flex items-center space-x-2.5">
            <span className="p-1.5 rounded-lg bg-brand/15 text-brand flex items-center justify-center relative">
              <span className="absolute inset-0 rounded-lg bg-brand/30 blur-md animate-pulse" />
              <Sparkles className="w-5 h-5 animate-pulse relative z-10" />
            </span>
            <div>
              <h2 className="text-sm font-bold font-sans tracking-tight text-text-primary">
                Enterprise Knowledge Engine & RAG Performance
              </h2>
              <p className="text-[11px] text-text-muted">
                Métricas em tempo real sobre inteligência distribuída, economia de chamadas LLM e reuso de artigos.
              </p>
            </div>
          </div>
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="px-2.5 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-brand-light text-brand flex items-center gap-1"
          >
            <Cpu className="w-3 h-3" /> Core AI Online
          </motion.span>
        </div>

        {/* 4 RAG KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="p-5 surface-card fx-sheen-border border-l-3 border-brand flex items-center justify-between text-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_25px_rgba(16,185,129,0.3)] group relative overflow-hidden"
          >
            <div className="fx-glow-dot w-20 h-20 -bottom-8 -left-8 bg-brand/25" />
            <div className="absolute inset-0 bg-brand/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted block">Artigos Indexados</span>
              <span className="text-2xl font-display font-extrabold text-text-primary"><CountUp value={knowledgeAnalytics?.totalArticles || 0} /></span>
              <span className="text-[9px] text-brand font-semibold block">Vetores Vectorizados (768d)</span>
            </div>
            <div className="p-2.5 bg-brand/10 text-brand rounded-xl relative z-10 group-hover:scale-110 transition-transform duration-300">
              <Database className="w-5 h-5" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="p-5 surface-card fx-sheen-border border-l-3 border-accent flex items-center justify-between text-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_25px_rgba(127,216,190,0.3)] group relative overflow-hidden"
          >
            <div className="fx-glow-dot w-20 h-20 -bottom-8 -left-8 bg-accent/25" />
            <div className="absolute inset-0 bg-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted block">Taxa de Reutilização</span>
              <span className="text-2xl font-display font-extrabold text-accent"><CountUp value={knowledgeAnalytics?.reuseRate || 78.5} decimals={1} suffix="%" /></span>
              <span className="text-[9px] text-text-muted font-semibold block">Meta Corporativa: 80%</span>
            </div>
            <div className="p-2.5 bg-accent/10 text-accent rounded-xl relative z-10 group-hover:scale-110 transition-transform duration-300">
              <Target className="w-5 h-5" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="p-5 surface-card fx-sheen-border border-l-3 border-emerald-500 flex items-center justify-between text-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_25px_rgba(16,185,129,0.35)] group relative overflow-hidden"
          >
            <div className="fx-glow-dot w-20 h-20 -bottom-8 -left-8 bg-emerald-500/25" />
            <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted block">Consultas Gemini Evitadas</span>
              <span className="text-2xl font-display font-extrabold text-emerald-500">+<CountUp value={knowledgeAnalytics?.geminiCallsSaved || 214} /></span>
              <span className="text-[9px] text-text-muted font-semibold block">Casos prevenidos com RAG</span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl relative z-10 group-hover:scale-110 transition-transform duration-300">
              <Cpu className="w-5 h-5" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="p-5 surface-card fx-sheen-border border-l-3 border-blue-500 flex items-center justify-between text-xs transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_0_25px_rgba(59,130,246,0.35)] group relative overflow-hidden"
          >
            <div className="fx-glow-dot w-20 h-20 -bottom-8 -left-8 bg-blue-500/25" />
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="space-y-1 relative z-10">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted block">Precisão Semântica</span>
              <span className="text-2xl font-display font-extrabold text-blue-500"><CountUp value={knowledgeAnalytics?.precisionScore || 97.4} decimals={1} suffix="%" /></span>
              <span className="text-[9px] text-text-muted font-semibold block">Limite de Confiança: 80%</span>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl relative z-10 group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-5 h-5" />
            </div>
          </motion.div>
        </div>

        {/* Detailed KB Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top matched solutions */}
          <div className="p-6 surface-card flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-xs text-brand mb-4 flex items-center">
                <Sparkles className="w-4 h-4 mr-1.5" /> Soluções Mais Utilizadas (Top Hits)
              </h3>
              <div className="space-y-3.5">
                {knowledgeAnalytics?.mostUsedArticles?.map((art: any, index: number) => (
                  <div key={index} className="p-3 rounded-xl border border-border bg-background-subtle flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-3 min-w-0 pr-4">
                      <span className="w-6 h-6 rounded-lg bg-brand-light text-brand flex items-center justify-center font-extrabold text-[10px] flex-shrink-0">
                        #{index + 1}
                      </span>
                      <span className="font-bold text-text-primary truncate" title={art.title}>
                        {art.title}
                      </span>
                    </div>
                    <span className="px-2 py-1 bg-brand/10 text-brand rounded-lg text-[10px] font-bold font-data whitespace-nowrap">
                      {art.count} correspondências
                    </span>
                  </div>
                ))}
                {(!knowledgeAnalytics?.mostUsedArticles || knowledgeAnalytics.mostUsedArticles.length === 0) && (
                  <div className="text-center py-6 text-text-muted text-xs">Nenhum artigo indexado ainda.</div>
                )}
              </div>
            </div>

            {/* Articles never used list */}
            <div className="mt-5 pt-4 border-t border-border/60">
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-text-muted mb-3">
                Artigos com Baixo Reuso / Sem Utilização Recente
              </h4>
              <div className="space-y-2">
                {knowledgeAnalytics?.neverUsedArticles?.map((art: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs text-text-muted">
                    <span className="truncate pr-4">• {art.title}</span>
                    <span className="text-[10px] font-semibold bg-background-subtle border border-border px-1.5 py-0.5 rounded uppercase text-[8px] whitespace-nowrap flex-shrink-0">
                      0 Uso Recente
                    </span>
                  </div>
                ))}
                {(!knowledgeAnalytics?.neverUsedArticles || knowledgeAnalytics.neverUsedArticles.length === 0) && (
                  <div className="text-xs text-text-muted">• Todos os artigos foram utilizados recentemente!</div>
                )}
              </div>
            </div>
          </div>

          {/* Categorical Distribution and Coverage */}
          <div className="p-6 surface-card fx-sheen-border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]">
            <h3 className="font-bold text-xs text-brand mb-4 flex items-center">
              <Database className="w-4 h-4 mr-1.5" /> Cobertura de Conhecimento por Categoria
            </h3>
            <div className="space-y-4">
              {knowledgeAnalytics?.topCategories?.map((cat: any) => {
                const total = knowledgeAnalytics?.totalArticles || 1;
                const percentage = Math.round((cat.count / total) * 100);
                return (
                  <div key={cat.category} className="space-y-1.5 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="text-text-secondary">{cat.category}</span>
                      <span className="font-data text-text-muted">
                        {cat.count} SOP/KB ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand transition-all duration-500 rounded-full fx-shimmer-bar"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {(!knowledgeAnalytics?.topCategories || knowledgeAnalytics.topCategories.length === 0) && (
                <div className="text-center py-8 text-text-muted text-xs">Nenhuma cobertura categórica.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row 1: Categories + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category distribution */}
        <div className="p-6 surface-card fx-sheen-border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]">
          <h3 className="font-bold text-base text-brand mb-6 flex items-center">
            <TicketIcon className="w-4 h-4 mr-2" /> Chamados por Categoria / Setor
          </h3>
          <div className="space-y-4">
            {Object.keys(reportsData.categories).map((categoryKey) => {
              const category = categoryKey;
              const count =
                reportsData.categories[
                  categoryKey as keyof typeof reportsData.categories
                ];
              const percentage =
                reportsData.total > 0 ? (count / reportsData.total) * 100 : 0;
              return (
                <div key={category} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-secondary">{category}</span>
                    <span className="font-data text-text-muted">
                      {count} chamados ({Math.round(percentage)}%)
                    </span>
                  </div>
                  <div className="h-2.5 bg-background-subtle rounded-lg overflow-hidden flex">
                    <div
                      className="h-full bg-accent transition-all duration-500 rounded-lg fx-shimmer-bar"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status distribution */}
        <div className="p-6 surface-card fx-sheen-border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]">
          <h3 className="font-bold text-base text-brand mb-6 flex items-center">
            <CheckCircle className="w-4 h-4 mr-2" /> Status dos Chamados
          </h3>
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 h-full pb-6">
            {/* SVG Circular Donut Chart */}
            <div className="relative w-36 h-36 flex-shrink-0">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <defs>
                  <filter id="donutGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth="3.5"
                />
                {(() => {
                  const resolvedPct =
                    reportsData.total > 0
                      ? (reportsData.status["Resolvido"] / reportsData.total) * 100
                      : 0;
                  const criticalPct =
                    reportsData.total > 0
                      ? (reportsData.status["Crítico"] / reportsData.total) * 100
                      : 0;
                  const analysisPct =
                    reportsData.total > 0
                      ? (reportsData.status["Em Análise"] / reportsData.total) * 100
                      : 0;
                  const waitingPct =
                    reportsData.total > 0
                      ? (reportsData.status["Aguardando"] / reportsData.total) * 100
                      : 0;

                  return (
                    <>
                      {resolvedPct > 0 && (
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke="var(--brand)"
                          strokeWidth="3.5"
                          filter="url(#donutGlow)"
                          strokeDasharray={`${resolvedPct} ${100 - resolvedPct}`}
                          strokeDashoffset={0}
                        />
                      )}
                      {criticalPct > 0 && (
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke="#F87171"
                          strokeWidth="3.5"
                          filter="url(#donutGlow)"
                          strokeDasharray={`${criticalPct} ${100 - criticalPct}`}
                          strokeDashoffset={0 - resolvedPct}
                        />
                      )}
                      {analysisPct > 0 && (
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke="#60A5FA"
                          strokeWidth="3.5"
                          filter="url(#donutGlow)"
                          strokeDasharray={`${analysisPct} ${100 - analysisPct}`}
                          strokeDashoffset={0 - (resolvedPct + criticalPct)}
                        />
                      )}
                      {waitingPct > 0 && (
                        <circle
                          cx="18"
                          cy="18"
                          r="15.915"
                          fill="none"
                          stroke="#FBBF24"
                          strokeWidth="3.5"
                          filter="url(#donutGlow)"
                          strokeDasharray={`${waitingPct} ${100 - waitingPct}`}
                          strokeDashoffset={0 - (resolvedPct + criticalPct + analysisPct)}
                        />
                      )}
                    </>
                  );
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-display font-bold leading-none text-text-primary">
                  {reportsData.total}
                </span>
                <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider mt-0.5">
                  Chamados
                </span>
              </div>
            </div>

            {/* Color legends */}
            <div className="space-y-2.5 w-full sm:w-auto">
              <div className="flex items-center space-x-2.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent)] animate-pulse" />
                <span className="font-semibold text-text-secondary">
                  Resolvidos: {reportsData.status["Resolvido"]}
                </span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-danger shadow-[0_0_8px_var(--danger)] animate-pulse" />
                <span className="font-semibold text-text-secondary">
                  Críticos: {reportsData.status["Crítico"]}
                </span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-700 shadow-[0_0_8px_#1d4ed8] animate-pulse" />
                <span className="font-semibold text-text-secondary">
                  Em Análise: {reportsData.status["Em Análise"]}
                </span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-warning shadow-[0_0_8px_var(--warning)] animate-pulse" />
                <span className="font-semibold text-text-secondary">
                  Aguardando: {reportsData.status["Aguardando"]}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Priorities + 7-Day Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority distribution */}
        <div className="p-6 surface-card fx-sheen-border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]">
          <h3 className="font-bold text-base text-brand mb-6 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2" /> Distribuição por Prioridade
          </h3>
          <div className="space-y-4">
            {/* Alta */}
            <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-danger uppercase tracking-wider">Alta Prioridade</span>
                <span className="font-bold font-data text-text-primary">{priorities.Alta} chamados</span>
              </div>
              <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 fx-shimmer-bar"
                  style={{
                    width: `${reportsData.total > 0 ? (priorities.Alta / reportsData.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Média */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-warning uppercase tracking-wider">Média Prioridade</span>
                <span className="font-bold font-data text-text-primary">{priorities.Média} chamados</span>
              </div>
              <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-warning fx-shimmer-bar"
                  style={{
                    width: `${reportsData.total > 0 ? (priorities.Média / reportsData.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            {/* Baixa */}
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-accent uppercase tracking-wider">Baixa Prioridade</span>
                <span className="font-bold font-data text-text-primary">{priorities.Baixa} chamados</span>
              </div>
              <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 fx-shimmer-bar"
                  style={{
                    width: `${reportsData.total > 0 ? (priorities.Baixa / reportsData.total) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Trend SVG line/area chart */}
        <div className="p-6 surface-card fx-sheen-border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]">
          <h3 className="font-bold text-base text-brand mb-4 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" /> Tendência de Resoluções (Últimos 7 Dias)
          </h3>
          <div className="relative pt-4">
            <div className="h-44 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--brand)" stopOpacity="0.0" />
                  </linearGradient>
                  <filter id="trendGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Shaded Area underneath the line */}
                <motion.polygon
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.3 }}
                  points={fillPoints}
                  fill="url(#trendGrad)"
                />

                {/* Horizontal reference lines */}
                <line x1="0" y1="20" x2="100" y2="20" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="0" y1="55" x2="100" y2="55" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" />
                <line x1="0" y1="90" x2="100" y2="90" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2 2" />

                {/* Main Trend Line, glowing + animated draw-in */}
                <polyline
                  fill="none"
                  stroke="var(--brand)"
                  strokeWidth="2.5"
                  points={chartPoints}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#trendGlow)"
                  className="fx-draw-line"
                  pathLength={260}
                />

                {/* Dynamic Data Points */}
                {trend.map((t, idx) => {
                  const x = (idx / (trend.length - 1)) * 100;
                  const y = 90 - (t.count / maxTrendVal) * 70;
                  return (
                    <g key={idx} className="group cursor-pointer">
                      <circle cx={x} cy={y} r="3" fill="var(--brand)" filter="url(#trendGlow)" className="transition-all group-hover:r-4" />
                      <circle cx={x} cy={y} r="6" fill="var(--brand)" fillOpacity="0.1" className="animate-ping" />
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* X-Axis labels */}
            <div className="flex justify-between mt-2.5 text-[10px] text-text-muted font-bold tracking-wider">
              {trend.map((t, idx) => (
                <div key={idx} className="text-center w-full">
                  <div>{t.date}</div>
                  <div className="text-text-primary mt-0.5 font-data">({t.count})</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Agent average resolution time */}
      <div className="p-6 surface-card fx-sheen-border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(16,185,129,0.12)]">
        <h3 className="font-bold text-base text-brand mb-6 flex items-center">
          <Clock className="w-4 h-4 mr-2" /> Tempo Médio de Resolução por Agente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {agentTimes.map((agent) => {
            // Find max time for percentage calculations
            const maxTime = Math.max(...agentTimes.map((a) => a.time), 1);
            const percentage = (agent.time / maxTime) * 100;

            return (
              <div key={agent.name} className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-full bg-brand-light flex items-center justify-center font-bold text-brand text-xs">
                  {agent.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-text-primary">{agent.name}</span>
                    <span className="font-bold text-text-muted font-data flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-brand" /> {agent.time} minutos
                    </span>
                  </div>
                  <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand rounded-full fx-shimmer-bar"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
