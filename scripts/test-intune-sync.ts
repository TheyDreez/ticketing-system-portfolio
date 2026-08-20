// AVISO: Script manual de utilidade/debug. Não deve ser importado ou executado pelo servidor em produção.

import { logger } from '../server/lib/logger';
import { syncIntuneDevices } from '../server/lib/intuneSync';

syncIntuneDevices().then(res => logger.info({ result: res }, "Result:")).catch(err => logger.error({ err: err.message }, "Error running test:"));
