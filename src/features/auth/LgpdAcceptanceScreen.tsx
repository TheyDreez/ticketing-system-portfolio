import React, { useState } from "react";
import { ShieldCheck, LogOut, FileText, CheckCircle } from "lucide-react";

interface LgpdAcceptanceScreenProps {
  user: any;
  onAccept: () => void;
  logout: () => void;
}

export function LgpdAcceptanceScreen({
  user,
  onAccept,
  logout,
}: LgpdAcceptanceScreenProps) {
  const [loading, setLoading] = useState(false);

  const handleAccept = () => {
    setLoading(true);
    setTimeout(() => {
      onAccept();
    }, 600); // Simulate network request for effect
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand via-accent to-brand" />
      <div className="absolute -top-[500px] -right-[500px] w-[1000px] h-[1000px] rounded-full bg-brand-light blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute -bottom-[500px] -left-[500px] w-[1000px] h-[1000px] rounded-full bg-accent-light blur-3xl opacity-20 pointer-events-none" />

      <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-border flex items-center space-x-4 bg-background-subtle">
          <div className="w-12 h-12 bg-surface border border-border rounded-xl shadow-sm flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h1 className="text-xl font-display text-text-primary mb-1">
              Termos de Privacidade e LGPD
            </h1>
            <p className="text-sm text-text-muted">
              Olá, {user.name}. Aceite os termos abaixo para continuar.
            </p>
          </div>
        </div>

        <div className="p-8 overflow-y-auto flex-1 text-sm text-text-secondary space-y-6">
          <p className="leading-relaxed text-text-primary font-medium">
            O AcmeCorp Operations Center processa informações essenciais para garantir o correto funcionamento dos serviços de TI e a segurança de nossa infraestrutura.
          </p>

          <div className="space-y-4">
            <div className="bg-background-subtle p-4 rounded-xl border border-border">
              <h3 className="font-bold text-text-primary mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-brand" />
                1. Coleta e Finalidade
              </h3>
              <p className="leading-relaxed">
                Coletamos seu nome, e-mail departamental e informações de perfil corporativo. Estes dados são usados estritamente para autenticação, autorização de acesso e registro em logs de auditoria de chamados.
              </p>
            </div>

            <div className="bg-background-subtle p-4 rounded-xl border border-border">
              <h3 className="font-bold text-text-primary mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-brand" />
                2. Retenção de Dados
              </h3>
              <ul className="list-disc pl-5 space-y-1 mt-2">
                <li>
                  <strong className="text-text-primary">Logs de Auditoria:</strong> Mantidos por 1 ano para conformidade (Marco Civil da Internet).
                </li>
                <li>
                  <strong className="text-text-primary">Chamados:</strong> Retidos por 5 anos para fins de conformidade legal, faturamento e histórico operacional.
                </li>
              </ul>
            </div>

            <div className="bg-background-subtle p-4 rounded-xl border border-border">
              <h3 className="font-bold text-text-primary mb-2 flex items-center">
                <FileText className="w-4 h-4 mr-2 text-brand" />
                3. Seus Direitos (Art. 18, LGPD)
              </h3>
              <p className="leading-relaxed">
                Você pode solicitar uma cópia dos seus dados, a portabilidade ou a anonimização de suas informações a qualquer momento através da guia <strong>Perfil</strong> do sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-border bg-background-subtle flex items-center justify-between mt-auto">
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-text-muted hover:text-text-primary font-medium transition-colors text-sm px-4 py-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair do Sistema</span>
          </button>

          <button
            onClick={handleAccept}
            disabled={loading}
            className="btn-premium-primary px-8 py-2.5 flex items-center space-x-2 shadow-lg disabled:opacity-70 disabled:cursor-wait"
          >
            {loading ? (
              <span className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-surface border-t-transparent rounded-full animate-spin" />
                <span>Processando...</span>
              </span>
            ) : (
              <span className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>Li e Aceito</span>
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
