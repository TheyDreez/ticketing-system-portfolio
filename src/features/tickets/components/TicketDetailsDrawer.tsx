import React, { useEffect, useState } from "react";
import {
  X,
  User,
  Paperclip,
  UploadCloud,
  History,
  FileText,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Send,
  Cpu,
  ArrowRight,
  Laptop
} from "lucide-react";
import { Ticket, Attachment, AuditEvent, TicketComment, UserProfile } from '../../../types';

export function ImageAttachmentPreview({ ticketId, file }: { ticketId: string; file: Attachment }) {
  const [imgUrl, setImgUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    const fetchUrl = async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/attachments/${file.id}/download`);
        if (res.ok) {
          const { downloadUrl } = await res.json();
          if (active) {
            setImgUrl(downloadUrl);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchUrl();
    return () => {
      active = false;
    };
  }, [ticketId, file.id]);

  if (!imgUrl) return null;

  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-border/40 max-h-40 bg-slate-950/20 flex items-center justify-center">
      <img
        src={imgUrl}
        alt={file.filename}
        referrerPolicy="no-referrer"
        className="max-h-40 max-w-full object-contain"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

interface TicketDetailsDrawerProps {
  user?: UserProfile | null;
  selectedTicket: Ticket;
  setSelectedTicket: (ticket: Ticket | null) => void;
  noteInput: string;
  setNoteInput: (val: string) => void;
  handleAddNote: (id: string) => void;
  handleUpdateStatus: (id: string, status: Ticket["status"]) => void;
  csrfToken: string;
}

export function TicketDetailsDrawer({
  user,
  selectedTicket,
  setSelectedTicket,
  noteInput,
  setNoteInput,
  handleAddNote,
  handleUpdateStatus,
  csrfToken,
}: TicketDetailsDrawerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTicket(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedTicket]);

  const [activeSection, setActiveSection] = React.useState<
    "detalhes" | "comentarios" | "timeline" | "anexos" | "auditoria"
  >("detalhes");
  const [attachments, setAttachments] = React.useState<Attachment[]>([]);
  const [auditEvents, setAuditEvents] = React.useState<AuditEvent[]>([]);
  const [comments, setComments] = React.useState<TicketComment[]>([]);
  const [deviceInfo, setDeviceInfo] = React.useState<any>(null);
  const [newCommentText, setNewCommentText] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSendingComment, setIsSendingComment] = React.useState(false);

  type TimelineEvent = 
    | (AuditEvent & { kind: 'audit' })
    | (TicketComment & { kind: 'comment' });

  const timelineEvents = React.useMemo<TimelineEvent[]>(() => {
    const combined: TimelineEvent[] = [
      ...auditEvents.map(e => ({ ...e, kind: 'audit' as const })),
      ...comments.map(c => ({ ...c, kind: 'comment' as const }))
    ];
    return combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // descending, newest first
  }, [auditEvents, comments]);



  const [dragOver, setDragOver] = React.useState(false);

  // Continuous Learning state variables
  const [isAddedToKB, setIsAddedToKB] = React.useState(false);
  const [isAddingToKB, setIsAddingToKB] = React.useState(false);
  const [kbTitle, setKbTitle] = React.useState("");
  const [kbContent, setKbContent] = React.useState("");
  const [kbKeywords, setKbKeywords] = React.useState("");
  const [showKbForm, setShowKbForm] = React.useState(false);

  // Initialize KB form when ticket status changes or selected ticket changes
  React.useEffect(() => {
    setIsAddedToKB(false);
    setShowKbForm(false);
    if (selectedTicket.status === "Resolvido") {
      setKbTitle(`KB-${Math.floor(100 + Math.random() * 900)}: ${selectedTicket.title}`);
      const notesCombined = selectedTicket.notes && selectedTicket.notes.length > 0
        ? "\n\nResolução Técnica:\n" + selectedTicket.notes.join("\n")
        : "";
      setKbContent(`Problema Relatado:\n${selectedTicket.description}${notesCombined}`);
      setKbKeywords(selectedTicket.category.toLowerCase());
    }
  }, [selectedTicket.id, selectedTicket.status]);

  const handleAddToKnowledgeBase = async () => {
    if (!kbTitle.trim() || !kbContent.trim()) {
      alert("Por favor, preencha o título e conteúdo do artigo.");
      return;
    }
    setIsAddingToKB(true);
    try {
      const response = await fetch("/api/knowledge/articles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({
          title: kbTitle,
          category: selectedTicket.category,
          keywords: kbKeywords.split(",").map(k => k.trim()).filter(Boolean),
          content: kbContent,
          confidence: 95,
          source: "ticket_resolution"
        }),
      });

      if (response.ok) {
        setIsAddedToKB(true);
        setShowKbForm(false);
        fetchAuditEvents();
      } else {
        alert("Erro ao adicionar artigo à base de conhecimento.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de rede ao salvar artigo.");
    } finally {
      setIsAddingToKB(false);
    }
  };

  /* Fetch attachments, comments and audit log whenever active ticket changes */ React.useEffect(() => {
    fetchAttachments();
    fetchAuditEvents();
    fetchComments();
    fetchDeviceInfo();
  }, [selectedTicket.id, selectedTicket.assetId, selectedTicket.user, selectedTicket.authorEmail]);

  const fetchDeviceInfo = async () => {
    try {
      const res = await fetch('/api/devices');
      if (res.ok) {
        const devices = await res.json();
        const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() : "";
        
        let matched = null;
        if (selectedTicket.assetId) {
          matched = devices.find((d: any) => d.id === selectedTicket.assetId);
        }
        if (!matched && (selectedTicket.user || selectedTicket.authorEmail)) {
          const uName = normalize(selectedTicket.user || '');
          const uEmail = normalize(selectedTicket.authorEmail || '');
          const emailPrefix = uEmail.split('@')[0];
          matched = devices.find((d: any) => {
            const assigned = normalize(d.user || '');
            if (!assigned) return false;
            return assigned === uEmail || 
                   assigned === uName || 
                   (emailPrefix && assigned === emailPrefix) || 
                   (uName && assigned.includes(uName)) || 
                   (uName && uName.includes(assigned));
          });
        }
        setDeviceInfo(matched || null);
      }
    } catch (err) {
      console.error("Error fetching device info:", err);
    }
  };
  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/attachments`);
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (err) {
      console.error("Error fetching attachments:", err);
    }
  };
  const fetchAuditEvents = async () => {
    try {
      const res = await fetch(
        `/api/audit-events?ticket_id=${encodeURIComponent(selectedTicket.id)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setAuditEvents(data);
      }
    } catch (err) {
      console.error("Error fetching audit events:", err);
    }
  };
  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };
  const handleSendComment = async () => {
    if (!newCommentText.trim() || isSendingComment) return;
    setIsSendingComment(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ content: newCommentText }),
      });
      if (res.ok) {
        setNewCommentText("");
        fetchComments();
        fetchAuditEvents();
      } else {
        alert("Erro ao enviar comentário.");
      }
    } catch (err) {
      alert("Erro de conexão ao enviar comentário.");
    } finally {
      setIsSendingComment(false);
    }
  };
  const handleFileUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      alert("O arquivo excede o limite máximo de 10MB.");
      return;
    }
    setIsUploading(true);
    try {
      const regRes = await fetch(
        `/api/tickets/${selectedTicket.id}/attachments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-Token": csrfToken,
          },
          body: JSON.stringify({
            filename: file.name,
            mimetype: file.type || "application/octet-stream",
            size: file.size,
          }),
        },
      );
      if (!regRes.ok) {
        const errorData = await regRes.json();
        throw new Error(errorData.error || "Erro ao registrar anexo.");
      }
      const { uploadUrl, attachment } = await regRes.json();
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "X-CSRF-Token": csrfToken },
      });
      if (uploadRes.ok) {
        // Disparar verificação de magic bytes (Spoofing Check)
        const verifyRes = await fetch(
          `/api/tickets/${selectedTicket.id}/attachments/${attachment.id}/verify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": csrfToken,
            },
          }
        );

        if (!verifyRes.ok) {
          const verifyError = await verifyRes.json();
          throw new Error(verifyError.error || "Arquivo rejeitado pela verificação de segurança.");
        }

        await fetchAttachments();
        await fetchAuditEvents();
      } else {
        throw new Error("Falha ao enviar arquivo.");
      }
    } catch (err: any) {
      alert("Erro no envio: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => {
    setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };
  const handleDownload = async (attachmentId: string, filename: string) => {
    try {
      const res = await fetch(
        `/api/tickets/${selectedTicket.id}/attachments/${attachmentId}/download`,
      );
      if (res.ok) {
        const { downloadUrl } = await res.json();
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await fetchAuditEvents(); /* update log */
      }
    } catch (err) {
      console.error("Error downloading:", err);
    }
  };
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };
  return (
    <div
      id="details-drawer"
      className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] bg-surface border-l border-border shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in text-text-primary"
    >
      {" "}
      {/* Header */}{" "}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-background-subtle">
        {" "}
        <div>
          {" "}
          <div className="flex items-center space-x-2">
            {" "}
            {user?.role !== 'Colaborador' && (
              <span className="font-data text-sm font-extrabold text-brand">
                {selectedTicket.id}
              </span>
            )}{" "}
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${selectedTicket.priority === "Alta" ? "bg-danger-light text-danger" : selectedTicket.priority === "Média" ? "bg-warning-light text-warning" : "bg-background-subtle text-text-muted"}`}
            >
              {" "}
              {selectedTicket.priority}{" "}
            </span>{" "}
            {/* SLA Status Indicator Badge */}{" "}
            {selectedTicket.slaStatus && (
              <span
                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase flex items-center space-x-1 ${selectedTicket.slaStatus === "estourado" ? "bg-danger text-white" : selectedTicket.slaStatus === "em_risco" ? "bg-warning text-white" : "bg-brand text-white"}`}
              >
                {" "}
                {selectedTicket.slaStatus === "estourado"
                  ? "🚨 SLA Estourado"
                  : selectedTicket.slaStatus === "em_risco"
                    ? "⚠️ SLA Em Risco"
                    : "✅ SLA No Prazo"}{" "}
              </span>
            )}{" "}
          </div>{" "}
          <h3 className="font-bold text-base mt-1 line-clamp-1">
            {selectedTicket.title}
          </h3>{" "}
        </div>{" "}
        <button
          aria-label="Fechar detalhes do chamado"
          onClick={() => setSelectedTicket(null)}
          className="p-1.5 rounded-lg hover:bg-border :bg-surface text-text-muted hover:text-text-secondary :text-white cursor-pointer bg-transparent border-none"
        >
          {" "}
          <X className="w-5 h-5" />{" "}
        </button>{" "}
      </div>{" "}
      {/* Navigation Sub-Tabs */}{" "}
      <div className="flex border-b border-slate-100 bg-background-subtle [#161D24] text-xs">
        {" "}
        <button
          onClick={() => setActiveSection("detalhes")}
          className={`flex-1 py-3 text-center font-bold tracking-tight border-b-2 transition-colors cursor-pointer ${activeSection === "detalhes" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-secondary :text-white"}`}
        >
          {" "}
          Detalhes & Notas{" "}
        </button>{" "}
        <button
          onClick={() => setActiveSection("comentarios")}
          className={`flex-1 py-3 text-center font-bold tracking-tight border-b-2 transition-colors cursor-pointer relative ${activeSection === "comentarios" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-secondary :text-white"}`}
        >
          {" "}
          Comentários ({comments.length}){" "}
        </button>{" "}
        <button
          onClick={() => setActiveSection("timeline")}
          className={`flex-1 py-3 text-center font-bold tracking-tight border-b-2 transition-colors cursor-pointer relative ${activeSection === "timeline" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-secondary :text-white"}`}
        >
          {" "}
          Linha do Tempo{" "}
        </button>{" "}
        <button
          onClick={() => setActiveSection("anexos")}
          className={`flex-1 py-3 text-center font-bold tracking-tight border-b-2 transition-colors cursor-pointer relative ${activeSection === "anexos" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-secondary :text-white"}`}
        >
          {" "}
          Anexos ({attachments.length}){" "}
        </button>{" "}
        {user?.role !== 'Colaborador' && (
        <button
          onClick={() => setActiveSection("auditoria")}
          className={`flex-1 py-3 text-center font-bold tracking-tight border-b-2 transition-colors cursor-pointer ${activeSection === "auditoria" ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text-secondary :text-white"}`}
        >
          {" "}
          Auditoria{" "}
        </button>
        )}{" "}
      </div>{" "}
      {/* Body content based on Active Section */}{" "}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col min-h-0">
        {" "}
        {activeSection === "detalhes" && (
          <div className="space-y-6">
            {/* Continuous Learning - Add to Knowledge Base Block */}
            {selectedTicket.status === "Resolvido" && !isAddedToKB && user?.role !== 'Colaborador' && (
              <div className="p-4 rounded-xl border border-brand/25 bg-brand/5 space-y-3 animate-fade-in text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="p-1 rounded-lg bg-brand/15 text-brand flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </span>
                    <span className="font-extrabold text-text-primary">
                      Adicionar esta solução à Base de Conhecimento?
                    </span>
                  </div>
                  {!showKbForm && (
                    <button
                      onClick={() => setShowKbForm(true)}
                      className="px-2.5 py-1 bg-brand hover:bg-brand-hover text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all border-none"
                    >
                      Sim, Criar Artigo
                    </button>
                  )}
                </div>

                {showKbForm && (
                  <div className="space-y-3 pt-2.5 border-t border-brand/10">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase">Título do Artigo</label>
                      <input
                        type="text"
                        value={kbTitle}
                        onChange={(e) => setKbTitle(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-xl bg-background border-border/60 focus:outline-none focus:ring-1 focus:ring-brand text-text-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase">Palavras-chave (Separadas por vírgula)</label>
                      <input
                        type="text"
                        value={kbKeywords}
                        onChange={(e) => setKbKeywords(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-xl bg-background border-border/60 focus:outline-none focus:ring-1 focus:ring-brand text-text-primary"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-text-muted uppercase">Conteúdo do Procedimento (SOP)</label>
                      <textarea
                        rows={4}
                        value={kbContent}
                        onChange={(e) => setKbContent(e.target.value)}
                        className="w-full text-xs px-3 py-2 border rounded-xl bg-background border-border/60 focus:outline-none focus:ring-1 focus:ring-brand font-sans text-text-primary"
                      />
                    </div>
                    <div className="flex justify-end space-x-2 pt-1">
                      <button
                        onClick={() => setShowKbForm(false)}
                        className="px-3 py-1.5 bg-background border border-border rounded-lg text-[10px] font-semibold text-text-muted hover:text-text-primary transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleAddToKnowledgeBase}
                        disabled={isAddingToKB}
                        className="px-3 py-1.5 bg-brand hover:bg-brand-hover text-white rounded-lg text-[10px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer disabled:opacity-50 border-none"
                      >
                        {isAddingToKB ? "Processando Embedding..." : "Salvar e Gerar Embedding"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isAddedToKB && (
              <div className="p-3.5 rounded-xl border border-success/20 bg-success/5 flex items-center space-x-2.5 text-xs text-success font-medium animate-fade-in">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                <span>Artigo salvo e indexado na Base de Conhecimento com sucesso!</span>
              </div>
            )}

            {" "}
            {/* Meta tags indicators */}{" "}
            <div className="grid grid-cols-2 gap-4 bg-background-subtle p-4 rounded-xl text-xs">
              {" "}
              <div>
                {" "}
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">
                  Requisitante
                </span>{" "}
                <span className="font-bold flex items-center space-x-1.5 text-text-primary">
                  {" "}
                  <User className="w-3.5 h-3.5 text-text-muted" />{" "}
                  <span>{selectedTicket.user}</span>{" "}
                </span>{" "}
              </div>{" "}
              <div>
                {" "}
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">
                  Setor de Atuação
                </span>{" "}
                <span className="font-bold uppercase font-data tracking-wide text-text-primary">
                  {selectedTicket.category}
                </span>{" "}
              </div>{" "}
              <div>
                {" "}
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">
                  Registrado Em
                </span>{" "}
                <span className="font-bold text-text-primary">
                  {selectedTicket.createdAt}
                </span>{" "}
              </div>{" "}
              <div>
                {" "}
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">
                  Limite SLA
                </span>{" "}
                <span
                  className={`font-semibold font-data ${selectedTicket.slaStatus === "estourado" ? "text-danger font-bold" : "text-text-primary "}`}
                >
                  {" "}
                  {selectedTicket.slaDeadline
                    ? new Date(selectedTicket.slaDeadline).toLocaleTimeString(
                        "pt-BR",
                        { hour: "2-digit", minute: "2-digit" },
                      ) +
                      " (" +
                      new Date(selectedTicket.slaDeadline).toLocaleDateString(
                        "pt-BR",
                      ) +
                      ")"
                    : selectedTicket.deadline}{" "}
                </span>{" "}
              </div>{" "}
              <div className="col-span-2 pt-2.5 border-t border-border/50">
                {" "}
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-1">
                  Dispositivo Vinculado
                </span>{" "}
                <div className="flex items-center space-x-2">
                  <Laptop className="w-4 h-4 text-brand flex-shrink-0" />
                  {deviceInfo ? (
                    <span className="text-xs font-bold text-brand font-data">
                      {deviceInfo.name} {deviceInfo.model ? `(${deviceInfo.model})` : deviceInfo.serial ? `(${deviceInfo.serial})` : ''} • <span className="text-text-secondary font-medium">{deviceInfo.id}</span>
                    </span>
                  ) : selectedTicket.assetId ? (
                    <span className="text-xs font-bold text-brand font-data">{selectedTicket.assetId}</span>
                  ) : (
                    <span className="text-xs text-text-muted italic">Nenhum dispositivo localizado para este usuário</span>
                  )}
                </div>
              </div>
            </div>{" "}

            {/* Ticket Intelligence AI Card */}
            {user?.role !== 'Colaborador' && selectedTicket.description.toLowerCase().match(/(notebook|computador|lpt|pc|desktop|windows|update|lento|travando|falha|tela azul|vírus|defender)/) && (
              <div className="p-4 rounded-xl border border-brand/20 bg-brand/5 space-y-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-brand/10 rounded-full blur-2xl -mr-10 -mt-10" />
                <h4 className="text-[10px] font-bold text-brand uppercase tracking-wider flex items-center gap-1.5 relative z-10">
                  <Cpu className="w-3.5 h-3.5" /> Ticket Intelligence
                </h4>
                
                <div className="space-y-3 relative z-10">
                  <div>
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Root Cause (AI Generated)</span>
                    <p className="text-xs text-text-primary leading-relaxed font-medium">
                      O problema relatado assemelha-se a um vazamento de memória associado à atualização de segurança recente ou a um processo zumbi consumindo recursos locais no dispositivo.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-brand/10">
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Risk Score</span>
                      <span className="text-xs font-bold text-danger">Alto (88/100)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-0.5">Impacto Estimado</span>
                      <span className="text-xs font-bold text-text-primary">Perda de Produtividade</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-brand/10">
                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-2">Ações Sugeridas (Auto-Healing)</span>
                    <div className="space-y-1.5">
                      <button className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-brand bg-brand/10 hover:bg-brand/20 rounded-md transition-colors flex items-center justify-between">
                        Limpar Cache Temporário e Reiniciar Spooler
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button className="w-full text-left px-3 py-1.5 text-[10px] font-bold text-text-primary bg-background-subtle border border-border hover:border-brand/30 rounded-md transition-colors flex items-center justify-between">
                        Forçar Sincronização de Políticas (Intune)
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Description */}{" "}
            <div className="space-y-2">
              {" "}
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
                Descrição Detalhada
              </span>{" "}
              <p className="text-xs leading-relaxed text-text-secondary bg-background-subtle p-4 rounded-xl border border-slate-100">
                {" "}
                {selectedTicket.description}{" "}
              </p>{" "}
            </div>{" "}
            {/* Note logs / Historico */}{" "}
            {user?.role !== 'Colaborador' && (
            <div className="space-y-3">
              {" "}
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
                Histórico de Acompanhamento
              </span>{" "}
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {" "}
                {selectedTicket.notes &&
                  selectedTicket.notes.map((note, index) => (
                    <div
                      key={index}
                      className="p-3 bg-background-subtle rounded-lg text-xs leading-relaxed border-l-3 border-accent"
                    >
                      {" "}
                      {note}{" "}
                    </div>
                  ))}{" "}
                {(!selectedTicket.notes ||
                  selectedTicket.notes.length === 0) && (
                  <div className="text-center py-8 text-text-muted">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-xs">Nenhum histórico registrado.</p>
                  </div>
                )}{" "}
              </div>{" "}
            </div>
            )}{" "}
            {/* Add note inline input */}{" "}
            {user?.role !== 'Colaborador' && (
            <div className="space-y-2 pt-2">
              {" "}
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
                Inserir Nova Nota
              </span>{" "}
              <div className="flex space-x-2">
                {" "}
                <input
                  type="text"
                  placeholder="Descreva uma nova ação ou atualização..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddNote(selectedTicket.id);
                  }}
                  className={`flex-1 text-xs px-3 py-2 border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent`}
                />{" "}
                <button
                  onClick={() => handleAddNote(selectedTicket.id)}
                  className="bg-accent text-white hover:bg-brand-hover px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer border-none"
                >
                  {" "}
                  Anexar{" "}
                </button>{" "}
              </div>{" "}
            </div>
            )}
          </div>
        )}{" "}
        {activeSection === "comentarios" && (
          <div className="flex flex-col h-full">
            {" "}
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {" "}
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="bg-background-subtle p-4 rounded-xl border border-slate-100"
                >
                  {" "}
                  <div className="flex items-center justify-between mb-2">
                    {" "}
                    <div className="flex items-center space-x-2">
                      {" "}
                      <div className="w-6 h-6 rounded-full bg-border flex items-center justify-center text-[10px] text-text-secondary font-bold">
                        {" "}
                        {comment.authorName.substring(0, 2).toUpperCase()}{" "}
                      </div>{" "}
                      <span className="font-bold text-xs text-text-primary">
                        {comment.authorName}
                      </span>{" "}
                    </div>{" "}
                    <span className="text-[9px] text-text-muted font-data">
                      {" "}
                      {new Date(comment.createdAt).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(comment.createdAt).toLocaleDateString(
                        "pt-BR",
                      )}{" "}
                    </span>{" "}
                  </div>{" "}
                  <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                    {comment.content}
                  </p>{" "}
                </div>
              ))}{" "}
              {comments.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  {" "}
                  <MessageSquare className="w-6 h-6 mx-auto mb-2 opacity-50" />{" "}
                  <p className="text-xs">Nenhum comentário na thread.</p>{" "}
                </div>
              )}{" "}
            </div>{" "}
            <div className="mt-4 pt-4 border-t border-slate-100 flex-shrink-0">
              {" "}
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-2">
                Novo Comentário
              </span>{" "}
              <div className="flex flex-col space-y-2">
                {" "}
                <textarea
                  placeholder="Escreva seu comentário aqui... (Ctrl + Enter para enviar)"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSendComment();
                    }
                  }}
                  className={`w-full text-xs p-3 border rounded-xl focus:outline-none focus:ring-1 focus:ring-accent min-h-[80px] resize-none bg-surface border-border text-text-primary`}
                />{" "}
                <div className="flex justify-end">
                  {" "}
                  <button
                    onClick={handleSendComment}
                    disabled={!newCommentText.trim() || isSendingComment}
                    className="bg-accent text-white hover:bg-brand-hover px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer border-none flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    {" "}
                    <Send className="w-4 h-4" /> <span>Enviar</span>{" "}
                  </button>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>
        )}{" "}
        
        {activeSection === "timeline" && (
          <div className="space-y-4">
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
              Linha do Tempo
            </span>
            <div className="relative border-l border-slate-100 ml-2 pl-4 pb-2 space-y-6">
              {timelineEvents.map((event) => {
                const isAudit = event.kind === 'audit';
                
                return (
                  <div key={event.id} className="relative">
                    <span className={`absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${isAudit ? 'bg-text-muted' : 'bg-brand'}`} />
                    <div className="bg-background-subtle p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-text-primary flex items-center space-x-2">
                          {isAudit ? <History className="w-3 h-3 text-text-muted mr-1" /> : <MessageSquare className="w-3 h-3 text-brand mr-1" />}
                          {isAudit ? (event as any).action : 'Comentário'}
                        </span>
                        <span className="text-[10px] text-text-secondary whitespace-nowrap font-data">
                          {new Date(event.createdAt).toLocaleDateString("pt-BR")}{" "}
                          {new Date(event.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 ${isAudit ? 'text-text-secondary' : 'text-text-primary'}`}>
                        {isAudit ? (event as any).details : (event as any).content}
                      </p>
                      <div className="mt-2 text-[10px] font-bold text-brand flex items-center space-x-1 uppercase tracking-widest">
                        <User className="w-3 h-3" />
                        <span>{isAudit ? (event as any).userName : (event as any).authorName}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {timelineEvents.length === 0 && (
                <div className="text-center text-text-muted text-xs py-4">
                  Nenhum evento registrado.
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeSection === "anexos" && (
          <div className="space-y-6">
            {" "}
            {/* Drag & Drop zone */}{" "}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${dragOver ? "border-accent bg-accent/5" : "border-border hover:border-accent"}`}
            >
              {" "}
              <input
                type="file"
                id="file-upload-input"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                disabled={isUploading}
              />{" "}
              <UploadCloud
                className={`w-10 h-10 mb-2 ${isUploading ? "animate-bounce text-accent" : "text-text-muted"}`}
              />{" "}
              <p className="text-xs font-bold text-text-secondary">
                {" "}
                {isUploading
                  ? "Enviando arquivo..."
                  : "Arraste seu arquivo aqui ou clique para selecionar"}{" "}
              </p>{" "}
              <p className="text-[10px] text-text-muted mt-1">
                Limite de 10MB por arquivo (Imagens, PDF, DOCX, ZIP, CSV, TXT)
              </p>{" "}
            </div>{" "}
            {/* Attachments List */}{" "}
            <div className="space-y-2">
              {" "}
              <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
                Documentos e Arquivos ({attachments.length})
              </span>{" "}
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {" "}
                {attachments.map((file) => {
                  const isImage = file.mimetype.startsWith("image/") || 
                    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.filename);
                  return (
                    <div
                      key={file.id}
                      className="p-3 rounded-xl border border-border bg-background-subtle flex flex-col gap-2 text-xs transition-all hover:shadow-sm"
                    >
                      {" "}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0">
                          {" "}
                          <div className="p-2 bg-brand-light rounded-lg text-brand">
                            {" "}
                            <FileText className="w-4 h-4 flex-shrink-0" />{" "}
                          </div>{" "}
                          <div className="min-w-0">
                            {" "}
                            <p
                              className="font-bold text-text-primary truncate pr-2"
                              title={file.filename}
                            >
                              {file.filename}
                            </p>{" "}
                            <p className="text-[10px] text-text-muted mt-0.5">
                              {formatSize(file.size)} • Por {file.uploadedBy}
                            </p>{" "}
                          </div>{" "}
                        </div>{" "}
                        <button
                          onClick={() => handleDownload(file.id, file.filename)}
                          className="p-2 hover:bg-border :bg-slate-700 rounded-lg text-text-muted hover:text-accent :text-white transition-colors cursor-pointer border-none bg-transparent"
                          title="Baixar arquivo de forma segura"
                        >
                          {" "}
                          <Download className="w-4 h-4" />{" "}
                        </button>{" "}
                      </div>
                      {isImage && (
                        <ImageAttachmentPreview ticketId={selectedTicket.id} file={file} />
                      )}
                    </div>
                  );
                })}{" "}
                {attachments.length === 0 && (
                  <div className="text-center py-8 text-text-muted">
                    {" "}
                    <Paperclip className="w-6 h-6 mx-auto mb-2 opacity-50" />{" "}
                    <p className="text-xs">
                      Nenhum anexo enviado para este chamado.
                    </p>{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {activeSection === "auditoria" && (
          <div className="space-y-4">
            {" "}
            <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block">
              Histórico de Auditoria Geral (Audit Trail)
            </span>{" "}
            <div className="relative border-l border-slate-100 pl-4 space-y-4 max-h-96 overflow-y-auto pr-1 text-xs">
              {" "}
              {auditEvents.map((event) => (
                <div key={event.id} className="relative">
                  {" "}
                  {/* Left bullet node pin */}{" "}
                  <span className="absolute -left-[21px] top-0.5 w-2.5 h-2.5 rounded-full bg-accent border-2 border-white [#12181E]" />{" "}
                  <div className="bg-background-subtle p-3 rounded-xl border border-slate-100">
                    {" "}
                    <div className="flex justify-between items-start">
                      {" "}
                      <span className="font-bold text-text-primary">
                        {event.action}
                      </span>{" "}
                      <span className="text-[9px] text-text-muted font-data">
                        {" "}
                        {new Date(event.createdAt).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        -{" "}
                        {new Date(event.createdAt).toLocaleDateString(
                          "pt-BR",
                        )}{" "}
                      </span>{" "}
                    </div>{" "}
                    <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                      {event.details}
                    </p>{" "}
                    <div className="flex items-center space-x-1 mt-1.5 text-[9px] text-text-muted font-semibold uppercase tracking-wider">
                      {" "}
                      <span>
                        Executado por: {event.userName} ({event.userEmail})
                      </span>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
              {auditEvents.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  {" "}
                  <History className="w-6 h-6 mx-auto mb-2 opacity-50" />{" "}
                  <p className="text-xs">
                    Nenhum evento registrado no histórico.
                  </p>{" "}
                </div>
              )}{" "}
            </div>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Bottom Action controllers */}{" "}
      {user?.role !== 'Colaborador' && (
      <div className="p-6 border-t border-slate-100 bg-background-subtle">
        {" "}
        <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider block mb-3 text-center">
          Modificar Status Operacional
        </span>{" "}
        <div className="grid grid-cols-3 gap-2">
          {" "}
          <button
            onClick={() => handleUpdateStatus(selectedTicket.id, "Em Análise")}
            disabled={selectedTicket.status === "Em Análise"}
            className="py-2 px-1 rounded-xl text-center text-xs font-bold bg-background-subtle text-brand hover:bg-background-subtle disabled:opacity-40 transition-colors cursor-pointer border-none"
          >
            {" "}
            Análise{" "}
          </button>{" "}
          <button
            onClick={() => handleUpdateStatus(selectedTicket.id, "Aguardando")}
            disabled={selectedTicket.status === "Aguardando"}
            className="py-2 px-1 rounded-xl text-center text-xs font-bold bg-warning-light text-warning hover:bg-warning-light disabled:opacity-40 transition-colors cursor-pointer border-none"
          >
            {" "}
            Espera{" "}
          </button>{" "}
          <button
            onClick={() => handleUpdateStatus(selectedTicket.id, "Resolvido")}
            disabled={selectedTicket.status === "Resolvido"}
            className="py-2 px-1 rounded-xl text-center text-xs font-bold bg-success-light text-accent hover:bg-accent-light disabled:opacity-40 transition-colors cursor-pointer border-none"
          >
            {" "}
            Resolvido{" "}
          </button>{" "}
        </div>{" "}
      </div>
      )}{" "}
    </div>
  );
}
