import * as fs from 'fs';
import * as path from 'path';
import pool from './db';
import { RowDataPacket } from 'mysql2';

/**
 * Database migration utility to run SQL migration files
 */
export class DbMigration {
  private migrationsDir: string;

  constructor() {
    this.migrationsDir = path.join(__dirname, '../../database/migrations');
  }

  /**
   * Run all migrations that haven't been applied yet
   */
  async runMigrations(): Promise<void> {
    // Create migrations table if it doesn't exist
    await this.createMigrationsTable();

    // Get list of applied migrations
    const appliedMigrations = await this.getAppliedMigrations();

    // Get all migration files
    const migrationFiles = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql') && !file.startsWith('_')) // Skip files starting with underscore like master migration
      .sort(); // Sort to ensure migrations run in order

    // Run migrations that haven't been applied
    for (const file of migrationFiles) {
      if (!appliedMigrations.includes(file)) {
        console.log(`Running migration: ${file}`);
        await this.runMigration(file);
        await this.markMigrationAsApplied(file);
        console.log(`Migration applied: ${file}`);
      } else {
        console.log(`Migration already applied: ${file}`);
      }
    }

    console.log('All migrations applied successfully!');
  }

  /**
   * Create migrations table if it doesn't exist
   */
  private async createMigrationsTable(): Promise<void> {
    // First, drop the table if it exists to ensure a clean slate
    await pool.query('DROP TABLE IF EXISTS migrations');
    
    // Then create the table with the correct schema
    const query = `
      CREATE TABLE migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_migration (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.query(query);
    console.log('Created migrations table with schema:', query);
  }

  /**
   * Get list of migrations that have already been applied
   */
  private async getAppliedMigrations(): Promise<string[]> {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT name FROM migrations');
    return rows.map(row => row.name);
  }

  /**
   * Run a specific migration file
   */
  private async runMigration(filename: string): Promise<void> {
    const filePath = path.join(this.migrationsDir, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Split SQL by semicolons to handle multiple statements
    const statements = sql
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement !== '');

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      for (const statement of statements) {
        try {
          // Skip CREATE INDEX statements if they already exist
          if (statement.toUpperCase().includes('CREATE INDEX')) {
            const indexNameMatch = statement.match(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([^`\s]+)`?/i);
            if (indexNameMatch && indexNameMatch[1]) {
              const indexName = indexNameMatch[1];
              const [existingIndexes] = await connection.query<RowDataPacket[]>(
                `SHOW INDEX FROM ${statement.match(/ON\s+`?([^`\s;]+)/i)?.[1] || ''} WHERE Key_name = ?`,
                [indexName]
              );
              if (existingIndexes && existingIndexes.length > 0) {
                console.log(`Index ${indexName} already exists, skipping...`);
                continue;
              }
            }
          }
          
          await connection.query(statement);
        } catch (error) {
          // Ignore duplicate key/index errors
          if (error.code === 'ER_DUP_KEYNAME' || 
              error.code === 'ER_DUP_ENTRY' || 
              error.message.includes('Duplicate key name') ||
              error.message.includes('Duplicate entry')) {
            console.log(`Skipping duplicate key in migration ${filename}:`, error.message.split('\n')[0]);
            continue;
          }
          throw error;
        }
      }

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      console.error(`Error running migration ${filename}:`, error.message);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Mark a migration as applied in the migrations table
   */
  private async markMigrationAsApplied(filename: string): Promise<void> {
    await pool.query('INSERT INTO migrations (name) VALUES (?)', [filename]);
  }
}

// Export a singleton instance
export const dbMigration = new DbMigration();
