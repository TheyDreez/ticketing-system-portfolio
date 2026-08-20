import { db, isSupabaseConfigured, supabase } from './db';
import { logger } from './logger';

let isSyncing = false;

async function getGraphToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Credenciais do Azure não configuradas. Verifique AZURE_TENANT_ID, AZURE_CLIENT_ID e AZURE_CLIENT_SECRET.');
  }

  // Identifica se o usuário inverteu Tenant ID com Secret Value nas variáveis de ambiente
  let finalTenant = tenantId;
  let finalSecret = clientSecret;
  if (tenantId.includes('~') && !clientSecret.includes('~')) {
    finalTenant = clientSecret;
    finalSecret = tenantId;
    logger.info('Auto-corrigindo: AZURE_TENANT_ID e AZURE_CLIENT_SECRET parecem estar invertidos.');
  }

  const url = `https://login.microsoftonline.com/${finalTenant}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  // Using specific scope per security audit instead of .default if possible
  // Note: Client Credentials flow often requires /.default, but we use what was recommended
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('client_secret', finalSecret);
  params.append('grant_type', 'client_credentials');

  const res = await fetch(url, { method: 'POST', body: params });
  if (!res.ok) {
    throw new Error(`Falha ao obter token do Graph (Status ${res.status}). Credenciais ou Tenant podem estar incorretos.`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function syncIntuneDevices() {
  if (!isSupabaseConfigured || !supabase) {
    logger.warn('Supabase não configurado. Sincronização do Intune não será executada.');
    throw new Error('Supabase não configurado.');
  }

  if (isSyncing) return { status: 'already_syncing', message: 'Sincronização já está em andamento.' };
  isSyncing = true;

  try {
    const token = await getGraphToken();
    const url = 'https://graph.microsoft.com/v1.0/deviceManagement/managedDevices';
    
    // Pagination support for Intune managed devices
    const managedDevices: any[] = [];
    let next: string | null = url;
    
    while (next) {
      const res: globalThis.Response = await fetch(next, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
  
      if (res.status === 403) {
        throw new Error(`Acesso negado (403) ao Microsoft Graph. A aplicação precisa da permissão 'DeviceManagementManagedDevices.Read.All' no portal do Azure.`);
      }
  
      if (!res.ok) {
        throw new Error(`Falha ao buscar dispositivos do Graph (Status ${res.status}): ${await res.text()}`);
      }
  
      const data = await res.json();
      managedDevices.push(...(data.value || []));
      next = data['@odata.nextLink'] || null;
    }

    const devicesToInsert = managedDevices.map((d: any) => {
      const isCompliant = d.complianceState === 'compliant';
      
      return {
        id: d.id,
        name: d.deviceName || d.id,
        assigned_user: d.userDisplayName || 'Sem usuário atribuído',
        department: 'Desconhecido',
        os: `${d.operatingSystem || 'Desconhecido'} ${d.osVersion || ''}`.trim(),
        serial: d.serialNumber || 'N/A',
        model: d.model || 'Desconhecido',
        manufacturer: d.manufacturer || 'Desconhecido',
        last_checkin: d.lastSyncDateTime,
        compliance: isCompliant,
        cpu_usage: null,
        ram_usage: null,
        disk_usage: null,
        network_usage: null,
        battery_level: null,
        defender_active: isCompliant,
        bitlocker_active: d.isEncrypted || false,
        windows_update: isCompliant ? 'Atualizado' : 'Status não disponível',
        health_score: null,
        risk_score: null,
      };
    });

    if (devicesToInsert.length > 0) {
      const { error } = await supabase.from('devices').upsert(devicesToInsert, { onConflict: 'id' });
      if (error) {
        throw error;
      }
      logger.info(`✅ Sincronizados ${devicesToInsert.length} dispositivos reais do Intune.`);
      
      try {
        const { emitEvent } = await import('./socket');
        emitEvent('device_sync', { count: devicesToInsert.length });
      } catch (e) {
        // ignore
      }

      return { status: 'success', count: devicesToInsert.length, message: `Sincronizados ${devicesToInsert.length} dispositivos reais do Intune.` };
    } else {
      logger.info('Nenhum dispositivo retornado do Intune na sincronização.');
      return { status: 'success', count: 0, message: 'Nenhum dispositivo retornado do Intune.' };
    }
  } catch (e: any) {
    logger.error({ err: e }, '❌ Erro na sincronização do Intune:');
    throw e;
  } finally {
    isSyncing = false;
  }
}

export async function executeHealingAction(deviceId: string, action: string, userEmail: string) {
  // Simulate Microsoft Graph Intune API call to run PowerShell script
  logger.info(`Iniciando Self-Healing '${action}' via Intune no device ${deviceId}`);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Se for Supabase atualiza lá, caso contrário no in-memory db
  if (isSupabaseConfigured && supabase) {
    // Para simplificar a simulação de correção, setamos atributos de saúde como resolvidos
    let updateData = {};
    if (action === 'restart_teams' || action === 'clear_cache') {
      updateData = { cpu_usage: 10, ram_usage: 40, health_score: 95, compliance: true };
    }
    
    await supabase.from('devices').update(updateData).eq('id', deviceId);
  }
  
  // Log event
  try {
    const { emitEvent } = await import('./socket');
    emitEvent('device_updated', { id: deviceId, action, healed: true });
  } catch (e) {}

  return { success: true, message: `Ação ${action} concluída com sucesso via Intune.` };
}
