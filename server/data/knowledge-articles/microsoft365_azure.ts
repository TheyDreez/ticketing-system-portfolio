export const m365AzureArticles = [
  {
    id: 'kb-ent-001',
    title: 'Microsoft 365 / Entra ID — Resolução de Problemas de Autenticação Híbrida e SSPR',
    category: 'Acessos',
    subcategory: 'Autenticação',
    tags: ['M365', 'Entra ID', 'SSPR', 'Active Directory', 'Azure AD', 'Senha', 'MFA'],
    keywords: ['sspr', 'entra', 'azure ad', 'senha', 'autenticação', 'bloqueado', 'senha expirada', 'pass-through', 'ad connect'],
    products: ['Entra ID', 'Microsoft 365', 'Microsoft Entra Connect'],
    systems: ['Active Directory', 'Azure AD', 'Windows Server DNS'],
    author: 'arquitetura.iam@cbiops.com',
    status: 'published',
    version: '2.4.0',
    criticality: 'critical',
    difficulty: 'Médio',
    content: `# Microsoft 365 / Entra ID — Resolução de Problemas de Autenticação Híbrida e SSPR

## 1. Contexto Arquitetural
Em ambientes híbridos (Active Directory On-Premises + Microsoft Entra ID), a autenticação pode utilizar **Password Hash Synchronization (PHS)**, **Pass-through Authentication (PTA)** ou **Federation (AD FS)**. Quando um usuário relata impossibilidade de login ou falha no Self-Service Password Reset (SSPR), é necessário isolar a camada de identidade afetada.

## 2. Diagnóstico Passo a Passo

### 2.1 Validação do Status da Conta no Entra Admin Center
1. Acesse o **Microsoft Entra Admin Center** (\`https://entra.microsoft.com\`).
2. Navegue até **Identidade > Usuários > Todos os Usuários**.
3. Pesquise pelo UPN do usuário (\`usuario@empresa.com.br\`).
4. Verifique os seguintes atributos:
   - **Conta habilitada**: Deve constar como *Sim*.
   - **Tipo de Usuário**: *Membro*.
   - **Sincronizado no local**: *Sim* (para contas criadas no AD Local).

### 2.2 Sincronização AD Connect (Password Writeback)
Se o SSPR estiver ativado, a alteração efetuada na nuvem deve ser refletida no Active Directory local em tempo real via **Password Writeback**.
Para diagnosticar falhas no serviço AD Connect Agent:

\`\`\`powershell
# Executar no servidor Microsoft Entra Connect
Import-Module ADSync
Get-ADSyncScheduler

# Forçar sincronização delta
Start-ADSyncSyncCycle -PolicyType Delta

# Verificar eventos de erro no Log do Event Viewer
Get-WinEvent -LogName "Application" | Where-Object { $_.ProviderName -eq "Directory Synchronization" } | Select-Object -First 10 | Format-Table TimeCreated, Message
\`\`\`

## 3. Resolução e Recomendações

- **Sintoma: "Sua senha foi alterada na nuvem mas não no computador"**:
  - Causa: Falha no serviço Password Writeback ou permissão do Service Account do AD Connect no OU do usuário.
  - Solução: Garantir permissões \`Unexpire Password\` e \`Reset Password\` na conta de serviço do AD Sync na UO de Destino.

- **Sintoma: Usuário presencial em Home Office (VPN)**:
  - Causa: O Kerberos Ticket / NTLM Cache do Windows está dessincronizado.
  - Solução: Conectar a VPN corporativa na tela de logon do Windows (*Connect before logon*) ou executar \`klist purge\` após estabelecer túnel VPN.`,
    procedure: `1. Validar UPN e status no Entra ID.
2. Testar SSPR em aba anônima (https://aka.ms/sspr).
3. Verificar conectividade do agente Entra Connect com porta 443 liberada para *.msappproxy.net.
4. Forçar sincronização Delta via PowerShell.
5. Confirmar sincronização de hash de senha no AD local.`,
    checklist: [
      'Verificar bloqueio de conta por tentativas inválidas (Lockout)',
      'Validar se o UPN coincide com o atributo mail e userPrincipalName no AD Local',
      'Confirmar que a permissão de Password Writeback está ativa na UO do usuário',
      'Testar conectividade com o portal da Microsoft',
      'Registrar resolução no ticket'
    ],
    officialLinks: [
      'https://learn.microsoft.com/pt-br/entra/identity/authentication/howto-sspr-troubleshoot',
      'https://learn.microsoft.com/pt-br/entra/identity/hybrid/connect/tshoot-connect-password-hash-synchronization'
    ],
    relatedArticleIds: ['kb-ent-002', 'kb-ent-003']
  },
  {
    id: 'kb-ent-002',
    title: 'Microsoft Intune — Resolução de Falhas de Enrollment e Policy Compliance',
    category: 'Dispositivos',
    subcategory: 'MDM / Intune',
    tags: ['Intune', 'MDM', 'Enrollment', 'Compliance', 'Windows 11', 'Autopilot'],
    keywords: ['intune', 'enrollment', 'compliance', 'autopilot', 'portal da empresa', 'company portal', 'device', 'mdm'],
    products: ['Microsoft Intune', 'Windows 11 Enterprise'],
    systems: ['Microsoft Intune', 'Entra ID Join'],
    author: 'endpoint.management@cbiops.com',
    status: 'published',
    version: '1.8.0',
    criticality: 'high',
    difficulty: 'Médio',
    content: `# Microsoft Intune — Resolução de Falhas de Enrollment e Policy Compliance

## 1. Visão Geral
O gerenciamento moderno de endpoints exige que computadores corporativos efetuem o **Entra ID Join** e o auto-enrollment no **Microsoft Intune**. Dispositivos fora de conformidade (*Non-Compliant*) perdem acesso aos recursos corporativos via regras de Acesso Condicional.

## 2. Códigos de Erro Frequentes em Enrollment
| Código de Erro | Causa Provável | Ação Recomendada |
|----------------|----------------|------------------|
| **0x80180018** | Licença do Intune ausente para o usuário | Atribuir licença M365 E3/E5 ou Mobility + Security E3 |
| **0x80180014** | Tipo de dispositivo bloqueado na política de restrição | Permitir Windows MDM enrollment no Portal Intune |
| **0x800705b4** | Timeout na aplicação de políticas Autopilot | Verificar velocidade da conexão de rede e proxy |

## 3. Comandos de Diagnóstico no Cliente Windows

\`\`\`cmd
:: Verificar status de join e MDM
dsregcmd /status

:: Forçar sincronização de políticas Intune via prompt
C:\\Windows\\System32\\deviceenroller.exe /c /AutoEnrollMDM

:: Coletar logs do Intune Management Extension
powershell -Command "Get-ChildItem -Path 'C:\\ProgramData\\Microsoft\\IntuneManagementExtension\\Logs' | Select-Object Name, LastWriteTime"
\`\`\`

## 4. Remediação para Dispositivo "Não Conforme" (Non-Compliant)
1. Abra a aplicação **Portal da Empresa (Company Portal)** no Windows.
2. Clique em **Dispositivos** e selecione o computador local.
3. Clique em **Verificar Acesso (Check Access)**.
4. Identifique o motivo da não conformidade (Exemplo: BitLocker desativado, Antivírus desatualizado, Senha de BIOS ausente).
5. Aplique a correção local e force nova sincronização.`,
    procedure: `1. Executar dsregcmd /status no prompt elevado.
2. Confirmar que AzureAdJoined = YES e EnterpriseJoined = NO (ou YES se híbrido).
3. Verificar no Intune Admin Center (intune.microsoft.com) se o dispositivo consta como ativo.
4. Limpar cache do MDM local se necessário (HKLM\\SOFTWARE\\Microsoft\\Enrollments).
5. Reiniciar o serviço IntuneManagementExtension.`,
    checklist: [
      'Validar licença Intune atribuída ao usuário',
      'Confirmar que AzureAdJoined está TRUE',
      'Executar sincronização no Portal da Empresa',
      'Verificar logs de evento em Microsoft-Windows-DeviceManagement-Enterprise-Diagnostics-Provider/Admin'
    ],
    officialLinks: [
      'https://learn.microsoft.com/pt-br/mem/intune/enrollment/troubleshoot-windows-enrollment-errors'
    ],
    relatedArticleIds: ['kb-ent-001', 'kb-ent-003']
  },
  {
    id: 'kb-ent-003',
    title: 'Microsoft Defender for Endpoint — Isolamento de Dispositivos e Remediação de Ameaças',
    category: 'Segurança',
    subcategory: 'EDR / Antivírus',
    tags: ['Defender', 'EDR', 'Segurança', 'Isolamento', 'Malware', 'Quarentena'],
    keywords: ['defender', 'antivirus', 'edr', 'isolamento', 'ameaca', 'quarentena', 'rtp', 'malware', 'soc'],
    products: ['Microsoft Defender for Endpoint'],
    systems: ['Windows Security', 'Microsoft Defender Portal'],
    author: 'soc.security@cbiops.com',
    status: 'published',
    version: '2.1.0',
    criticality: 'critical',
    difficulty: 'Especialista',
    content: `# Microsoft Defender for Endpoint — Isolamento de Dispositivos e Remediação de Ameaças

## 1. Visão Geral de Incidentes de EDR
O **Microsoft Defender for Endpoint (MDE)** monitora em tempo real processos, conexões de rede e alterações de registro no dispositivo. Caso ocorra uma detecção de severidade Alta ou Crítica (ex: ransomware, mimikatz, PowerShell obfuscado), o SOC pode isolar o dispositivo da rede.

## 2. Procedimento de Isolamento e Liberação
Quando um dispositivo é isolado:
- **Conexões bloqueadas**: Toda comunicação de rede de entrada e saída é cortada.
- **Conexões permitidas**: Apenas a comunicação com a nuvem do Microsoft Defender permanece ativa.

### 2.1 Script de Remediação Automática e Coleta de Investigação
\`\`\`powershell
# Verificar status do serviço do Defender
Get-Service -Name "Sense"

# Coletar suporte de diagnóstico MDE
Set-Location "C:\\Program Files\\Windows Defender"
.\\MpCmdRun.exe -GetFiles

# Forçar atualização de inteligência de ameaças
.\\MpCmdRun.exe -SignatureUpdate

# Executar varredura rápida de emergência
.\\MpCmdRun.exe -Scan -ScanType 1
\`\`\`

## 3. Retirada do Isolamento
Após o Analista de Segurança / Service Desk confirmar a eliminação da ameaça:
1. Acesse o **Microsoft Defender Portal** (\`https://security.microsoft.com\`).
2. Acesse **Dispositivos > Inventário de Dispositivos**.
3. Selecione o dispositivo afetado.
4. Clique em **Ações (...) > Liberação do Isolamento (Release from Isolation)**.
5. Aguarde até 5 minutos para a restauração completa da conectividade de rede.`,
    procedure: `1. Notificar o usuário e a liderança sobre a contenção de segurança.
2. Coletar o pacote de investigação (Investigative Package) pelo portal do Defender.
3. Executar o escaneamento offline ou varredura completa.
4. Validar o log de quarentena via MpCmdRun.exe.
5. Aprovar a liberação de isolamento no Security Portal.`,
    checklist: [
      'Confirmar que a ameaça foi totalmente remediada ou colocada em quarentena',
      'Validar que não existem novos alertas pendentes no painel do EDR',
      'Executar atualização das assinaturas de antivírus',
      'Registrar hash dos arquivos maliciosos identificados no chamado'
    ],
    officialLinks: [
      'https://learn.microsoft.com/pt-br/defender-endpoint/respond-machine-alerts'
    ],
    relatedArticleIds: ['kb-ent-002']
  }
];
