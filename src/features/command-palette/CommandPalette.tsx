import React, { useState, useEffect, useRef } from "react";
import { Search, Terminal, FileText, Settings, User, ArrowRight, X } from "lucide-react";
import { Ticket } from '../../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  tickets: Ticket[];
  onNavigate: (tab: "dashboard" | "chamados" | "relatorios" | "configuracoes" | "perfil") => void;
  onSelectTicket: (ticket: Ticket) => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  tickets,
  onNavigate,
  onSelectTicket,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle outside click to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen, onClose]);

  // Compute results
  const results = React.useMemo(() => {
    const navOptions = [
      { id: "nav-dashboard", type: "nav", label: "Ir para Dashboard", icon: Terminal, action: () => onNavigate("dashboard") },
      { id: "nav-chamados", type: "nav", label: "Ir para Central de Chamados", icon: FileText, action: () => onNavigate("chamados") },
      { id: "nav-relatorios", type: "nav", label: "Ir para Relatórios", icon: FileText, action: () => onNavigate("relatorios") },
      { id: "nav-configuracoes", type: "nav", label: "Ir para Configurações", icon: Settings, action: () => onNavigate("configuracoes") },
      { id: "nav-perfil", type: "nav", label: "Ir para Meu Perfil", icon: User, action: () => onNavigate("perfil") },
    ];

    const cleanQuery = query.toLowerCase().trim();

    if (!cleanQuery) {
      // Show navigation options and 5 recent tickets
      const recentTickets = tickets.slice(0, 5).map(t => ({
        id: `ticket-${t.id}`,
        type: "ticket",
        label: `${t.id} - ${t.title}`,
        subtitle: `Solicitante: ${t.user} | Status: ${t.status}`,
        icon: FileText,
        action: () => onSelectTicket(t)
      }));
      return [...navOptions, ...recentTickets];
    }

    // Filtered search
    const filteredNav = navOptions.filter(o => o.label.toLowerCase().includes(cleanQuery));
    const filteredTickets = tickets
      .filter(t => 
        t.id.toLowerCase().includes(cleanQuery) ||
        t.title.toLowerCase().includes(cleanQuery) ||
        t.user.toLowerCase().includes(cleanQuery)
      )
      .map(t => ({
        id: `ticket-${t.id}`,
        type: "ticket",
        label: `${t.id} - ${t.title}`,
        subtitle: `Solicitante: ${t.user} | Status: ${t.status}`,
        icon: FileText,
        action: () => onSelectTicket(t)
      }));

    return [...filteredNav, ...filteredTickets];
  }, [query, tickets, onNavigate, onSelectTicket]);

  // Handle key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          results[selectedIndex].action();
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, results, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[100] flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
      <div
        ref={containerRef}
        className="w-full max-w-xl bg-surface border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[50vh] text-text-primary"
      >
        {/* Search Input Header */}
        <div className="flex items-center space-x-3 px-4 py-3.5 border-b border-border bg-background-subtle/50">
          <Search className="w-5 h-5 text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none text-sm font-semibold focus:outline-none placeholder-text-muted text-text-primary"
            placeholder="Digite para buscar chamados (ID, título, requisitante) ou atalhos..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-border text-text-muted transition-colors cursor-pointer border-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-border/20">
          {results.length > 0 ? (
            results.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-brand text-white dark:text-[#081B16] font-bold"
                      : "hover:bg-background-subtle"
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-white dark:text-[#081B16]" : "text-text-muted"}`} />
                    <div className="min-w-0">
                      <p className="text-xs truncate font-semibold">{item.label}</p>
                      {item.type === "ticket" && (
                        <p className={`text-[10px] truncate ${isSelected ? "text-white/80 dark:text-[#081B16]/80" : "text-text-muted"}`}>
                          {(item as any).subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <ArrowRight className="w-4 h-4 animate-pulse flex-shrink-0 text-white dark:text-[#081B16]" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-text-muted text-xs font-semibold">
              Nenhum atalho ou chamado correspondente encontrado.
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2 bg-background-subtle border-t border-border flex justify-between items-center text-[10px] font-semibold text-text-muted font-data uppercase tracking-wider">
          <span>Use as setas ↑↓ e Enter para navegar</span>
          <span>Esc para fechar</span>
        </div>
      </div>
    </div>
  );
}
