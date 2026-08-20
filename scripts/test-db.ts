// AVISO: Script manual de utilidade/debug. Não deve ser importado ou executado pelo servidor em produção.

import { db } from '../server/lib/db';

async function run() {
  try {
    const users = await db.getUsers();
    console.log('Users:', users.length);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
