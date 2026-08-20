// AVISO: Script manual de utilidade/debug. Não deve ser importado ou executado pelo servidor em produção.


import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function run() {
  await supabase.from('audit_events').delete().neq('id', 'null');
  await supabase.from('attachments').delete().neq('id', 'null');
  await supabase.from('ticket_comments').delete().neq('id', 'null');
  await supabase.from('tickets').delete().neq('id', 'null');
  // keep users? or delete specific users?
  await supabase.from('users').delete().in('email', ['joao.silva@cbiops.com', 'ana.clara@cbiops.com']);
}
run();

