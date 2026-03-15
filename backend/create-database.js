/**
 * Create Database on VPS
 * This script connects to PostgreSQL and creates the database
 */

const { Client } = require('pg');

// VPS Database Configuration
const DB_CONFIG = {
  user: 'MPSDB',
  password: '#mpsdb#2026',
  host: '31.97.116.89',
  port: 5533,
  // Connect to default 'postgres' database first to create our database
  database: 'postgres',
};

const TARGET_DATABASE = 'mps_jewelry_pos';

async function createDatabase() {
  console.log('🔧 Creating Database on VPS');
  console.log('============================\n');
  
  console.log('📋 Configuration:');
  console.log(`   Host: ${DB_CONFIG.host}`);
  console.log(`   Port: ${DB_CONFIG.port}`);
  console.log(`   Target Database: ${TARGET_DATABASE}`);
  console.log(`   Username: ${DB_CONFIG.user}\n`);

  const client = new Client(DB_CONFIG);

  try {
    console.log('🔌 Connecting to PostgreSQL server...');
    await client.connect();
    console.log('   ✓ Connected successfully!\n');

    // Check if database already exists
    console.log('🔍 Checking if database exists...');
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TARGET_DATABASE]
    );

    if (checkResult.rows.length > 0) {
      console.log(`   ℹ Database '${TARGET_DATABASE}' already exists!\n`);
    } else {
      console.log(`   ℹ Database '${TARGET_DATABASE}' does not exist\n`);
      
      console.log('🚀 Creating database...');
      await client.query(`CREATE DATABASE ${TARGET_DATABASE}`);
      console.log(`   ✓ Database '${TARGET_DATABASE}' created successfully!\n`);
    }

    // Verify the database was created
    console.log('✅ Verifying database...');
    const verifyResult = await client.query(
      `SELECT datname FROM pg_database WHERE datname = $1`,
      [TARGET_DATABASE]
    );

    if (verifyResult.rows.length > 0) {
      console.log(`   ✓ Database '${TARGET_DATABASE}' is ready!\n`);
      
      console.log('📌 Next steps:');
      console.log('   Run: node setup-vps-database.js');
      console.log('   This will create all tables and run migrations.\n');
      
      return true;
    } else {
      console.error('   ✗ Database verification failed\n');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. Please check:');
      console.error('   - PostgreSQL is running on the VPS');
      console.error('   - Port 5533 is open in the firewall');
      console.error('   - The VPS IP address is correct');
    } else if (error.code === 'ENOTFOUND') {
      console.error('\n💡 Host not found. Please check:');
      console.error('   - The VPS IP address is correct');
      console.error('   - You have internet connectivity');
    } else if (error.message.includes('password authentication failed')) {
      console.error('\n💡 Authentication failed. Please check:');
      console.error('   - Username is correct: MPSDB');
      console.error('   - Password is correct');
      console.error('   - User has permission to create databases');
    } else if (error.message.includes('permission denied')) {
      console.error('\n💡 Permission denied. The user needs CREATE DATABASE privilege.');
      console.error('   Connect to PostgreSQL as superuser and run:');
      console.error(`   ALTER USER MPSDB CREATEDB;`);
    }
    
    console.error('');
    return false;
  } finally {
    await client.end();
  }
}

// Run the script
createDatabase()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
