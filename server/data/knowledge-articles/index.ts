import { m365AzureArticles } from './microsoft365_azure';
import { networkingSecurityArticles } from './networking_security';
import { windowsHardwareArticles } from './windows_hardware';

export const seedArticles = [
  ...m365AzureArticles,
  ...networkingSecurityArticles,
  ...windowsHardwareArticles
];

export const knowledgeArticles = seedArticles;
