import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Key, 
  RefreshCw, 
  AlertTriangle, 
  Users,
  CreditCard,
  Clock,
  ShieldAlert,
  CheckCircle2,
  PieChart,
  Building2,
  Search,
  UserCircle
} from 'lucide-react';
import { useSocket } from '../../shared/hooks/useSocket';

interface SkuInfo {
  skuId: string;
  skuPartNumber: string;
  displayName: string;
  total: number;
  consumed: number;
  available: number;
  suspended: number;
  warning: number;
  status: string;
  utilizationPct: number;
  syncedAt: string;
}

interface AllocationInfo {
  upn: string;
  displayName: string;
  skuId: string;
  skuPartNumber: string;
  accountEnabled: boolean;
}

interface WasteInfo {
  upn: string;
  displayName: string;
  skuPartNumber: string;
  accountEnabled: boolean;
  lastSignIn: string | null;
  reason: string;
}

export function LicencasTab({ csrfToken, showToast }: { csrfToken: string, showToast?: (msg: string, type: 'success' | 'error' | 'info') => void }) {
  const [skus, setSkus] = useState<SkuInfo[]>([]);
  const [waste, setWaste] = useState<WasteInfo[]>([]);
  const [allocations, setAllocations] = useState<AllocationInfo[]>([]);
  
  // Navigation States
  const [viewMode, setViewMode] = useState<'geral' | 'dominio' | 'usuario'>('geral');
  const [selectedDomain, setSelectedDomain] = useState<string>('todos');
  const [userSearch, setUserSearch] = useState('');
  
  const [allocationFilter, setAllocationFilter] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [wasteDays, setWasteDays] = useState(90);
  
  const { socket } = useSocket();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [skusRes, wasteRes, allocationsRes] = await Promise.all([
        fetch('/api/licenses/skus'),
        fetch(`/api/licenses/waste?days=${wasteDays}`),
        fetch('/api/licenses/allocations')
      ]);
      
      if (skusRes.ok) setSkus(await skusRes.json());
      if (wasteRes.ok) setWaste(await wasteRes.json());
      if (allocationsRes.ok) setAllocations(await allocationsRes.json());
    } catch (err) {
      console.error('Erro ao buscar dados de licenças', err);
      if (showToast) showToast('Erro ao carregar dados de licenças', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [wasteDays, showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (socket) {
      const handleLicenseSync = (data: any) => {
        setIsSyncing(false);
        if (showToast) showToast(`Sincronização concluída: ${data.skus} SKUs atualizados.`, 'success');
        fetchData();
      };
      
      socket.on('license_sync', handleLicenseSync);
      return () => {
        socket.off('license_sync', handleLicenseSync);
      };
    }
  }, [socket, fetchData, showToast]);

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch('/api/licenses/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        }
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Erro na sincronização');
      }
      const data = await res.json();
      if (data.status === 'already_syncing') {
        if (showToast) showToast('Sincronização já está em andamento.', 'info');
      } else {
        if (showToast) showToast(data.message, 'success');
        fetchData();
        setIsSyncing(false);
      }
    } catch (err: any) {
      console.error(err);
      if (showToast) showToast(err.message || 'Falha ao sincronizar licenças', 'error');
      setIsSyncing(false);
    }
  };

  const getStatusColor = (pct: number) => {
    if (pct >= 90) return 'bg-danger text-white border-danger shadow-[0_0_12px_rgba(239,68,68,0.4)]';
    if (pct >= 75) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    return 'bg-brand/10 text-brand border-brand/20';
  };

  const getProgressBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-danger';
    if (pct >= 75) return 'bg-amber-400';
    return 'bg-brand';
  };

  // --- DERIVADOS DE DADOS (DOMÍNIOS E USUÁRIOS) ---
  
  // 1. Extração de domínios únicos
  const uniqueDomains = useMemo(() => {
    const domains = new Set<string>();
    allocations.forEach(a => {
      const parts = a.upn.split('@');
      if (parts.length > 1) domains.add(parts[1]);
    });
    return Array.from(domains).sort();
  }, [allocations]);

  // 2. Agrupamento para Visão por Domínio
  const domainAllocations = useMemo(() => {
    return allocations.filter(a => selectedDomain === 'todos' || a.upn.endsWith(`@${selectedDomain}`));
  }, [allocations, selectedDomain]);

  const domainWaste = useMemo(() => {
    return waste.filter(w => selectedDomain === 'todos' || w.upn.endsWith(`@${selectedDomain}`));
  }, [waste, selectedDomain]);

  const domainSkuUsage = useMemo(() => {
    const usage = new Map<string, number>();
    domainAllocations.forEach(a => {
      usage.set(a.skuPartNumber, (usage.get(a.skuPartNumber) || 0) + 1);
    });
    return Array.from(usage.entries()).sort((a, b) => b[1] - a[1]);
  }, [domainAllocations]);

  // 3. Agrupamento para Visão por Usuário
  const groupedUsers = useMemo(() => {
    const usersMap = new Map<string, { displayName: string; upn: string; domain: string; licenses: string[], active: boolean }>();
    
    allocations.forEach(a => {
      const domain = a.upn.split('@')[1] || 'desconhecido';
      if (!usersMap.has(a.upn)) {
        usersMap.set(a.upn, { 
          displayName: a.displayName || 'Desconhecido', 
          upn: a.upn, 
          domain, 
          licenses: [], 
          active: a.accountEnabled 
        });
      }
      if (!usersMap.get(a.upn)!.licenses.includes(a.skuPartNumber)) {
        usersMap.get(a.upn)!.licenses.push(a.skuPartNumber);
      }
    });

    return Array.from(usersMap.values()).filter(u => 
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.upn.toLowerCase().includes(userSearch.toLowerCase())
    ).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allocations, userSearch]);


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <Key className="w-6 h-6 text-brand" />
            Controle de Licenças M365
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Gestão inteligente de assinaturas, alocação e identificação de desperdícios no Microsoft 365.
          </p>
        </div>
        
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg ${
            isSyncing 
            ? 'bg-background-subtle text-text-muted cursor-not-allowed'
            : 'bg-brand text-background hover:bg-brand-hover hover:shadow-[0_0_20px_rgba(127,216,190,0.3)]'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
        </button>
      </div>

      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex space-x-1 bg-surface border border-border p-1 rounded-xl w-fit">
        <button
          onClick={() => setViewMode('geral')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'geral' ? 'bg-brand/10 text-brand' : 'text-text-muted hover:text-text-primary'}`}
        >
          <PieChart className="w-4 h-4" />
          Visão Geral
        </button>
        <button
          onClick={() => setViewMode('dominio')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'dominio' ? 'bg-brand/10 text-brand' : 'text-text-muted hover:text-text-primary'}`}
        >
          <Building2 className="w-4 h-4" />
          Por Empresa (Domínio)
        </button>
        <button
          onClick={() => setViewMode('usuario')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'usuario' ? 'bg-brand/10 text-brand' : 'text-text-muted hover:text-text-primary'}`}
        >
          <UserCircle className="w-4 h-4" />
          Por Usuário
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 text-brand animate-spin" />
        </div>
      ) : (
        <>
          {/* =========================================
              VISÃO GERAL (TENANT COMPLETO)
          ========================================= */}
          {viewMode === 'geral' && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {skus.map(sku => (
                  <div 
                    key={sku.skuId} 
                    className="bg-surface border border-border rounded-2xl p-5 hover:border-brand/40 transition-colors shadow-sm relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${getStatusColor(sku.utilizationPct)}`}>
                          <CreditCard className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text-primary leading-tight">{sku.displayName}</h3>
                          <p className="text-xs text-text-muted">{sku.skuPartNumber}</p>
                        </div>
                      </div>
                      {sku.utilizationPct >= 90 && (
                        <div className="animate-pulse bg-danger/10 text-danger p-1.5 rounded-full" title="Alerta de capacidade">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-5 text-center">
                      <div className="bg-background/50 rounded-xl p-2 border border-border/50">
                        <p className="text-[10px] text-text-muted uppercase font-semibold">Total</p>
                        <p className="text-lg font-bold text-text-primary">{sku.total}</p>
                      </div>
                      <div className="bg-background/50 rounded-xl p-2 border border-border/50">
                        <p className="text-[10px] text-text-muted uppercase font-semibold">Uso</p>
                        <p className="text-lg font-bold text-text-primary">{sku.consumed}</p>
                      </div>
                      <div className="bg-background/50 rounded-xl p-2 border border-border/50">
                        <p className="text-[10px] text-text-muted uppercase font-semibold">Livre</p>
                        <p className="text-lg font-bold text-brand">{sku.available}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-text-secondary">Utilização</span>
                        <span className={sku.utilizationPct >= 90 ? 'text-danger font-bold' : 'text-text-primary'}>
                          {sku.utilizationPct}%
                        </span>
                      </div>
                      <div className="w-full bg-background-subtle rounded-full h-2.5 overflow-hidden border border-border/50">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${getProgressBarColor(sku.utilizationPct)}`}
                          style={{ width: `${Math.min(100, sku.utilizationPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {skus.length === 0 && (
                <div className="text-center py-12 bg-surface/50 rounded-2xl border border-dashed border-border">
                  <PieChart className="w-12 h-12 text-text-muted mx-auto mb-4" />
                  <p className="text-text-secondary font-medium">Nenhum SKU de licença encontrado.</p>
                  <p className="text-sm text-text-muted mt-1">Verifique as permissões do Azure ou sincronize os dados.</p>
                </div>
              )}

              {/* Tabela de Waste (Ociosidade Geral) */}
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background-subtle/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-text-primary">Monitoramento de Ociosidade</h3>
                      <p className="text-xs text-text-secondary">Licenças alocadas em contas inativas (Tenant Completo).</p>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-background z-10 shadow-sm">
                      <tr className="text-text-muted text-[11px] uppercase tracking-wider">
                        <th className="px-5 py-3 font-semibold">Usuário</th>
                        <th className="px-5 py-3 font-semibold">Status Conta</th>
                        <th className="px-5 py-3 font-semibold">Licença Ociosa</th>
                        <th className="px-5 py-3 font-semibold">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                      {waste.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-5 py-10 text-center text-text-muted">
                            Excelente! Nenhum desperdício de licença detectado.
                          </td>
                        </tr>
                      ) : (
                        waste.map((w, idx) => (
                          <tr key={`waste-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-text-primary">{w.displayName}</span>
                                <span className="text-[11px] text-text-secondary">{w.upn}</span>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              {w.accountEnabled ? (
                                <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase">Ativa</span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger text-[10px] font-bold uppercase">Desabilitada</span>
                              )}
                            </td>
                            <td className="px-5 py-3 font-medium text-text-secondary">{w.skuPartNumber}</td>
                            <td className="px-5 py-3 text-amber-400 text-xs">{w.reason}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================
              VISÃO POR EMPRESA (DOMÍNIO)
          ========================================= */}
          {viewMode === 'dominio' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-text-primary">Filtro por Empresa</h3>
                  <p className="text-xs text-text-secondary">Selecione o domínio para visualizar o consumo isolado.</p>
                </div>
                <select 
                  value={selectedDomain}
                  onChange={(e) => setSelectedDomain(e.target.value)}
                  className="bg-background border border-border text-sm text-text-primary rounded-lg px-4 py-2 focus:border-brand outline-none"
                >
                  <option value="todos">Todos os Domínios (Visão Global)</option>
                  {uniqueDomains.map(d => (
                    <option key={d} value={d}>@{d}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Consumo por Licença na Empresa */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-border bg-background-subtle/30">
                    <h3 className="font-bold text-text-primary">Consumo de Licenças ({selectedDomain === 'todos' ? 'Global' : `@${selectedDomain}`})</h3>
                  </div>
                  <div className="p-5">
                    {domainSkuUsage.length === 0 ? (
                      <p className="text-sm text-text-muted">Nenhuma licença consumida neste domínio.</p>
                    ) : (
                      <div className="space-y-4">
                        {domainSkuUsage.map(([sku, count]) => (
                          <div key={sku} className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/50">
                            <span className="font-medium text-text-secondary text-sm">{sku}</span>
                            <span className="bg-brand/10 text-brand px-3 py-1 rounded-lg font-bold">{count} alocadas</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ociosidade na Empresa */}
                <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="p-5 border-b border-border bg-background-subtle/30">
                    <h3 className="font-bold text-text-primary flex items-center gap-2 text-amber-500">
                      <ShieldAlert className="w-4 h-4" />
                      Desperdício na Empresa
                    </h3>
                  </div>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <tbody className="divide-y divide-border">
                        {domainWaste.length === 0 ? (
                          <tr>
                            <td className="px-5 py-8 text-center text-text-muted">Nenhum desperdício encontrado neste domínio.</td>
                          </tr>
                        ) : (
                          domainWaste.map((w, idx) => (
                            <tr key={`dw-${idx}`}>
                              <td className="px-5 py-3">
                                <span className="font-semibold block text-text-primary">{w.displayName}</span>
                                <span className="text-[11px] text-text-muted">{w.skuPartNumber} ({w.reason})</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =========================================
              VISÃO POR USUÁRIO (AGRUPADO)
          ========================================= */}
          {viewMode === 'usuario' && (
            <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm animate-fade-in">
              <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background-subtle/30">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand/10 text-brand rounded-xl border border-brand/20">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary">Inventário por Usuário</h3>
                    <p className="text-xs text-text-secondary">Visualize todas as licenças que cada funcionário possui.</p>
                  </div>
                </div>
                
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full bg-background border border-border text-sm text-text-primary rounded-lg pl-9 pr-3 py-2 focus:border-brand outline-none"
                  />
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-background z-10 shadow-sm">
                    <tr className="text-text-muted text-[11px] uppercase tracking-wider">
                      <th className="px-5 py-4 font-semibold">Colaborador</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Pacote de Licenças M365</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {groupedUsers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-5 py-10 text-center text-text-muted">
                          Nenhum usuário encontrado com os critérios de busca.
                        </td>
                      </tr>
                    ) : (
                      groupedUsers.map((user, idx) => (
                        <tr key={`usr-${idx}`} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-sm border border-brand/20">
                                {user.displayName.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-text-primary">{user.displayName}</span>
                                <span className="text-[11px] text-text-muted">{user.upn}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            {user.active ? (
                              <span className="px-2.5 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase border border-success/20">Ativo</span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-danger/10 text-danger text-[10px] font-bold uppercase border border-danger/20">Inativo</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {user.licenses.map((lic, lIdx) => (
                                <span key={lIdx} className="bg-background-subtle border border-border text-text-secondary text-xs px-2.5 py-1 rounded-md font-medium">
                                  {lic}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
