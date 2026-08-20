import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Activity, ServerCrash, Cpu, TerminalSquare, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';

interface IncidentCorrelationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId?: string;
  devices?: any[];
}

export function IncidentCorrelationDrawer({ isOpen, onClose, deviceId, devices }: IncidentCorrelationDrawerProps) {
  const [healingAction, setHealingAction] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const { user } = useAuth();

  const handleAutoHeal = async (actionName: string) => {
    setHealingAction(actionName);
    setActionSuccess(null);
    try {
      const targetDeviceId = deviceId || devices?.[0]?.id || 'DEV-001';
      const res = await fetch(`/api/devices/${targetDeviceId}/heal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': user?.csrfToken || ''
        },
        body: JSON.stringify({ action: actionName })
      });
      if (res.ok) {
        setActionSuccess(actionName);
        setTimeout(() => setActionSuccess(null), 3000);
      } else {
        throw new Error('Self healing failed');
      }
    } catch (e) {
      console.error(e);
      alert('Erro na auto-correção via Intune.');
    } finally {
      setHealingAction(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-xl h-full bg-surface border-l border-border shadow-2xl flex flex-col"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-xl font-display font-bold text-text-primary flex items-center gap-2">
              <Activity className="w-5 h-5 text-warning" />
              Incident Correlation
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-full hover:bg-background-subtle"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="p-5 bg-warning/10 border border-warning/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <ServerCrash className="w-5 h-5 text-warning" />
                <h3 className="text-sm font-bold text-warning-dark">Pico de Falhas Detectado: Engenharia</h3>
              </div>
              <p className="text-xs text-text-secondary">
                15 notebooks no departamento de Engenharia apresentaram pico de CPU (100%) logo após a instalação silenciosa do <strong>KB5031356</strong>. O processo causador foi identificado como "Teams.exe".
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold text-text-muted mb-3">AI Root Cause Analysis</h4>
              <p className="text-sm text-text-primary p-4 bg-background-subtle rounded-lg border border-border">
                A atualização KB5031356 introduziu um conflito de driver de áudio que faz o Microsoft Teams Classic entrar em um loop infinito, consumindo todos os recursos da CPU.
              </p>
            </div>

            <div>
              <h4 className="text-xs uppercase font-bold text-text-muted mb-3">Ações de Resolução em Massa</h4>
              <div className="space-y-3">
                <button 
                  onClick={() => handleAutoHeal('clear_cache')}
                  disabled={healingAction !== null}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-brand/50 hover:bg-brand/5 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    {healingAction === 'clear_cache' ? (
                      <Loader2 className="w-5 h-5 text-brand animate-spin" />
                    ) : actionSuccess === 'clear_cache' ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <TerminalSquare className="w-5 h-5 text-brand" />
                    )}
                    <div className="text-left">
                      <div className="text-sm font-bold text-text-primary group-hover:text-brand transition-colors">
                        Executar Script de Correção (Self-Healing)
                      </div>
                      <div className="text-[10px] text-text-secondary">Limpar cache do Teams e reiniciar serviço de áudio.</div>
                    </div>
                  </div>
                  <div className="px-2 py-1 text-[10px] font-bold bg-brand text-brand-light rounded-full">15 devices</div>
                </button>
                <button 
                  onClick={() => handleAutoHeal('revert_update')}
                  disabled={healingAction !== null}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-border hover:border-warning/50 hover:bg-warning/5 transition-all group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    {healingAction === 'revert_update' ? (
                      <Loader2 className="w-5 h-5 text-warning animate-spin" />
                    ) : actionSuccess === 'revert_update' ? (
                      <CheckCircle className="w-5 h-5 text-success" />
                    ) : (
                      <Cpu className="w-5 h-5 text-warning" />
                    )}
                    <div className="text-left">
                      <div className="text-sm font-bold text-text-primary group-hover:text-warning transition-colors">Reverter Atualização</div>
                      <div className="text-[10px] text-text-secondary">Desinstalar KB5031356 via Intune e bloquear temporariamente.</div>
                    </div>
                  </div>
                  <div className="px-2 py-1 text-[10px] font-bold bg-warning text-warning-light rounded-full">15 devices</div>
                </button>
              </div>
            </div>
            
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
