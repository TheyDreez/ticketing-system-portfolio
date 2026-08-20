// AVISO: Script manual de utilidade/debug. Não deve ser importado ou executado pelo servidor em produção.

import { logger } from '../server/lib/logger';
import { db } from '../server/lib/db';

async function check() {
  const devices = await db.getDevices();
  logger.info("Devices list from Supabase:");
  logger.info(JSON.stringify(devices, null, 2));
}

check().then(() => logger.info("Done")).catch(console.error);
