import React, { useState, useEffect, useMemo, useCallback } from "react";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from './shared/hooks/useAuth';
import { LoginScreen } from './features/auth/LoginScreen';
import { Header } from './shared/components/layout/Header';
import { Sidebar } from './shared/components/layout/Sidebar';
import { LicencasTab } from './features/licenses/LicencasTab';
import { DashboardTab } from './features/dashboard/DashboardTab';
import { DashboardGeral } from './features/dashboard/DashboardGeral';
import { ChamadosTab } from './features/tickets/ChamadosTab';
import { RelatoriosTab } from './features/reports/RelatoriosTab';
import { ConfiguracoesTab } from './features/settings/ConfiguracoesTab';
import { PerfilTab } from './features/profile/PerfilTab';
import { TicketDetailsDrawer } from './features/tickets/components/TicketDetailsDrawer';
import { NewTicketModal } from './features/tickets/components/NewTicketModal';
import { ChatWidget } from './features/chat/ChatWidget';
import { ForcePasswordChange } from './features/auth/ForcePasswordChange';
import { LgpdAcceptanceScreen } from './features/auth/LgpdAcceptanceScreen';
import { DeviceIntelligenceTab } from './features/device-intelligence/DeviceIntelligenceTab';
import { useTicketEvents } from './shared/hooks/useTicketEvents';
import { useSocket } from './shared/hooks/useSocket';
import { Ticket, SystemHealth, AppNotification } from './types';
import { CursorGlow } from './shared/components/ui/CursorGlow';
import { EasterEgg } from './shared/components/ui/EasterEgg';

// --- INÍCIO DOS IMPORTS ENTERPRISE ---
import { AuthProvider } from './contexts/AuthContext';
import { UIProvider } from './contexts/UIContext';
import { TicketProvider } from './contexts/TicketContext';
import { KnowledgeProvider } from './contexts/KnowledgeContext';
import { useRouter } from './lib/router';
import { KnowledgeAdminTab } from './features/knowledge/KnowledgeAdminTab';
import { KnowledgeEditor } from './features/knowledge/KnowledgeEditor';
import { KnowledgeArticleView } from './features/knowledge/KnowledgeArticleView';

