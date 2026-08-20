import React, { useEffect, useState } from "react";
import { Search, X, Check, Trash2, Laptop, RotateCcw, CheckCircle2, AlertCircle } from "lucide-react";
import { Ticket, UserProfile } from '../../types';
interface ChamadosTabProps {
  user?: UserProfile | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  filteredTickets: Ticket[];
  totalTicketsCount: number;
  setSelectedTicket: (ticket: Ticket) => void;
  handleUpdateStatus: (id: string, status: Ticket["status"]) => void;
  handleDeleteTicket: (id: string) => void;
  showToast: (msg: string, type?: "success" | "info" | "error") => void;
  isCompact?: boolean;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}
export function ChamadosTab({
  user,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
  filteredTickets,
  totalTicketsCount,
  setSelectedTicket,
  handleUpdateStatus,
  handleDeleteTicket,
  showToast,
  isCompact = false,
  currentPage,
  setCurrentPage,
}: ChamadosTabProps) {
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);
  const [deviceMap, setDeviceMap] = React.useState<Record<string, { id: string; name: string; model?: string }>>({});
  const [resolvedPage, setResolvedPage] = React.useState<number>(1);

  React.useEffect(() => {
    fetch('/api/devices')
      .then(res => res.ok ? res.json() : [])
      .then(devices => {
        const map: Record<string, { id: string; name: string; model?: string }> = {};
        const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
        
        devices.forEach((d: any) => {
          if (d.id) map[d.id] = { id: d.id, name: d.name, model: d.model };
          if (d.user) {
            const normUser = normalize(d.user);
            if (normUser) map[`user:${normUser}`] = { id: d.id, name: d.name, model: d.model };
          }
        });
        setDeviceMap(map);
      })
      .catch(() => {});
  }, []);

  // Separate tickets into pending vs resolved boxes
  const chamadosPendentes = React.useMemo(() => {
    return filteredTickets.filter(t => t.status !== "Resolvido");
  }, [filteredTickets]);

  const chamadosResolvidos = React.useMemo(() => {
    return filteredTickets.filter(t => t.status === "Resolvido");
  }, [filteredTickets]);

  const PAGE_SIZE = 10;
  const paginatedPendentes = React.useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return chamadosPendentes.slice(start, start + PAGE_SIZE);
  }, [chamadosPendentes, currentPage]);

  const paginatedResolvidos = React.useMemo(() => {
    const start = (resolvedPage - 1) * PAGE_SIZE;
    return chamadosResolvidos.slice(start, start + PAGE_SIZE);
  }, [chamadosResolvidos, resolvedPage]);

  React.useEffect(() => {
    setFocusedIndex(-1);
  }, [paginatedPendentes]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement && 
          (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
        const inputId = document.activeElement.id;
        if (inputId && inputId !== "search-query-input") {
          return;
        }
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < paginatedPendentes.length - 1 ? prev + 1 : prev));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === "Enter") {
        if (focusedIndex >= 0 && focusedIndex < paginatedPendentes.length) {
          e.preventDefault();
          setSelectedTicket(paginatedPendentes[focusedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [paginatedPendentes, focusedIndex, setSelectedTicket]);

  const cellPadding = isCompact ? "px-4 py-1.5" : "px-6 py-4";

  return (
    <div className="space-y-6 animate-fade-in">
      {user?.role !== 'Colaborador' && (
      <div className="p-6 surface-card mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search box */}
          <div className="w-full lg:w-1/3 relative">
            <Search className="w-4 h-4 absolute left-3 top-3.5 text-text-muted" />
            <input
              type="text"
              id="search-query-input"
              placeholder="Pesquisar por ID, título, usuário ou descrição..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs input-premium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-3.5 text-text-muted hover:text-text-secondary bg-transparent border-none cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* Dropdown Filters and status buttons */}
          <div className="w-full lg:w-auto flex flex-wrap gap-3 items-center justify-end">
            {/* Status Select */}
            <div className="flex items-center space-x-1">
              <span className="ledger-title mr-1 hidden sm:inline">
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs rounded-xl px-3 py-2 border border-border bg-surface text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/30 font-semibold cursor-pointer"
              >
                <option value="Todos">Todos os Status</option>
                <option value="Crítico">Crítico</option>
                <option value="Aguardando">Aguardando</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Resolvido">Resolvido</option>
              </select>
            </div>
            {/* Category Select */}
            <div className="flex items-center space-x-1">
              <span className="ledger-title mr-1 hidden sm:inline">
                Setor:
              </span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs rounded-xl px-3 py-2 border border-border bg-surface text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/30 font-semibold cursor-pointer"
              >
                <option value="Todos">Todas Áreas</option>
                <option value="Infraestrutura">Infraestrutura</option>
                <option value="Permissões">Permissões</option>
                <option value="Rede">Rede</option>
                <option value="Software">Software</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>
            {/* Priority Select */}
            <div className="flex items-center space-x-1">
              <span className="ledger-title mr-1 hidden sm:inline">
                Prioridade:
              </span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="text-xs rounded-xl px-3 py-2 border border-border bg-surface text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/30 font-semibold cursor-pointer"
              >
                <option value="Todos">Qualquer Nível</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>
            {/* Clear Filters Indicator */}
            {(statusFilter !== "Todos" ||
              categoryFilter !== "Todos" ||
              priorityFilter !== "Todos" ||
              searchQuery !== "") && (
              <button
                onClick={() => {
                  setStatusFilter("Todos");
                  setCategoryFilter("Todos");
                  setPriorityFilter("Todos");
                  setSearchQuery("");
                  showToast("Filtros de busca limpos.", "info");
                }}
                className="text-xs text-danger font-bold hover:underline ml-1 cursor-pointer bg-transparent border-none"
                title="Limpar todos os filtros ativos"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* SECTION 1: CAIXA DE CHAMADOS PENDENTES / EM ATENDIMENTO */}
      {statusFilter !== "Resolvido" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-brand" />
              <h3 className="text-sm font-bold text-text-primary font-display">
                Chamados Pendentes & Em Atendimento
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-brand/10 text-brand border border-brand/20">
                {chamadosPendentes.length}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border shadow-sm overflow-hidden bg-surface surface-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                  <tr>
                    {user?.role !== 'Colaborador' && <th className={cellPadding}>ID</th>}
                    <th className={cellPadding}>Título do Chamado</th>
                    <th className={cellPadding}>Usuário / Requisitante</th>
                    <th className={cellPadding}>Prioridade</th>
                    <th className={cellPadding}>Área de Atuação</th>
                    <th className={cellPadding}>Status</th>
                    <th className={cellPadding}>Data Registro</th>
                    <th className={`${cellPadding} text-right`}>Ações</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 [#2E3A46]">
                  {paginatedPendentes.map((ticket, index) => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className={`cursor-pointer transition-colors duration-150 ${index === focusedIndex ? "bg-[#17463C]/60 border-l-2 border-l-brand" : "hover:bg-slate-100/10 :hover:bg-slate-800/50"}`}
                    >
                      {user?.role !== 'Colaborador' && (
                        <td className={`${cellPadding} font-data font-bold text-brand`}>
                          {ticket.id}
                        </td>
                      )}
                      <td className={cellPadding}>
                        <div className="font-bold text-text-primary">
                          {ticket.title}
                        </div>
                        <div className="text-[11px] text-text-muted truncate max-w-xs">
                          {ticket.description}
                        </div>
                      </td>
                      <td className={`${cellPadding} font-semibold text-text-primary`}>
                        <div>{ticket.user}</div>
                        {(() => {
                          const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
                          const dev = (ticket.assetId && deviceMap[ticket.assetId]) || deviceMap[`user:${normalize(ticket.user)}`];
                          if (dev) {
                            return (
                              <div className="text-[10px] text-brand font-data flex items-center gap-1 mt-0.5 font-bold">
                                <Laptop className="w-3 h-3 text-brand" />
                                <span>{dev.name} ({dev.id})</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className={cellPadding}>
                        <div className="flex items-center space-x-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${ticket.priority === "Alta" ? "bg-danger" : ticket.priority === "Média" ? "bg-amber-400" : "bg-slate-300"}`}
                          />
                          <span className="font-semibold">
                            {ticket.priority}
                          </span>
                        </div>
                      </td>
                      <td className={`${cellPadding} font-semibold text-text-muted`}>
                        {ticket.category}
                      </td>
                      <td className={cellPadding}>
                        <span
                          className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${ticket.status === "Crítico" ? "bg-danger-light text-danger border-[#FEE2E2]" : ticket.status === "Aguardando" ? "bg-warning-light text-warning border-[#FEF3C7]" : ticket.status === "Em Análise" ? "bg-background-subtle text-brand border-[#EFF6FF]" : "bg-success-light text-accent border-[#DCFCE7]"}`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className={`${cellPadding} text-text-muted font-data`}>
                        {ticket.createdAt}
                      </td>
                      <td
                        className={`${cellPadding} text-right`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() =>
                              handleUpdateStatus(ticket.id, "Resolvido")
                            }
                            className="p-1.5 bg-accent-light text-accent rounded-lg hover:bg-emerald-500/20 transition-colors cursor-pointer border-none flex items-center gap-1 text-[11px] font-bold"
                            title="Marcar como Resolvido"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Resolver</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="p-1.5 bg-red-50 text-danger rounded-lg hover:bg-danger-light transition-colors cursor-pointer border-none"
                            title="Excluir chamado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {chamadosPendentes.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-10 text-center text-text-muted text-sm font-semibold"
                      >
                        <div className="flex flex-col items-center justify-center opacity-60">
                          <CheckCircle2 className="w-8 h-8 mb-2 text-brand opacity-60" />
                          <p>Nenhum chamado pendente no momento!</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for pending */}
            {(() => {
              const startIdx = chamadosPendentes.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
              const endIdx = Math.min(currentPage * PAGE_SIZE, chamadosPendentes.length);
              const totalPages = Math.max(1, Math.ceil(chamadosPendentes.length / PAGE_SIZE));
              return (
                <div className="p-4 bg-background-subtle border-t border-slate-100 text-xs font-semibold text-text-muted flex justify-between items-center">
                  <span>
                    Exibindo {startIdx}–{endIdx} de {chamadosPendentes.length} chamados pendentes
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        if (currentPage > 1) {
                          setCurrentPage(currentPage - 1);
                        }
                      }}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 bg-surface border border-border rounded-lg text-text-primary transition-all ${
                        currentPage === 1
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-background-subtle cursor-pointer hover:border-brand"
                      }`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => {
                        if (currentPage < totalPages) {
                          setCurrentPage(currentPage + 1);
                        }
                      }}
                      disabled={currentPage >= totalPages}
                      className={`px-3 py-1 bg-surface border border-border rounded-lg text-text-primary transition-all ${
                        currentPage >= totalPages
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-background-subtle cursor-pointer hover:border-brand"
                      }`}
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* SECTION 2: CAIXA DE CHAMADOS RESOLVIDOS (SEPARATE BOX) */}
      {(statusFilter === "Todos" || statusFilter === "Resolvido") && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-text-primary font-display">
                Caixa de Chamados Resolvidos
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {chamadosResolvidos.length}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border shadow-sm overflow-hidden bg-surface surface-card border-l-4 border-l-emerald-500">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="text-[10px] uppercase font-bold text-text-muted tracking-wider bg-emerald-500/5">
                  <tr>
                    {user?.role !== 'Colaborador' && <th className={cellPadding}>ID</th>}
                    <th className={cellPadding}>Título do Chamado</th>
                    <th className={cellPadding}>Usuário / Requisitante</th>
                    <th className={cellPadding}>Prioridade</th>
                    <th className={cellPadding}>Área de Atuação</th>
                    <th className={cellPadding}>Status</th>
                    <th className={cellPadding}>Data Registro</th>
                    <th className={`${cellPadding} text-right`}>Ações</th>
                  </tr>
                </thead>
                <tbody className="text-xs divide-y divide-slate-100 [#2E3A46]">
                  {paginatedResolvidos.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="cursor-pointer transition-colors duration-150 hover:bg-emerald-500/5 opacity-80 hover:opacity-100"
                    >
                      {user?.role !== 'Colaborador' && (
                        <td className={`${cellPadding} font-data font-bold text-emerald-600 dark:text-emerald-400`}>
                          {ticket.id}
                        </td>
                      )}
                      <td className={cellPadding}>
                        <div className="font-bold text-text-primary line-through decoration-emerald-500/50">
                          {ticket.title}
                        </div>
                        <div className="text-[11px] text-text-muted truncate max-w-xs">
                          {ticket.description}
                        </div>
                      </td>
                      <td className={`${cellPadding} font-semibold text-text-primary`}>
                        <div>{ticket.user}</div>
                        {(() => {
                          const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
                          const dev = (ticket.assetId && deviceMap[ticket.assetId]) || deviceMap[`user:${normalize(ticket.user)}`];
                          if (dev) {
                            return (
                              <div className="text-[10px] text-emerald-600 font-data flex items-center gap-1 mt-0.5 font-bold">
                                <Laptop className="w-3 h-3 text-emerald-600" />
                                <span>{dev.name} ({dev.id})</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td className={cellPadding}>
                        <div className="flex items-center space-x-1.5 opacity-60">
                          <span
                            className={`w-2 h-2 rounded-full ${ticket.priority === "Alta" ? "bg-danger" : ticket.priority === "Média" ? "bg-amber-400" : "bg-slate-300"}`}
                          />
                          <span className="font-semibold">
                            {ticket.priority}
                          </span>
                        </div>
                      </td>
                      <td className={`${cellPadding} font-semibold text-text-muted`}>
                        {ticket.category}
                      </td>
                      <td className={cellPadding}>
                        <span className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                          Resolvido
                        </span>
                      </td>
                      <td className={`${cellPadding} text-text-muted font-data`}>
                        {ticket.createdAt}
                      </td>
                      <td
                        className={`${cellPadding} text-right`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleUpdateStatus(ticket.id, "Em Análise")}
                            className="px-2.5 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer border border-amber-500/20 flex items-center space-x-1 text-xs font-bold"
                            title="Reabrir Chamado"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reabrir</span>
                          </button>
                          <button
                            onClick={() => handleDeleteTicket(ticket.id)}
                            className="p-1.5 bg-red-50 text-danger rounded-lg hover:bg-danger-light transition-colors cursor-pointer border-none"
                            title="Excluir chamado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {chamadosResolvidos.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-10 text-center text-text-muted text-sm font-semibold"
                      >
                        <div className="flex flex-col items-center justify-center opacity-60">
                          <p>Nenhum chamado resolvido nesta visualização.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for resolved */}
            {(() => {
              const startIdx = chamadosResolvidos.length === 0 ? 0 : (resolvedPage - 1) * PAGE_SIZE + 1;
              const endIdx = Math.min(resolvedPage * PAGE_SIZE, chamadosResolvidos.length);
              const totalPages = Math.max(1, Math.ceil(chamadosResolvidos.length / PAGE_SIZE));
              return (
                <div className="p-4 bg-background-subtle border-t border-slate-100 text-xs font-semibold text-text-muted flex justify-between items-center">
                  <span>
                    Exibindo {startIdx}–{endIdx} de {chamadosResolvidos.length} chamados resolvidos
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        if (resolvedPage > 1) {
                          setResolvedPage(resolvedPage - 1);
                        }
                      }}
                      disabled={resolvedPage === 1}
                      className={`px-3 py-1 bg-surface border border-border rounded-lg text-text-primary transition-all ${
                        resolvedPage === 1
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-background-subtle cursor-pointer hover:border-brand"
                      }`}
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => {
                        if (resolvedPage < totalPages) {
                          setResolvedPage(resolvedPage + 1);
                        }
                      }}
                      disabled={resolvedPage >= totalPages}
                      className={`px-3 py-1 bg-surface border border-border rounded-lg text-text-primary transition-all ${
                        resolvedPage >= totalPages
                          ? "opacity-40 cursor-not-allowed"
                          : "hover:bg-background-subtle cursor-pointer hover:border-brand"
                      }`}
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
