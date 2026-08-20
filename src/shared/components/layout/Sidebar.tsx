import React from "react";
import { Key,
  LayoutDashboard,
  Ticket as TicketIcon,
  BarChart3,
  Settings as SettingsIcon,
  MonitorSmartphone,
  X,
  LogOut,
  User,
  BookOpen,
  Bot
} from "lucide-react";
import { UserProfile } from '../../../types';
import { navigate } from '../../../lib/router';
interface SidebarProps {
  activeTab:
    | "dashboard"
    | "chamados"
    | "relatorios"
    | "configuracoes"
    | "perfil"
    | "device_intelligence"
    | "licencas";
  setActiveTab: (
    tab:
      | "dashboard"
      | "chamados"
      | "relatorios"
      | "configuracoes"
      | "perfil"
      | "device_intelligence"
      | "licencas",
  ) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  activeTicketsCount: number;
  user: UserProfile | null;
  logout: () => void;
}
export function Sidebar({
  activeTab,
  setActiveTab,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  activeTicketsCount,
  user,
  logout,
}: SidebarProps) {
  const getInitials = (name: string) => {
    return (
      name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };
  return (
    <aside
      id="sidebar-navigation"
      className={`w-64 flex-shrink-0 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0 fixed inset-y-0 left-0 z-40" : "-translate-x-full md:relative md:flex"} bg-sidebar-bg border-r border-sidebar-border shadow-lg`}
    >
      {" "}
      <div>
        {" "}
        {/* Logo Brand Header */}{" "}
        <div className="p-6 flex items-center justify-between border-b border-sidebar-border">
          {" "}
          <div className="flex items-center space-x-3">
            {" "}
            <img src="/logo.jpg" alt="AcmeCorp Logo" className="w-10 h-10 rounded-xl object-contain bg-surface border border-sidebar-border shadow-md" />
            <div className="flex flex-col">
              {" "}
              <span className="text-text-primary font-bold leading-none tracking-tight text-lg">
                AcmeCorp
              </span>{" "}
              <span className="text-[10px] text-text-secondary uppercase tracking-widest font-semibold mt-0.5">
                Ops Center
              </span>{" "}
            </div>{" "}
          </div>{" "}
          {/* Close button for mobile menu */}{" "}
          <button
            aria-label="Fechar menu lateral"
            className="md:hidden text-text-secondary hover:text-text-primary"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {" "}
            <X className="w-6 h-6" />{" "}
          </button>{" "}
        </div>{" "}
        {/* Navigation Menu */}{" "}
        <nav className="flex-1 px-4 mt-6 space-y-1.5">
          {" "}
          {user?.role !== 'Colaborador' && (
          <button
            onClick={() => {
              setActiveTab("dashboard");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 text-left font-medium text-sm border ${activeTab === "dashboard" ? "bg-brand/10 text-brand border-brand/20 shadow-[0_0_12px_rgba(127,216,190,0.12)] font-semibold" : "text-text-secondary border-transparent hover:bg-white/5 hover:text-text-primary"}`}
          >
            {" "}
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />{" "}
            <span>Dashboard Principal</span>{" "}
          </button>
          )}{" "}
          <button
            onClick={() => {
              setActiveTab("chamados");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 text-left font-medium text-sm border ${activeTab === "chamados" ? "bg-brand/10 text-brand border-brand/20 shadow-[0_0_12px_rgba(127,216,190,0.12)] font-semibold" : "text-text-secondary border-transparent hover:bg-white/5 hover:text-text-primary"}`}
          >
            {" "}
            <TicketIcon className="w-5 h-5 flex-shrink-0" />{" "}
            <div className="flex-1 flex justify-between items-center">
              {" "}
              <span>{user?.role === 'Colaborador' ? 'Meus Chamados' : 'Central de Chamados'}</span>{" "}
              {activeTicketsCount > 0 && (
                <span className="bg-danger text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {" "}
                  {activeTicketsCount}{" "}
                </span>
              )}{" "}
            </div>{" "}
          </button>{" "}
          {user?.role !== 'Colaborador' && (
          <button
            onClick={() => {
              setActiveTab("relatorios");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 text-left font-medium text-sm border ${activeTab === "relatorios" ? "bg-brand/10 text-brand border-brand/20 shadow-[0_0_12px_rgba(127,216,190,0.12)] font-semibold" : "text-text-secondary border-transparent hover:bg-white/5 hover:text-text-primary"}`}
          >
            {" "}
            <BarChart3 className="w-5 h-5 flex-shrink-0" />{" "}
            <span>Relatórios & Metas</span>{" "}
          </button>
          )}{" "}
          {user?.role !== 'Colaborador' && (
          <button
            onClick={() => {
              setActiveTab("device_intelligence");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 text-left font-medium text-sm border ${activeTab === "device_intelligence" ? "bg-brand/10 text-brand border-brand/20 shadow-[0_0_12px_rgba(127,216,190,0.12)] font-semibold" : "text-text-secondary border-transparent hover:bg-white/5 hover:text-text-primary"}`}
          >
            {" "}
            <MonitorSmartphone className="w-5 h-5 flex-shrink-0" />{" "}
            <span>Device Intelligence</span>{" "}
          </button>
          )}{" "}
                    {user?.role !== 'Colaborador' && (
          <button
            onClick={() => {
              setActiveTab("licencas");
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 text-left font-medium text-sm border ${activeTab === "licencas" ? "bg-brand/10 text-brand border-brand/20 shadow-[0_0_12px_rgba(127,216,190,0.12)] font-semibold" : "text-text-secondary border-transparent hover:bg-white/5 hover:text-text-primary"}`}
          >
            <Key className="w-5 h-5 flex-shrink-0" />
            <span>Licenças Microsoft</span>
          </button>
          )}

          {/* Enterprise IA & Knowledge Links */}
          <div className="pt-4 my-2 border-t border-sidebar-border/50">
            <span className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-2">
              Enterprise IA
            </span>
            {user?.role !== 'Colaborador' && (
              <button
                onClick={() => {
                  navigate('#/base-conhecimento');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-150 text-left font-medium text-sm border text-text-secondary border-transparent hover:bg-white/5 hover:text-text-primary"
              >
                <BookOpen className="w-5 h-5 flex-shrink-0 text-cyan-400" />
                <span>Base de Conhecimento</span>
              </button>
            )}
            <button
              onClick={() => {
                navigate('#/');
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-150 text-left font-medium text-sm border text-text-secondary border-transparent hover:bg-white/5 hover:text-text-primary"
            >
              <Bot className="w-5 h-5 flex-shrink-0 text-blue-400" />
              <span>Assistente IA (SupportAI)</span>
            </button>
          </div>
          {user?.role !== 'Colaborador' && (
          <div className="pt-6 my-4 border-t border-sidebar-border">
            {" "}
            <span className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest block mb-2">
              Simulação & Ajustes
            </span>{" "}
            <button
              onClick={() => {
                setActiveTab("configuracoes");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-150 text-left font-medium text-sm border ${activeTab === "configuracoes" ? "bg-brand/10 text-brand border-brand/20 shadow-[0_0_12px_rgba(127,216,190,0.12)] font-semibold" : "text-text-secondary border-transparent hover:bg-white/5 hover:text-text-primary"}`}
            >
              {" "}
              <SettingsIcon className="w-5 h-5 flex-shrink-0" />{" "}
              <span>Painel de Controle</span>{" "}
            </button>{" "}
          </div>
          )}{" "}
        </nav>{" "}
      </div>{" "}
      {/* Bottom User profile card */}{" "}
      <div className="p-4 border-t border-sidebar-border bg-background-subtle/40 flex flex-col space-y-3">
        {" "}
        <button
          onClick={() => {
            setActiveTab("perfil");
            setIsMobileMenuOpen(false);
          }}
          className="flex items-center space-x-3 justify-between hover:bg-white/5 p-2 rounded-xl transition-colors cursor-pointer text-left border-none outline-none"
        >
          {" "}
          <div className="flex items-center space-x-3">
            {" "}
            <div className="w-9 h-9 rounded-full bg-brand/15 flex items-center justify-center text-sm font-bold text-brand border border-brand/35">
              {" "}
              {user ? getInitials(user.name) : "JS"}{" "}
            </div>{" "}
            <div className="flex flex-col">
              {" "}
              <span className="text-xs text-text-primary font-bold leading-tight">
                {user ? user.name : "João Silva"}
              </span>{" "}
              <span className="text-[9px] text-text-secondary uppercase tracking-wider font-semibold">
                {user ? user.role : "Administrador"}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          <div
            className="w-2 h-2 rounded-full bg-accent shadow-sm animate-pulse"
            title="Sessão Operacional Conectada"
          />{" "}
        </button>{" "}
        {/* Logout Trigger button */}{" "}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-lg bg-red-950/20 hover:bg-red-900/30 text-red-200/80 hover:text-white text-[10px] font-bold uppercase tracking-wider border border-red-900/40 transition-all cursor-pointer"
        >
          {" "}
          <LogOut className="w-3.5 h-3.5" /> <span>Encerrar Sessão</span>{" "}
        </button>{" "}
      </div>{" "}
    </aside>
  );
}
