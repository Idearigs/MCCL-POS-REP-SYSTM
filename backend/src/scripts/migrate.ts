import { dbMigration } from '../utils/dbMigration';

/**
 * Database migration script
 * Run with: npm run migrate
 */
async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    await dbMigration.runMigrations();
    console.log('Database migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }
}

runMigrations();
