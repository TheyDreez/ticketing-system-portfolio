export interface NotificationPreferences {
  ticketAssigned: boolean;
  newComments: boolean;
  slaAlerts: boolean;
  statusChange: boolean;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'Administrador' | 'Suporte' | 'Colaborador';
  avatar?: string;
  active: boolean;
  createdAt: string;
  department?: string;
  password?: string;
  mustChangePassword?: boolean;
  tokensRevokedAt?: string;
  notificationPreferences?: NotificationPreferences;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  category: string;
  user: string;
  authorEmail?: string;
  assignedToEmail?: string;
  department?: string;
  status: 'Crítico' | 'Aguardando' | 'Em Análise' | 'Resolvido';
  deadline: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  description: string;
  createdAt: string;
  notes: string[];
  createdAtIso?: string;
  slaDeadline?: string;
  slaStatus?: 'dentro_prazo' | 'em_risco' | 'estourado';
  assetId?: string;
}

export interface SlaConfig {
  id: string;
  priority: 'Alta' | 'Média' | 'Baixa';
  category: string;
  hours: number;
}

export interface Attachment {
  id: string;
  ticketId: string;
  filename: string;
  mimetype: string;
  size: number;
  filePath: string;
  uploadedBy: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  ticketId: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  details: string;
  createdAt: string;
  metadata?: any;
}

export interface SystemHealth {
  linkDedicado: number;
  supabaseDb: 'Normal' | 'Lento' | 'Fora do Ar';
  storageApi: number;
  lastChecked: string;
}

export interface AppNotification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  type: 'critical' | 'info';
}

export interface UserProfile {
  name: string;
  email: string;
  role: string;
  department?: string;
  mustChangePassword?: boolean;
}

export interface SmartSolution {
  title: string;
  explanation: string;
  steps: string[];
  estimatedTime: string;
  difficulty: "Fácil" | "Médio" | "Difícil";
}

export interface PreventionResponse {
  solutions: SmartSolution[];
  sources?: string[];
  confidenceScore?: number;
  matchedCount?: number;
}

export interface ArticleVersionHistory {
  version: string;
  changedBy: string;
  description: string;
  date: string;
  title?: string;
  content?: string;
  procedure?: string;
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  keywords: string[];
  products?: string[];
  systems?: string[];
  author?: string;
  createdBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  content: string;
  procedure?: string;
  checklist?: string[];
  officialLinks?: { title: string; url: string }[] | string[];
  relatedArticleIds?: string[];
  status?: 'draft' | 'in_review' | 'published' | 'archived';
  version: string;
  criticality?: 'Baixa' | 'Média' | 'Alta' | 'Crítica' | 'low' | 'medium' | 'high' | 'critical';
  difficulty?: 'Fácil' | 'Médio' | 'Difícil' | 'Especialista';
  embedding?: number[];
  createdAt: string;
  updatedAt: string;
  lastUpdated?: string;
  source?: 'manual' | 'ticket_resolution';
  confidence?: number;
  confidenceScore?: number;
  viewCount?: number;
  views?: number;
  useCount?: number;
  aiUsageCount?: number;
  helpfulCount?: number;
  notHelpfulCount?: number;
  history?: ArticleVersionHistory[];
}

export interface DeviceData {
  id: string;
  name: string;
  user: string;
  department: string;
  os: string;
  serial: string;
  model: string;
  manufacturer: string;
  lastCheckin: string;
  compliance: boolean;
  cpu?: number;
  ram?: number;
  disk?: number;
  network?: number;
  battery?: number;
  defender: boolean;
  bitlocker: boolean;
  windowsUpdate: string;
  healthScore?: number;
  riskScore?: number;
}

export interface DeviceEvent {
  id: string;
  deviceId: string;
  type: 'alert' | 'update' | 'policy' | 'script' | 'incident' | 'ticket';
  description: string;
  timestamp: string;
  severity?: 'high' | 'medium' | 'low';
}

export interface DeviceInsight {
  id: string;
  type: 'risk' | 'performance' | 'usage' | 'anomaly';
  description: string;
  impact: string;
  recommendation?: string;
  severity: 'high' | 'medium' | 'low';
}

export interface DeviceAutoAction {
  id: string;
  name: string;
  action: string;
  description: string;
}
