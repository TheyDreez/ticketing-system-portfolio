import { initializeDatabaseSchema, testDbConnection } from '../lib/db';
import { seedDevicesIfEmpty } from '../lib/deviceSeed';

/**
 * Initializes and seeds the database connections and schemas.
 *
 * Architecture Decision: Isolating database startup logic keeps server.ts clean and
 * allows us to easily sequence migrations, seeders, or additional DB connections (e.g. Redis)
 * in a single, dedicated location without cluttering the HTTP server boot process.
 */
export async function setupDatabase() {
  // Initialize DB tables if needed
  await initializeDatabaseSchema();
  
  // Verify connectivity before fully accepting traffic
  await testDbConnection();
  
  // Seed required initial data
  await seedDevicesIfEmpty();
}
