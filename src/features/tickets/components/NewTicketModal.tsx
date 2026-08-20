import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { SmartTicketPrevention } from './SmartTicketPrevention';
interface NewTicketModalProps {
  isInline?: boolean;
  newTitle: string;
  setNewTitle: (val: string) => void;
  newUser: string;
  setNewUser: (val: string) => void;
  newCategory: string;
  setNewCategory: (val: string) => void;
  newPriority: "Alta" | "Média" | "Baixa";
  setNewPriority: (val: "Alta" | "Média" | "Baixa") => void;
  newDescription: string;
  setNewDescription: (val: string) => void;
  handleCreateTicket: (e: React.FormEvent) => void;
  setIsNewTicketOpen: (open: boolean) => void;
  csrfToken?: string;
}
export function NewTicketModal({
  isInline = false,
  newTitle,
  setNewTitle,
  newUser,
  setNewUser,
  newCategory,
  setNewCategory,
  newPriority,
  setNewPriority,
  newDescription,
  setNewDescription,
  handleCreateTicket,
  setIsNewTicketOpen,
  csrfToken,
}: NewTicketModalProps) {

  const inputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await handleCreateTicket(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    // Focus first input
    if (inputRef.current && !isInline) {
      inputRef.current.focus();
    }

    if (!isInline) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsNewTicketOpen(false);
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [setIsNewTicketOpen, isInline]);

  const formContent = (
      <div
        className={`w-full max-w-lg bg-surface rounded-2xl p-6 text-text-primary ${!isInline ? "relative border border-border shadow-2xl animate-fade-in z-50" : ""}`}
      >
        {" "}
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
          {" "}
          <h3 className="font-extrabold text-base text-brand">
            Criar Novo Chamado de Operações
          </h3>{" "}
          {!isInline && (
          <button
            type="button"
            aria-label="Fechar modal"
            onClick={() => setIsNewTicketOpen(false)}
            className="p-1 rounded-lg hover:bg-background-subtle text-text-muted hover:text-text-secondary cursor-pointer bg-transparent border-none"
          >
            {" "}
            <X className="w-5 h-5" />{" "}
          </button>
          )}{" "}
        </div>{" "}
        <form onSubmit={onSubmit} className="space-y-4">
          {" "}
          {/* Title input */}{" "}
          <div className="space-y-1">
            {" "}
            <label className="ledger-title block">
              Título do Problema *
            </label>{" "}
            <input
              type="text"
              required
              ref={inputRef}
              placeholder="Ex: Erro ao gerar relatórios fiscais"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="input-premium w-full text-xs"
            />{" "}
          </div>{" "}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            {/* Requisitante input */}{" "}
            <div className="space-y-1">
              {" "}
              <label className="ledger-title block">
                Usuário Requisitante *
              </label>{" "}
              <input
                type="text"
                required
                placeholder="Ex: Mariana Luz"
                value={newUser}
                onChange={(e) => setNewUser(e.target.value)}
                className="input-premium w-full text-xs"
              />{" "}
            </div>{" "}
            {/* Setor selector */}{" "}
            <div className="space-y-1">
              {" "}
              <label className="ledger-title block">
                Setor de Atuação
              </label>{" "}
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="input-premium w-full text-xs"
              >
                {" "}
                <option value="Infraestrutura">Infraestrutura</option>{" "}
                <option value="Permissões">Permissões</option>{" "}
                <option value="Rede">Rede</option>{" "}
                <option value="Software">Software</option>{" "}
                <option value="Hardware">Hardware</option>{" "}
              </select>{" "}
            </div>{" "}
          </div>{" "}
          {/* Priority select */}{" "}
          <div className="space-y-1">
            {" "}
            <label className="ledger-title block">
              Prioridade do Chamado
            </label>{" "}
            <div className="grid grid-cols-3 gap-2">
              {" "}
              {(["Baixa", "Média", "Alta"] as const).map((prio) => (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setNewPriority(prio)}
                  className={`py-2 px-1 border text-xs rounded-xl font-bold transition-all cursor-pointer ${newPriority === prio ? "bg-brand text-white border-brand" : "bg-background-subtle border-border text-text-muted hover:bg-background-subtle"}`}
                >
                  {" "}
                  {prio}{" "}
                </button>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Description input */}{" "}
          <div className="space-y-1">
            {" "}
            <label className="ledger-title block">
              Descrição Completa *
            </label>{" "}
            <textarea
              required
              rows={3}
              placeholder="Descreva de forma concisa e técnica o incidente relatado pelo usuário para que os analistas possam iniciar a triagem..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="input-premium w-full text-xs"
            />{" "}
          </div>{" "}
          <SmartTicketPrevention
            title={newTitle}
            description={newDescription}
            csrfToken={csrfToken}
            onPreventSuccess={() => {
              setNewTitle("");
              setNewDescription("");
              setIsNewTicketOpen(false);
            }}
            onRejected={() => {
              console.log("Suggestions rejected by user.");
            }}
          />

          {/* Buttons Form Submissions */}{" "}
          <div className="pt-4 flex space-x-3 justify-end">
            {" "}
            {!isInline && (
            <button
              type="button"
              onClick={() => setIsNewTicketOpen(false)}
              className="px-4 py-2 border rounded-xl text-xs font-bold text-text-muted hover:text-text-secondary transition-colors cursor-pointer bg-transparent border-border"
            >
              {" "}
              Cancelar{" "}
            </button>
            )}{" "}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-accent text-white hover:bg-brand-hover px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors border-none ${isSubmitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              {" "}
              {isSubmitting ? "Registrando..." : "Registrar Chamado"}{" "}
            </button>{" "}
          </div>{" "}
        </form>{" "}
      </div>
  );

  if (isInline) {
    return formContent;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={() => setIsNewTicketOpen(false)}
      />
      {formContent}
    </div>
  );
}
