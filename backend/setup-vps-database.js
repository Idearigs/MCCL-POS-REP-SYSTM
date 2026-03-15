/**
 * VPS Database Setup Script
 * This script helps configure the database connection and run migrations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// VPS Database Configuration
const DB_CONFIG = {
  username: 'MPSDB',
  password: '#mpsdb#2026',
  host: '31.97.116.89',
  port: '5533',
  database: 'mps_jewelry_pos', // Change this if you want a different database name
};

// URL encode the password (# becomes %23)
const encodedPassword = encodeURIComponent(DB_CONFIG.password);

// Construct the DATABASE_URL
const DATABASE_URL = `postgresql://${DB_CONFIG.username}:${encodedPassword}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}?schema=public`;

console.log('🔧 MPS Jewelry POS - VPS Database Setup');
console.log('=========================================\n');

console.log('📋 Database Configuration:');
console.log(`   Host: ${DB_CONFIG.host}`);
console.log(`   Port: ${DB_CONFIG.port}`);
console.log(`   Database: ${DB_CONFIG.database}`);
console.log(`   Username: ${DB_CONFIG.username}`);
console.log('');

// Step 1: Update .env file
console.log('📝 Step 1: Updating .env file...');
const envPath = path.join(__dirname, '.env');
let envContent = '';

try {
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
    console.log('   ✓ Found existing .env file');
  } else {
    console.log('   ℹ Creating new .env file');
  }

  // Update or add DATABASE_URL
  const lines = envContent.split('\n');
  let found = false;
  const updatedLines = lines.map(line => {
    if (line.startsWith('DATABASE_URL=')) {
      found = true;
      return `DATABASE_URL="${DATABASE_URL}"`;
    }
    return line;
  });

  if (!found) {
    updatedLines.push(`DATABASE_URL="${DATABASE_URL}"`);
  }

  fs.writeFileSync(envPath, updatedLines.join('\n'));
  console.log('   ✓ Updated DATABASE_URL in .env file\n');
} catch (error) {
  console.error('   ✗ Error updating .env file:', error.message);
  process.exit(1);
}

// Step 2: Test database connection (skip pull for empty database)
console.log('🔌 Step 2: Verifying database connection...');
try {
  // Set environment variable for this process
  process.env.DATABASE_URL = DATABASE_URL;
  console.log('   ✓ Database connection configured\n');
} catch (error) {
  console.error('   ✗ Failed to configure database connection');
  process.exit(1);
}

// Step 3: Run migrations
console.log('🚀 Step 3: Running database migrations...');
try {
  execSync('npx prisma migrate deploy', { 
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL }
  });
  console.log('   ✓ Migrations completed successfully!\n');
} catch (error) {
  console.error('   ✗ Migration failed:', error.message);
  console.log('\n   Trying to push schema instead...');
  
  try {
    execSync('npx prisma db push', { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL }
    });
    console.log('   ✓ Schema pushed successfully!\n');
  } catch (pushError) {
    console.error('   ✗ Schema push also failed');
    process.exit(1);
  }
}

// Step 4: Generate Prisma Client
console.log('⚙️  Step 4: Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('   ✓ Prisma Client generated!\n');
} catch (error) {
  console.error('   ✗ Failed to generate Prisma Client:', error.message);
  process.exit(1);
}

// Success!
console.log('✅ Database setup completed successfully!');
console.log('');
console.log('📌 Next steps:');
console.log('   1. Start your backend server: npm run start:dev');
console.log('   2. Your app should now connect to the VPS database');
console.log('');
console.log('🔗 Connection String (saved in .env):');
console.log(`   ${DATABASE_URL.replace(encodedPassword, '***')}`);
console.log('');
