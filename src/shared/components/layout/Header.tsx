import React from "react";
import {
  ChevronRight,
  Clock,
  Sun,
  Moon,
  Bell,
  Plus,
  Activity,
} from "lucide-react";
import { AppNotification, UserProfile } from '../../../types';
interface HeaderProps {
  user?: UserProfile | null;
  activeTab:
    | "dashboard"
    | "chamados"
    | "relatorios"
    | "configuracoes"
    | "perfil"
    | "device_intelligence"
    | "licencas";
  theme: "claro" | "escuro";
  setTheme: (theme: "claro" | "escuro") => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  notifications: AppNotification[];
  handleMarkNotificationsRead: () => void;
  setIsNewTicketOpen: (open: boolean) => void;
  setIsMobileMenuOpen: (open: boolean) => void;
  currentTime?: Date;
  showToast?: (msg: string, type?: "success" | "info" | "error") => void;
}
export function Header({
  user,
  activeTab,
  theme,
  setTheme,
  showNotifications,
  setShowNotifications,
  notifications,
  handleMarkNotificationsRead,
  setIsNewTicketOpen,
  setIsMobileMenuOpen,
  currentTime = new Date(),
  showToast = () => {},
}: HeaderProps) {
  return (
    <header
      className="h-16 flex-shrink-0 flex items-center justify-between px-8 border-b border-border bg-surface transition-colors duration-200"
    >
      <div className="flex items-center space-x-4">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden text-text-secondary hover:text-text-primary focus:outline-none"
        >
          <Activity className="w-6 h-6" />
        </button>
        <div className="flex items-center space-x-2 text-sm text-text-muted">
          <span>Operações</span>
          <ChevronRight className="w-4 h-4" />
          <span className="font-semibold text-text-primary capitalize">
            {activeTab}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="hidden sm:flex items-center space-x-2 text-xs font-data text-text-muted bg-background px-3 py-1.5 rounded-lg border border-border">
          <Clock className="w-3.5 h-3.5" />
          <span>{currentTime.toLocaleTimeString('pt-BR')}</span>
        </div>

        <button
          onClick={() => setTheme(theme === 'escuro' ? 'claro' : 'escuro')}
          className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-background-subtle border-none cursor-pointer bg-transparent transition-colors"
          title={`Alternar para modo ${theme === 'escuro' ? 'claro' : 'escuro'}`}
        >
          {theme === 'escuro' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-background-subtle border-none cursor-pointer bg-transparent transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
            )}
          </button>
        </div>

        <button
          onClick={() => setIsNewTicketOpen(true)}
          className="btn-premium-primary text-xs px-3 py-1.5 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Novo Chamado</span>
        </button>
      </div>
    </header>
  );
}
