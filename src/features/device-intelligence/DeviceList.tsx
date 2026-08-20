import React from 'react';
import { MonitorSmartphone, Search, ArrowRight } from 'lucide-react';

export function DeviceList({ devices, search, setSearch, onSelectDevice }) {
  return (
    <div className="p-5 rounded-2xl border shadow-sm surface-card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-text-primary font-display">Frota Gerenciada</h2>
        <div className="flex space-x-2">
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar dispositivos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background-subtle border border-border rounded-xl text-xs text-text-primary focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 w-64 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-text-muted text-[10px] uppercase tracking-wider font-bold">
              <th className="pb-3 pt-2 px-2">Dispositivo</th>
              <th className="pb-3 pt-2 px-2">Usuário</th>
              <th className="pb-3 pt-2 px-2">Departamento</th>
              <th className="pb-3 pt-2 px-2">Health</th>
              <th className="pb-3 pt-2 px-2">Risco</th>
              <th className="pb-3 pt-2 px-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {devices.map(device => (
              <tr key={device.id} className="hover:bg-background-subtle/50 transition-colors group cursor-pointer" onClick={() => onSelectDevice(device)}>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <MonitorSmartphone className="w-4 h-4 text-text-secondary" />
                    <div>
                      <div className="font-bold text-text-primary">{device.name}</div>
                      <div className="text-[10px] text-text-muted font-data">{device.os}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-2 text-text-secondary">{device.user}</td>
                <td className="py-3 px-2 text-text-secondary">{device.department}</td>
                <td className="py-3 px-2">
                  <div className={`text-xs font-bold ${device.healthScore != null && device.healthScore < 50 ? 'text-danger' : device.healthScore != null && device.healthScore < 80 ? 'text-warning' : 'text-success'}`}>
                    {device.healthScore != null ? `${device.healthScore}%` : 'N/A'}
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${device.riskScore != null && device.riskScore > 80 ? 'bg-danger-light text-danger' : device.riskScore != null && device.riskScore > 50 ? 'bg-warning/20 text-warning' : 'bg-success-light text-success'}`}>
                    {device.riskScore != null ? (device.riskScore > 80 ? 'Alto' : device.riskScore > 50 ? 'Médio' : 'Baixo') : 'N/A'}
                  </div>
                </td>
                <td className="py-3 px-2 text-right">
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-brand inline-block transition-transform" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
