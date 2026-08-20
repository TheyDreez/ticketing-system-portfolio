import React from "react";
import { ShieldCheck, ShieldAlert, Shield } from "lucide-react";

interface ConfidenceIndicatorProps {
  score?: number;
}

export function ConfidenceIndicator({ score = 70 }: ConfidenceIndicatorProps) {
  let label = "Média";
  let colorClass = "text-warning bg-warning/5 border-warning/20";
  let Icon = Shield;
  let dotColor = "bg-warning";

  if (score >= 85) {
    label = "Alta Confiança";
    colorClass = "text-success bg-success/5 border-success/20";
    Icon = ShieldCheck;
    dotColor = "bg-success animate-ping";
  } else if (score < 60) {
    label = "Baixa Confiança";
    colorClass = "text-danger bg-danger/5 border-danger/20";
    Icon = ShieldAlert;
    dotColor = "bg-danger";
  }

  return (
    <div className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border text-[10px] font-bold font-sans ${colorClass}`}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="tracking-wide uppercase">{label}</span>
      <span className="text-text-primary font-extrabold opacity-85">({score}%)</span>
      <span className="relative flex h-1.5 w-1.5">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}></span>
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`}></span>
      </span>
    </div>
  );
}
