import React from "react";
import { FileText, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

interface KnowledgeSourcesProps {
  sources?: string[];
}

export function KnowledgeSources({ sources = [] }: KnowledgeSourcesProps) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2.5 border-t border-border/50">
      <div className="flex items-center space-x-1.5 text-[10px] font-bold text-text-muted tracking-wider uppercase">
        <CheckCircle2 className="w-3.5 h-3.5 text-success" />
        <span>Solução baseada em:</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {sources.map((source, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: idx * 0.05 }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-background-subtle border border-border/60 hover:border-brand/40 hover:bg-brand/5 text-[11px] text-text-primary font-medium transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-accent flex-shrink-0" />
            <span className="truncate max-w-[200px]">{source}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
