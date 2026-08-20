import { syncIntuneDevices } from '../../server/lib/intuneSync';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const res = await syncIntuneDevices();
    console.log("INTUNE SUCCESS:", res);
  } catch(e) {
    console.error("INTUNE ERROR:", e);
  }
}
run();
