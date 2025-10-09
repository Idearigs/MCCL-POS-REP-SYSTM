// Minimal test to check if the server starts without memory issues
console.log('Testing minimal NestJS startup...');

const { spawn } = require('child_process');

// Start with limited memory
const child = spawn('node', [
  '--max-old-space-size=1024',  // Limit to 1GB
  'dist/main.js'
], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('error', (error) => {
  console.error('Failed to start:', error);
});

// Kill after 10 seconds if still running
setTimeout(() => {
  console.log('Killing process after 10 seconds...');
  child.kill();
}, 10000);