import React, { useState, useEffect } from "react";
import {
  Sliders,
  Trash2,
  Clock,
  CheckCircle,
  Users,
  UserPlus,
  Power,
  PowerOff,
} from "lucide-react";
import { UserRecord } from '../../types';
interface SlaConfig {
  id: string;
  priority: string;
  category: string;
  hours: number;
}
interface ConfiguracoesTabProps {
  simStorageOutage: boolean;
  setSimStorageOutage: (val: boolean) => void;
  simDbLatency: boolean;
  setSimDbLatency: (val: boolean) => void;
  handleResetDatabase: () => void;
  showToast: (msg: string, type?: "success" | "info" | "error") => void;
  csrfToken: string;
  userRole: string;
  onUnsavedChangesChange?: (val: boolean) => void;
  isCompact: boolean;
  setIsCompact: (val: boolean) => void;
}
export function ConfiguracoesTab({
  simStorageOutage,
  setSimStorageOutage,
  simDbLatency,
  setSimDbLatency,
  handleResetDatabase,
  showToast,
  csrfToken,
  userRole,
  onUnsavedChangesChange,
  isCompact,
  setIsCompact,
}: ConfiguracoesTabProps) {
  const [slaConfigs, setSlaConfigs] = useState<SlaConfig[]>([]);
  const [loadingSlas, setLoadingSlas] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<number | "">("");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "Suporte",
  });

  const originalHours = slaConfigs.find((c) => c.id === editingId)?.hours;
  const hasUnsavedChanges =
    editingId !== null &&
    editingValue !== "" &&
    Number(editingValue) !== originalHours;

  useEffect(() => {
    if (onUnsavedChangesChange) {
      onUnsavedChangesChange(hasUnsavedChanges);
    }
  }, [hasUnsavedChanges, onUnsavedChangesChange]);
  useEffect(() => {
    fetchSlas();
    if (userRole === "Administrador") {
      fetchUsers();
    }
  }, [userRole]);
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  };
  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email) {
      showToast("Nome e e-mail são obrigatórios", "error");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify(newUser),
      });
      if (res.ok) {
        showToast("Usuário criado com sucesso", "success");
        setShowNewUser(false);
        setNewUser({ name: "", email: "", role: "Suporte" });
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.error || "Erro ao criar", "error");
      }
    } catch (err) {
      showToast("Erro de comunicação", "error");
    }
  };
  const handleToggleUserActive = async (id: string, currentActive: boolean) => {
    try {
      const endpoint = currentActive ? `/api/users/${id}` : `/api/users/${id}`;
      /* Note: we can use PATCH to toggle active back on if needed. DELETE sets to false. */ const method =
        currentActive ? "DELETE" : "PATCH";
      const body = currentActive ? undefined : JSON.stringify({ active: true });
      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body,
      });
      if (res.ok) {
        showToast(
          currentActive ? "Usuário desativado" : "Usuário ativado",
          "success",
        );
        fetchUsers();
      } else {
        showToast("Erro ao alterar status", "error");
      }
    } catch (err) {
      showToast("Erro de comunicação", "error");
    }
  };
  const handleChangeRole = async (id: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        showToast("Perfil atualizado", "success");
        fetchUsers();
      } else {
        showToast("Erro ao atualizar perfil", "error");
      }
    } catch (err) {
      showToast("Erro de comunicação", "error");
    }
  };
  const fetchSlas = async () => {
    setLoadingSlas(true);
    try {
      const res = await fetch("/api/sla-configs");
      if (res.ok) {
        const data = await res.json();
        setSlaConfigs(data);
      }
    } catch (err) {
      console.error("Error fetching SLAs:", err);
    } finally {
      setLoadingSlas(false);
    }
  };
  const handleUpdateSla = async (id: string) => {
    if (editingValue === "" || Number(editingValue) <= 0) {
      showToast("O valor do SLA deve ser positivo", "error");
      return;
    }
    try {
      const res = await fetch(`/api/sla-configs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ hours: Number(editingValue) }),
      });
      if (res.ok) {
        showToast("SLA atualizado com sucesso!", "success");
        setEditingId(null);
        setEditingValue("");
        fetchSlas();
      } else {
        const err = await res.json();
        showToast(`Erro ao atualizar SLA: ${err.error}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Erro ao comunicar com servidor", "error");
    }
  };
  return (
    <div className="space-y-6 animate-fade-in">
      {" "}
      <div className="p-6 surface-card">
        {" "}
        <div className="flex items-center space-x-2.5 mb-6">
          {" "}
          <Sliders className="w-5 h-5 text-accent" />{" "}
          <h3 className="font-bold text-base text-brand">
            Controles do Simulador Operacional
          </h3>{" "}
        </div>{" "}
        <p className="text-xs text-text-muted mb-6">
          {" "}
          Este painel interativo permite simular falhas e eventos críticos na
          infraestrutura do sistema. Ao acionar os gatilhos abaixo, o painel do{" "}
          <strong>Estado da Infraestrutura</strong> na página principal
          atualizará instantaneamente seus valores, permitindo testar a lógica
          automatizada de resposta e triagem.{" "}
        </p>{" "}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {" "}
          {/* Outage Toggle 1 */}{" "}
          <div className="p-4 rounded-xl border border-border flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <h4 className="font-bold text-sm">
                Simular Falha na API de Storage
              </h4>{" "}
              <p className="text-[11px] text-text-muted mt-1">
                Derruba o monitoramento de envio de arquivos para 12% e gera
                alertas visuais vermelhos.
              </p>{" "}
            </div>{" "}
            <div className="flex items-center">
              {" "}
              <input
                type="checkbox"
                checked={simStorageOutage}
                onChange={(e) => {
                  setSimStorageOutage(e.target.checked);
                  showToast(
                    e.target.checked
                      ? "Simulação de falha de Storage iniciada."
                      : "API de Storage normalizada.",
                    e.target.checked ? "error" : "success",
                  );
                }}
                className="w-10 h-5 bg-slate-300 checked:bg-accent rounded-full cursor-pointer relative appearance-none"
              />{" "}
            </div>{" "}
          </div>{" "}
          {/* Outage Toggle 2 */}{" "}
          <div className="p-4 rounded-xl border border-border flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <h4 className="font-bold text-sm">
                Simular Lentidão no PostgreSQL
              </h4>{" "}
              <p className="text-[11px] text-text-muted mt-1">
                Força o monitor do banco de dados para o estado de
                latência"Lento" (amarelo).
              </p>{" "}
            </div>{" "}
            <div className="flex items-center">
              {" "}
              <input
                type="checkbox"
                checked={simDbLatency}
                onChange={(e) => {
                  setSimDbLatency(e.target.checked);
                  showToast(
                    e.target.checked
                      ? "Simulação de latência de banco iniciada."
                      : "Banco de dados normalizado.",
                    e.target.checked ? "error" : "success",
                  );
                }}
                className="w-10 h-5 bg-slate-300 checked:bg-accent rounded-full cursor-pointer relative appearance-none"
              />{" "}
            </div>{" "}
          </div>{" "}
          {/* Interface Toggle 3: Compact Mode */}
          <div className="p-4 rounded-xl border border-border flex items-center justify-between">
            {" "}
            <div>
              {" "}
              <h4 className="font-bold text-sm">
                Interface de Alta Densidade (Modo Compacto)
              </h4>{" "}
              <p className="text-[11px] text-text-muted mt-1">
                Reduz o espaçamento e padding das tabelas de chamados para
                exibir mais informações de uma vez.
              </p>{" "}
            </div>{" "}
            <div className="flex items-center">
              {" "}
              <input
                type="checkbox"
                checked={isCompact}
                onChange={(e) => {
                  setIsCompact(e.target.checked);
                  showToast(
                    e.target.checked
                      ? "Modo compacto de alta densidade ativado."
                      : "Modo de visualização padrão restaurado.",
                    "success",
                  );
                }}
                className="w-10 h-5 bg-slate-300 checked:bg-accent rounded-full cursor-pointer relative appearance-none"
              />{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        {/* Additional diagnostic triggers */}{" "}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap gap-4 justify-between items-center">
          {" "}
          <div>
            {" "}
            <h4 className="font-bold text-sm text-brand">
              Restaurar Banco de Dados Local
            </h4>{" "}
            <p className="text-xs text-text-muted mt-0.5">
              Retorna a listagem de chamados e históricos para os valores
              originais.
            </p>{" "}
          </div>{" "}
          <button
            onClick={handleResetDatabase}
            className="px-4 py-2 bg-background-subtle hover:bg-border text-brand :bg-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer border-none"
          >
            {" "}
            <Trash2 className="w-4 h-4" />{" "}
            <span>Redefinir Banco de Dados</span>{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
      {/* NOVO BLOCO: GERENCIAMENTO DE SLAS */}{" "}
      <div className="p-6 surface-card">
        {" "}
        <div className="flex items-center space-x-2.5 mb-6">
          {" "}
          <Clock className="w-5 h-5 text-accent" />{" "}
          <h3 className="font-bold text-base text-brand">
            Configurações de SLA (Horas)
          </h3>{" "}
        </div>{" "}
        <p className="text-xs text-text-muted mb-6">
          {" "}
          Define os prazos máximos para resolução dos chamados com base em
          Prioridade e Categoria. Edite os valores em horas.{" "}
        </p>{" "}
        {loadingSlas ? (
          <div className="space-y-3 animate-pulse mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex space-x-4 items-center">
                <div className="h-4 bg-background-subtle rounded w-1/4" />
                <div className="h-4 bg-background-subtle rounded w-1/4" />
                <div className="h-6 bg-background-subtle rounded w-16" />
                <div className="h-4 bg-background-subtle rounded w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {" "}
            <table className="w-full text-left text-xs">
              {" "}
              <thead>
                {" "}
                <tr className="border-b border-border text-text-muted uppercase tracking-wider text-[10px] font-bold">
                  {" "}
                  <th className="pb-3 pt-2">Prioridade</th>{" "}
                  <th className="pb-3 pt-2">Categoria</th>{" "}
                  <th className="pb-3 pt-2">Limite SLA (Horas)</th>{" "}
                  <th className="pb-3 pt-2">Ação</th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody>
                {" "}
                {slaConfigs.map((config) => (
                  <tr
                    key={config.id}
                    className="border-b border-slate-100 hover:bg-background-subtle :bg-surface/30"
                  >
                    {" "}
                    <td className="py-3 font-semibold">
                      {config.priority}
                    </td>{" "}
                    <td className="py-3 font-data text-[11px]">
                      {config.category}
                    </td>{" "}
                    <td className="py-3">
                      {" "}
                      {editingId === config.id ? (
                        <input
                          type="number"
                          step="0.1"
                          min="0.1"
                          className="w-20 px-2 py-1 text-xs rounded border border-border bg-surface text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/30 focus:outline-none"
                          value={editingValue}
                          onChange={(e) =>
                            setEditingValue(Number(e.target.value))
                          }
                        />
                      ) : (
                        <span className="font-data bg-background-subtle px-2 py-1 rounded">
                          {config.hours}h
                        </span>
                      )}{" "}
                    </td>{" "}
                    <td className="py-3">
                      {" "}
                      {editingId === config.id ? (
                        <div className="flex space-x-2">
                          {" "}
                          <button
                            onClick={() => handleUpdateSla(config.id)}
                            className="text-accent hover:text-brand font-bold flex items-center space-x-1"
                          >
                            {" "}
                            <CheckCircle className="w-3.5 h-3.5" />{" "}
                            <span>Salvar</span>{" "}
                          </button>{" "}
                          <button
                            onClick={() => {
                              setEditingId(null);
                              setEditingValue("");
                            }}
                            className="text-text-muted hover:text-text-secondary font-bold"
                          >
                            {" "}
                            Cancelar{" "}
                          </button>{" "}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(config.id);
                            setEditingValue(config.hours);
                          }}
                          className="text-brand hover:underline font-bold"
                        >
                          {" "}
                          Editar{" "}
                        </button>
                      )}{" "}
                    </td>{" "}
                  </tr>
                ))}{" "}
              </tbody>{" "}
            </table>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* BLOCO: GERENCIAMENTO DE USUÁRIOS (Apenas Admin) */}{" "}
      {userRole === "Administrador" && (
        <div className="p-6 surface-card">
          {" "}
          <div className="flex items-center justify-between mb-6">
            {" "}
            <div className="flex items-center space-x-2.5">
              {" "}
              <Users className="w-5 h-5 text-accent" />{" "}
              <h3 className="font-bold text-base text-brand">
                Gerenciamento de Operadores
              </h3>{" "}
            </div>{" "}
            <button
              onClick={() => setShowNewUser(!showNewUser)}
              className="px-3 py-1.5 bg-brand text-white dark:text-[#081B16] hover:bg-brand-hover rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 border-none cursor-pointer hover:shadow-[0_4px_12px_rgba(127,216,190,0.15)] active:scale-95"
            >
              {" "}
              <UserPlus className="w-4 h-4" /> <span>Novo Operador</span>{" "}
            </button>{" "}
          </div>{" "}
          <p className="text-xs text-text-muted mb-6">
            {" "}
            Gerencie os acessos ao painel AcmeCorp Ops Center. Operadores desativados
            não poderão realizar novas ações.{" "}
          </p>{" "}
          {showNewUser && (
            <div className="mb-6 p-5 rounded-2xl border border-border bg-background-subtle/50 space-y-4">
              {" "}
              <h4 className="text-sm font-bold">
                Adicionar Novo Operador
              </h4>{" "}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {" "}
                <input
                  type="text"
                  placeholder="Nome Completo"
                  value={newUser.name}
                  onChange={(e) =>
                    setNewUser({ ...newUser, name: e.target.value })
                  }
                  className="px-3 py-2 text-xs input-premium"
                />{" "}
                <input
                  type="email"
                  placeholder="E-mail"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser({ ...newUser, email: e.target.value })
                  }
                  className="px-3 py-2 text-xs input-premium"
                />{" "}
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value as any })
                  }
                  className="px-3 py-2 text-xs rounded-xl border border-border bg-surface text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/30 font-semibold cursor-pointer"
                >
                  <option value="Suporte">Suporte</option>
                  <option value="Colaborador">Colaborador</option>
                  <option value="Administrador">Administrador</option>
                </select>
              </div>{" "}
              <div className="flex space-x-3 justify-end pt-2">
                {" "}
                <button
                  onClick={() => setShowNewUser(false)}
                  className="px-4 py-2 bg-background-subtle hover:bg-border text-text-primary text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
                >
                  {" "}
                  Cancelar{" "}
                </button>{" "}
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-brand text-white dark:text-[#081B16] hover:bg-brand-hover text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
                >
                  {" "}
                  Salvar{" "}
                </button>{" "}
              </div>{" "}
            </div>
          )}{" "}
          {loadingUsers ? (
            <div className="space-y-3 animate-pulse mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex space-x-4 items-center">
                  <div className="w-6 h-6 rounded-full bg-background-subtle flex-shrink-0" />
                  <div className="h-4 bg-background-subtle rounded w-1/4" />
                  <div className="h-4 bg-background-subtle rounded w-1/4" />
                  <div className="h-6 bg-background-subtle rounded w-20" />
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              {" "}
              <table className="w-full text-left text-xs">
                {" "}
                <thead>
                  {" "}
                  <tr className="border-b border-border text-text-muted uppercase tracking-wider text-[10px] font-bold">
                    {" "}
                    <th className="pb-3 pt-2">Nome</th>{" "}
                    <th className="pb-3 pt-2">E-mail</th>{" "}
                    <th className="pb-3 pt-2">Perfil</th>{" "}
                    <th className="pb-3 pt-2">Status</th>{" "}
                    <th className="pb-3 pt-2">Ação</th>{" "}
                  </tr>{" "}
                </thead>{" "}
                <tbody>
                  {" "}
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-100 hover:bg-background-subtle :bg-surface/30 ${!u.active ? "opacity-50" : ""}`}
                    >
                      {" "}
                      <td className="py-3 font-semibold flex items-center space-x-2">
                        {" "}
                        <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-[10px] text-text-secondary font-bold">
                          {" "}
                          {u.avatar ||
                            u.name.substring(0, 2).toUpperCase()}{" "}
                        </div>{" "}
                        <span>{u.name}</span>{" "}
                      </td>{" "}
                      <td className="py-3 text-text-muted">{u.email}</td>{" "}
                      <td className="py-3">
                        {" "}
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleChangeRole(u.id, e.target.value)
                          }
                          className="px-2 py-1 text-[11px] rounded-lg border border-border bg-surface text-text-primary focus:border-brand focus:ring-1 focus:ring-brand/30 disabled:opacity-50 cursor-pointer"
                          disabled={!u.active}
                        >
                          {" "}
                          <option value="Suporte">Suporte</option>{" "}
                          <option value="Colaborador">Colaborador</option>
                          <option value="Administrador">
                            Administrador
                          </option>{" "}
                        </select>{" "}
                      </td>{" "}
                      <td className="py-3">
                        {" "}
                        <span
                          className={`px-2 py-1 rounded text-[10px] font-bold ${u.active ? "bg-accent-light text-emerald-700 " : "bg-danger-light text-red-700 "}`}
                        >
                          {" "}
                          {u.active ? "Ativo" : "Inativo"}{" "}
                        </span>{" "}
                      </td>{" "}
                      <td className="py-3">
                        {" "}
                        <button
                          onClick={() => handleToggleUserActive(u.id, u.active)}
                          className={`p-1.5 rounded-lg border-none cursor-pointer font-bold flex items-center justify-center transition-colors ${u.active ? "text-danger hover:bg-red-50 :bg-red-900/20" : "text-accent hover:bg-accent-light :bg-accent-light"}`}
                          title={
                            u.active ? "Desativar Operador" : "Ativar Operador"
                          }
                        >
                          {" "}
                          {u.active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}{" "}
                        </button>{" "}
                      </td>{" "}
                    </tr>
                  ))}{" "}
                </tbody>{" "}
              </table>{" "}
            </div>
          )}{" "}
        </div>
      )}{" "}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-[#F59E0B] text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center space-x-4 z-50 border border-amber-600 animate-fade-in">
          <div className="p-1.5 bg-amber-600/30 rounded-lg">
            <Clock className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="text-xs">
            <span className="font-bold block leading-tight">
              Alterações não salvas no SLA!
            </span>
            <span className="text-[10px] text-white/85">
              Por favor, salve ou descarte as horas modificadas antes de
              prosseguir.
            </span>
          </div>
          <div className="flex items-center space-x-2 pl-4 border-l border-white/20">
            <button
              onClick={() => handleUpdateSla(editingId!)}
              className="px-3 py-1.5 bg-white text-amber-600 hover:bg-amber-50 font-bold rounded-lg text-[10px] transition-colors cursor-pointer border-none shadow-sm font-sans"
            >
              Salvar
            </button>
            <button
              onClick={() => {
                setEditingId(null);
                setEditingValue("");
              }}
              className="px-3 py-1.5 bg-transparent hover:bg-white/10 text-white font-bold rounded-lg text-[10px] transition-colors cursor-pointer border-none font-sans"
            >
              Descartar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
