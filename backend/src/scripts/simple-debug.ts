/**
 * Simple debug script to verify environment
 */

import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('Simple debug script started');
console.log('Current time:', new Date().toISOString());
console.log('Node version:', process.version);
console.log('Current directory:', process.cwd());
console.log('Environment variables loaded:', Object.keys(process.env).length);

// Exit after 1 second to ensure all console logs are flushed
setTimeout(() => {
  console.log('Debug script completed');
  process.exit(0);
}, 1000);
