import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Ticket as TicketIcon,
  Clock,
  CheckCircle,
  Activity,
  Settings,
  Bell,
  BellOff,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import { Ticket, UserRecord } from '../../types';

interface DashboardGeralProps {
  tickets: Ticket[];
  users: UserRecord[];
}

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf: number;
    const duration = 900;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{display}</>;
}

const STATUS_STYLES: Record<string, { dot: string; text: string; bg: string }> = {
  "Resolvido": { dot: "bg-brand", text: "text-brand", bg: "bg-brand/10" },
  "Crítico": { dot: "bg-danger", text: "text-danger", bg: "bg-danger/10" },
  "Em Análise": { dot: "bg-blue-500", text: "text-blue-500", bg: "bg-blue-500/10" },
  "Aguardando": { dot: "bg-warning", text: "text-warning", bg: "bg-warning/10" },
};

const AVATAR_PALETTE = [
  "from-rose-400 to-red-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-teal-300 to-brand",
];

function avatarGradient(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

export function DashboardGeral({ tickets, users }: DashboardGeralProps) {
  const [stats, setStats] = useState({
    aguardandoFila: 0,
    aguardandoAtendimento: 0,
    emAtendimento: 0,
    atendidosHoje: 0,
  });
  const [refreshRate, setRefreshRate] = useState(30);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    setStats({
      aguardandoFila: tickets.filter(t => t.status === "Aguardando").length,
      aguardandoAtendimento: 0,
      emAtendimento: tickets.filter(t => t.status === "Em Análise" || t.status === "Crítico").length,
      atendidosHoje: tickets.filter(t => t.status === "Resolvido").length,
    });
  }, [tickets]);

  const cards = [
    {
      title: "Aguardando Fila",
      count: stats.aguardandoFila,
      icon: TicketIcon,
      accent: "#DC2626",
      chipBg: "bg-red-50 dark:bg-red-500/15",
      chipText: "text-red-600 dark:text-red-400",
      bar: "bg-red-500",
      helper: "Chamados na fila de espera",
    },
    {
      title: "Aguardando Atendimento",
      count: stats.aguardandoAtendimento,
      icon: Clock,
      accent: "#D97706",
      chipBg: "bg-amber-50 dark:bg-amber-500/15",
      chipText: "text-amber-600 dark:text-amber-400",
      bar: "bg-amber-500",
      helper: "Prontos para serem assumidos",
    },
    {
      title: "Em Atendimento",
      count: stats.emAtendimento,
      icon: Activity,
      accent: "#059669",
      chipBg: "bg-emerald-50 dark:bg-emerald-500/15",
      chipText: "text-emerald-600 dark:text-emerald-400",
      bar: "bg-emerald-500",
      helper: "Sendo tratados agora",
    },
    {
      title: "Atendidos Hoje",
      count: stats.atendidosHoje,
      icon: CheckCircle,
      accent: "#0F766E",
      chipBg: "bg-teal-50 dark:bg-teal-500/15",
      chipText: "text-teal-700 dark:text-brand",
      bar: "bg-brand",
      helper: "Resolvidos com sucesso",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in p-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row justify-between sm:items-center gap-4"
      >
        <div>
          <h2 className="text-2xl font-display font-bold text-text-primary">Dashboard Geral</h2>
          <p className="text-xs text-text-secondary mt-1 font-semibold">Visão consolidada do fluxo de atendimento em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-text-secondary px-3 py-2 rounded-xl border border-border bg-surface shadow-sm">
            <Settings size={15} className="text-text-muted" />
            <div className="relative flex items-center">
              <select
                value={refreshRate}
                onChange={(e) => setRefreshRate(Number(e.target.value))}
                className="appearance-none bg-transparent pr-5 outline-none cursor-pointer font-bold text-text-primary"
              >
                <option value={10}>Atualiza a cada 10s</option>
                <option value={30}>Atualiza a cada 30s</option>
                <option value={60}>Atualiza a cada 60s</option>
              </select>
              <ChevronDown size={13} className="absolute right-0 pointer-events-none text-text-muted" />
            </div>
          </div>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-xl border transition-all duration-200 shadow-sm cursor-pointer ${
              notificationsEnabled
                ? "text-brand border-brand/30 bg-brand-light hover:bg-brand/15"
                : "text-text-muted border-border bg-surface hover:bg-background-subtle"
            }`}
          >
            {notificationsEnabled ? <Bell size={15} /> : <BellOff size={15} />}
            <span>Notificações: {notificationsEnabled ? "Ligado" : "Desligado"}</span>
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="relative rounded-2xl bg-surface border border-border shadow-sm overflow-hidden group transition-all duration-250 hover:-translate-y-1 hover:shadow-lg hover:border-border-strong"
            >
              {/* Solid top accent bar */}
              <div className={`h-1 w-full ${card.bar}`} />

              <div className="p-5">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-text-secondary">
                    {card.title}
                  </span>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.chipBg} ${card.chipText} group-hover:scale-110 transition-transform duration-250`}>
                    <Icon size={18} strokeWidth={2.4} />
                  </div>
                </div>

                <div
                  className="text-5xl font-display font-extrabold mt-3 mb-1 tabular-nums leading-none"
                  style={{ color: card.accent }}
                >
                  <CountUp value={card.count} />
                </div>
                <p className="text-[11px] text-text-secondary font-semibold">{card.helper}</p>

                <div className="mt-4 pt-3 border-t border-border flex items-center text-[10px] font-bold text-text-secondary gap-1">
                  <ArrowUpRight size={12} className={card.chipText} />
                  <span>Atualizado agora</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Latest tickets */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.26 }}
        className="rounded-2xl bg-surface border border-border shadow-sm p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-display font-bold text-text-primary flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand" />
            Últimos atendimentos
          </h3>
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">{tickets.length} no total</span>
        </div>
        <div className="space-y-2.5">
          {tickets.slice(0, 5).map((t, idx) => {
            const assignedUser = users.find(u => u.email === t.assignedToEmail);
            const statusStyle = STATUS_STYLES[t.status] || STATUS_STYLES["Aguardando"];
            const initials = assignedUser?.name ? assignedUser.name.substring(0, 2).toUpperCase() : "??";
            const gradient = avatarGradient(assignedUser?.name || t.id);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.32 + idx * 0.05 }}
                className="flex items-center justify-between p-3.5 bg-background-subtle hover:bg-surface-hover rounded-xl border border-border hover:border-border-strong transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {assignedUser?.avatar ? (
                    <img src={assignedUser.avatar} alt={assignedUser.name} className="w-9 h-9 rounded-full flex-shrink-0" />
                  ) : (
                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-extrabold text-white flex-shrink-0 shadow-sm`}>
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-text-primary truncate">{t.title}</div>
                    <div className="text-[11px] text-text-secondary font-medium">
                      Analista: {assignedUser?.name || "Não atribuído"}
                    </div>
                  </div>
                </div>
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                  {t.status}
                </span>
              </motion.div>
            );
          })}
          {tickets.length === 0 && (
            <div className="text-center py-10 text-text-muted text-xs font-semibold">Nenhum chamado registrado ainda.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
