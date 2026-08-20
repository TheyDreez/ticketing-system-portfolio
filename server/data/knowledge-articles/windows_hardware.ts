export const windowsHardwareArticles = [
  {
    id: 'kb-ent-006',
    title: 'Windows 11 / 10 — Diagnóstico Avançado de Tela Azul (BSOD), Integridade de Sistema e BitLocker',
    category: 'Sistema Operacional',
    subcategory: 'Windows',
    tags: ['Windows', 'BSOD', 'Tela Azul', 'BitLocker', 'SFC', 'DISM', 'Hardware', 'Driver'],
    keywords: ['tela azul', 'bsod', 'crash', 'reiniciando', 'sfc', 'dism', 'bitlocker', 'chave tpm', 'minidump', 'memory dump'],
    products: ['Windows 11 Enterprise', 'Windows 10 Enterprise'],
    systems: ['Windows Kernel', 'TPM 2.0 Module'],
    author: 'desktop.support@cbiops.com',
    status: 'published',
    version: '2.2.0',
    criticality: 'critical',
    difficulty: 'Especialista',
    content: `# Windows 11 / 10 — Diagnóstico Avançado de BSOD, DISM e BitLocker

## 1. Diagnóstico de Crash de Sistema (BSOD)
Telas azuis (*Blue Screen of Death*) indicam falhas críticas no modo Kernel do sistema operacional, geralmente provocadas por drivers corrompidos, falha de memória RAM ou setores defeituosos no SSD/HD.

## 2. Roteiro de Recuperação de Integridade do Sistema (SFC e DISM)

Execute os comandos em um prompt de comando elevado (**CMD como Administrador**):

\`\`\`cmd
:: 1. Reparar a imagem de componentes do Windows usando o repositório da Microsoft
dism /online /cleanup-image /restorehealth

:: 2. Executar o Verificador de Arquivos do Sistema
sfc /scannow

:: 3. Verificar o status dos discos físicos (SMART)
wmic diskdrive get model,status
\`\`\`

## 3. Recuperação de Chave do BitLocker
Se o computador solicitar a chave de 48 dígitos do BitLocker na inicialização:

1. Acesse o portal da Microsoft (\`https://aka.ms/myrecoverykey\`) com a conta corporativa do colaborador.
2. Como alternativa de suporte N2/N3, acesse o **Microsoft Entra Admin Center**:
   - Navegue até **Dispositivos > Todos os Dispositivos**.
   - Selecione o nome do computador -> **Chaves do BitLocker**.
   - Copie a chave de 48 dígitos correspondente ao ID de Recuperação exibido na tela do computador.

## 4. Análise de Minidump de BSOD
Caso os crashes continuem ocorrendo:
- Copie o arquivo mais recente de \`C:\\Windows\\Minidump\\*.dmp\`
- Utilize a ferramenta **WinDbg** ou **BlueScreenView** para identificar o módulo responsável pelo crash (Exemplo: \`nvlddmkm.sys\`, \`NETIO.SYS\`, \`rtwlanu.sys\`).`,
    procedure: `1. Executar dism /online /cleanup-image /restorehealth e sfc /scannow.
2. Localizar a chave do BitLocker no Entra Admin Center se houver bloqueio de BOOT.
3. Verificar a pasta C:\\Windows\\Minidump\\ para identificar o driver causador.
4. Atualizar o driver problemático via Gerenciador de Dispositivos ou utilitário do fabricante (Dell Command Update / Lenovo Vantage).
5. Executar teste de memória do Windows (mdsched.exe).`,
    checklist: [
      'Executar SFC e DISM para restaurar integridade do SO',
      'Confirmar que a chave do BitLocker foi anotada e sincronizada na nuvem',
      'Analisar arquivo de Dump do sistema',
      'Atualizar os drivers de chipset, rede e vídeo para as versões homologadas'
    ],
    officialLinks: [
      'https://learn.microsoft.com/pt-br/windows-hardware/drivers/debugger/bug-check-code-reference',
      'https://learn.microsoft.com/pt-br/entra/identity/devices/device-management-azure-portal#bitlocker-keys'
    ],
    relatedArticleIds: ['kb-ent-002', 'kb-ent-007']
  },
  {
    id: 'kb-ent-007',
    title: 'Microsoft Outlook & Teams — Resolução de Conexão, Perfil OST e Limpeza de Cache',
    category: 'Software',
    subcategory: 'Produtividade M365',
    tags: ['Outlook', 'Teams', 'Cache', 'OST', 'Exchange', 'M365', 'Performance'],
    keywords: ['outlook', 'teams', 'ost', 'cache', 'desconectado', 'nao sincroniza', 'reuniao', 'limpeza de cache', 'scanpst'],
    products: ['Microsoft Outlook 365', 'Microsoft Teams'],
    systems: ['Exchange Online', 'Teams Live Media Services'],
    author: 'collaboration.support@cbiops.com',
    status: 'published',
    version: '1.7.0',
    criticality: 'medium',
    difficulty: 'Fácil',
    content: `# Microsoft Outlook & Teams — Resolução de Conexão, Perfil OST e Limpeza de Cache

## 1. Visão Geral
Problemas de travamento, lentidão ou sincronização de e-mails no Outlook e ausência de status no Microsoft Teams costumam estar ligados a arquivos de cache local corrompidos.

## 2. Procedimento de Limpeza do Cache do Microsoft Teams (Novo Teams)

\`\`\`powershell
# Encerra todas as instâncias do Teams
Stop-Process -Name "ms-teams" -Force -ErrorAction SilentlyContinue

# Apagar cache do Novo Teams no Windows 11/10
Remove-Item -Path "$env:LOCALAPPDATA\\Packages\\MSTeams_8wekyb3d8bbwe\\LocalCache\\Microsoft\\MSTeams\\*" -Recurse -Force -ErrorAction SilentlyContinue

# Reabrir o Teams
Start-Process "ms-teams.exe"
\`\`\`

## 3. Reparo de Perfil e Arquivo de Dados do Outlook (.OST)

### 3.1 Recriação do Arquivo de Dados (.OST)
1. Feche o Microsoft Outlook.
2. Navegue até a pasta: \`%LOCALAPPDATA%\\Microsoft\\Outlook\`
3. Renomeie o arquivo com extensão \`.ost\` (Exemplo: \`usuario@empresa.com.br.ost.old\`).
4. Abra o Outlook novamente. O arquivo será recriado e sincronizado automaticamente a partir do Exchange Online.

### 3.2 Reparo do Perfil de Email via Painel de Controle
1. Pressione \`Win + R\`, digite \`control mail\` e pressione Enter.
2. Clique em **Mostrar Perfis (Show Profiles)**.
3. Adicione um novo perfil chamado **AcmeCorp-Default**.
4. Defina a nova conta de e-mail corporativo e marque a opção **"Sempre usar este perfil"**.`,
    procedure: `1. Encerrar processos do Outlook e Teams.
2. Executar script de limpeza do cache do Teams.
3. Renomear o arquivo .OST para forçar o re-download da caixa postal.
4. Recriar perfil no Mail (Control Panel) se o erro persistir.
5. Testar envio e recebimento de e-mails de teste.`,
    checklist: [
      'Limpar cache do Teams e verificar sincronização de status',
      'Garantir espaço em disco suficiente para o arquivo .OST',
      'Testar conectividade em https://outlook.office.com (OWA)',
      'Confirmar resolução no chamado'
    ],
    officialLinks: [
      'https://learn.microsoft.com/pt-br/microsoftteams/troubleshoot/teams-rooms-and-devices/clearing-cache'
    ],
    relatedArticleIds: ['kb-ent-001', 'kb-ent-006']
  }
];
