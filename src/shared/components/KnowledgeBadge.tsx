import React from "react";
import { BookOpen, Sparkles } from "lucide-react";

interface KnowledgeBadgeProps {
  matchedCount?: number;
}

export function KnowledgeBadge({ matchedCount = 0 }: KnowledgeBadgeProps) {
  if (matchedCount === 0) {
    return (
      <div className="inline-flex items-center space-x-1.5 px-2 py-0.5.5 rounded-md bg-background border border-border text-[10px] text-text-muted font-medium font-sans">
        <Sparkles className="w-3 h-3 text-accent" />
        <span>General Model Reasoner</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-[10px] text-brand font-bold font-sans animate-pulse">
      <BookOpen className="w-3 h-3 text-brand" />
      <span>
        {matchedCount === 1 
          ? "Matched 1 internal document" 
          : `Matched ${matchedCount} internal documents`}
      </span>
    </div>
  );
}
