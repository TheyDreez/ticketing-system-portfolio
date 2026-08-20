import React, { useState } from "react";
import { Lock, Loader2, AlertTriangle, LogOut, CheckCircle } from "lucide-react";

interface ForcePasswordChangeProps {
  user: {
    id: string;
    email: string;
    name: string;
  };
  csrfToken: string;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  showToast: (msg: string, type?: "success" | "info" | "error") => void;
}

export function ForcePasswordChange({
  user,
  csrfToken,
  refreshSession,
  logout,
  showToast,
}: ForcePasswordChangeProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError("Senha atual é obrigatória.");
      return;
    }
    if (newPassword.length < 8) {
      setError("A nova senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação de senha não confere.");
      return;
    }

    setLoading(true);
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
        setSuccess(true);
        showToast("Senha alterada com sucesso!", "success");
        setTimeout(async () => {
          await refreshSession();
        }, 1500);
      } else {
        if (data.errors) {
          const firstError = Object.values(data.errors)[0] as string;
          setError(firstError || "Erro ao alterar a senha.");
        } else {
          setError(data.error || "Erro ao alterar a senha.");
        }
      }
    } catch (err) {
      setError("Erro ao conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="force-password-container"
      className="fixed inset-0 min-h-screen w-full flex items-center justify-center bg-background p-6 text-white z-[9999]"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(#159A65_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      <div
        id="force-password-card"
        className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-2xl relative z-10 flex flex-col"
      >
        <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center shadow-lg mb-6 self-center">
          <Lock className="w-8 h-8 text-amber-500 animate-pulse" />
        </div>

        <h1 className="text-xl font-bold tracking-tight text-center text-white mb-2">
          Troca de Senha Obrigatória
        </h1>
        <p className="text-xs text-text-muted text-center mb-6 leading-relaxed">
          Sua conta utiliza uma senha padrão de inicialização (seed) ou requer alteração periódica. Para proteger seus dados e cumprir as normas da LGPD, você deve cadastrar uma nova senha forte.
        </p>

        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-success rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-xs text-success font-bold">Senha atualizada com sucesso!</p>
            <p className="text-[11px] text-text-muted">Iniciando sua sessão segura...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-start space-x-2 text-left">
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-300 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Senha Atual / Temporária
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs input-premium"
                placeholder="Insira a senha recebida"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Nova Senha (Mín. 8 caracteres)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs input-premium"
                placeholder="Defina uma senha forte"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-xs input-premium"
                placeholder="Repita a nova senha"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-brand text-white hover:bg-brand-hover py-3 px-4 rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando nova senha...</span>
                </>
              ) : (
                <span>Atualizar Senha e Entrar</span>
              )}
            </button>

            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center space-x-2 bg-transparent hover:bg-white/5 border border-border py-2.5 px-4 rounded-xl font-bold text-[11px] text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair do Console</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
