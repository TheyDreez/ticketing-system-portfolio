import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "card" | "table-row";
}

export function Skeleton({ className = "", variant = "text" }: SkeletonProps) {
  const baseClass = "animate-pulse bg-text-muted/10 rounded-md";

  if (variant === "text") {
    return <div className={`${baseClass} h-4 w-3/4 ${className}`} />;
  }

  if (variant === "card") {
    return (
      <div className={`p-6 border border-border bg-surface rounded-2xl flex flex-col space-y-4 ${baseClass} ${className}`}>
        <div className="h-5 w-1/3 bg-text-muted/10 rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-text-muted/10 rounded" />
          <div className="h-4 w-5/6 bg-text-muted/10 rounded" />
        </div>
        <div className="h-8 w-1/4 bg-text-muted/10 rounded mt-4" />
      </div>
    );
  }

  if (variant === "table-row") {
    return (
      <div className={`h-14 w-full flex items-center px-4 space-x-4 ${baseClass} ${className}`}>
        <div className="h-4 w-12 bg-text-muted/10 rounded" />
        <div className="h-4 flex-1 bg-text-muted/10 rounded" />
        <div className="h-4 w-24 bg-text-muted/10 rounded" />
        <div className="h-4 w-16 bg-text-muted/10 rounded" />
      </div>
    );
  }

  return <div className={`${baseClass} ${className}`} />;
}