function MonolithicApp() {
  const { user, loading, authError, loginWithMicrosoft, logout, refreshSession } =
    useAuth();
  /* Navigation State */ const [activeTab, setActiveTab] = useState<
    "dashboard" | "chamados" | "relatorios" | "configuracoes" | "perfil" | "device_intelligence" | "licencas"
  >("dashboard");
  useEffect(() => {
    if (user?.role === 'Colaborador' && activeTab === 'dashboard') {
      setActiveTab('chamados');
    }
  }, [user, activeTab]);

  useEffect(() => {
    if (user?.role === 'Colaborador' && activeTab === 'dashboard') {
      setActiveTab('chamados');
    }
  }, [user, activeTab]);

  /* Unsaved SLA changes state */ const [hasUnsavedSlaChanges, setHasUnsavedSlaChanges] = useState(false);
  const handleSetActiveTab = useCallback((tab: "dashboard" | "chamados" | "relatorios" | "configuracoes" | "perfil" | "device_intelligence" | "licencas") => {
    if (hasUnsavedSlaChanges) {
      showToast("Por favor, salve ou descarte as alterações de SLA antes de trocar de aba.", "error");
      return;
    }
    setActiveTab(tab);
  }, [hasUnsavedSlaChanges]);
  /* Theme State */ const [theme, setTheme] = useState<"claro" | "escuro">(
    () => {
      const saved = localStorage.getItem("theme");
      return saved === "claro" ? "claro" : "escuro";
    }
  );
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "escuro") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);
  /* Mobile Sidebar Toggle */ const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);
  /* Tickets State fetched from real Express server API */ const [
    tickets,
    setTickets,
  ] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  /* System Health States */ const [health, setHealth] = useState<SystemHealth>(
    {
      linkDedicado: 99.9,
      supabaseDb: "Normal",
      storageApi: 65,
      lastChecked: "Agora mesmo",
    },
  );
  /* Diagnostic Simulation Log */ const [diagnosticLogs, setDiagnosticLogs] =
    useState<string[]>([]);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  /* Filter States (Tickets Screen) */ const [searchQuery, setSearchQuery] =
    useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Todos");
  const [categoryFilter, setCategoryFilter] = useState<string>("Todos");
  const [priorityFilter, setPriorityFilter] = useState<string>("Todos");
  const [currentPage, setCurrentPage] = useState<number>(1);

  /* Reset page to 1 on any filter change */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, categoryFilter, priorityFilter]);
  /* Interactive Toast State */ const [toast, setToast] = useState<{
    message: string;
    type: "success" | "info" | "error";
  } | null>(null);
  /* Users State */ const [users, setUsers] = useState<any[]>([]);
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    }
  }, []);
  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user, fetchUsers]);
  /* Selected Ticket for details panel / drawer */ const [
    selectedTicket,
    setSelectedTicket,
  ] = useState<Ticket | null>(null);
  /* Create Ticket Modal State */ const [isNewTicketOpen, setIsNewTicketOpen] =
    useState(false);
  /* Simulation Controls (Settings panel) */ const [
    simStorageOutage,
    setSimStorageOutage,
  ] = useState(false);
  const [simDbLatency, setSimDbLatency] = useState(false);
  /* New Ticket Form State */ const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Infraestrutura");
  const [newUser, setNewUser] = useState("");
  const [newPriority, setNewPriority] = useState<"Alta" | "Média" | "Baixa">(
    "Média",
  );
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    const handleOpenDeviceTicket = (e: any) => {
      setNewTitle(e.detail?.title || "Chamado - Dispositivo");
      setNewDescription(e.detail?.description || "");
      setNewCategory("Equipamentos");
      setNewPriority(e.detail?.priority || "Média");
      setIsNewTicketOpen(true);
    };
    window.addEventListener("open-device-ticket", handleOpenDeviceTicket);
    return () => window.removeEventListener("open-device-ticket", handleOpenDeviceTicket);
  }, []);
  /* Ticket Note Input State */ const [noteInput, setNoteInput] = useState("");
  /* Notifications State */ const [showNotifications, setShowNotifications] =
    useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([
    {
      id: "1",
      text: "Chamado Crítico #12904: Erro de Login no Portal requer atenção imediata.",
      time: "5m atrás",
      read: false,
      type: "critical",
    },
    {
      id: "2",
      text: "Backup de segurança diário concluído com sucesso às 04:00.",
      time: "13h atrás",
      read: true,
      type: "info",
    },
    {
      id: "3",
      text: "Instabilidade na API de Storage detectada (Tempo de resposta alto).",
      time: "1h atrás",
      read: false,
      type: "critical",
    },
  ]);
  /* Analytics state */ const [analyticsData, setAnalyticsData] =
    useState<any>(null);
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [lgpdAccepted, setLgpdAccepted] = useState(localStorage.getItem("cbi_lgpd_accepted") === "true");
  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/analytics/summary");
      if (res.ok) setAnalyticsData(await res.json());
    } catch (e) {}
  }, [user]);
  /* Real-time dynamic clock */ 
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  /* Show auto dismissible toast */ const showToast = useCallback(
    (message: string, type: "success" | "info" | "error" = "success") => {
      setToast({ message, type });
      setTimeout(() => {
        setToast(null);
      }, 4000);
    },
    [],
  );
  /* Fetch Tickets from backend */ const fetchTickets =
    useCallback(async () => {
      if (!user) return;
      setLoadingTickets(true);
      try {
        const response = await fetch("/api/tickets");
        if (response.ok) {
          const data = await response.json();
          setTickets(data);
          fetchAnalytics();
        } else {
          console.error("Failed to fetch tickets");
        }
      } catch (err) {
        console.error("Error fetching tickets:", err);
      } finally {
        setLoadingTickets(false);
      }
    }, [user, fetchAnalytics]);
  /* Load tickets on user changes */ 
  useEffect(() => {
    if (user) {
      fetchTickets();
    } else {
      setTickets([]);
    }
  }, [user, fetchTickets]);

  // Handle Real-Time Events
  const { socket } = useSocket();
  useEffect(() => {
    if (socket) {
      const handleTicketCreated = () => fetchTickets();
      const handleTicketUpdated = () => fetchTickets();
      
      socket.on('ticket_created', handleTicketCreated);
      socket.on('ticket_updated', handleTicketUpdated);
      
      return () => {
        socket.off('ticket_created', handleTicketCreated);
        socket.off('ticket_updated', handleTicketUpdated);
      };
    }
  }, [socket, fetchTickets]);

  /* Proactive SLA Monitoring for tickets near breach (<30 mins) */
  const [alertedTicketIds, setAlertedTicketIds] = useState<string[]>([]);
  const [hasShownDailySummary, setHasShownDailySummary] = useState<boolean>(false);
  const [showDailySummaryModal, setShowDailySummaryModal] = useState<boolean>(false);
  const [dailySummaryCount, setDailySummaryCount] = useState<number>(0);

  useEffect(() => {
    if (!user || tickets.length === 0) return;

    tickets.forEach((ticket) => {
      if (ticket.status === "Resolvido") return;
      if (!ticket.slaDeadline) return;

      const deadline = new Date(ticket.slaDeadline);
      const now = new Date();
      const timeRemainingMs = deadline.getTime() - now.getTime();

      // Trigger if less than 30 minutes left but still open and not already alerted
      const lessThan30Mins = timeRemainingMs > 0 && timeRemainingMs <= 30 * 60 * 1000;
      
      if (lessThan30Mins && !alertedTicketIds.includes(ticket.id)) {
        const textMsg = `SLA Alerta: Chamado Crítico ${ticket.id} "${ticket.title}" está a menos de 30 minutos do estouro de prazo!`;
        const newNotification: AppNotification = {
          id: `sla-${ticket.id}-${Date.now()}`,
          text: textMsg,
          time: "Agora mesmo",
          read: false,
          type: "critical"
        };

        setNotifications((prev) => [newNotification, ...prev]);
        setAlertedTicketIds((prev) => [...prev, ticket.id]);
        showToast(textMsg, "error");
      }
    });
  }, [tickets, user, alertedTicketIds, showToast]);

  /* Login Daily Summary Auto-Trigger */
  useEffect(() => {
    if (user && tickets.length > 0 && !hasShownDailySummary) {
      const todayStr = new Date().toDateString();
      const openCriticalToday = tickets.filter((t) => {
        if (t.status === "Resolvido") return false;
        const isCritical = t.priority === "Alta" || t.status === "Crítico";
        const hasDeadlineToday = t.slaDeadline && new Date(t.slaDeadline).toDateString() === todayStr;
        return isCritical && hasDeadlineToday;
      });

      if (openCriticalToday.length > 0) {
        setDailySummaryCount(openCriticalToday.length);
        setShowDailySummaryModal(true);
      }
      setHasShownDailySummary(true);
    }
  }, [user, tickets, hasShownDailySummary]);
  /* Update detail view when tickets list is updated */ useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find((t) => t.id === selectedTicket.id);
      if (updated) {
        setSelectedTicket(updated);
      }
    }
  }, [tickets, selectedTicket]);
  /* Run System Diagnostics */ const runDiagnostics = () => {
    setIsDiagnosing(true);
    setShowTerminal(true);
    setDiagnosticLogs([]);
    const logSteps = [
      "Iniciando rotina completa de diagnósticos do AcmeCorp Ops Center...",
      "Verificando integridade das conexões de rede locais...",
      "Ping Link Dedicado Principal (10.0.0.1): 4ms [OK]",
      "Verificando balanceadores de carga Cloud Run... [OK]",
      "Conectando ao banco de dados Supabase PostgreSQL...",
      simDbLatency
        ? "[AVISO] Supabase DB respondendo com alta latência (580ms). Pool de conexões em 94."
        : "Supabase DB ativo (18ms). Integridade das tabelas de transação: 100%. [OK]",
      "Testando endpoints da API de Storage...",
      simStorageOutage
        ? "[ERRO] Storage API retornando 503 Service Unavailable nos servidores oeste."
        : "Storage API operando com 65% de taxa de acerto de cache de borda. [OK]",
      "Verificando fila de e-mails e Webhooks integrados... [OK]",
      "Sincronizando cache local de chamados com o servidor central... [OK]",
      "Processo de diagnóstico finalizado com sucesso!",
    ];
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < logSteps.length) {
        setDiagnosticLogs((prev) => [...prev, logSteps[currentStep]]);
        currentStep++;
      } else {
        clearInterval(interval);
        setIsDiagnosing(false);
        /* Update live health widget state depending on simulated inputs */ setHealth(
          {
            linkDedicado: 99.9,
            supabaseDb: simDbLatency ? "Lento" : "Normal",
            storageApi: simStorageOutage ? 12 : 78,
            lastChecked: currentTime.toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          },
        );
        showToast("Diagnóstico de infraestrutura finalizado.", "info");
      }
    }, 400);
  }; /* Reset to default seed */
  const handleResetDatabase = async () => {
    if (
      confirm(
        "Tem certeza de que deseja redefinir os dados para os valores originais?",
      )
    ) {
      try {
        setSimDbLatency(false);
        setSimStorageOutage(false);
        const defaultTicketsList = [
          {
            id: "#12904",
            title: "Erro de Login no Portal",
            category: "Infraestrutura",
            user: "Carlos Mendez",
            status: "Crítico",
            deadline: "14 min restantes",
            priority: "Alta",
            description:
              "Usuários relatando erro 500 intermitente ao tentar autenticar via portal corporativo principal. Latência alta detectada no cluster de banco de dados primário.",
            createdAt: "17:10",
            notes: [
              "Iniciada investigação dos logs do gateway de autenticação.",
              "Aumento incomum de conexões simultâneas detectado no pool do PostgreSQL.",
            ],
          },
          {
            id: "#12901",
            title: "Acesso Pasta Financeira Q2",
            category: "Permissões",
            user: "Mariana Luz",
            status: "Aguardando",
            deadline: "1h 22m",
            priority: "Média",
            description:
              "Solicitação de acesso urgente à pasta restrita de auditoria financeira do segundo trimestre para consolidação de relatórios.",
            createdAt: "16:45",
            notes: [
              "Aguardando aprovação por e-mail do diretor da área financeira para liberação do perfil de acesso.",
            ],
          },
          {
            id: "#12899",
            title: "Instabilidade na VPN Corporativa",
            category: "Rede",
            user: "Roberto Dias",
            status: "Em Análise",
            deadline: "2h 45m",
            priority: "Alta",
            description:
              "Quedas frequentes e perda de pacotes na conexão VPN corporativa relatada por colaboradores em trabalho remoto na região Sudeste.",
            createdAt: "15:30",
            notes: [
              "Verificando rotas de tráfego do gateway secundário.",
              "Testes de ping revelam perda de até 15% de pacotes no nó principal do provedor.",
            ],
          },
        ];
        for (const t of tickets) {
          await fetch(`/api/tickets/${t.id}`, {
            method: "DELETE",
            headers: { "X-CSRF-Token": (user as any)?.csrfToken || "" },
          });
        }
        for (const t of defaultTicketsList) {
          await fetch("/api/tickets", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRF-Token": (user as any)?.csrfToken || "",
            },
            body: JSON.stringify(t),
          });
        }
        await fetchTickets();
        setSelectedTicket(null);
        setHealth({
          linkDedicado: 99.9,
          supabaseDb: "Normal",
          storageApi: 65,
          lastChecked: "Agora mesmo",
        });
        showToast("Banco de dados redefinido com sucesso!", "success");
      } catch (err) {
        console.error(err);
        showToast("Erro ao redefinir banco de dados.", "error");
      }
    }
  };
  /* Calculated Metrics */ const metrics = useMemo(() => {
    const totalAbertos = tickets.filter((t) => t.status !== "Resolvido").length;
    const criticos = tickets.filter((t) => t.status === "Crítico").length;
    if (analyticsData) {
      return {
        totalAbertos:
          analyticsData.total - (analyticsData.status["Resolvido"] || 0),
        criticos: analyticsData.status["Crítico"] || 0,
        meanTime: analyticsData.meanTime || "1h 35m",
        satisfaction: analyticsData.satisfaction || "98%",
        slaConformity: analyticsData.slaConformity || 100,
      };
    }
    return {
      totalAbertos,
      criticos,
      meanTime: "...",
      satisfaction: "...",
      slaConformity: 100,
    };
  }, [tickets, analyticsData]);
  /* Handle Add Ticket */ const handleCreateTicket = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUser.trim() || !newDescription.trim()) {
      showToast("Por favor, preencha todos os campos obrigatórios.", "error");
      return;
    }
    const randomIdNum = Math.floor(10000 + Math.random() * 90000);
    const newTicket: Ticket = {
      id: `#${randomIdNum}`,
      title: newTitle,
      category: newCategory,
      user: newUser,
      status: newPriority === "Alta" ? "Crítico" : "Aguardando",
      deadline: newPriority === "Alta" ? "45m restante" : "4h 00m",
      priority: newPriority,
      description: newDescription,
      createdAt: currentTime.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      notes: ["Chamado criado pelo console de operações."],
    };
    try {
      const response = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": (user as any)?.csrfToken || "",
        },
        body: JSON.stringify(newTicket),
      });
      if (response.ok) {
        await fetchTickets();
        /* Auto-alert notification for Critical priority */ if (
          newPriority === "Alta"
        ) {
          const newNotification: AppNotification = {
            id: Date.now().toString(),
            text: `Chamado Urgente ${newTicket.id} cadastrado por ${newTicket.user}.`,
            time: "Agora mesmo",
            read: false,
            type: "critical",
          };
          setNotifications((prev) => [newNotification, ...prev]);
        }
        setIsNewTicketOpen(false);
        /* Clear Form */ setNewTitle("");
        setNewUser("");
        setNewDescription("");
        setNewPriority("Média");
        showToast(`Chamado ${newTicket.id} registrado com sucesso!`, "success");
      } else {
        const errData = await response.json();
        showToast(errData.error || "Erro ao registrar chamado", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Falha na comunicação com o servidor", "error");
    }
  };
  /* Add notes to a ticket */ const handleAddNote = async (
    ticketId: string,
  ) => {
    if (!noteInput.trim()) return;
    const targetTicket = tickets.find((t) => t.id === ticketId);
    if (!targetTicket) return;
    const updatedNotes = [
      ...targetTicket.notes,
      `${currentTime.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} - ${noteInput}`,
    ];
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": (user as any)?.csrfToken || "",
        },
        body: JSON.stringify({ notes: updatedNotes }),
      });
      if (response.ok) {
        await fetchTickets();
        setNoteInput("");
        showToast("Nota de acompanhamento anexada ao chamado.", "success");
      } else {
        showToast("Erro ao adicionar nota.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Falha de conexão com o servidor.", "error");
    }
  };
  /* Update Status of a ticket */ const handleUpdateStatus = async (
    ticketId: string,
    newStatus: Ticket["status"],
  ) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": (user as any)?.csrfToken || "",
        },
        body: JSON.stringify({
          status: newStatus,
          deadline: newStatus === "Resolvido" ? "Concluído" : undefined,
        }),
      });
      if (response.ok) {
        await fetchTickets();
        showToast(`Chamado ${ticketId} atualizado para"${newStatus}".`, "info");
      } else {
        showToast("Erro ao atualizar status.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Falha ao conectar com o servidor.", "error");
    }
  };
  /* Delete/Cancel a Ticket */ const handleDeleteTicket = async (
    ticketId: string,
  ) => {
    if (
      confirm(
        `Tem certeza que deseja remover permanentemente o chamado ${ticketId}?`,
      )
    ) {
      try {
        const response = await fetch(`/api/tickets/${ticketId}`, {
          method: "DELETE",
          headers: { "X-CSRF-Token": (user as any)?.csrfToken || "" },
        });
        if (response.ok) {
          await fetchTickets();
          if (selectedTicket && selectedTicket.id === ticketId) {
            setSelectedTicket(null);
          }
          showToast(`Chamado ${ticketId} foi removido.`, "info");
        } else {
          showToast("Erro ao remover chamado.", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("Falha na comunicação para remover chamado.", "error");
      }
    }
  };
  /* Mark all notifications as read */ const handleMarkNotificationsRead =
    () => {
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      showToast("Todas as notificações marcadas como lidas.", "info");
    };
  /* Filtered Tickets for search/grid views */ const filteredTickets =
    useMemo(() => {
      return tickets.filter((t) => {
        const matchQuery =
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus =
          statusFilter === "Todos" || t.status === statusFilter;
        const matchCategory =
          categoryFilter === "Todos" || t.category === categoryFilter;
        const matchPriority =
          priorityFilter === "Todos" || t.priority === priorityFilter;
        return matchQuery && matchStatus && matchCategory && matchPriority;
      });
    }, [tickets, searchQuery, statusFilter, categoryFilter, priorityFilter]);
  /* Report statistics calculated based on current local tickets database */ const reportsData =
    useMemo(() => {
      if (analyticsData) {
        return analyticsData;
      }
      return {
        total: 0,
        categories: {
          Infraestrutura: 0,
          Permissões: 0,
          Rede: 0,
          Software: 0,
          Hardware: 0,
        },
        status: { Resolvido: 0, Crítico: 0, "Em Análise": 0, Aguardando: 0 },
        slaConformity: 100,
      };
    }, [analyticsData]);
  /* Handle setting simulated toggles and immediate response */ useEffect(() => {
    setHealth((prev) => ({
      ...prev,
      supabaseDb: simDbLatency ? "Lento" : "Normal",
      storageApi: simStorageOutage ? 12 : 78,
    }));
  }, [simDbLatency, simStorageOutage]);
  /* If loading user profile, show full centered screen loading indicator */ if (
    loading
  ) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-white">
        {" "}
        <Loader2 className="w-10 h-10 text-accent animate-spin mb-4" />{" "}
        <span className="text-xs font-data tracking-widest text-text-muted uppercase">
          Verificando sessão...
        </span>{" "}
      </div>
    );
  }
  /* If user is not authenticated, render LoginScreen */ if (!user) {
    return (
      <LoginScreen
        loginWithMicrosoft={loginWithMicrosoft}
        authError={authError}
      />
    );
  }
  /* If user must change password, force password change screen */ if (user && (user as any).mustChangePassword) {
    return (
      <ForcePasswordChange
        user={user}
        csrfToken={user.csrfToken || ""}
        refreshSession={refreshSession}
        logout={logout}
        showToast={showToast}
      />
    );
  }
  
  /* If user hasn't accepted LGPD terms */
  if (user && !(user as any).mustChangePassword && !lgpdAccepted) {
    return (
      <LgpdAcceptanceScreen
        user={user}
        logout={logout}
        onAccept={() => {
          localStorage.setItem("cbi_lgpd_accepted", "true");
          setLgpdAccepted(true);
        }}
      />
    );
  }

  
  /* Convert custom user profile shape */ const adaptedUser = {
    name: user.name,
    email: user.email,
    role: user.role,
    department: (user as any).department || "Operações",
    notificationPreferences: (user as any).notificationPreferences || {
      ticketAssigned: true,
      newComments: true,
      slaAlerts: true,
      statusChange: true
    }
  };
  return (
    <div
      id="AcmeCorp-ops-center-app"
      className={`flex h-screen w-full overflow-hidden antialiased select-none`}
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <CursorGlow />
      {" "}
      {/* Dynamic Floating Toast Notifications */}{" "}
      {toast && (
        <div
          id="ops-toast"
          className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-xl shadow-lg border animate-bounce max-w-sm ${toast.type === "success" ? "bg-success-light text-accent border-success" : toast.type === "error" ? "bg-danger-light text-danger border-danger" : "bg-background-subtle text-brand border-brand-light"}`}
        >
          {" "}
          <div className="mr-3">
            {" "}
            {toast.type === "success" && (
              <CheckCircle className="w-5 h-5" />
            )}{" "}
            {toast.type === "error" && <AlertTriangle className="w-5 h-5" />}{" "}
            {toast.type === "info" && (
              <CheckCircle className="w-5 h-5 text-text-secondary" />
            )}{" "}
          </div>{" "}
          <div className="text-xs font-bold">{toast.message}</div>{" "}
        </div>
      )}{" "}
      {/* 1. LEFT SIDEBAR NAVIGATION */}{" "}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleSetActiveTab}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        activeTicketsCount={metrics.totalAbertos}
        user={adaptedUser}
        logout={logout}
      />{" "}
      {/* 2. MAIN APP CONTENT CONTAINER */}{" "}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {" "}
        {/* TOP COMPACT HEADER CONTROL BAR */}{" "}
        <Header
          user={user}
          activeTab={activeTab}
          theme={theme}
          setTheme={setTheme}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          notifications={notifications}
          handleMarkNotificationsRead={handleMarkNotificationsRead}
          setIsNewTicketOpen={setIsNewTicketOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          currentTime={currentTime}
          showToast={showToast}
        />{" "}
        {/* INNER CONTENT MAIN PORTAL SCROLLER */}{" "}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {" "}
          {loadingTickets && (
            <div className="absolute top-4 right-8 z-20 flex items-center space-x-2 bg-accent/10 text-accent px-3 py-1.5 rounded-lg text-xs font-data">
              {" "}
              <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
              <span>Sincronizando...</span>{" "}
            </div>
          )}{" "}
          {/* TAB 1: OPERATIONAL METRICS DASHBOARD */}{" "}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <DashboardGeral tickets={tickets} users={users} />
              <DashboardTab
                tickets={tickets}
                health={health}
                metrics={metrics}
                isDiagnosing={isDiagnosing}
                showTerminal={showTerminal}
                diagnosticLogs={diagnosticLogs}
                runDiagnostics={runDiagnostics}
                setShowTerminal={setShowTerminal}
                setSelectedTicket={setSelectedTicket}
                setActiveTab={handleSetActiveTab}
                setStatusFilter={setStatusFilter}
              />
            </div>
          )}{" "}
          {/* TAB 2: CENTRAL DE CHAMADOS GRID / CENTRAL */}{" "}
          {activeTab === "chamados" && (
            <>
              {user?.role === 'Colaborador' && (
                <div className="mb-6 flex justify-center">
                  <NewTicketModal
                    isInline={true}
                    newTitle={newTitle}
                    setNewTitle={setNewTitle}
                    newUser={newUser}
                    setNewUser={setNewUser}
                    newCategory={newCategory}
                    setNewCategory={setNewCategory}
                    newPriority={newPriority}
                    setNewPriority={setNewPriority}
                    newDescription={newDescription}
                    setNewDescription={setNewDescription}
                    handleCreateTicket={handleCreateTicket}
                    setIsNewTicketOpen={setIsNewTicketOpen}
                    csrfToken={(user as any)?.csrfToken}
                  />
                </div>
              )}
              <ChamadosTab
              user={user}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              filteredTickets={filteredTickets}
              totalTicketsCount={tickets.length}
              setSelectedTicket={setSelectedTicket}
              handleUpdateStatus={handleUpdateStatus}
              handleDeleteTicket={handleDeleteTicket}
              showToast={showToast}
              isCompact={isCompact}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
            </>
          )}{" "}
          {/* TAB 3: RELATÓRIOS E VOLUMETRIA */}{" "}
          {activeTab === "relatorios" && (
            <RelatoriosTab reportsData={reportsData} filteredTickets={filteredTickets} csrfToken={user?.csrfToken || ''} />
          )}{" "}
          {/* TAB 4: PAINEL DE CONTROLE / SIMULAÇÕES */}{" "}
          {activeTab === "configuracoes" && (
            <ConfiguracoesTab
              simStorageOutage={simStorageOutage}
              setSimStorageOutage={setSimStorageOutage}
              simDbLatency={simDbLatency}
              setSimDbLatency={setSimDbLatency}
              handleResetDatabase={handleResetDatabase}
              showToast={showToast}
              csrfToken={user?.csrfToken || ""}
              userRole={user?.role || "Suporte"}
              onUnsavedChangesChange={setHasUnsavedSlaChanges}
              isCompact={isCompact}
              setIsCompact={setIsCompact}
            />
          )}{" "}
          {/* TAB 5: PERFIL DO USUÁRIO */}{" "}
          {activeTab === "perfil" && (
            <PerfilTab
              user={adaptedUser}
              refreshSession={refreshSession}
              logout={logout}
              showToast={showToast}
              csrfToken={user?.csrfToken || ""}
            />
          )}{" "}
          {/* TAB 6: DEVICE INTELLIGENCE */}{" "}
          {activeTab === "device_intelligence" && (
            <DeviceIntelligenceTab />
          )}{" "}
                {/* TAB 7: LICENÇAS MICROSOFT */}
          {activeTab === "licencas" && (
            <LicencasTab 
              csrfToken={(user as any)?.csrfToken || ""} 
              showToast={showToast} 
            />
          )}
        </main>
      </div>
      {/* 3. FLOATING DETAILS SLIDE-OVER DRAWER (For selected ticket details) */}{" "}
      {selectedTicket && (
        <TicketDetailsDrawer
          user={user}
          selectedTicket={selectedTicket}
          setSelectedTicket={setSelectedTicket}
          noteInput={noteInput}
          setNoteInput={setNoteInput}
          handleAddNote={handleAddNote}
          handleUpdateStatus={handleUpdateStatus}
          csrfToken={user?.csrfToken || ""}
        />
      )}{" "}
      {/* 4. DIALOG FORM MODAL: CREATE NEW TICKET */}{" "}
      {isNewTicketOpen && (
        <NewTicketModal
          newTitle={newTitle}
          setNewTitle={setNewTitle}
          newUser={newUser}
          setNewUser={setNewUser}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          newPriority={newPriority}
          setNewPriority={setNewPriority}
          newDescription={newDescription}
          setNewDescription={setNewDescription}
          handleCreateTicket={handleCreateTicket}
          setIsNewTicketOpen={setIsNewTicketOpen}
          csrfToken={(user as any)?.csrfToken}
        />
      )}{" "}
      {/* 4.5 PREMIUM DAILY SLA SUMMARY MODAL */}
      {showDailySummaryModal && (
        <div className="fixed inset-0 bg-[#081B16]/85 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0D241F] border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2.5 bg-danger-light rounded-xl text-danger border border-danger/20">
                <AlertTriangle className="w-5 h-5 text-danger animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#7FD8BE] tracking-tight">Resumo Diário de Operações</h3>
                <p className="text-[10px] text-text-muted">AcmeCorp Ops Center • SLA Monitor</p>
              </div>
            </div>
            
            <div className="space-y-3 my-4 text-xs text-text-secondary leading-relaxed">
              <p>
                Olá, <span className="font-bold text-text-primary">{user?.name}</span>.
              </p>
              <p>
                Identificamos <span className="font-bold text-danger">{dailySummaryCount} chamado(s) crítico(s)</span> com vencimento de SLA agendado para <span className="text-text-primary underline decoration-brand">hoje</span>.
              </p>
              <p className="text-[11px] text-text-muted bg-background/30 p-2.5 rounded-xl border border-border/30">
                A resposta rápida e triagem prioritária garantem a conformidade do SLA contratual do AcmeCorp.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 mt-6 pt-4 border-t border-border">
              <button
                onClick={() => {
                  setShowDailySummaryModal(false);
                }}
                className="px-4 py-2 bg-transparent hover:bg-white/5 text-text-muted hover:text-text-primary rounded-xl text-xs font-bold transition-colors border-none cursor-pointer"
              >
                Ignorar
              </button>
              <button
                onClick={() => {
                  setShowDailySummaryModal(false);
                  setActiveTab("chamados");
                  setPriorityFilter("Alta");
                }}
                className="px-4 py-2 bg-accent text-white hover:bg-brand-hover rounded-xl text-xs font-bold shadow-sm transition-colors border-none cursor-pointer"
              >
                Visualizar Chamados
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 5. FLOATING AI ASSISTANT CHAT */}{" "}
      <ChatWidget csrfToken={user?.csrfToken || ""} />{" "}
    </div>
  );
}

function EnterpriseRouterWrapper() {
  const { route } = useRouter();

  if (route === '#/base-conhecimento') {
    return <KnowledgeAdminTab />;
  }

  if (route === '#/base-conhecimento/novo') {
    return <KnowledgeEditor />;
  }

  if (route.startsWith('#/base-conhecimento/editar/')) {
    const articleId = route.replace('#/base-conhecimento/editar/', '');
    return <KnowledgeEditor articleId={articleId} />;
  }

  if (route.startsWith('#/base-conhecimento/artigo/')) {
    const articleId = route.replace('#/base-conhecimento/artigo/', '');
    return <KnowledgeArticleView articleId={articleId} />;
  }

  return <MonolithicApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <UIProvider>
        <TicketProvider>
          <KnowledgeProvider>
            <EnterpriseRouterWrapper />
            <EasterEgg />
          </KnowledgeProvider>
        </TicketProvider>
      </UIProvider>
    </AuthProvider>
  );
}
