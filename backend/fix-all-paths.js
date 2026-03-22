const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Comprehensive path fixes for the new organized structure
const pathFixes = [
  // Core infrastructure paths
  { from: '../prisma/prisma.service', to: '../../../core/prisma/prisma.service' },
  { from: '../cache/cache.service', to: '../../../core/cache/cache.service' },
  { from: '../cache/cache.module', to: '../../../core/cache/cache.module' },
  { from: '../../db/prisma.service', to: '../../../core/prisma/prisma.service' },
  
  // Shared components paths
  { from: '../common/guards/tenant.guard', to: '../../../shared/guards/tenant.guard' },
  { from: '../common/decorators/user.decorator', to: '../../../shared/decorators/user.decorator' },
  { from: '../common/decorators/tenant.decorator', to: '../../../shared/decorators/tenant.decorator' },
  { from: '../common/dto/pagination.dto', to: '../../../shared/dto/pagination.dto' },
  { from: '../auth/guards/jwt-auth.guard', to: '../../../shared/guards/jwt-auth.guard' },
];

function fixImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  pathFixes.forEach(fix => {
    const regex = new RegExp(fix.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    if (content.includes(fix.from)) {
      content = content.replace(regex, fix.to);
      changed = true;
      console.log(`   ✅ Fixed: ${fix.from} -> ${fix.to}`);
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`📝 Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

function fixAllFiles() {
  console.log('🔧 Starting comprehensive import path fixes...\n');
  
  // Find all TypeScript files in old directories that need fixing
  const patterns = [
    'src/auth/**/*.ts',
    'src/customers/**/*.ts', 
    'src/products/**/*.ts',
    'src/sales/**/*.ts',
    'src/repairs/**/*.ts',
    'src/sms/**/*.ts',
    'src/file-storage/**/*.ts',
    'src/google-drive/**/*.ts'
  ];
  
  let totalFixed = 0;
  
  patterns.forEach(pattern => {
    const files = glob.sync(pattern);
    console.log(`\n🔍 Processing pattern: ${pattern} (${files.length} files)`);
    
    files.forEach(file => {
      console.log(`\n   Processing: ${file}`);
      if (fixImportsInFile(file)) {
        totalFixed++;
      } else {
        console.log(`     ⚪ No changes needed`);
      }
    });
  });
  
  console.log(`\n✅ Import fixing completed! Fixed ${totalFixed} files.\n`);
}

fixAllFiles();