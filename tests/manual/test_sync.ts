import { syncLicenses } from '../../server/lib/licenseSync';
import { logger } from '../../server/lib/logger';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  try {
    const res = await syncLicenses();
    console.log("SUCCESS:", res);
  } catch(e) {
    console.error("ERROR:", e);
  }
}
run();
