import { logger } from './logger';
import { isSupabaseConfigured, supabase } from './db';

let isSyncing = false;
let cachedSkus: any[] = [];
let cachedWaste: any[] = [];
let cachedAllocations: any[] = [];

async function getGraphToken() {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Credenciais do Azure não configuradas. Verifique AZURE_TENANT_ID, AZURE_CLIENT_ID e AZURE_CLIENT_SECRET.');
  }

  let finalTenant = tenantId;
  let finalSecret = clientSecret;
  if (tenantId.includes('~') && !clientSecret.includes('~')) {
    finalTenant = clientSecret;
    finalSecret = tenantId;
  }

  const url = `https://login.microsoftonline.com/${finalTenant}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
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

export async function syncLicenses() {
  if (isSyncing) return { status: 'already_syncing', message: 'Sincronização já está em andamento.' };
  isSyncing = true;
  try {
    logger.info('Iniciando sincronização de licenças Microsoft...');
    
    let skus: any[] = [];
    let waste: any[] = [];
    let allocations: any[] = [];

    if (process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID) {
      const token = await getGraphToken();

      // 1. Fetch Subscribed SKUs
      const skusRes = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!skusRes.ok) {
        const errTxt = await skusRes.text(); if(skusRes.status === 403) { throw new Error('Acesso Negado. Adicione a permissão Organization.Read.All no Microsoft Graph.'); } throw new Error(`Falha ao buscar SKUs: ${errTxt}`);
      }
      
      const skusData = await skusRes.json();
      skus = (skusData.value || []).map((sku: any) => {
        const total = sku.prepaidUnits?.enabled || 0;
        const consumed = sku.consumedUnits || 0;
        const available = total - consumed;
        let displayName = sku.skuPartNumber;
        
        // Pretty names mapping for common M365 SKUs
        const skuNames: Record<string, string> = {
          'SPE_E5': 'Microsoft 365 E5',
          'SPE_E3': 'Microsoft 365 E3',
          'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
          'SPB': 'Microsoft 365 Business Premium',
          'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
          'O365_BUSINESS': 'Microsoft 365 Apps for business',
          'ENTERPRISEPACK': 'Office 365 E3',
          'DESKLESSPACK': 'Office 365 F3',
          'POWER_BI_PRO': 'Power BI Pro',
          'POWER_BI_STANDARD': 'Microsoft Fabric (Free)',
          'EMS': 'Enterprise Mobility + Security E3',
          'EMS_PREMIUM': 'Enterprise Mobility + Security E5',
          'PROJECTPREMIUM': 'Project Plan 3',
          'PROJECTPROFESSIONAL': 'Planner and Project Plan 3',
          'VISIOCLIENT': 'Visio Plan 2',
          'MCOPSTN1': 'Microsoft Teams Domestic Calling Plan',
          'FLOW_FREE': 'Microsoft Power Automate Free',
          'CCIBOTS_PRIVPREV_VIRAL': 'Microsoft Copilot Studio Viral Trial',
          'POWERAPPS_DEV': 'Microsoft Power Apps for Developer',
          'Power_Pages_vTrial_for_Makers': 'Power Pages vTrial for Makers'
        };

        if (skuNames[sku.skuPartNumber]) {
          displayName = skuNames[sku.skuPartNumber];
        }

        return {
          skuId: sku.skuId,
          skuPartNumber: sku.skuPartNumber,
          displayName,
          total,
          consumed,
          available,
          suspended: sku.prepaidUnits?.suspended || 0,
          warning: sku.prepaidUnits?.warning || 0,
          status: available === 0 ? 'esgotado' : (available < 5 ? 'alerta' : 'ok'),
          utilizationPct: total > 0 ? Math.round((consumed / total) * 100) : 0,
          syncedAt: new Date().toISOString()
        };
      });

      // 2. Fetch Users to detect waste
      // Fetch users with signInActivity to check for inactivity
      const usersRes = await fetch('https://graph.microsoft.com/beta/users?$select=id,userPrincipalName,displayName,accountEnabled,signInActivity,assignedLicenses&$filter=assignedLicenses/$count ne 0', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ConsistencyLevel': 'eventual'
        }
      });
      
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const users = usersData.value || [];
        
        const now = new Date();
        
        users.forEach((user: any) => {
          if (!user.assignedLicenses || user.assignedLicenses.length === 0) return;
          
          let lastSignIn = user.signInActivity?.lastSignInDateTime ? new Date(user.signInActivity.lastSignInDateTime) : null;
          let isInactive = false;
          let reason = '';
          
          if (!user.accountEnabled) {
            isInactive = true;
            reason = 'Conta desativada';
          } else if (lastSignIn) {
            const diffTime = Math.abs(now.getTime() - lastSignIn.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 30) {
              isInactive = true;
              reason = `Inativo há ${diffDays} dias`;
            }
          } else {
             // Never signed in
             isInactive = true;
             reason = 'Nunca acessou';
          }


          user.assignedLicenses.forEach((lic: any) => {
             const skuMatch = skus.find(s => s.skuId === lic.skuId);
             allocations.push({
               upn: user.userPrincipalName,
               displayName: user.displayName,
               skuId: lic.skuId,
               skuPartNumber: skuMatch ? skuMatch.displayName : lic.skuId,
               accountEnabled: user.accountEnabled
             });
          });
          if (isInactive) {
            user.assignedLicenses.forEach((lic: any) => {
               // Find sku part number
               const skuMatch = skus.find(s => s.skuId === lic.skuId);
               waste.push({
                 upn: user.userPrincipalName,
                 displayName: user.displayName,
                 skuPartNumber: skuMatch ? skuMatch.displayName : lic.skuId,
                 accountEnabled: user.accountEnabled,
                 lastSignIn: user.signInActivity?.lastSignInDateTime || null,
                 reason
               });
            });
          }
        });
      } else {
        logger.warn('Rota beta falhou (possível falta de licença P1). Tentando fallback para rota v1.0 normal...');
        
        // FALLBACK: Busca lista simples sem Advanced Queries para evitar bloqueios da Microsoft (400 Bad Request)
        const fallbackRes = await fetch('https://graph.microsoft.com/v1.0/users?$select=id,userPrincipalName,displayName,accountEnabled,assignedLicenses', {
          headers: { 
            'Authorization': `Bearer ${token}`
          }
        });

        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const users = fallbackData.value || [];
          
          users.forEach((user: any) => {
            if (!user.assignedLicenses || user.assignedLicenses.length === 0) return;
            
            user.assignedLicenses.forEach((lic: any) => {
              const skuMatch = skus.find(s => s.skuId === lic.skuId);
              allocations.push({
                upn: user.userPrincipalName,
                displayName: user.displayName,
                skuId: lic.skuId,
                skuPartNumber: skuMatch ? skuMatch.displayName : lic.skuId,
                accountEnabled: user.accountEnabled
              });
            });

            // Se a conta estiver desativada no AD, conta como desperdício
            if (!user.accountEnabled) {
              user.assignedLicenses.forEach((lic: any) => {
                const skuMatch = skus.find(s => s.skuId === lic.skuId);
                waste.push({
                  upn: user.userPrincipalName,
                  displayName: user.displayName,
                  skuPartNumber: skuMatch ? skuMatch.displayName : lic.skuId,
                  accountEnabled: user.accountEnabled,
                  lastSignIn: null,
                  reason: 'Conta desativada no Entra ID (Fallback)'
                });
              });
            }
          });
        } else {
          logger.error('Fallback também falhou. Verifique as permissões User.Read.All no Microsoft Entra ID.');
          waste = [];
          allocations = [];
        }
      }
    } else {
      throw new Error('Credenciais do Azure ausentes. Impossível sincronizar.');
    }
    
    cachedSkus = skus;
    cachedWaste = waste;
    cachedAllocations = allocations;

    try {
        const { emitEvent } = await import('./socket');
        emitEvent('license_sync', { skus: skus.length });
    } catch (e) {}

    return { status: 'success', message: 'Sincronização de licenças concluída.', skus: skus.length };
  } catch (e: any) {
    logger.error({ err: e }, 'Erro na sincronização de licenças');
    throw e;
  } finally {
    isSyncing = false;
  }
}

export function getCachedSkus() {
  return cachedSkus;
}

export function getCachedWaste() {
  return cachedWaste;
}

export function getCachedAllocations() {
  return cachedAllocations;
}
