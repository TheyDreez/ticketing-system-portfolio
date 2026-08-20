// AVISO: Script manual de utilidade/debug. Não deve ser importado ou executado pelo servidor em produção.

import { logger } from '../server/lib/logger';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearMockDevices() {
  logger.info("Clearing devices and device_insights...");
  
  const { error: insightsError } = await supabase
    .from('device_insights')
    .delete()
    .neq('id', 'dummy_id_never_matches'); // Delete all rows
    
  if (insightsError) {
    logger.error({ err: insightsError.message }, "Error clearing device_insights:");
  } else {
    logger.info("Cleared device_insights.");
  }
  
  const { error: devicesError } = await supabase
    .from('devices')
    .delete()
    .neq('id', 'dummy_id_never_matches'); // Delete all rows
    
  if (devicesError) {
    logger.error({ err: devicesError.message }, "Error clearing devices:");
  } else {
    logger.info("Cleared devices.");
  }
}

clearMockDevices().then(() => logger.info("Done")).catch(console.error);
