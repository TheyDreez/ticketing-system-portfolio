import { logger } from '../lib/logger';
import { initKnowledgeBase } from '../lib/knowledgeService';
import { startSlaJob } from '../lib/slaEngine';
import { syncIntuneDevices } from '../lib/intuneSync';
import { syncLicenses } from '../lib/licenseSync';

/**
 * Initializes all background jobs, scheduled tasks, and periodic synchronizations.
 *
 * Architecture Decision: Grouping background task initialization isolates business-logic side-effects
 * from the HTTP server lifecycle. This makes it easier to disable jobs during unit testing or 
 * to eventually extract them into a separate worker process if the app scales.
 */
export async function setupJobs() {
  // Intune Sync Background Job
  import('../lib/jobLock').then(({ runWithLock }) => {
    runWithLock('syncIntuneDevices', 890, async () => {
      syncIntuneDevices().catch((err: Error) => logger.error({ err }, 'Failed initial Intune sync:'));
    });
    
    setInterval(() => {
      runWithLock('syncIntuneDevices', 890, async () => {
        syncIntuneDevices().catch((err: Error) => logger.error({ err }, 'Failed periodic Intune sync:'));
      });
    }, 15 * 60 * 1000);
  });

  // Initialize and Seed Enterprise Knowledge Base
  await initKnowledgeBase();

  // Start background SLA monitor
  startSlaJob();

  // Initial License Sync
  syncLicenses().catch(err => logger.error({ err }, 'Failed initial license sync:'));
}
