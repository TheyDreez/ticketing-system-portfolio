import React, { useState, useMemo, useEffect } from 'react';
import { MonitorSmartphone, Bot, Activity, ShieldCheck, AlertTriangle, CheckCircle, Zap, Brain, RefreshCcw, Crosshair } from 'lucide-react';
import { DeviceData, Ticket } from '../../types';
// mock data removed
import { FleetDashboard } from './FleetDashboard';
import { DeviceList } from './DeviceList';
import { DeviceDetails } from './DeviceDetails';
import { IncidentCorrelationDrawer } from './IncidentCorrelationDrawer';
import { FleetRadar } from './FleetRadar';
import { useSocket } from '../../shared/hooks/useSocket';



export function DeviceIntelligenceTab() {
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [viewMode, setViewMode] = useState<'dashboard' | 'radar'>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      const handleDeviceSync = () => {
        fetch('/api/devices').then(r => r.json()).then(setDevices).catch(console.error);
      };
      const handleDeviceUpdated = (data: { id: string, action: string, healed: boolean }) => {
        fetch('/api/devices').then(r => r.json()).then(setDevices).catch(console.error);
      };
      const handleTicketCreated = (ticket: Ticket) => {
        setTickets(prev => [ticket, ...prev]);
      };
      const handleTicketUpdated = (ticket: Ticket) => {
        setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
      };

      socket.on('device_sync', handleDeviceSync);
      socket.on('device_updated', handleDeviceUpdated);
      socket.on('ticket_created', handleTicketCreated);
      socket.on('ticket_updated', handleTicketUpdated);

      return () => {
        socket.off('device_sync', handleDeviceSync);
        socket.off('device_updated', handleDeviceUpdated);
        socket.off('ticket_created', handleTicketCreated);
        socket.off('ticket_updated', handleTicketUpdated);
      };
    }
  }, [socket]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devRes, insRes, tickRes] = await Promise.all([
          fetch('/api/devices'),
          fetch('/api/devices/insights'),
          fetch('/api/tickets')
        ]);
        if (devRes.ok) setDevices(await devRes.json());
        if (insRes.ok) setInsights(await insRes.json());
        if (tickRes.ok) setTickets(await tickRes.json());
      } catch (e) {
        console.error('Error fetching device data:', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  const [search, setSearch] = useState("");
  const [isCorrelationOpen, setIsCorrelationOpen] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const filteredDevices = useMemo(() => {
    return devices.filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) || 
      d.user.toLowerCase().includes(search.toLowerCase()) ||
      d.department.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, devices]);

  const metrics = useMemo(() => {
    const total = devices.length;
    const critical = devices.filter(d => d.riskScore > 80).length;
    const warning = devices.filter(d => d.riskScore > 50 && d.riskScore <= 80).length;
    const healthy = total - critical - warning;
    const avgHealth = total > 0 ? Math.round(devices.reduce((acc, d) => acc + d.healthScore, 0) / total) : 0;
    const compliance = total > 0 ? Math.round((devices.filter(d => d.compliance).length / total) * 100) : 0;
    const avgRisk = total > 0 ? Math.round(devices.reduce((acc, d) => acc + d.riskScore, 0) / total) : 0;
    
    return { total, critical, warning, healthy, avgHealth, compliance, avgRisk };
  }, [devices]);

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary flex items-center gap-2">
            <MonitorSmartphone className="w-6 h-6 text-brand" />
            Device Intelligence
          </h1>
          <div className="text-sm text-text-secondary mt-1 flex items-center gap-2">
            Inteligência artificial analisando o Microsoft Intune e gerenciamento da frota
          </div>
        </div>
      </div>

      {/* Live AI Status Bar */}
      <div className="bg-background-subtle border border-border p-4 rounded-xl flex flex-wrap gap-y-4 gap-x-6 items-center justify-between text-xs shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
             <span className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
             <span className="font-bold text-success uppercase tracking-wider">Live</span>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <div className="flex items-center gap-2 text-text-primary">
             <Bot className="w-4 h-4 text-brand animate-pulse" />
             {isLoading ? (
                <span>Buscando dados no Microsoft Intune...</span>
             ) : devices.length === 0 ? (
                <span className="text-warning font-semibold">Sem dispositivos ou integração não configurada</span>
             ) : (
                <span>IA Monitorando <strong>{metrics.total}</strong> dispositivos</span>
             )}
          </div>
        </div>
        
        {devices.length > 0 && (
          <>
            <div className="flex items-center gap-4 text-text-secondary">
               <div className="flex items-center gap-1.5">
                 <Activity className="w-3.5 h-3.5 text-success" />
                 <span>Health <strong className="text-success">{metrics.avgHealth}%</strong></span>
               </div>
               <div className="flex items-center gap-1.5">
                 <ShieldCheck className="w-3.5 h-3.5 text-text-primary" />
                 <span>Compliance <strong className="text-text-primary">{metrics.compliance}%</strong></span>
               </div>
               <div className="flex items-center gap-1.5">
                 <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                 <span>Risco Médio <strong className="text-warning">{metrics.avgRisk}%</strong></span>
               </div>
            </div>
            
            <div className="flex items-center gap-4 text-text-secondary">
              <div className="flex items-center gap-1.5">
                 <Brain className="w-3.5 h-3.5 text-brand" />
                 <span>Status <strong className="font-bold text-text-primary">Monitoramento Ativo</strong></span>
              </div>
            </div>
          </>
        )}
        
        <div className="text-[10px] text-text-muted font-data flex items-center gap-1">
          <RefreshCcw className="w-3 h-3 animate-[spin_3s_linear_infinite]" />
          Última sincronização: agora
        </div>
      </div>

      {!selectedDevice ? (
        <div className="space-y-6">
          {/* View Toggle */}
          <div className="flex gap-2 p-1 bg-background-subtle rounded-lg w-fit border border-border">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${viewMode === 'dashboard' ? 'bg-white dark:bg-slate-800 shadow-sm text-brand' : 'text-text-muted hover:text-text-primary'}`}
            >
              Dashboard & Lista
            </button>
            <button
              onClick={() => setViewMode('radar')}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-colors ${viewMode === 'radar' ? 'bg-white dark:bg-slate-800 shadow-sm text-brand' : 'text-text-muted hover:text-text-primary'}`}
            >
              <Crosshair size={16} /> Fleet Radar
            </button>
          </div>

          {viewMode === 'dashboard' ? (
            <>
              <FleetDashboard 
                metrics={metrics} 
                insights={insights} 
                onCorrelationClick={() => setIsCorrelationOpen(true)}
              />
              <DeviceList 
                devices={filteredDevices} 
                search={search} 
                setSearch={setSearch} 
                onSelectDevice={setSelectedDevice}
              />
            </>
          ) : (
            <FleetRadar devices={devices} tickets={tickets} />
          )}
        </div>
      ) : (
        <DeviceDetails device={selectedDevice} onBack={() => setSelectedDevice(null)} />
      )}

      {isCorrelationOpen && (
        <IncidentCorrelationDrawer 
          isOpen={isCorrelationOpen} 
          onClose={() => setIsCorrelationOpen(false)} 
          deviceId={selectedDevice?.id || devices[0]?.id}
          devices={devices}
        />
      )}
    </div>
  );
}

