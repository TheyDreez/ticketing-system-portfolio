// AVISO: Script manual de utilidade/debug. Não deve ser importado ou executado pelo servidor em produção.

import { logger } from '../server/lib/logger';
import { syncIntuneDevices } from '../server/lib/intuneSync';

// Swap them
if (!process.env.AZURE_TENANT_ID_TEST || !process.env.AZURE_CLIENT_SECRET_TEST) {
  throw new Error("AZURE_TENANT_ID_TEST and AZURE_CLIENT_SECRET_TEST environment variables must be set");
}
process.env.AZURE_TENANT_ID = process.env.AZURE_TENANT_ID_TEST;
process.env.AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET_TEST;

syncIntuneDevices().then(res => logger.info({ result: res }, "Result:")).catch(err => logger.error({ err: err.message }, "Error running test:"));
