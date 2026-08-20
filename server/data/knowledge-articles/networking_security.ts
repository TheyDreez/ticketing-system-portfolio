export const networkingSecurityArticles = [
  {
    id: 'kb-ent-004',
    title: 'VPN Cisco AnyConnect — Troubleshooting de Falhas de Túnel, MTU e Autenticação MFA',
    category: 'Rede',
    subcategory: 'VPN / Acesso Remoto',
    tags: ['VPN', 'Cisco', 'AnyConnect', 'Rede', 'MFA', 'DNS', 'Túnel'],
    keywords: ['vpn', 'cisco', 'anyconnect', 'falha de tunel', 'desconecta', 'mtu', 'dns vpn', 'home office', 'ipsec', 'ssl vpn'],
    products: ['Cisco AnyConnect Secure Mobility Client', 'Cisco ASA / Firepower'],
    systems: ['Cisco ASA', 'RADIUS / NPS', 'Entra ID MFA'],
    author: 'infra.network@cbiops.com',
    status: 'published',
    version: '2.0.0',
    criticality: 'high',
    difficulty: 'Médio',
    content: `# VPN Cisco AnyConnect — Troubleshooting de Falhas de Túnel e Autenticação

## 1. Descrição do Problema
O acesso remoto corporativo via Cisco AnyConnect pode apresentar mensagens como *"Unable to establish VPN"*, *"Connection attempt failed due to network issues"* ou desconexões constantes a cada poucas minutos.

## 2. Causas Raiz Comuns
1. **Divergência de MTU (Maximum Transmission Unit)**: Fragmentação de pacotes em conexões de banda larga / Wi-Fi residenciais.
2. **Conflito de Perfil de DNS**: O adaptador virtual da VPN não assume os servidores DNS internos corporativos.
3. **Timeout de Notificação Push de MFA**: O usuário demora mais de 30 segundos para aprovar a notificação no celular.

## 3. Procedimento Técnico de Resolução

### 3.1 Ajuste de MTU no Adaptador Cisco AnyConnect (Windows)
\`\`\`cmd
:: Abrir prompt como Administrador e listar adaptadores de rede
netsh interface ipv4 show subinterfaces

:: Alterar o MTU da interface VPN (substituir "Cisco AnyConnect" pelo nome exato da interface)
netsh interface ipv4 set subinterface "Cisco AnyConnect Secure Mobility Client Virtual Miniport Adapter" mtu=1300 store=persistent
\`\`\`

### 3.2 Limpeza de Cache de Conexão e DNS
\`\`\`cmd
:: Flush no resolver DNS local
ipconfig /flushdns

:: Reiniciar o serviço de VPN local
net stop vpnagent
net start vpnagent
\`\`\`

### 3.3 Reativação do Perfil XML
Exclua a pasta temporária de preferências para recarregar o perfil corporativo atualizado:
- Pasta: \`C:\\ProgramData\\Cisco\\Cisco AnyConnect Secure Mobility Client\\Profile\\\`
- Remova arquivos \`.xml\` corrompidos e reabra o cliente AnyConnect.`,
    procedure: `1. Executar ipconfig /flushdns e reiniciar serviço vpnagent.
2. Verificar se o horário do computador está sincronizado via NTP.
3. Ajustar o MTU do adaptador para 1300 ou 1350 bytes.
4. Testar autenticação digitando o domínio vpn.AcmeCorp.com.br.
5. Se persistir, recriar o perfil XML na pasta ProgramData.`,
    checklist: [
      'Confirmar que a banda larga do usuário possui conectividade IPv4 ativa',
      'Validar se a notificação do Microsoft Authenticator está chegando no celular',
      'Reduzir o MTU da interface virtual VPN para evitar fragmentação',
      'Testar resolução de nomes de servidores internos (ping servidor.AcmeCorp.local)'
    ],
    officialLinks: [
      'https://www.cisco.com/c/en/us/support/docs/security/anyconnect-secure-mobility-client/215331-anyconnect-vpn-troubleshooting-guide.html'
    ],
    relatedArticleIds: ['kb-ent-001', 'kb-ent-005']
  },
  {
    id: 'kb-ent-005',
    title: 'Troubleshooting de Conectividade de Rede — DNS, DHCP, Proxy e Firewall Fortinet',
    category: 'Rede',
    subcategory: 'Infraestrutura',
    tags: ['Rede', 'DNS', 'DHCP', 'Proxy', 'Firewall', 'Fortinet', 'Ethernet', 'Wi-Fi'],
    keywords: ['dns', 'dhcp', 'proxy', 'firewall', 'fortinet', 'sem internet', 'ip invalido', 'gateway', 'pac', 'fortigate'],
    products: ['FortiGate Firewall', 'Windows Server DHCP/DNS'],
    systems: ['Core Network', 'Active Directory DNS'],
    author: 'infra.network@cbiops.com',
    status: 'published',
    version: '1.9.0',
    criticality: 'critical',
    difficulty: 'Médio',
    content: `# Troubleshooting de Conectividade de Rede — DNS, DHCP, Proxy e Firewall

## 1. Metodologia de Diagnóstico (Modelo OSI)
Quando um colaborador relata *"Sem acesso à internet"* ou *"Não carrega os sistemas da empresa"*, o diagnóstico deve seguir a camada OSI (Física -> Enlace -> Rede -> Aplicação).

## 2. Comandos de Diagnóstico Rápido

\`\`\`powershell
# 1. Verificar endereço IP atribuído pelo DHCP (procurar por IPs 169.254.x.x da APIPA)
Get-NetIPAddress -AddressFamily IPv4 | Select-Object InterfaceAlias, IPAddress, PrefixLength

# 2. Renovar concessão de DHCP
ipconfig /release
ipconfig /renew

# 3. Testar resolução de nomes DNS internos e externos
Resolve-DnsName -Name "intranet.AcmeCorp.local"
Resolve-DnsName -Name "google.com"

# 4. Verificar se o Proxy corporativo está configurado no Registry
Get-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' | Select-Object ProxyEnable, ProxyServer, AutoConfigURL
\`\`\`

## 3. Resolução por Cenário

- **Cenário 1: IP no intervalo APIPA (169.254.X.X)**
  - Causa: Falha de comunicação com o servidor DHCP ou esgotamento do escopo de IPs na VLAN.
  - Solução: Reiniciar o adaptador de rede ou alterar a porta no switch de rede local.

- **Cenário 2: Erro "ERR_PROXY_CONNECTION_FAILED"**
  - Causa: Script PAC de proxy fora do ar ou configuração manual incorreta.
  - Solução: Desmarcar "Usar um servidor proxy" nas Configurações de Internet do Windows e utilizar a opção "Detectar automaticamente as configurações".`,
    procedure: `1. Verificar o status dos cabos ou conexão Wi-Fi.
2. Executar ipconfig /release e ipconfig /renew no PowerShell.
3. Testar a resolução DNS corporativa com nslookup.
4. Desativar o proxy temporariamente se for acesso direto à internet.
5. Limpar a tabela de rotas locais com route -f se necessário.`,
    checklist: [
      'Verificar se o IP obtido é válido na sub-rede corporativa',
      'Testar conectividade com o Gateway Padrão via ICMP ping',
      'Validar porta 443 liberada no Firewall FortiGate para o destino',
      'Documentar os testes no chamado'
    ],
    officialLinks: [
      'https://docs.fortinet.com/document/fortigate/7.4.0/administration-guide/troubleshooting-network-issues'
    ],
    relatedArticleIds: ['kb-ent-004', 'kb-ent-006']
  }
];
