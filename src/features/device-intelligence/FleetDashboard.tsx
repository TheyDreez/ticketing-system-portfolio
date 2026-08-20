import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  MonitorSmartphone,
  ServerCrash,
  TrendingUp,
  ArrowRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export function FleetDashboard({ metrics, insights, onCorrelationClick }) {
  const pieData = [
    { name: 'Healthy', value: metrics.healthy, color: '#10b981' },
    { name: 'Warning', value: metrics.warning, color: '#f59e0b' },
    { name: 'Critical', value: metrics.critical, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Executive Insights */}
      <div className="p-4 rounded-xl border border-brand/20 bg-brand/5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-brand/20 rounded-lg text-brand mt-1">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-brand mb-2">Executive AI Insights</h3>
            <ul className="text-xs text-text-secondary space-y-2">
              {insights.map((insight, idx) => (
                <li key={insight.id} className="flex items-start gap-2">
                  <span className="text-brand">•</span> 
                  <span>
                    <strong className={insight.severity === 'high' ? 'text-danger' : 'text-text-primary'}>
                      {insight.description}
                    </strong>
                    {' '}- Impacto: {insight.impact}
                  </span>
                </li>
              ))}

            </ul>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-2xl border shadow-sm surface-card flex flex-col justify-between col-span-1 lg:col-span-2">
          <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 flex justify-between">
            Risk Distribution <Activity className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="h-24 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={30}
                  outerRadius={45}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: 'var(--color-text-primary)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-5 rounded-2xl border shadow-sm surface-card flex flex-col justify-between">
          <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 flex justify-between">
            Health Score <Activity className="w-3.5 h-3.5 text-brand" />
          </div>
          <div className="text-3xl font-bold text-brand font-display">{metrics.avgHealth}/100</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-5 rounded-2xl border shadow-sm surface-card flex flex-col justify-between">
          <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 flex justify-between">
            Total Devices <MonitorSmartphone className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="text-3xl font-bold text-text-primary font-display">{metrics.total}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="p-5 rounded-2xl border shadow-sm surface-card flex flex-col justify-between">
          <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 flex justify-between">
            Saudáveis <CheckCircle className="w-3.5 h-3.5 text-success" />
          </div>
          <div className="text-3xl font-bold text-success font-display">{metrics.healthy}</div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="p-5 rounded-2xl border shadow-sm surface-card flex flex-col justify-between">
          <div className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-1 flex justify-between">
            Críticos <ServerCrash className="w-3.5 h-3.5 text-danger" />
          </div>
          <div className="text-3xl font-bold text-danger font-display">{metrics.critical}</div>
        </motion.div>
      </div>
      
      {/* Incident Correlation */}
      <div className="p-5 rounded-2xl border shadow-sm surface-card border-l-4 border-l-warning">
        <h3 className="text-sm font-bold text-text-primary mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-warning" />
          Incident Correlation Engine
        </h3>
        <div className="space-y-3">
          {insights && insights.length > 0 ? (
            insights.map((insight: any) => (
              <div key={insight.id} className="p-4 bg-warning/10 rounded-lg flex items-center justify-between group cursor-pointer transition-colors hover:bg-warning/20" onClick={onCorrelationClick}>
                <div>
                  <div className="text-xs font-bold text-warning-dark mb-1">
                    {insight.insight_type === 'risk' ? 'Risco Detectado' : 'Análise de Performance'}
                  </div>
                  <p className="text-xs text-text-secondary">
                    {insight.description}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-warning group-hover:translate-x-1 transition-transform" />
              </div>
            ))
          ) : (
            <div className="text-xs text-text-muted italic">Nenhuma correlação de incidentes detectada no momento.</div>
          )}
        </div>
      </div>
    </div>
  );
}
