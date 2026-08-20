import { logger } from "./logger";
import { createClient } from '@supabase/supabase-js';
import { Ticket, SlaConfig, Attachment, AuditEvent, UserRecord, TicketComment } from '../../src/types';
import { defaultSlaConfigs, calculateSla } from './slaEngine';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

let supabaseUrl = process.env.SUPABASE_URL;
if (supabaseUrl && supabaseUrl.includes('supabase.com/dashboard/project/')) {
  const projectId = supabaseUrl.split('/project/')[1].split('/')[0];
  supabaseUrl = `https://${projectId}.supabase.co`;
}
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export let isSupabaseConfigured = !!(supabaseUrl && supabaseServiceRoleKey);

// Log configuration status
if (isSupabaseConfigured) {
  logger.info('✅ Supabase database configuration detected.');
} else {
  logger.warn('⚠️ Supabase environment variables missing (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).');
}

/**
 * ARCHITECTURE DECISION: SUPABASE_SERVICE_ROLE_KEY
 * We deliberately use the service role key here to bypass Supabase RLS.
 * Our Supabase database is configured with a "deny-all" RLS policy (see supabase/rls_policies.sql).
 * This forces all authorization logic to be handled exclusively by this Express backend,
 * ensuring the frontend never connects directly to the database.
 * DO NOT change this to the anon key.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseServiceRoleKey!)
  : null;


const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

// Mock fallback store in case Supabase is not connected yet








// Lazy initialization to avoid circular dependency issues during tests






// Helper to seed tables on Supabase if they are empty
export async function initializeDatabaseSchema() { /* removed */ }

