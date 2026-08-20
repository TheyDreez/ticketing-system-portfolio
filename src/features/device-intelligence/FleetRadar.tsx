import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { DeviceData, Ticket } from '../../types';
import { ShieldAlert, AlertTriangle, CheckCircle, Activity, Crosshair, Smartphone, Download } from 'lucide-react';
import { DeviceDetails } from './DeviceDetails';

import { useAuth } from '../../shared/hooks/useAuth';

interface FleetRadarProps {
  devices: DeviceData[];
  tickets: Ticket[];
}

function calculateDeviceRisk(device: DeviceData, tickets: Ticket[]) {
  let score = 0;
  
  const penalties = {
    sla: 0,
    compliance: 0,
    security: 0,
    performance: 0
  };

  // 1. SLA Tickets
  const deviceTickets = tickets.filter(t => t.assetId === device.id && t.status !== 'Resolvido');
  const hasCritical = deviceTickets.some(t => t.slaStatus === 'estourado' || t.status === 'Crítico');
  const hasWarning = deviceTickets.some(t => t.slaStatus === 'em_risco');
  
  if (hasCritical) penalties.sla = 30;
  else if (hasWarning) penalties.sla = 15;

  score += penalties.sla;

  // 2. Compliance
  if (!device.compliance) {
    penalties.compliance = 40;
    score += penalties.compliance;
  }

  // 3. Security
  if (!device.defender) {
    penalties.security = 30;
    score += penalties.security;
  }

  // 4. Performance
  const cpu = device.cpu || 0;
  const ram = device.ram || 0;
  
  if (cpu > 90) penalties.performance += 10;
  if (ram > 90) penalties.performance += 10;
  
  score += penalties.performance;

  score = Math.min(score, 100);

  // Strict priority for quadrant allocation (First penalty > 0 wins)
  let quadrant = 0; // 0 = Healthy
  
  if (penalties.sla > 0) quadrant = 1; // SLA Chamados (Top Right)
  else if (penalties.compliance > 0) quadrant = 2; // Compliance (Bottom Right)
  else if (penalties.security > 0) quadrant = 3; // Segurança (Bottom Left)
  else if (penalties.performance > 0) quadrant = 4; // Performance (Top Left)

  return { score, quadrant, deviceTickets };
}

function getPointInRadar(quadrant: number, score: number, seedId: string) {
  let hash = 0;
  for (let i = 0; i < seedId.length; i++) hash = seedId.charCodeAt(i) + ((hash << 5) - hash);
  const random = Math.abs(Math.sin(hash)); 
  let minAngle = 0;
  let maxAngle = 360;

  // Quadrants logic
  if (quadrant === 1) { minAngle = 270; maxAngle = 360; } // Top Right (SLA)
  else if (quadrant === 2) { minAngle = 0; maxAngle = 90; } // Bottom Right (Compliance)
  else if (quadrant === 3) { minAngle = 90; maxAngle = 180; } // Bottom Left (Security)
  else if (quadrant === 4) { minAngle = 180; maxAngle = 270; } // Top Left (Performance)
  
  const angleDeg = minAngle + (random * (maxAngle - minAngle));
  const angleRad = (angleDeg * Math.PI) / 180;

  // Radius calculation: 0 (Center/Critical) to 330 (Outer edge)
  let baseRadius = 330 - (score * 3.1); 
  
  if (score === 0) {
     // Healthy devices float freely on the outer edge
     baseRadius = 310 + (random * 30);
  } else {
     // Jitter to prevent perfect overlapping of problematic devices
     baseRadius += (random * 20 - 10);
  }
  
  baseRadius = Math.max(10, Math.min(baseRadius, 340));

  const x = 400 + baseRadius * Math.cos(angleRad);
  const y = 400 + baseRadius * Math.sin(angleRad);
  
  return { x, y };
}

