import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Shield,
  CheckCircle,
  Ticket,
  Activity,
  Lock,
  Bell,
  AlertOctagon,
  X,
  Check,
  Building,
  Loader2,
} from "lucide-react";
import { NotificationPreferences } from '../../types';

interface PerfilTabProps {
  user: {
    name: string;
    email: string;
    role: string;
    department?: string;
    notificationPreferences?: NotificationPreferences;
  };
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "info" | "error") => void;
  csrfToken: string;
}

export function PerfilTab({
  user,
  refreshSession,
  logout,
  showToast,
  csrfToken,
}: PerfilTabProps) {
  const isOperador = user.role === "Suporte" || user.role === "Administrador";
  const [stats, setStats] = useState({ criados: 0, resolvidos: 0, abertos: 0 });
  const [loading, setLoading] = useState(true);

  // Sub Tab & Audit Logs States
  const [subTab, setSubTab] = useState<"configuracoes" | "atividade">("configuracoes");
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Personal Info form
  const [name, setName] = useState(user.name);
  const [department, setDepartment] = useState(user.department || "Operações");
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Change Form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Preferences
  const [prefs, setPrefs] = useState<NotificationPreferences>(
    user.notificationPreferences || {
      ticketAssigned: true,
      newComments: true,
      slaAlerts: true,
      statusChange: true,
    }
  );
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Danger Zone Double Confirmation
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivateStep, setDeactivateStep] = useState(1);
  const [confirmDeactivateText, setConfirmDeactivateText] = useState("");
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [anonymize, setAnonymize] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sync state with props
  useEffect(() => {
    setName(user.name);
    setDepartment(user.department || "Operações");
    if (user.notificationPreferences) {
      setPrefs(user.notificationPreferences);
    }
  }, [user]);

  // Fetch my audit log events
  useEffect(() => {
    if (subTab === "atividade") {
      const fetchMyEvents = async () => {
        setLoadingEvents(true);
        try {
          const res = await fetch("/api/audit-events");
          if (res.ok) {
            const allEvents = await res.json();
            const filtered = allEvents.filter(
              (e: any) => e.userEmail && e.userEmail.toLowerCase() === user.email.toLowerCase()
            );
            setMyEvents(filtered);
          }
        } catch (err) {
          console.error("Failed to fetch my audit events", err);
        } finally {
          setLoadingEvents(false);
        }
      };
      fetchMyEvents();
    }
  }, [subTab, user.email]);

  useEffect(() => {
    const fetchMyStats = async () => {
      try {
        const res = await fetch("/api/tickets");
        if (res.ok) {
          const tickets: any[] = await res.json();
          const myTickets = tickets.filter(
            (t) =>
              t.user.toLowerCase() === user.name.toLowerCase() ||
              t.user.toLowerCase() === user.email.toLowerCase()
          );
          setStats({
            criados: myTickets.length,
            resolvidos: myTickets.filter((t) => t.status === "Resolvido").length,
            abertos: myTickets.filter((t) => t.status !== "Resolvido").length,
          });
        }
      } catch (err) {
        console.error("Failed to fetch user stats", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyStats();
  }, [user]);

  // Save personal info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !department.trim()) {
      showToast("Preencha todos os campos do perfil.", "error");
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ name, department }),
      });

      if (res.ok) {
        showToast("Perfil atualizado com sucesso!", "success");
        await refreshSession();
      } else {
        const data = await res.json();
        showToast(data.error || "Erro ao atualizar perfil.", "error");
      }
    } catch (err) {
      showToast("Erro de rede ao salvar perfil.", "error");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Upload Profile Avatar
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('avatar', file);
      setIsSavingProfile(true);
      try {
        const res = await fetch("/api/users/me/avatar", {
          method: "POST",
          headers: {
            "x-csrf-token": csrfToken,
          },
          body: formData,
        });
        if (res.ok) {
          showToast("Foto de perfil atualizada!", "success");
          await refreshSession();
        } else {
          showToast("Erro ao atualizar foto de perfil.", "error");
        }
      } catch (err) {
        showToast("Erro de rede ao salvar foto.", "error");
      } finally {
        setIsSavingProfile(false);
      }
    }
  };

  // Change password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});

    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = "Senha atual é obrigatória.";
    if (newPassword.length < 8) errors.newPassword = "A nova senha deve ter pelo menos 8 caracteres.";
    if (newPassword !== confirmPassword) errors.confirmPassword = "A confirmação de senha não confere.";

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast("Senha alterada com sucesso!", "success");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        if (data.errors) {
          setPasswordErrors(data.errors);
        } else {
          showToast(data.error || "Erro ao alterar senha.", "error");
        }
      }
    } catch (err) {
      showToast("Erro ao conectar com o servidor.", "error");
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Toggle notifications preference
  const handleTogglePref = async (key: keyof NotificationPreferences) => {
    const updatedPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(updatedPrefs);
    setIsSavingPrefs(true);

    try {
      const res = await fetch("/api/users/me/preferences", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify(updatedPrefs),
      });

      if (res.ok) {
        showToast("Preferências de notificação atualizadas!", "success");
        await refreshSession();
      } else {
        showToast("Erro ao salvar preferências.", "error");
        // rollback
        setPrefs(prefs);
      }
    } catch (err) {
      showToast("Erro de conexão ao salvar preferências.", "error");
      setPrefs(prefs);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Export Data (LGPD Art. 18 Right of Access)
  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const res = await fetch("/api/users/me/data-export");
      if (res.ok) {
        const data = await res.json();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(data, null, 2)
        )}`;
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", jsonString);
        downloadAnchor.setAttribute("download", `cbi_ops_data_export_${user.email}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast("Relatório de dados pessoais baixado com sucesso!", "success");
      } else {
        showToast("Erro ao exportar dados pessoais.", "error");
      }
    } catch (e) {
      showToast("Erro de conexão ao exportar dados.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Deactivate Account
  const handleDeactivate = async () => {
    if (confirmDeactivateText !== "DESATIVAR") {
      showToast("Texto de confirmação incorreto.", "error");
      return;
    }

    setIsDeactivating(true);
    try {
      const res = await fetch("/api/users/me/deactivate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ anonymize }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "Sua conta foi desativada permanentemente.", "success");
        await logout();
      } else {
        showToast(data.error || "Falha ao desativar conta.", "error");
      }
    } catch (err) {
      showToast("Erro de rede ao desativar conta.", "error");
    } finally {
      setIsDeactivating(false);
      setIsDeactivateModalOpen(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* 1. Profile Summary Card */}
      <div className="p-8 rounded-2xl border border-border bg-surface shadow-sm flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
        <div className="relative w-24 h-24 rounded-full bg-brand-light flex items-center justify-center text-3xl font-bold text-brand border-4 border-brand/10 flex-shrink-0 cursor-pointer overflow-hidden group">
          {user.name.substring(0, 2).toUpperCase()}
          <input type="file" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold">Trocar</div>
        </div>
        <div className="flex-1 text-center md:text-left">
          <h2 className="text-2xl font-display font-bold text-text-primary mb-1">
            {user.name}
          </h2>
          <div className="flex flex-col md:flex-row items-center md:items-start space-y-2 md:space-y-0 md:space-x-6 mt-2">
            <div className="flex items-center space-x-2 text-text-muted text-xs">
              <Mail className="w-4 h-4" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center space-x-2 text-text-muted text-xs">
              <Shield className="w-4 h-4" />
              <span className="font-semibold">{user.role}</span>
            </div>
            <div className="flex items-center space-x-2 text-text-muted text-xs">
              <Building className="w-4 h-4" />
              <span>{user.department || "Operações"}</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
            <span className="px-2.5 py-0.5 bg-background-subtle text-text-secondary rounded-full text-xs font-bold uppercase tracking-wider border border-border">
              {user.department || "Operações"}
            </span>
            <span className="px-2.5 py-0.5 bg-brand-light text-brand rounded-full text-xs font-bold uppercase tracking-wider border border-brand/20">
              Conta Ativa
            </span>
          </div>
        </div>
      </div>

      {/* Profile Sub-navigation Tabs */}
      <div className="flex border-b border-border bg-background-subtle/40 rounded-xl p-1 text-xs max-w-xs">
        <button
          onClick={() => setSubTab("configuracoes")}
          className={`flex-1 py-2 text-center font-bold tracking-tight rounded-lg transition-colors cursor-pointer border-none ${
            subTab === "configuracoes"
              ? "bg-brand text-white dark:text-[#081B16]"
              : "text-text-muted hover:text-text-primary bg-transparent"
          }`}
        >
          Configurações
        </button>
        <button
          onClick={() => setSubTab("atividade")}
          className={`flex-1 py-2 text-center font-bold tracking-tight rounded-lg transition-colors cursor-pointer border-none ${
            subTab === "atividade"
              ? "bg-brand text-white dark:text-[#081B16]"
              : "text-text-muted hover:text-text-primary bg-transparent"
          }`}
        >
          Minha Atividade
        </button>
      </div>

      {subTab === "configuracoes" ? (
        <>
          {/* 2. Operational Stats Block */}
          {isOperador && (
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center">
                <Activity className="w-4 h-4 mr-2 text-brand" /> Atividade do Operador
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm">
                  <div className="text-xs font-semibold text-text-muted mb-1">Chamados Atendidos</div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold font-display text-text-primary">
                      {loading ? "-" : stats.criados}
                    </span>
                    <div className="p-2.5 bg-background-subtle border border-border rounded-xl text-text-muted">
                      <Ticket className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm">
                  <div className="text-xs font-semibold text-text-muted mb-1">Em Aberto / Pendentes</div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold font-display text-warning">
                      {loading ? "-" : stats.abertos}
                    </span>
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-warning">
                      <Activity className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm">
                  <div className="text-xs font-semibold text-text-muted mb-1">Resolvidos</div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-bold font-display text-success">
                      {loading ? "-" : stats.resolvidos}
                    </span>
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-success">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Form Grid: Personal Info + Security */}
          <div className={`grid grid-cols-1 ${isOperador ? "lg:grid-cols-2" : ""} gap-6`}>
            
            {/* EDIT PERSONAL INFO */}
            <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center border-b border-border pb-3">
                <User className="w-4 h-4 mr-2 text-brand" /> Informações Pessoais
              </h3>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs input-premium"
                    disabled={!isOperador}
                    placeholder="Insira seu nome completo"
                  />
                </div>

                {isOperador && (
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">
                      Departamento / Setor
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs input-premium"
                      placeholder="Ex: Suporte de TI, Infraestrutura"
                    />
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSavingProfile || !isOperador}
                    className="px-4 py-2 text-xs font-bold text-white dark:text-[#081B16] bg-brand hover:bg-brand-hover disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
                  >
                    {isSavingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Salvar Alterações</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* SECURITY: CHANGE PASSWORD - só pra operador */}
            {isOperador && (
              <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center border-b border-border pb-3">
                  <Lock className="w-4 h-4 mr-2 text-brand" /> Segurança & Trocar Senha
                </h3>
                <form onSubmit={handleSavePassword} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                      Senha Atual
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs input-premium"
                      placeholder="Sua senha atual"
                    />
                    {passwordErrors.currentPassword && (
                      <p className="text-[10px] text-danger font-semibold mt-1 flex items-center">
                        <X className="w-3 h-3 mr-0.5" /> {passwordErrors.currentPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                      Nova Senha (Mín. 8 caracteres)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs input-premium"
                      placeholder="Mínimo 8 caracteres"
                    />
                    {passwordErrors.newPassword && (
                      <p className="text-[10px] text-danger font-semibold mt-1 flex items-center">
                        <X className="w-3 h-3 mr-0.5" /> {passwordErrors.newPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs input-premium"
                      placeholder="Repita a nova senha exatamente"
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-[10px] text-danger font-semibold mt-1 flex items-center">
                        <X className="w-3 h-3 mr-0.5" /> {passwordErrors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingPassword}
                      className="px-4 py-2 text-xs font-bold text-white dark:text-[#081B16] bg-brand hover:bg-brand-hover disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      {isSavingPassword ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Atualizando...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Mudar Senha</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* 4. Notification Preferences & Danger Zone */}
          <div className={`grid grid-cols-1 ${isOperador ? "lg:grid-cols-2" : ""} gap-6`}>
            
            {/* NOTIFICATION PREFERENCES */}
            <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center border-b border-border pb-3">
                <Bell className="w-4 h-4 mr-2 text-brand" /> Preferências de Notificação
              </h3>
              <div className="space-y-4 pt-1">
                {isOperador && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-text-primary">Chamado atribuído a mim</p>
                      <p className="text-[10px] text-text-muted">Aviso instantâneo quando você for escalado.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePref("ticketAssigned")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${prefs.ticketAssigned ? "bg-brand" : "bg-border-strong"}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${prefs.ticketAssigned ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                )}

                {/* Pref 2: Novos comentários */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-text-primary">Novos comentários</p>
                    <p className="text-[10px] text-text-muted">Aviso quando houver notas internas ou respostas.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePref("newComments")}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${prefs.newComments ? "bg-brand" : "bg-border-strong"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${prefs.newComments ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </button>
                </div>

                {isOperador && (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-text-primary">Alertas de SLA estourando</p>
                      <p className="text-[10px] text-text-muted">Notificações preventivas para tickets em risco crítico.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleTogglePref("slaAlerts")}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${prefs.slaAlerts ? "bg-brand" : "bg-border-strong"}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${prefs.slaAlerts ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                )}

                {/* Pref 4: Mudança de status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-text-primary">Mudança de status</p>
                    <p className="text-[10px] text-text-muted">Toda vez que o ciclo de vida do chamado avançar.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTogglePref("statusChange")}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${prefs.statusChange ? "bg-brand" : "bg-border-strong"}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${prefs.statusChange ? "translate-x-4" : "translate-x-0"}`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* DANGER ZONE / LGPD - só pra operador */}
            {isOperador && (
              <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-2xl shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-danger uppercase tracking-wider flex items-center border-b border-red-500/20 pb-3">
                  <AlertOctagon className="w-4 h-4 mr-2" /> Privacidade & Zona de Perigo
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-text-primary mb-1">Exportar Dados Pessoais (LGPD)</h4>
                    <p className="text-xs text-text-secondary leading-relaxed mb-2">
                      Baixe uma cópia completa de todas as suas informações pessoais, histórico de chamados, comentários e eventos de auditoria em conformidade com o Art. 18 da LGPD.
                    </p>
                    <button
                      type="button"
                      onClick={handleExportData}
                      disabled={isExporting}
                      className="px-4 py-2 text-xs font-bold text-white bg-surface border border-border hover:bg-background-subtle rounded-xl shadow-sm transition-all cursor-pointer flex items-center space-x-1"
                    >
                      {isExporting ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Exportando...</span>
                        </>
                      ) : (
                        <span>Baixar Relatório (JSON)</span>
                      )}
                    </button>
                  </div>

                  <div className="border-t border-red-500/10 pt-4">
                    <h4 className="text-xs font-bold text-danger mb-1">Desativar & Anonimizar</h4>
                    <p className="text-xs text-text-secondary leading-relaxed mb-3">
                      Ao desativar sua conta, você será deslogado imediatamente e perderá o acesso operacional ao console. Você pode também solicitar a anonimização irreversível de seus dados de operador.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDeactivateStep(1);
                        setConfirmDeactivateText("");
                        setAnonymize(false);
                        setIsDeactivateModalOpen(true);
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-danger hover:bg-danger/90 rounded-xl shadow-sm transition-all cursor-pointer"
                    >
                      Desativar Minha Conta
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Timeline View for My Activity sub tab */
        <div className="p-6 bg-surface border border-border rounded-2xl shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center border-b border-border pb-3">
            <Activity className="w-4 h-4 mr-2 text-brand" /> Meu Histórico de Auditoria
          </h3>
          
          {loadingEvents ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-brand" />
            </div>
          ) : myEvents.length > 0 ? (
            <div className="relative border-l-2 border-border ml-3 pl-6 space-y-6">
              {myEvents.map((ev) => (
                <div key={ev.id} className="relative">
                  {/* Timeline bullet node */}
                  <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#0D241F] border-2 border-brand flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" />
                  </span>
                  <div className="p-4 bg-background-subtle border border-border rounded-xl shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                      <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                        {ev.action}
                      </span>
                      <span className="text-[10px] text-text-muted font-data">
                        {new Date(ev.createdAt).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted leading-relaxed">
                      {ev.details}
                    </p>
                    {ev.ticketId && (
                      <div className="mt-2 text-[10px] text-brand font-data font-bold">
                        Chamado Relacionado: #{ev.ticketId}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-background-subtle rounded-xl text-text-muted text-xs font-semibold">
              Nenhuma atividade recente registrada em seu histórico pessoal.
            </div>
          )}
        </div>
      )}

      {/* 5. Double Confirmation Modal for account deactivation */}
      {isDeactivateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-55">
          <div className="bg-surface border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 relative animate-scale-in">
            <button
              onClick={() => setIsDeactivateModalOpen(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {deactivateStep === 1 ? (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-danger rounded-full flex items-center justify-center">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-text-primary">Confirmar Desativação?</h4>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    Você tem certeza de que deseja prosseguir? Suas sessões serão finalizadas imediatamente e seu usuário será marcado como inativo.
                  </p>
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => setIsDeactivateModalOpen(false)}
                    className="flex-1 py-2 text-xs font-semibold border border-border rounded-xl text-text-secondary hover:bg-background-subtle transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => setDeactivateStep(2)}
                    className="flex-1 py-2 text-xs font-bold text-white bg-danger hover:bg-danger/95 rounded-xl transition-all cursor-pointer"
                  >
                    Sim, Continuar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 text-danger rounded-full flex items-center justify-center">
                  <AlertOctagon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-text-primary">Confirmação Final Exigida</h4>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    Para confirmar a desativação da própria conta, por favor digite <strong className="text-danger">DESATIVAR</strong> no campo abaixo:
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2 bg-red-950/20 border border-red-500/20 rounded-xl p-3 text-left my-2">
                    <input
                      type="checkbox"
                      id="chk-anonymize"
                      checked={anonymize}
                      onChange={(e) => setAnonymize(e.target.checked)}
                      className="mt-0.5 rounded text-red-500 focus:ring-red-500 cursor-pointer"
                    />
                    <label htmlFor="chk-anonymize" className="text-[11px] text-red-300 font-semibold cursor-pointer leading-tight">
                      Solicitar anonimização irreversível dos meus dados de operador sob as diretrizes da LGPD (substitui nome/e-mail por hashes e remove avatar).
                    </label>
                  </div>
                  <input
                    type="text"
                    value={confirmDeactivateText}
                    onChange={(e) => setConfirmDeactivateText(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs input-premium text-center font-bold tracking-wider focus:border-danger focus:ring-danger/30"
                    placeholder="Digite DESATIVAR"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => setIsDeactivateModalOpen(false)}
                    className="flex-1 py-2 text-xs font-semibold border border-border rounded-xl text-text-secondary hover:bg-background-subtle transition-all cursor-pointer"
                  >
                    Abortar
                  </button>
                  <button
                    onClick={handleDeactivate}
                    disabled={confirmDeactivateText !== "DESATIVAR" || isDeactivating}
                    className="flex-1 py-2 text-xs font-bold text-white bg-danger hover:bg-danger/95 disabled:bg-danger/50 rounded-xl transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    {isDeactivating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Desativando...</span>
                      </>
                    ) : (
                      <span>Confirmar Desativação</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