// Database Operations Layer
export const db = {
  // --- TICKETS ---
  getTickets: async (): Promise<Ticket[]> => {
    const slaConfigs = await db.getSlaConfigs();
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        logger.error({ err: error }, 'Supabase getTickets error:');
        throw new Error(`Erro ao buscar chamados no Supabase: ${error.message}`);
      }
      if (data) {
        const ticketsMapped = data.map(item => ({
          id: item.id,
          authorEmail: item.author_email,
          assignedToEmail: item.assigned_to_email,
          department: item.department,
          title: item.title,
          category: item.category,
          user: item.user_name || item.user,
          status: item.status,
          deadline: item.deadline || '',
          priority: item.priority,
          description: item.description,
          assetId: item.asset_id,
          createdAt: item.created_at_time || new Date(item.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          createdAtIso: item.created_at_iso || item.created_at,
          notes: item.notes || []
        }));
        return ticketsMapped.map(t => calculateSla(t, slaConfigs));
      }
    }
    // Fallback ONLY if NOT configured (local dev)
    throw new Error("Supabase não configurado");
  },

  createTicket: async (ticket: Ticket): Promise<Ticket> => {
    const slaConfigs = await db.getSlaConfigs();
    const withSla = calculateSla(ticket, slaConfigs);
    
    if (isSupabaseConfigured) {
      const payload: any = {
        id: withSla.id,
        title: withSla.title,
        category: withSla.category,
        author_email: withSla.authorEmail,
        assigned_to_email: withSla.assignedToEmail,
        department: withSla.department,
        user_name: withSla.user,
        status: withSla.status,
        deadline: withSla.deadline,
        priority: withSla.priority,
        description: withSla.description,
        notes: withSla.notes,
        created_at_time: withSla.createdAt,
        created_at_iso: withSla.createdAtIso,
        sla_deadline: withSla.slaDeadline,
        sla_status: withSla.slaStatus,
        asset_id: withSla.assetId
      };

      let success = false;
      let lastError: any = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await supabase!
          .from('tickets')
          .insert(payload);

        if (!error) {
          success = true;
          break;
        }

        lastError = error;
        logger.warn({ err: error }, `Supabase createTicket insertion attempt ${attempt + 1} failed, checking for missing columns...`);

        const match = error.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          const missingCol = match[1];
          logger.warn(`⚠️ Column "${missingCol}" is missing in remote database. Removing and retrying...`);
          delete payload[missingCol];
        } else {
          break;
        }
      }

      if (!success) {
        logger.error({ err: lastError }, 'Supabase createTicket fatal error:');
        throw new Error(`Erro ao criar chamado no Supabase: ${lastError.message}`);
      }
      return withSla;
    }
    // Fallback ONLY if NOT configured
    throw new Error("Supabase não configurado");
    return withSla;
  },

  updateTicket: async (id: string, updates: Partial<Ticket>): Promise<Ticket | null> => {
    const slaConfigs = await db.getSlaConfigs();
    if (isSupabaseConfigured) {
      const supabaseUpdates: any = {};
      if (updates.status !== undefined) supabaseUpdates.status = updates.status;
      if (updates.deadline !== undefined) supabaseUpdates.deadline = updates.deadline;
      if (updates.notes !== undefined) supabaseUpdates.notes = updates.notes;
      if (updates.department !== undefined) supabaseUpdates.department = updates.department;
      
      // If status or priority or category changes, recalculate SLA
      const currentList = await db.getTickets();
      const existing = currentList.find(t => t.id === id);
      if (existing) {
        const merged = { ...existing, ...updates };
        const recalculated = calculateSla(merged, slaConfigs);
        supabaseUpdates.sla_deadline = recalculated.slaDeadline;
        supabaseUpdates.sla_status = recalculated.slaStatus;
      }

      let success = false;
      let lastError: any = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await supabase!
          .from('tickets')
          .update(supabaseUpdates)
          .eq('id', id);

        if (!error) {
          success = true;
          break;
        }

        lastError = error;
        logger.warn({ err: error }, `Supabase updateTicket attempt ${attempt + 1} failed, checking for missing columns...`);

        const match = error.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          const missingCol = match[1];
          logger.warn(`⚠️ Column "${missingCol}" is missing in remote database during update. Removing and retrying...`);
          delete supabaseUpdates[missingCol];
        } else {
          break;
        }
      }

      if (!success) {
        logger.error({ err: lastError }, 'Supabase updateTicket fatal error:');
        throw new Error(`Erro ao atualizar chamado no Supabase: ${lastError.message}`);
      }
      const updatedList = await db.getTickets();
      return updatedList.find(t => t.id === id) || null;
    }

    throw new Error("Supabase não configurado");
  },

  deleteTicket: async (id: string): Promise<boolean> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase!
        .from('tickets')
        .delete()
        .eq('id', id);
      
      if (error) {
        logger.error({ err: error }, 'Supabase deleteTicket error:');
        throw new Error(`Erro ao deletar chamado no Supabase: ${error.message}`);
      }
      return true;
    }
    throw new Error("Supabase não configurado");
  },

  // --- SLA CONFIGS ---
  getSlaConfigs: async (): Promise<SlaConfig[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('sla_configs')
        .select('*');
      if (error) {
        logger.error({ err: error }, 'Supabase getSlaConfigs error:');
        throw new Error(`Erro ao obter configurações SLA do Supabase: ${error.message}`);
      }
      if (data && data.length > 0) {
        return data;
      }
    }
    
    throw new Error("Supabase não configurado");
  },

  updateSlaConfig: async (id: string, hours: number): Promise<SlaConfig | null> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase!
        .from('sla_configs')
        .update({ hours })
        .eq('id', id);
      if (error) {
        logger.error({ err: error }, 'Supabase updateSlaConfig error:');
        throw new Error(`Erro ao atualizar SLA no Supabase: ${error.message}`);
      }
      const configs = await db.getSlaConfigs();
      return configs.find(c => c.id === id) || null;
    }
    
    throw new Error("Supabase não configurado");
  },

  // --- ATTACHMENTS ---
  getAttachments: async (ticketId: string): Promise<Attachment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('attachments')
        .select('*')
        .eq('ticket_id', ticketId);
      if (error) {
        logger.error({ err: error }, 'Supabase getAttachments error:');
        throw new Error(`Erro ao obter anexos do Supabase: ${error.message}`);
      }
      if (data) {
        return data.map(item => ({
          id: item.id,
          ticketId: item.ticket_id,
          filename: item.filename,
          mimetype: item.mimetype,
          size: item.size,
          filePath: item.file_path,
          uploadedBy: item.uploaded_by,
          createdAt: item.created_at
        }));
      }
    }
    throw new Error("Supabase não configurado");
  },

  createAttachment: async (attachment: Attachment): Promise<Attachment> => {
    if (isSupabaseConfigured) {
      const { error } = await supabase!
        .from('attachments')
        .insert({
          id: attachment.id,
          ticket_id: attachment.ticketId,
          filename: attachment.filename,
          mimetype: attachment.mimetype,
          size: attachment.size,
          file_path: attachment.filePath,
          uploaded_by: attachment.uploadedBy,
          created_at: attachment.createdAt
        });
      if (error) {
        logger.error({ err: error }, 'Supabase createAttachment error:');
        throw new Error(`Erro ao anexar arquivo no Supabase: ${error.message}`);
      }
      return attachment;
    }
    throw new Error("Supabase não configurado");
    return attachment;
  },

  // --- AUDIT EVENTS ---
  getAuditEvents: async (ticketId?: string): Promise<AuditEvent[]> => {
    
    if (!isSupabaseConfigured) {
       
       
       
    }
    
    if (isSupabaseConfigured) {
      let query = supabase!.from('audit_events').select('*');
      if (ticketId) {
        query = query.eq('ticket_id', ticketId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        logger.error({ err: error }, 'Supabase getAuditEvents error:');
        throw new Error(`Erro ao obter eventos de auditoria do Supabase: ${error.message}`);
      }
      if (data) {
        return data.map(item => ({
          id: item.id,
          ticketId: item.ticket_id,
          userId: item.user_id,
          userName: item.user_name,
          userEmail: item.user_email,
          action: item.action,
          details: item.details,
          createdAt: item.created_at
        }));
      }
    }
    throw new Error("Supabase não configurado");
  },

  createAuditEvent: async (event: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<AuditEvent> => {
    const newEvent: AuditEvent = {
      id: `aud-${Math.floor(100000 + Math.random() * 900000)}`,
      ticketId: event.ticketId,
      userId: event.userId,
      userName: event.userName,
      userEmail: event.userEmail,
      action: event.action,
      details: event.details,
      metadata: event.metadata,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const payload: any = {
        id: newEvent.id,
        ticket_id: newEvent.ticketId,
        user_id: newEvent.userId,
        user_name: newEvent.userName,
        user_email: newEvent.userEmail,
        action: newEvent.action,
        details: newEvent.details,
        metadata: newEvent.metadata,
        created_at: newEvent.createdAt
      };

      let success = false;
      let lastError: any = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        const { error } = await supabase!
          .from('audit_events')
          .insert(payload);

        if (!error) {
          success = true;
          break;
        }

        lastError = error;
        logger.warn({ err: error }, `Supabase createAuditEvent attempt ${attempt + 1} failed, checking for missing columns...`);

        const match = error.message.match(/Could not find the '([^']+)' column/);
        if (match && match[1]) {
          const missingCol = match[1];
          logger.warn(`⚠️ Column "${missingCol}" is missing in remote database. Removing and retrying...`);
          delete payload[missingCol];
        } else {
          break;
        }
      }

      if (!success) {
        logger.error({ err: lastError }, 'Supabase createAuditEvent fatal error:');
        throw new Error(`Erro ao registrar auditoria no Supabase: ${lastError.message}`);
      }
      return newEvent;
    }
    throw new Error("Supabase não configurado");
    return newEvent;
  },

  // --- USERS ---
  getUsers: async (): Promise<UserRecord[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) {
        logger.error({ err: error }, 'Supabase getUsers error:');
                        throw new Error(`Erro ao obter usuários do Supabase: ${error.message}`);
      }
      if (data) {
        return data.map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          avatar: u.avatar,
          active: u.active,
          createdAt: u.created_at,
          department: u.department,
          password: u.password,
          mustChangePassword: u.must_change_password || false,
          tokensRevokedAt: u.tokens_revoked_at,
          notificationPreferences: u.notification_preferences
        }));
      }
    }
    throw new Error("Supabase não configurado");
  },

  getUserByEmail: async (email: string): Promise<UserRecord | null> => {
    const users = await db.getUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  createUser: async (user: Omit<UserRecord, 'id' | 'createdAt'>): Promise<UserRecord> => {
    const plainPassword = user.password || crypto.randomBytes(12).toString('hex');
    const hashedPassword = bcrypt.hashSync(plainPassword, BCRYPT_ROUNDS);
    const newUser: UserRecord = {
      ...user,
      password: hashedPassword,
      id: `usr-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString()
    };
    if (isSupabaseConfigured) {
      const { error } = await supabase!.from('users').insert({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar || null,
        active: newUser.active,
        created_at: newUser.createdAt,
        department: newUser.department || null,
        password: newUser.password || null,
        must_change_password: newUser.mustChangePassword || false,
        notification_preferences: newUser.notificationPreferences || null
      });
      if (error) {
        logger.error({ err: error }, 'Supabase createUser error:');
        throw new Error(`Erro ao criar usuário no Supabase: ${error.message}`);
      }
      return newUser;
    }
    throw new Error("Supabase não configurado");
    return newUser;
  },

  updateUser: async (id: string, updates: Partial<UserRecord>): Promise<UserRecord | null> => {
    const finalUpdates = { ...updates };
    if (finalUpdates.password !== undefined) {
      finalUpdates.password = bcrypt.hashSync(finalUpdates.password, BCRYPT_ROUNDS);
    }

    if (isSupabaseConfigured) {
      const supabaseUpdates: any = {};
      if (finalUpdates.name !== undefined) supabaseUpdates.name = finalUpdates.name;
      if (finalUpdates.role !== undefined) supabaseUpdates.role = finalUpdates.role;
      if (finalUpdates.active !== undefined) supabaseUpdates.active = finalUpdates.active;
      if (finalUpdates.avatar !== undefined) supabaseUpdates.avatar = finalUpdates.avatar;
      if (finalUpdates.department !== undefined) supabaseUpdates.department = finalUpdates.department;
      if (finalUpdates.password !== undefined) supabaseUpdates.password = finalUpdates.password;
      if (finalUpdates.mustChangePassword !== undefined) supabaseUpdates.must_change_password = finalUpdates.mustChangePassword;
      if (finalUpdates.tokensRevokedAt !== undefined) supabaseUpdates.tokens_revoked_at = finalUpdates.tokensRevokedAt;
      if (finalUpdates.notificationPreferences !== undefined) {
        supabaseUpdates.notification_preferences = finalUpdates.notificationPreferences;
      }

      const { error } = await supabase!
        .from('users')
        .update(supabaseUpdates)
        .eq('id', id);

      if (error) {
        logger.error({ err: error }, 'Supabase updateUser error:');
        throw new Error(`Erro ao atualizar usuário no Supabase: ${error.message}`);
      }
      const users = await db.getUsers();
      return users.find(u => u.id === id) || null;
    }

    throw new Error("Supabase não configurado");
  },

  anonymizeUserReferences: async (id: string, oldEmail: string, anonEmail: string, anonName: string): Promise<void> => {
    if (isSupabaseConfigured) {
      try {
        // Tickets (author_email and assigned_to_email)
        await supabase!.from('tickets').update({ author_email: anonEmail, user_name: anonName }).eq('author_email', oldEmail);
        await supabase!.from('tickets').update({ assigned_to_email: anonEmail }).eq('assigned_to_email', oldEmail);
        // Comments
        await supabase!.from('ticket_comments').update({ author_id: null, author_name: anonName }).eq('author_id', id);
        // Audit Events
        await supabase!.from('audit_events').update({ user_email: anonEmail, user_name: anonName }).eq('user_email', oldEmail);
      } catch (err: unknown) {
        logger.error({ err }, 'Error during cascaded anonymization on Supabase');
      }
    }

    
    throw new Error("Supabase não configurado");

  },

  // --- COMMENTS ---
  getComments: async (ticketId: string): Promise<TicketComment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('ticket_comments')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      
      if (error) {
        logger.error({ err: error }, 'Supabase getComments error:');
        throw new Error(`Erro ao obter comentários do Supabase: ${error.message}`);
      }
      if (data) {
        return data.map(c => ({
          id: c.id,
          ticketId: c.ticket_id,
          authorId: c.author_id,
          authorName: c.author_name,
          content: c.content,
          createdAt: c.created_at
        }));
      }
    }
    throw new Error("Supabase não configurado");
  },

  getCommentsByAuthor: async (authorId: string): Promise<TicketComment[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('ticket_comments')
        .select('*')
        .eq('author_id', authorId);
      if (error) {
        logger.error({ err: error }, 'Supabase getCommentsByAuthor error:');
        throw new Error(`Erro ao obter comentários por autor do Supabase: ${error.message}`);
      }
      if (data) {
        return data.map(c => ({
          id: c.id,
          ticketId: c.ticket_id,
          authorId: c.author_id,
          authorName: c.author_name,
          content: c.content,
          createdAt: c.created_at
        }));
      }
    }
    throw new Error("Supabase não configurado");
  },

  createComment: async (comment: Omit<TicketComment, 'id' | 'createdAt'>): Promise<TicketComment> => {
    const newComment: TicketComment = {
      ...comment,
      id: `cmt-${Math.floor(100000 + Math.random() * 900000)}`,
      createdAt: new Date().toISOString()
    };

    if (isSupabaseConfigured) {
      const { error } = await supabase!.from('ticket_comments').insert({
        id: newComment.id,
        ticket_id: newComment.ticketId,
        author_id: newComment.authorId,
        author_name: newComment.authorName,
        content: newComment.content,
        created_at: newComment.createdAt
      });
      if (error) {
        logger.error({ err: error }, 'Supabase createComment error:');
        throw new Error(`Erro ao criar comentário no Supabase: ${error.message}`);
      }
      return newComment;
    }
    throw new Error("Supabase não configurado");
    return newComment;
  },

  revokeToken: async (token: string, userId: string): Promise<void> => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase!.from('revoked_sessions').insert({
          token,
          user_id: userId,
          revoked_at: new Date().toISOString()
        });
        if (error) {
           // Fallback to memory if table doesn't exist
           
        }
      } catch (err) {
        
      }
    } else {
      
    }
  },
  
  revokeUser: async (userId: string): Promise<void> => {
    
    await db.updateUser(userId, { tokensRevokedAt: new Date().toISOString() });
  },

  isTokenRevoked: async (token: string, userId?: string): Promise<boolean> => {
    
    
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase!
          .from('revoked_sessions')
          .select('token')
          .eq('token', token)
          .maybeSingle();
        if (!error && data) {
            // Cache locally
           return true;
        }
      } catch (err) {
        // Ignore table not found errors
      }
    }
    return false;
  }
,
  // --- DEVICES ---
  getDevices: async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('devices').select('*').order('name');
      if (error) {
                throw new Error('Supabase getDevices error: ' + error.message);
      }
      return data.map(d => ({
        id: d.id,
        name: d.name,
        user: d.assigned_user,
        department: d.department,
        os: d.os,
        serial: d.serial,
        model: d.model,
        manufacturer: d.manufacturer,
        lastCheckin: d.last_checkin ? new Date(d.last_checkin).toLocaleString('pt-BR') : 'Desconhecido',
        compliance: d.compliance,
        cpu: d.cpu_usage,
        ram: d.ram_usage,
        disk: d.disk_usage,
        network: d.network_usage,
        battery: d.battery_level,
        defender: d.defender_active,
        bitlocker: d.bitlocker_active,
        windowsUpdate: d.windows_update,
        healthScore: d.health_score,
        riskScore: d.risk_score
      }));
    }
    return [];
  },
  
  getDeviceEvents: async (deviceId) => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('device_events').select('*').eq('device_id', deviceId).order('created_at', { ascending: false });
      if (error) {
                throw new Error('Supabase getDeviceEvents error: ' + error.message);
      }
      return data.map(e => ({
        id: e.id,
        deviceId: e.device_id,
        type: e.event_type,
        description: e.description,
        severity: e.severity,
        timestamp: e.created_at ? new Date(e.created_at).toLocaleString('pt-BR') : ''
      }));
    }
    return [];
  },

  getDeviceInsights: async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('device_insights').select('*');
      if (error) {
                throw new Error('Supabase getDeviceInsights error: ' + error.message);
      }
      return data.map(i => ({
        id: i.id,
        type: i.insight_type,
        severity: i.severity,
        description: i.description,
        impact: i.impact,
        recommendation: i.recommendation
      }));
    }
    return [];
  },


  // --- KNOWLEDGE BASE ---
  getKnowledgeArticles: async () => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('knowledge_articles').select('*').order('created_at', { ascending: false });
      if (error) {
                throw new Error('Supabase getKnowledgeArticles error: ' + error.message);
      }
      return data.map(a => ({
        id: a.id,
        title: a.title,
        category: a.category,        
        keywords: a.keywords || [],
        content: a.content,
        embedding: a.embedding ? (typeof a.embedding === 'string' ? JSON.parse(a.embedding) : a.embedding) : undefined,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        createdBy: a.created_by,
        source: a.source,
        version: "1.0",
        confidence: 1.0
      }));
    }
    return [];
  },
  createKnowledgeArticle: async (article) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('knowledge_articles').insert({
        id: article.id,
        title: article.title,
        category: article.category,
        keywords: article.keywords,
        content: article.content,
        embedding: article.embedding ? JSON.stringify(article.embedding) : null,
        created_at: article.createdAt,
        updated_at: article.updatedAt,
        created_by: article.createdBy,
        source: article.source
      });
      if (error) {
        throw new Error('Supabase createKnowledgeArticle error: ' + error.message);
      }
      return article;
    }
    return article;
  },
  updateKnowledgeArticle: async (id, updates) => {
    if (isSupabaseConfigured) {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.keywords !== undefined) dbUpdates.keywords = updates.keywords;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.embedding !== undefined) dbUpdates.embedding = updates.embedding ? JSON.stringify(updates.embedding) : null;
      if (updates.updatedAt !== undefined) dbUpdates.updated_at = updates.updatedAt;
      
      const { error } = await supabase.from('knowledge_articles').update(dbUpdates).eq('id', id);
      if (error) {
        throw new Error('Supabase updateKnowledgeArticle error: ' + error.message);
      }
      return true;
    }
    return true;
  },
  deleteKnowledgeArticle: async (id) => {
    if (isSupabaseConfigured) {
      const { error } = await supabase.from('knowledge_articles').delete().eq('id', id);
      if (error) {
        throw new Error('Supabase deleteKnowledgeArticle error: ' + error.message);
      }
      return true;
    }
    return true;
  }
};



export async function testDbConnection() {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('users').select('id').limit(1);
      if (error) {
        logger.warn('⚠️ Teste do Supabase falhou na inicialização: ' + error.message);
      } else {
        logger.info('✅ Supabase ativo');
      }
    } catch(e) {
      logger.warn('⚠️ Exceção no teste do Supabase: ' + e.message);
    }
  } else {
    logger.warn('⚠️ Supabase não configurado');
  }
}
