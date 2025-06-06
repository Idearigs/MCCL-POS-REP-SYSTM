import pool from '../utils/db';
import { dbMigration } from '../utils/dbMigration';
import { RowDataPacket } from 'mysql2';

/**
 * Database reset script
 * Run with: ts-node src/scripts/reset-db.ts
 * 
 * This script will drop all tables in the database and then run migrations
 */
async function resetDatabase() {
  try {
    console.log('Starting database reset...');
    
    // Get connection
    const connection = await pool.getConnection();
    
    try {
      // Get all table names
      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = ?',
        [process.env.DB_DATABASE || 'pos_mccl_db']
      );
      
      // Disable foreign key checks to allow dropping tables with dependencies
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      
      // Drop each table
      for (const row of rows) {
        console.log(`Dropping table: ${row.table_name}`);
        await connection.query(`DROP TABLE IF EXISTS \`${row.table_name}\``); 
      }
      
      // Re-enable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
      
      console.log('All tables dropped successfully!');
    } finally {
      // Release connection
      connection.release();
    }
    
    // Run migrations
    console.log('Starting fresh migrations...');
    await dbMigration.runMigrations();
    
    console.log('Database reset and migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();

