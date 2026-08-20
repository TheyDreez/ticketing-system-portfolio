import React, { useState } from "react";
import { Activity, ShieldCheck, AlertTriangle, X } from "lucide-react";
interface LoginScreenProps {
  loginWithMicrosoft: () => Promise<void>;
  authError: string | null;
}
export function LoginScreen({
  loginWithMicrosoft,
  authError,
}: LoginScreenProps) {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  return (
    <div
      id="login-container"
      className="min-h-screen w-full flex items-center justify-center bg-background p-6 text-white"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      {" "}
      {/* Decorative background grid */}{" "}
      <div className="absolute inset-0 bg-[radial-gradient(#159A65_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />{" "}
      <div
        id="login-card"
        className="w-full max-w-md bg-surface border border-border rounded-3xl p-8 shadow-2xl relative z-10 animate-scale-in flex flex-col items-center"
      >
        {" "}
        {/* Brand/Logo Header */}{" "}
        <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center shadow-lg mb-6">
          {" "}
        <img src="/logo.jpg" alt="AcmeCorp Logo" className="w-full h-auto" />
        </div>{" "}
        <h1 className="text-2xl font-bold tracking-tight text-center text-white mb-1">
          AcmeCorp Operations Center
        </h1>{" "}
        <p className="text-xs text-text-muted text-center mb-8 uppercase tracking-widest font-semibold">
          Console de Controle de TI
        </p>{" "}
        {/* Security Alert Badge */}{" "}
        <div className="w-full bg-accent/10 border border-accent/30 rounded-xl p-3.5 mb-6 flex items-start space-x-3 text-left">
          {" "}
          <ShieldCheck className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />{" "}
          <div className="text-xs">
            {" "}
            <span className="font-bold text-white block mb-0.5">
              Acesso Restrito
            </span>{" "}
            <span className="text-text-muted">
              Este console armazena informações críticas de rede e requer
              autenticação via Microsoft Entra ID.
            </span>{" "}
          </div>{" "}
        </div>{" "}
        {/* Error notification */}{" "}
        {authError && (
          <div className="w-full bg-red-950/40 border border-red-500/30 rounded-xl p-3.5 mb-6 flex items-start space-x-3 text-left">
            {" "}
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />{" "}
            <p className="text-xs text-red-300 font-medium">{authError}</p>{" "}
          </div>
        )}{" "}
        {/* Main login button (Microsoft Logo styling with 4 official colors) */}{" "}
        <button
          onClick={loginWithMicrosoft}
          className="w-full flex items-center justify-center space-x-4 bg-surface text-text-primary hover:bg-background-subtle py-3.5 px-6 rounded-xl font-bold text-sm shadow-md transition-all duration-150 cursor-pointer border border-border"
        >
          {" "}
          {/* Official Microsoft Logo Grid of 4 Squares */}{" "}
          <div className="grid grid-cols-2 gap-0.5 flex-shrink-0 w-4 h-4">
            {" "}
            <div className="w-[7px] h-[7px] bg-[#F25022]" /> {/* Orange-Red */}{" "}
            <div className="w-[7px] h-[7px] bg-[#7FBA00]" /> {/* Green */}{" "}
            <div className="w-[7px] h-[7px] bg-[#00A4EF]" /> {/* Blue */}{" "}
            <div className="w-[7px] h-[7px] bg-[#FFB900]" /> {/* Yellow */}{" "}
          </div>{" "}
          <span>Entrar com Microsoft</span>{" "}
        </button>{" "}
        {/* Footer info & LGPD Privacy Link */}
        <div className="mt-8 flex flex-col items-center space-y-2 text-[10px] text-text-secondary font-data">
          <div className="flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-accent/40" />
            <span>SYS_VER_3.4.1 / SECURE_SOCKET_SSL</span>
          </div>
          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="text-accent hover:underline cursor-pointer font-bold tracking-wide uppercase text-[9px]"
          >
            Termo de Privacidade & LGPD
          </button>
        </div>
      </div>{" "}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl p-6 relative max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-4 right-4 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2 border-b border-border pb-3 flex items-center">
              <ShieldCheck className="w-5 h-5 text-accent mr-2" /> Aviso de Privacidade e LGPD
            </h3>
            
            <div className="text-xs text-text-secondary space-y-4 leading-relaxed pr-2">
              <p>
                Este sistema adota medidas rígidas de segurança e conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>.
              </p>
              
              <div>
                <h4 className="font-bold text-white mb-1">1. Finalidade do Tratamento</h4>
                <p>Os seus dados de perfil corporativo (nome, e-mail e departamento) são processados estritamente para autenticação operacional e rastreabilidade de ações em chamados de TI.</p>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1">2. Política de Retenção de Dados</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Logs de Auditoria:</strong> Mantidos por 1 ano para fins de conformidade legal e segurança de acessos (Marco Civil da Internet).</li>
                  <li><strong>Chamados e Comentários:</strong> Mantidos por 5 anos após o encerramento para fins de auditoria interna e resolução de passivos.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-white mb-1">3. Direitos dos Titulares (Art. 18)</h4>
                <p>Você pode, a qualquer momento após o login, exportar um arquivo com todos os seus dados pessoais armazenados ou solicitar a desativação e anonimização irreversível da sua conta na guia Perfil.</p>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-border flex justify-end">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 text-xs font-bold text-white bg-accent hover:bg-accent/90 rounded-xl shadow-md transition-all cursor-pointer"
              >
                Ciente e De Acordo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
