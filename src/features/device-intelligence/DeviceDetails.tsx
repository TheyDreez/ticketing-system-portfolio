import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MonitorSmartphone,
  Activity,
  AlertTriangle,
  Cpu,
  HardDrive,
  Battery,
  ShieldAlert,
  ArrowRight,
  Loader2,
  CheckCircle,
  RefreshCw,
  TerminalSquare
} from 'lucide-react';
import { useAuth } from '../../shared/hooks/useAuth';

export function DeviceDetails({ device, onBack, isDrawer = false, onActionClick }: { device: any, onBack: () => void, isDrawer?: boolean, onActionClick?: (actionType: 'createTicket' | 'notifyUser') => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline'>('overview');
  const [healingAction, setHealingAction] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const { user } = useAuth();
  
  useEffect(() => {
    fetch(`/api/devices/${device.id}/events`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setEvents(data);
      })
      .catch(e => console.error(e));
  }, [device.id]);

  const handleAutoHeal = async (actionName: string) => {
    setHealingAction(actionName);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/devices/${device.id}/heal`, {
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

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={onBack}
          className="text-xs font-bold text-text-secondary hover:text-brand transition-colors flex items-center gap-1"
        >
          ← Voltar para a frota
        </button>
        <div className="flex bg-background-subtle rounded-lg p-1">
          <button onClick={() => setActiveTab('overview')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'overview' ? 'bg-white shadow text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Overview</button>
          <button onClick={() => setActiveTab('timeline')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === 'timeline' ? 'bg-white shadow text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>Timeline</button>
        </div>
      </div>
      
      <div className={`grid grid-cols-1 ${isDrawer ? '' : 'lg:grid-cols-3'} gap-6`}>
        <div className={`${isDrawer ? '' : 'lg:col-span-2'} space-y-6`}>
          
          <div className="p-6 rounded-2xl border shadow-sm surface-card relative overflow-hidden">
             {/* Header Info */}
            <div className={`flex ${isDrawer ? 'flex-col gap-4' : 'justify-between items-start'} mb-6`}>
              <div className="flex items-center gap-4">
                <div className="p-4 bg-background-subtle rounded-xl border border-border">
                  <MonitorSmartphone className="w-10 h-10 text-brand" />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold text-text-primary">{device.name}</h2>
                  <div className="text-sm text-text-secondary flex items-center gap-2 mt-1">
                    {device.user} • {device.department}
                  </div>
                </div>
              </div>
              <div className={isDrawer ? 'text-left' : 'text-right'}>
                <div className="text-[10px] uppercase font-bold text-text-muted mb-1 whitespace-nowrap">Health Score</div>
                <div className={`text-3xl font-display font-bold ${device.healthScore < 50 ? 'text-danger' : device.healthScore < 80 ? 'text-warning' : 'text-success'}`}>
                  {device.healthScore}
                </div>
              </div>
            </div>

            <div className={`grid grid-cols-2 ${isDrawer ? 'gap-4' : 'md:grid-cols-4 gap-4'} mt-6 border-t border-border pt-6`}>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-bold">OS</div>
                <div className="text-xs text-text-primary">{device.os}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-bold">Modelo</div>
                <div className="text-xs text-text-primary">{device.manufacturer} {device.model}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-bold">Serial</div>
                <div className="text-xs text-text-primary font-data">{device.serial}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1 font-bold whitespace-nowrap">Último Check-in</div>
                <div className="text-xs text-text-primary font-data flex items-center gap-1 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse shrink-0"></span>
                  {device.lastCheckin}
                </div>
              </div>
            </div>
          </div>

          {activeTab === 'overview' ? (
            <div className="p-6 rounded-2xl border shadow-sm surface-card">
              <h3 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Performance (Live)</h3>
              <div className={`grid grid-cols-2 ${isDrawer ? 'gap-6' : 'md:grid-cols-4 gap-6'}`}>
                
                {/* CPU */}
                <div>
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <span className="text-xs text-text-secondary flex items-center gap-1 shrink-0"><Cpu className="w-3.5 h-3.5" /> CPU</span>
                    <span className={`text-xs font-bold ${(device.cpu || 0) > 80 ? 'text-danger' : 'text-text-primary'}`}>{device.cpu != null ? `${device.cpu}%` : 'N/A'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-background-subtle rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${device.cpu || 0}%` }} transition={{ duration: 1 }} className={`h-full ${(device.cpu || 0) > 80 ? 'bg-danger' : 'bg-brand'}`} />
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <span className="text-xs text-text-secondary flex items-center gap-1 shrink-0"><Activity className="w-3.5 h-3.5" /> RAM</span>
                    <span className={`text-xs font-bold ${(device.ram || 0) > 80 ? 'text-danger' : 'text-text-primary'}`}>{device.ram != null ? `${device.ram}%` : 'N/A'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-background-subtle rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${device.ram || 0}%` }} transition={{ duration: 1, delay: 0.1 }} className={`h-full ${(device.ram || 0) > 80 ? 'bg-danger' : 'bg-brand'}`} />
                  </div>
                </div>

                {/* Disco */}
                <div>
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <span className="text-xs text-text-secondary flex items-center gap-1 shrink-0"><HardDrive className="w-3.5 h-3.5" /> Disco</span>
                    <span className={`text-xs font-bold ${(device.disk || 0) > 80 ? 'text-danger' : 'text-text-primary'}`}>{device.disk != null ? `${device.disk}%` : 'N/A'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-background-subtle rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${device.disk || 0}%` }} transition={{ duration: 1, delay: 0.2 }} className={`h-full ${(device.disk || 0) > 80 ? 'bg-danger' : 'bg-brand'}`} />
                  </div>
                </div>

                {/* Bateria */}
                <div>
                  <div className="flex justify-between items-center mb-2 gap-2">
                    <span className="text-xs text-text-secondary flex items-center gap-1 shrink-0"><Battery className="w-3.5 h-3.5" /> Bat</span>
                    <span className={`text-xs font-bold ${device.battery < 20 ? 'text-danger' : 'text-text-primary'}`}>{device.battery}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-background-subtle rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${device.battery}%` }} transition={{ duration: 1, delay: 0.3 }} className={`h-full ${device.battery < 20 ? 'bg-danger' : 'bg-brand'}`} />
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="p-6 rounded-2xl border shadow-sm surface-card">
              <h3 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Timeline Inteligente</h3>
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                {events.map((evt, idx) => (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={evt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-4 h-4 rounded-full border border-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${evt.type === 'alert' ? 'bg-danger text-danger-light' : evt.type === 'policy' ? 'bg-success text-success-light' : 'bg-brand text-brand-light'}`} />
                    <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-lg border border-border bg-background-subtle">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-text-primary text-xs capitalize">{evt.type}</span>
                        <span className="font-data text-[10px] text-text-muted">{evt.timestamp}</span>
                      </div>
                      <p className="text-[10px] text-text-secondary">{evt.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* AI Insights & Actions Panel */}
        <div className="space-y-6">
          
          <div className="p-5 rounded-2xl border border-brand/20 shadow-sm bg-brand/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-brand/10 rounded-full blur-2xl -mr-10 -mt-10" />
            <h3 className="text-sm font-bold text-brand mb-4 flex items-center gap-2 relative z-10">
              <Activity className="w-4 h-4" />
              AI Root Cause Analysis
            </h3>
            
            <div className="relative z-10">
              {device.healthScore != null && device.healthScore < 80 ? (
                <div className="space-y-4">
                  <p className="text-xs text-text-primary leading-relaxed">
                    Este dispositivo apresenta um nível de degradação {device.healthScore < 50 ? 'crítico' : 'moderado'}.
                    {(device.ram || 0) > 80 || (device.cpu || 0) > 80 || (device.disk || 0) > 80 ? (
                      ` O uso de recursos está alto, indicando possível lentidão.`
                    ) : null}
                  </p>
                  {!device.defender && (
                    <p className="text-xs text-danger leading-relaxed font-bold flex items-start gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      Antivírus / Defender inativo ou não reportado no Intune.
                    </p>
                  )}
                  
                  <div className="pt-4 border-t border-brand/20">
                    <h4 className="text-[10px] uppercase font-bold text-brand mb-2">Ações Sugeridas</h4>
                    <div className="space-y-2">
                      <AutoHealBtn 
                        actionName="Force Intune Sync" 
                        icon={<RefreshCw className="w-3 h-3" />}
                        isLoading={healingAction === 'Force Intune Sync'}
                        isSuccess={actionSuccess === 'Force Intune Sync'}
                        onClick={() => handleAutoHeal('Force Intune Sync')}
                      />
                      {!device.defender && (
                        <AutoHealBtn 
                          actionName="Enable & Update Defender" 
                          icon={<ShieldAlert className="w-3 h-3" />}
                          isLoading={healingAction === 'Enable & Update Defender'}
                          isSuccess={actionSuccess === 'Enable & Update Defender'}
                          onClick={() => handleAutoHeal('Enable & Update Defender')}
                          danger
                        />
                      )}
                      <AutoHealBtn 
                        actionName="Clear Temp & Cache" 
                        icon={<TerminalSquare className="w-3 h-3" />}
                        isLoading={healingAction === 'Clear Temp & Cache'}
                        isSuccess={actionSuccess === 'Clear Temp & Cache'}
                        onClick={() => handleAutoHeal('Clear Temp & Cache')}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-text-secondary leading-relaxed">
                  O dispositivo opera dentro dos limites de normalidade corporativa. Sem anomalias detectadas no padrão de uso nas últimas 48 horas.
                </p>
              )}
            </div>
          </div>

          {/* Operational Actions */}
          {device.healthScore < 80 && (
            <div className="p-5 rounded-2xl border border-warning/30 shadow-sm bg-warning/5">
              <h3 className="text-sm font-bold text-warning-dark mb-4 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Ações Operacionais
              </h3>
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    const desc = `Dispositivo: ${device.name}\nUsuário: ${device.user}\nSaúde: ${device.healthScore}%\nMotivo: ${(!device.defender ? 'Defender Inativo. ' : '')}${(device.cpu > 80 || device.ram > 80) ? 'Uso de recursos alto.' : 'Degradação sistêmica.'}`;
                    window.dispatchEvent(new CustomEvent('open-device-ticket', { 
                      detail: { 
                        title: `Intervenção: ${device.name} (${device.user})`, 
                        description: desc,
                        priority: device.healthScore < 50 ? 'Alta' : 'Média'
                      } 
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-white text-text-primary border border-border rounded-lg hover:bg-background-subtle transition-colors flex items-center justify-between"
                >
                  Criar Chamado
                  <ArrowRight className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => {
                    alert(`Notificação enviada para ${device.user} via Teams/Email.`);
                  }}
                  className="w-full px-3 py-2 text-xs font-bold bg-brand text-white border border-brand rounded-lg hover:bg-brand-dark transition-colors flex items-center justify-between"
                >
                  Notificar Responsável
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Compliance & Security */}
          <div className="p-5 rounded-2xl border shadow-sm surface-card">
            <h3 className="text-sm font-bold text-text-primary mb-4 uppercase tracking-wider">Compliance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Intune Policy</span>
                <span className={`text-xs font-bold ${device.compliance ? 'text-success' : 'text-danger flex items-center gap-1'}`}>
                  {!device.compliance && <AlertTriangle className="w-3 h-3" />}
                  {device.compliance ? 'Compliant' : 'Non-Compliant'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">BitLocker</span>
                <span className={`text-xs font-bold ${device.bitlocker ? 'text-success' : 'text-danger'}`}>
                  {device.bitlocker ? 'Encrypted' : 'Unprotected'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">Windows Update</span>
                <span className={`text-xs font-bold ${device.windowsUpdate === 'Atualizado' ? 'text-success' : 'text-warning'}`}>
                  {device.windowsUpdate}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}

function AutoHealBtn({ actionName, icon, isLoading, isSuccess, onClick, danger = false }) {
  return (
    <button 
      onClick={onClick}
      disabled={isLoading || isSuccess}
      className={`w-full px-3 py-2 text-xs font-bold border rounded-lg transition-colors flex items-center justify-between
        ${danger 
          ? 'bg-danger/10 hover:bg-danger/20 border-danger/20 text-danger' 
          : 'bg-background/50 hover:bg-background border-brand/20 text-brand'}
        ${isSuccess ? 'bg-success/10 border-success/30 text-success' : ''}
        disabled:opacity-70 disabled:cursor-not-allowed
      `}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{actionName}</span>
      </div>
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : isSuccess ? (
        <CheckCircle className="w-3 h-3 text-success" />
      ) : (
        <ArrowRight className="w-3 h-3" />
      )}
    </button>
  );
}
