import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Sparkles, 
  ThumbsUp, 
  ThumbsDown, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Check, 
  Loader2 
} from "lucide-react";
import { SmartSolution } from '../../../types';
import { KnowledgeBadge } from '../../../shared/components/KnowledgeBadge';
import { ConfidenceIndicator } from '../../../shared/components/ConfidenceIndicator';
import { KnowledgeSources } from '../../../shared/components/KnowledgeSources';

interface SmartTicketPreventionProps {
  title: string;
  description: string;
  onPreventSuccess: () => void; // Called when the issue is successfully resolved to cancel ticket creation
  onRejected: () => void;      // Called when user clicks No to reject suggestions
  csrfToken?: string;
}

export function SmartTicketPrevention({
  title,
  description,
  onPreventSuccess,
  onRejected,
  csrfToken,
}: SmartTicketPreventionProps) {
  const [solutions, setSolutions] = useState<SmartSolution[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [confidenceScore, setConfidenceScore] = useState<number | undefined>(undefined);
  const [matchedCount, setMatchedCount] = useState<number>(0);

  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [hasFeedback, setHasFeedback] = useState(false);
  const [isRejected, setIsRejected] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset state if description changes and falls below threshold
    const trimmed = description.trim();
    if (trimmed.length < 5) {
      setSolutions([]);
      setSources([]);
      setConfidenceScore(undefined);
      setMatchedCount(0);
      setLoading(false);
      setExpandedIndex(null);
      setHasFeedback(false);
      setIsResolved(false);
      setIsRejected(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
      return;
    }

    // Debounce the API call (700ms)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    setLoading(true);
    setIsRejected(false); // Reset rejection when typing continues

    timeoutRef.current = setTimeout(async () => {
      // Cancel previous pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await fetch("/api/tickets/prevent-check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken || "",
          },
          body: JSON.stringify({ description: trimmed, title }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Falha ao analisar descrição");
        }

        const data = await response.json();
        if (data.solutions && Array.isArray(data.solutions)) {
          setSolutions(data.solutions);
          setSources(data.sources || []);
          setConfidenceScore(data.confidenceScore);
          setMatchedCount(data.matchedCount || 0);
        } else {
          setSolutions([]);
          setSources([]);
          setConfidenceScore(undefined);
          setMatchedCount(0);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Erro na busca de soluções preventivas:", err);
          // Hide card on API failure
          setSolutions([]);
          setSources([]);
          setConfidenceScore(undefined);
          setMatchedCount(0);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 700);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [description, title]);

  // Handle positive feedback (issue resolved)
  const handleResolveSuccess = async () => {
    setIsResolved(true);
    setHasFeedback(true);

    try {
      await fetch("/api/tickets/prevent-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken || "",
        },
        body: JSON.stringify({
          title: title || "Problema de Suporte Técnico",
          description,
        }),
      });
    } catch (err) {
      console.error("Erro ao registrar métrica de ticket evitado:", err);
    }

    // Call callback to trigger success animation & close
    setTimeout(() => {
      onPreventSuccess();
    }, 3000);
  };

  // Handle negative feedback (suggestions did not help)
  const handleReject = () => {
    setIsRejected(true);
    setHasFeedback(true);
    onRejected();
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  // Do not render anything if there's no input, it's loading with empty solutions, or if user rejected it, or if there are no solutions
  if (description.trim().length < 5 || isRejected) {
    return null;
  }

  if (loading && solutions.length === 0) {
    return (
      <div className="p-4.5 rounded-xl border border-dashed border-accent/20 bg-accent/5 flex items-center justify-center space-x-2.5 text-xs text-accent animate-pulse">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="font-semibold font-sans">Análise preditiva inteligente em tempo real...</span>
      </div>
    );
  }

  if (solutions.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-brand/20 bg-gradient-to-b from-brand/5 to-transparent shadow-sm overflow-hidden"
      >
        {isResolved ? (
          // Success State with modern visual feedback
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-6 text-center space-y-3.5"
          >
            <div className="mx-auto w-12 h-12 rounded-full bg-success/10 flex items-center justify-center text-success">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 150, delay: 0.1 }}
              >
                <Check className="w-6 h-6 stroke-[3]" />
              </motion.div>
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-text-primary">
                Excelente! Chamado Evitado
              </h4>
              <p className="text-xs text-text-muted leading-relaxed">
                Ficamos muito felizes! Seu problema foi resolvido sem necessidade de abrir um novo chamado.
              </p>
            </div>
            <div className="text-[10px] text-accent/80 font-semibold uppercase tracking-wider animate-pulse">
              Registrando métrica de sucesso...
            </div>
          </motion.div>
        ) : (
          // Solutions List State
          <div className="p-4.5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
              <div className="flex items-center space-x-2 text-accent">
                <Sparkles className="w-4 h-4 text-brand animate-pulse" />
                <span className="text-xs font-extrabold font-sans tracking-wide uppercase">
                  Smart Ticket Prevention
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <KnowledgeBadge matchedCount={matchedCount} />
                {confidenceScore !== undefined && (
                  <ConfidenceIndicator score={confidenceScore} />
                )}
                {loading && (
                  <div className="flex items-center space-x-1.5 text-text-muted text-[10px]">
                    <Loader2 className="w-3 h-3 animate-spin text-accent" />
                    <span>Atualizando...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-sm text-text-primary flex items-center space-x-1.5">
                <span>💡 Soluções Predizidas por IA</span>
              </h4>
              <p className="text-xs text-text-muted">
                Antes de abrir o chamado, tente estas soluções oficiais recomendadas pelo AcmeCorp Ops Center:
              </p>
            </div>

            {/* Individual solutions */}
            <div className="space-y-2.5">
              {solutions.map((sol, index) => {
                const isExpanded = expandedIndex === index;
                return (
                  <div
                    key={index}
                    className="border border-border/80 rounded-xl bg-background-subtle/40 overflow-hidden hover:border-brand/30 transition-all duration-200"
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(index)}
                      className="w-full px-3.5 py-3 flex items-center justify-between text-left cursor-pointer bg-transparent border-none"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center text-success flex-shrink-0 text-xs font-bold">
                          ✓
                        </div>
                        <span className="text-xs font-bold text-text-primary truncate">
                          {sol.title}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0 text-text-muted">
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-background border text-text-muted">
                          {sol.difficulty}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3.5 pb-4.5 pt-1 border-t border-border/50 text-xs text-text-muted space-y-3.5 bg-background/20">
                            <p className="leading-relaxed text-text-primary font-medium">
                              {sol.explanation}
                            </p>

                            <div className="space-y-1.5">
                              <span className="text-[10px] font-extrabold text-brand uppercase tracking-wider block">
                                Passos para Resolução:
                              </span>
                              <ol className="list-decimal list-inside space-y-1 pl-1">
                                {sol.steps.map((step, sIdx) => (
                                  <li key={sIdx} className="leading-relaxed">
                                    <span className="text-text-primary font-medium">{step}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            <div className="flex items-center space-x-4 pt-1.5 border-t border-border/40 text-[10px] font-bold text-text-muted">
                              <div className="flex items-center space-x-1">
                                <Clock className="w-3.5 h-3.5 text-accent" />
                                <span>Tempo Estimado: <strong className="text-text-primary">{sol.estimatedTime}</strong></span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Knowledge Sources section */}
            {sources.length > 0 && (
              <KnowledgeSources sources={sources} />
            )}

            {/* Feedback footer */}
            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-muted">
                Alguma destas soluções resolveu seu problema?
              </span>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleResolveSuccess}
                  className="px-3 py-1.5 bg-success/10 hover:bg-success/20 text-success border border-success/20 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>Sim</span>
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-3 py-1.5 bg-danger/5 hover:bg-danger/10 text-danger border border-danger/20 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                >
                  <ThumbsDown className="w-3 h-3" />
                  <span>Não</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