export function FleetRadar({ devices, tickets }: FleetRadarProps) {
  const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);
  const [hoveredDevice, setHoveredDevice] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback((point: any) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredDevice(point);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredDevice(null);
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const radarData = useMemo(() => {
    let healthyCount = 0;
    let criticalCount = 0;
    const plotted = devices.map(d => {
      const { score, quadrant, deviceTickets } = calculateDeviceRisk(d, tickets);
      if (score === 0) healthyCount++;
      if (score > 60) criticalCount++;
      const { x, y } = getPointInRadar(quadrant, score, d.id);
      
      let color = '#10b981'; // Green
      if (score > 60) color = '#ef4444'; // Red
      else if (score > 20) color = '#f59e0b'; // Amber
      return { device: d, score, quadrant, x, y, color, deviceTickets };
    });
    const healthPercentage = devices.length > 0 ? Math.round((healthyCount / devices.length) * 100) : 100;
    const compliancePercentage = devices.length > 0 ? Math.round((devices.filter(d => d.compliance).length / devices.length) * 100) : 100;
    const criticalTickets = tickets.filter(t => t.priority === 'Alta' && t.status !== 'Resolvido').length;
    
    return { plotted, healthPercentage, compliancePercentage, criticalCount, criticalTickets };
  }, [devices, tickets]);

  const { user } = useAuth();
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/reports/export/devices/pdf', {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'x-csrf-token': user?.csrfToken || ''
        },
        body: JSON.stringify({ devices })
      });
      
      if (!response.ok) throw new Error('Erro na exportação de PDF de dispositivos');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-frota-${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Erro ao exportar PDF. Verifique o console.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 h-full relative" id="fleet-radar-export-area">
      {/* Executive Summary Layer */}
      <div className="surface-card rounded-2xl p-6" data-html2canvas-ignore="false">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-brand" />
              Resumo Executivo da Frota
            </h2>
            <p className="text-sm text-text-muted mt-1 leading-relaxed">
              <strong className="text-text-primary">{radarData.criticalCount} dispositivos em estado crítico.</strong> 
              {' '}Risco estimado moderado de novos chamados nesta semana. 
              <br />
              <span className="text-[10px] text-slate-400 italic">
                * Nota Histórica: O sistema atual trabalha com visão Live (D0). Snapshots diários de tendência estão em desenvolvimento.
              </span>
            </p>
          </div>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            data-html2canvas-ignore="true"
            className="px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 border border-slate-700"
          >
            {isExporting ? <span className="animate-spin text-white">◷</span> : <Download className="w-4 h-4" />}
            Exportar Relatório
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-border bg-background-subtle flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-text-muted mb-1">Saúde Geral da Frota</div>
            <div className="text-3xl font-display font-bold text-text-primary">
              {radarData.healthPercentage}%
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background-subtle flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-text-muted mb-1">Compliance</div>
            <div className="text-3xl font-display font-bold text-text-primary">
              {radarData.compliancePercentage}%
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background-subtle flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-text-muted mb-1">Chamados Críticos Abertos</div>
            <div className="text-3xl font-display font-bold text-danger">
              {radarData.criticalTickets}
            </div>
          </div>
          <div className="p-4 rounded-xl border border-border bg-background-subtle flex flex-col justify-between">
            <div className="text-[10px] uppercase font-bold text-text-muted mb-1">Dispositivos Críticos</div>
            <div className="text-3xl font-display font-bold text-danger">
              {radarData.criticalCount}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 relative flex-1">
        <div className="flex-1 surface-card rounded-2xl p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[600px]">
        
        {/* Quadrant Labels */}
        <div className="absolute top-4 right-8 font-bold text-slate-400 dark:text-slate-600 flex items-center gap-2">
          SLA Chamados <AlertTriangle size={16} />
        </div>
        <div className="absolute bottom-4 right-8 font-bold text-slate-400 dark:text-slate-600 flex items-center gap-2">
          Compliance <CheckCircle size={16} />
        </div>
        <div className="absolute bottom-4 left-8 font-bold text-slate-400 dark:text-slate-600 flex items-center gap-2">
          <ShieldAlert size={16} /> Segurança
        </div>
        <div className="absolute top-4 left-8 font-bold text-slate-400 dark:text-slate-600 flex items-center gap-2">
          <Activity size={16} /> Performance
        </div>

        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" className="w-full max-w-[700px] aspect-square">
          <defs>
            <radialGradient id="sweepGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(99, 102, 241, 0.3)" />
              <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
            </radialGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Grid Rings */}
          <circle cx="400" cy="400" r="340" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700/50" />
          <circle cx="400" cy="400" r="230" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300 dark:text-slate-600/50" strokeDasharray="4 6" />
          <circle cx="400" cy="400" r="120" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-200 dark:text-red-900/30" strokeDasharray="2 4" />
          
          {/* Axis Lines */}
          <line x1="400" y1="60" x2="400" y2="740" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700/50" />
          <line x1="60" y1="400" x2="740" y2="400" stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-slate-700/50" />

          {/* Sweep Animation */}
          <path 
            d="M 400 400 L 740 400 A 340 340 0 0 1 400 740 Z" 
            fill="url(#sweepGradient)" 
            className="origin-center animate-[spin_4s_linear_infinite]" 
          />

          {/* Center Hub */}
          <circle cx="400" cy="400" r="50" className="fill-white dark:fill-slate-800 stroke-indigo-500" strokeWidth="4" filter="url(#glow)" />
          <text x="400" y="390" textAnchor="middle" className="text-2xl font-bold fill-slate-800 dark:fill-white">
            {radarData.healthPercentage}%
          </text>
          <text x="400" y="415" textAnchor="middle" className="text-[10px] uppercase font-bold tracking-widest fill-slate-500">
            Saúde
          </text>

          {/* Blips */}
          {radarData.plotted.map((point) => {
            const isHovered = hoveredDevice?.device.id === point.device.id;
            return (
              <g 
                key={point.device.id} 
                transform={`translate(${point.x}, ${point.y})`}
                className="cursor-pointer"
                onMouseEnter={() => handleMouseEnter(point)}
                onMouseLeave={handleMouseLeave}
                onClick={() => setSelectedDevice(point.device)}
              >
                {/* Hitbox invisível maior */}
                <circle r="20" fill="transparent" />

                {point.score > 20 && (
                   <circle r="8" fill={point.color} opacity="0.4" className="animate-ping pointer-events-none" />
                )}
                <circle 
                  r="4" 
                  fill={point.color} 
                  stroke="#fff" 
                  strokeWidth="1" 
                  filter="url(#glow)" 
                  style={{
                    transform: isHovered ? 'scale(1.8)' : 'scale(1)',
                    transition: 'transform 0.2s ease-out',
                    transformOrigin: '0px 0px'
                  }}
                  className="pointer-events-none" 
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip */}
        {hoveredDevice && (
          <div className="absolute top-4 left-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 pointer-events-none z-20 min-w-[200px]">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Smartphone size={16} className="text-indigo-500" />
              {hoveredDevice.device.name}
            </h4>
            <p className="text-xs text-slate-500 mb-2">{hoveredDevice.device.user}</p>
            <div className="flex flex-col gap-1 mt-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Score de Risco:</span>
                <span className="font-bold" style={{color: hoveredDevice.color}}>{hoveredDevice.score}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Compliance:</span>
                <span className={hoveredDevice.device.compliance ? 'text-green-500' : 'text-red-500'}>
                  {hoveredDevice.device.compliance ? 'OK' : 'Falha'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Tickets Abertos:</span>
                <span className="font-bold">{hoveredDevice.deviceTickets.length}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Device Details Drawer */}
      {selectedDevice && (
        <div className="w-full lg:w-96 shrink-0 transition-all">
           <DeviceDetails 
             device={selectedDevice} 
             onBack={() => setSelectedDevice(null)} 
             isDrawer={true}
           />
        </div>
      )}
      </div>
    </div>
  );
}
