import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Ticket as TicketIcon,
  AlertTriangle,
  Clock,
  CheckCircle,
  ChevronRight,
  Activity,
  RefreshCw,
  Terminal,
  X,
  History,
  Users,
} from "lucide-react";
import { Ticket, SystemHealth, AuditEvent } from '../../types';
interface DashboardTabProps {
  tickets: Ticket[];
  health: SystemHealth;
  metrics: {
    totalAbertos: number;
    criticos: number;
    meanTime: string;
    satisfaction: string;
  };
  isDiagnosing: boolean;
  showTerminal: boolean;
  diagnosticLogs: string[];
  runDiagnostics: () => void;
  setShowTerminal: (show: boolean) => void;
  setSelectedTicket: (ticket: Ticket) => void;
  setActiveTab: (
    tab: "dashboard" | "chamados" | "relatorios" | "configuracoes" | "perfil"
  ) => void;
  setStatusFilter: (status: string) => void;
}
export function DashboardTab({
  tickets,
  health,
  metrics,
  isDiagnosing,
  showTerminal,
  diagnosticLogs,
  runDiagnostics,
  setShowTerminal,
  setSelectedTicket,
  setActiveTab,
  setStatusFilter,
}: DashboardTabProps) {
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const fetchDashboardExtras = async () => {
    try {
      const [auditRes, workloadRes] = await Promise.all([
        fetch("/api/audit-events"),
        /* fetch all recent events */ fetch("/api/analytics/workload"),
      ]);
      if (auditRes.ok) {
        const events: AuditEvent[] = await auditRes.json();
        /* Take top 15 */ setAuditEvents(events.slice(0, 15));
      }
      if (workloadRes.ok) {
        setWorkload(await workloadRes.json());
      }
    } catch (err) {
      console.error("Error fetching dashboard extras", err);
    } finally {
      setLoadingExtras(false);
    }
  };
  useEffect(() => {
    fetchDashboardExtras();
    const interval = setInterval(fetchDashboardExtras, 30000);
    /* refresh every 30s */ return () => clearInterval(interval);
  }, []);
  return (
    <div className="space-y-6 animate-fade-in">
      {" "}
      {/* KPIs Grid */}{" "}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {" "}
        {/* Card 1: Active Tickets with Category indicator */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className={`p-5 rounded-2xl border shadow-sm surface-card flex flex-col justify-between`}
        >
          {" "}
          <div>
            <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Chamados Ativos</span>
              <motion.div whileHover={{ rotate: 15 }}><TicketIcon className="w-3.5 h-3.5 text-brand" /></motion.div>
            </div>{" "}
            <div className="flex items-baseline space-x-1.5">
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                key={metrics.totalAbertos}
                className={`text-3xl font-display font-bold text-text-primary`}
              >
                {metrics.totalAbertos}
              </motion.span>{" "}
              <motion.span 
                animate={{ opacity: [1, 0.5, 1] }} 
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-text-muted text-[10px] font-bold font-data uppercase tracking-wider"
              >
                Em Aberto
              </motion.span>{" "}
            </div>{" "}
          </div>
          <div className="mt-3 space-y-1">
            <div className="h-1.5 w-full bg-background-subtle rounded-full overflow-hidden flex">
              <div className="h-full bg-accent" style={{ width: "40%" }} title="Software" />
              <div className="h-full bg-warning" style={{ width: "30%" }} title="Rede" />
              <div className="h-full bg-brand" style={{ width: "30%" }} title="Outros" />
            </div>
            <div className="flex justify-between text-[8px] font-bold text-text-muted">
              <span>SW 40%</span>
              <span>NET 30%</span>
              <span>INFRA 30%</span>
            </div>
          </div>
        </motion.div>{" "}

        {/* Card 2: Emergency Queue with SLA Countdown Arcs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className={`p-5 rounded-2xl border shadow-sm surface-card flex flex-col justify-between`}
        >
          {" "}
          <div>
            <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>SLA Emergencial</span>
              <motion.div whileHover={{ rotate: 15 }}><AlertTriangle className="w-3.5 h-3.5 text-danger" /></motion.div>
            </div>{" "}
            {(() => {
              const criticalTicketsList = tickets.filter((t) => t.status === "Crítico");
              if (criticalTicketsList.length === 0) {
                return (
                  <div className="flex items-center space-x-3 mt-1">
                    <div className="relative w-10 h-10 flex-shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="3" />
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#159A65" strokeWidth="3" strokeDasharray="100 0" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-success animate-pulse">✓</div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-success block">Fila Limpa</span>
                      <span className="text-[9px] text-text-muted">Sem riscos críticos</span>
                    </div>
                  </div>
                );
              }
              return (
                <div className="space-y-1.5 mt-1 w-full">
                  {criticalTicketsList.slice(0, 2).map((ticket) => {
                    // Simulated remaining minutes
                    const isOver = ticket.deadline.toLowerCase().includes("atrasado") || ticket.deadline.toLowerCase().includes("estourado");
                    const minutesLeft = isOver ? 0 : 42;
                    const pct = isOver ? 10 : Math.max(10, (minutesLeft / 120) * 100);
                    return (
                      <div key={ticket.id} className="flex items-center justify-between border-t border-border/40 pt-1.5 first:border-t-0 first:pt-0">
                        <div className="min-w-0 pr-1.5">
                          <span
                            className="font-bold font-data text-[9px] text-brand hover:underline cursor-pointer block leading-none mb-0.5"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            {ticket.id}
                          </span>
                          <p className="text-[9px] text-text-secondary truncate leading-none">{ticket.title}</p>
                        </div>
                        <div className="relative w-7 h-7 flex-shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="3.5" />
                            <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EF4444" strokeWidth="3.5" strokeDasharray={`${pct} ${100 - pct}`} />
                          </svg>
                          <motion.div
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-danger leading-none"
                          >
                            {minutesLeft}m
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>{" "}
        </motion.div>{" "}

        {/* Card 3: Priority Distribution Donut Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className={`p-5 rounded-2xl border shadow-sm surface-card flex flex-col justify-between`}
        >
          {" "}
          <div>
            <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Prioridades</span>
              <motion.div whileHover={{ rotate: 15 }}><Clock className="w-3.5 h-3.5 text-accent" /></motion.div>
            </div>{" "}
            {(() => {
              const high = tickets.filter((t) => t.priority === "Alta").length;
              const med = tickets.filter((t) => t.priority === "Média").length;
              const low = tickets.filter((t) => t.priority === "Baixa").length;
              const total = high + med + low || 1;
              const highPct = (high / total) * 100;
              const medPct = (med / total) * 100;
              const lowPct = (low / total) * 100;
              return (
                <div className="flex items-center space-x-3 w-full mt-1">
                  <div className="relative w-11 h-11 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="4" />
                      {highPct > 0 && (
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EF4444" strokeWidth="4" strokeDasharray={`${highPct} ${100 - highPct}`} strokeDashoffset={0} />
                      )}
                      {medPct > 0 && (
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray={`${medPct} ${100 - medPct}`} strokeDashoffset={0 - highPct} />
                      )}
                      {lowPct > 0 && (
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#159A65" strokeWidth="4" strokeDasharray={`${lowPct} ${100 - lowPct}`} strokeDashoffset={0 - (highPct + medPct)} />
                      )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-text-primary font-data">
                      {tickets.length}
                    </div>
                  </div>
                  <div className="text-[8px] space-y-0.5 font-bold flex-1">
                    <div className="flex items-center justify-between"><span className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-danger"/> <span className="text-text-muted">Alta</span></span> <span className="font-data text-text-primary">{high}</span></div>
                    <div className="flex items-center justify-between"><span className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-warning"/> <span className="text-text-muted">Média</span></span> <span className="font-data text-text-primary">{med}</span></div>
                    <div className="flex items-center justify-between"><span className="flex items-center space-x-1"><span className="w-1.5 h-1.5 rounded-full bg-accent"/> <span className="text-text-muted">Baixa</span></span> <span className="font-data text-text-primary">{low}</span></div>
                  </div>
                </div>
              );
            })()}
          </div>{" "}
        </motion.div>{" "}

        {/* Card 4: System Health Gauge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.01 }}
          className={`p-5 rounded-2xl border shadow-sm surface-card flex flex-col justify-between`}
        >
          {" "}
          <div>
            <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Cluster Health</span>
              <motion.div whileHover={{ rotate: 15 }}><Activity className="w-3.5 h-3.5 text-accent" /></motion.div>
            </div>{" "}
            {(() => {
              const overallHealth = Math.round(
                (health.linkDedicado +
                  health.storageApi +
                  (health.supabaseDb === "Normal" ? 100 : 50)) /
                  3
              );
              return (
                <div className="flex items-center space-x-3 w-full mt-1">
                  <div className="relative w-11 h-11 flex-shrink-0">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="var(--border)" strokeWidth="4" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#159A65" strokeWidth="4" strokeDasharray={`${overallHealth} ${100 - overallHealth}`} />
                    </svg>
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 3 }}
                      className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-success font-data"
                    >
                      {overallHealth}%
                    </motion.div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-text-primary block leading-none">Status Geral</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${overallHealth >= 80 ? "text-success" : "text-warning"}`}>
                      {overallHealth >= 80 ? "Saudável" : "Instável"}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>{" "}
        </motion.div>{" "}
      </div>{" "}
      {/* Workspace Divided Split */}{" "}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {" "}
        {/* 1. Primary Priority Tickets Table (Occupies 2 columns) */}{" "}
        <div className="lg:col-span-2 flex flex-col overflow-hidden surface-card">
          {" "}
          <div className="p-5 border-b border-border flex justify-between items-center">
            {" "}
            <div className="flex items-center space-x-2">
              {" "}
              <TicketIcon className="w-5 h-5 text-accent" />{" "}
              <h3 className="font-bold text-base tracking-tight text-brand">
                Chamados de Alta Prioridade
              </h3>{" "}
            </div>{" "}
            <button
              onClick={() => {
                setActiveTab("chamados");
                setStatusFilter("Todos");
              }}
              className="text-accent text-xs font-bold hover:underline flex items-center space-x-1 cursor-pointer bg-transparent border-none outline-none"
            >
              {" "}
              <span>Ver toda central</span>{" "}
              <ChevronRight className="w-3.5 h-3.5" />{" "}
            </button>{" "}
          </div>{" "}
          <div className="overflow-x-auto">
            {" "}
            <table className="w-full text-left border-collapse">
              {" "}
              <thead
                className={`text-[10px] uppercase font-bold text-text-muted tracking-wider`}
              >
                {" "}
                <tr>
                  {" "}
                  <th className="px-6 py-4">Ticket</th>{" "}
                  <th className="px-6 py-4">Usuário / Categoria</th>{" "}
                  <th className="px-6 py-4">Status</th>{" "}
                  <th className="px-6 py-4">SLA Prazo</th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody className="text-xs divide-y divide-slate-100 [#2E3A46]">
                {" "}
                {tickets
                  .filter((t) => t.status !== "Resolvido")
                  .slice(0, 4)
                  .map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`cursor-pointer transition-colors duration-150`}
                    >
                      {" "}
                      <td className="px-6 py-4.5">
                        {" "}
                        <div className="font-bold text-brand flex items-center space-x-1.5">
                          {" "}
                          <span className="hover:underline">
                            {ticket.id}
                          </span>{" "}
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${ticket.priority === "Alta" ? "bg-danger" : ticket.priority === "Média" ? "bg-warning" : "bg-slate-300"}`}
                          />{" "}
                        </div>{" "}
                        <div className="font-semibold text-text-secondary truncate max-w-xs">
                          {ticket.title}
                        </div>{" "}
                      </td>{" "}
                      <td className="px-6 py-4.5">
                        {" "}
                        <div className="font-semibold text-text-primary">
                          {ticket.user}
                        </div>{" "}
                        <div className="text-[10px] text-text-muted uppercase font-data tracking-wider">
                          {ticket.category}
                        </div>{" "}
                      </td>{" "}
                      <td className="px-6 py-4.5">
                        {" "}
                        <span
                          className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${ticket.status === "Crítico" ? "bg-danger-light text-danger border-[#FEE2E2]" : ticket.status === "Aguardando" ? "bg-warning-light text-warning border-[#FEF3C7]" : "bg-success-light text-accent border-[#DCFCE7]"}`}
                        >
                          {" "}
                          {ticket.status}{" "}
                        </span>{" "}
                      </td>{" "}
                      <td className="px-6 py-4.5 font-data text-[11px] font-bold text-text-muted">
                        {" "}
                        {ticket.status === "Crítico" ? (
                          <span className="text-danger animate-pulse">
                            {ticket.deadline}
                          </span>
                        ) : (
                          ticket.deadline
                        )}{" "}
                      </td>{" "}
                    </tr>
                  ))}{" "}
                {tickets.filter((t) => t.status !== "Resolvido").length ===
                  0 && (
                  <tr>
                    {" "}
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-text-muted text-sm font-semibold"
                    >
                      <div className="flex flex-col items-center justify-center opacity-60">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-3 opacity-50 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p>Nenhum chamado pendente no momento! Todos resolvidos ou em dia.</p>
                      </div>
                    </td>{" "}
                  </tr>
                )}{" "}
              </tbody>{" "}
            </table>{" "}
          </div>{" "}
        </div>{" "}
        {/* 2. System Infrastructure Monitoring Panel (1 column) */}{" "}
        <div
          className="p-5 rounded-2xl border transition-all duration-200 shadow-sm hover:scale-[1.01] surface-card flex flex-col justify-between"
        >
          {" "}
          <div>
            {" "}
            <div className="flex items-center justify-between mb-4">
              {" "}
              <div className="flex items-center space-x-2">
                {" "}
                <Activity className="w-5 h-5 text-accent" />{" "}
                <h3 className="font-bold text-base text-brand">
                  Estado da Infraestrutura
                </h3>{" "}
              </div>{" "}
              <button
                onClick={runDiagnostics}
                disabled={isDiagnosing}
                className="text-text-muted hover:text-accent disabled:opacity-50 transition-colors p-1 cursor-pointer bg-transparent border-none"
                title="Verificar sistemas agora"
              >
                {" "}
                <RefreshCw
                  className={`w-4 h-4 ${isDiagnosing ? "animate-spin text-accent" : ""}`}
                />{" "}
              </button>{" "}
            </div>{" "}
            {/* Progress bars indicators */}{" "}
            <div className="space-y-4">
              {" "}
              {/* Link Dedicado */}{" "}
              <div className="space-y-1">
                {" "}
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  {" "}
                  <span className="text-text-muted">
                    Conexão Redundante (WAN)
                  </span>{" "}
                  <span className="text-accent">
                    {health.linkDedicado}%
                  </span>{" "}
                </div>{" "}
                <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                  {" "}
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${health.linkDedicado}%` }}
                  />{" "}
                </div>{" "}
              </div>{" "}
              {/* Supabase Database */}{" "}
              <div className="space-y-1">
                {" "}
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  {" "}
                  <span className="text-text-muted">Supabase SQL DB</span>{" "}
                  <span
                    className={
                      health.supabaseDb === "Lento"
                        ? "text-warning"
                        : "text-accent"
                    }
                  >
                    {" "}
                    {health.supabaseDb}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                  {" "}
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${health.supabaseDb === "Normal" ? "bg-accent" : "bg-warning"}`}
                    style={{
                      width: health.supabaseDb === "Normal" ? "100%" : "55%",
                    }}
                  />{" "}
                </div>{" "}
              </div>{" "}
              {/* Storage API Integration */}{" "}
              <div className="space-y-1">
                {" "}
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                  {" "}
                  <span className="text-text-muted">
                    API de Storage CDN
                  </span>{" "}
                  <span
                    className={
                      health.storageApi < 30 ? "text-danger" : "text-warning"
                    }
                  >
                    {" "}
                    {health.storageApi < 30
                      ? "Grave"
                      : `${health.storageApi}% Lento`}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="h-2 bg-background-subtle rounded-full overflow-hidden">
                  {" "}
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${health.storageApi < 30 ? "bg-danger" : "bg-warning"}`}
                    style={{ width: `${health.storageApi}%` }}
                  />{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          {/* Operational Status bottom card banner */}{" "}
          <div className="mt-6 pt-5 border-t border-slate-100">
            {" "}
            <div className="bg-background p-3.5 rounded-xl flex items-center space-x-3">
              {" "}
              <div
                className={`w-2.5 h-2.5 rounded-full ${health.storageApi < 30 ? "bg-danger animate-ping" : "bg-accent animate-pulse"}`}
              />{" "}
              <div className="flex-1 min-w-0">
                {" "}
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest block leading-none mb-1">
                  Status Operacional
                </span>{" "}
                <span className="text-xs text-text-muted truncate block">
                  {" "}
                  {health.storageApi < 30
                    ? "Instabilidade crítica nos servidores de arquivos!"
                    : "Todos os sistemas operando normalmente."}{" "}
                </span>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Grid 3: Activity Stream & Workload Matrix */}{" "}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {" "}
        {/* Recent Activity Feed */}{" "}
        <div className="lg:col-span-2 flex flex-col overflow-hidden surface-card">
          {" "}
          <div className="p-5 border-b border-border flex justify-between items-center">
            {" "}
            <div className="flex items-center space-x-2">
              {" "}
              <History className="w-5 h-5 text-accent" />{" "}
              <h3 className="font-bold text-base tracking-tight text-brand">
                Atividade Recente
              </h3>{" "}
            </div>{" "}
            <button
              onClick={fetchDashboardExtras}
              className="text-text-muted hover:text-accent p-1 cursor-pointer bg-transparent border-none transition-colors"
            >
              {" "}
              <RefreshCw
                className={`w-4 h-4 ${loadingExtras ? "animate-spin" : ""}`}
              />{" "}
            </button>{" "}
          </div>{" "}
          <div className="flex-1 overflow-y-auto max-h-80 p-5 space-y-4">
            {" "}
            {loadingExtras && auditEvents.length === 0 ? (
              <div className="space-y-4 animate-pulse py-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-8 h-8 rounded-full bg-background-subtle flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-background-subtle rounded w-3/4" />
                      <div className="h-2.5 bg-background-subtle rounded w-full" />
                      <div className="h-2 bg-background-subtle rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : auditEvents.length > 0 ? (
              auditEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-3">
                  {" "}
                  <div className="w-8 h-8 rounded-full bg-background-subtle flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-text-muted">
                    {" "}
                    {event.userName.substring(0, 2).toUpperCase()}{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-text-primary">
                      {" "}
                      <span className="font-bold text-brand">
                        {event.userName}
                      </span>{" "}
                      realizou{" "}
                      <span className="font-semibold">{event.action}</span>{" "}
                      {event.ticketId && event.ticketId !== "N/A" && (
                        <span>
                          {" "}
                          em{" "}
                          <span className="font-data text-[10px]">
                            {event.ticketId}
                          </span>
                        </span>
                      )}{" "}
                    </p>{" "}
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {event.details}
                    </p>{" "}
                    <p className="text-[9px] text-text-muted font-data mt-1">
                      {" "}
                      {new Date(event.createdAt).toLocaleString("pt-BR")}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 opacity-60">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-3 opacity-50 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-text-muted text-center">Nenhuma atividade recente.</p>
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
        {/* Workload Matrix */}{" "}
        <div className="lg:col-span-1 flex flex-col overflow-hidden surface-card">
          {" "}
          <div className="p-5 border-b border-border flex items-center space-x-2">
            {" "}
            <Users className="w-5 h-5 text-accent" />{" "}
            <h3 className="font-bold text-base tracking-tight text-brand">
              Carga por Técnico
            </h3>{" "}
          </div>{" "}
          <div className="flex-1 p-5 overflow-y-auto max-h-80 space-y-4">
            {" "}
            {loadingExtras && workload.length === 0 ? (
              <div className="space-y-4 animate-pulse py-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-background-subtle" />
                        <div className="h-3 bg-background-subtle rounded w-16" />
                      </div>
                      <div className="h-2 bg-background-subtle rounded w-10" />
                    </div>
                    <div className="h-2 bg-background-subtle rounded-full w-full" />
                  </div>
                ))}
              </div>
            ) : workload.length > 0 ? (
              workload.map((user) => (
                <div key={user.userId} className="space-y-2">
                  {" "}
                  <div className="flex justify-between items-center">
                    {" "}
                    <div className="flex items-center space-x-2">
                      {" "}
                      <div className="w-6 h-6 rounded-full bg-background-subtle flex items-center justify-center text-[9px] font-bold text-text-muted">
                        {" "}
                        {user.avatar}{" "}
                      </div>{" "}
                      <span className="text-xs font-bold text-text-primary">
                        {user.userName}
                      </span>{" "}
                    </div>{" "}
                    <span className="text-[11px] font-data text-text-muted font-bold">
                      {user.total} tickets
                    </span>{" "}
                  </div>{" "}
                  <div className="flex space-x-1 h-2 rounded-full overflow-hidden bg-background-subtle">
                    {" "}
                    {user.criticos > 0 && (
                      <div
                        style={{
                          width: `${(user.criticos / user.total) * 100}%`,
                        }}
                        className="bg-danger h-full"
                        title={`${user.criticos} Críticos`}
                      />
                    )}{" "}
                    {user.emAnalise > 0 && (
                      <div
                        style={{
                          width: `${(user.emAnalise / user.total) * 100}%`,
                        }}
                        className="bg-accent h-full"
                        title={`${user.emAnalise} Em Análise`}
                      />
                    )}{" "}
                    {user.aguardando > 0 && (
                      <div
                        style={{
                          width: `${(user.aguardando / user.total) * 100}%`,
                        }}
                        className="bg-warning h-full"
                        title={`${user.aguardando} Aguardando`}
                      />
                    )}{" "}
                  </div>{" "}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 opacity-60">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mb-3 opacity-50 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-xs text-text-muted text-center">Nenhum técnico de suporte ativo.</p>
              </div>
            )}{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Optional Terminal Output for diagnostics logs */}{" "}
      {showTerminal && (
        <div className="rounded-2xl border border-slate-800 bg-[#0F172A] text-[#38BDF8] font-data text-xs shadow-xl overflow-hidden p-5 animate-fade-in">
          {" "}
          <div className="flex justify-between items-center mb-3 text-text-muted border-b border-slate-800 pb-2">
            {" "}
            <div className="flex items-center space-x-2">
              {" "}
              <Terminal className="w-4 h-4 text-accent" />{" "}
              <span className="font-bold">
                Console de Diagnósticos Operacionais
              </span>{" "}
            </div>{" "}
            <button
              onClick={() => setShowTerminal(false)}
              className="hover:text-white cursor-pointer bg-transparent border-none"
            >
              {" "}
              <X className="w-4 h-4" />{" "}
            </button>{" "}
          </div>{" "}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {" "}
            {diagnosticLogs.map((log, index) => (
              <p
                key={index}
                className={
                  log.includes("[ERRO]")
                    ? "text-red-400 font-bold"
                    : log.includes("[AVISO]")
                      ? "text-amber-400 font-bold"
                      : "text-text-muted"
                }
              >
                {" "}
                &gt; {log}{" "}
              </p>
            ))}{" "}
            {isDiagnosing && (
              <span className="inline-block w-2.5 h-4 bg-slate-400 animate-pulse ml-1" />
            )}{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
}
