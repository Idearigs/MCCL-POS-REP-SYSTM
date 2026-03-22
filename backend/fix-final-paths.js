const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Final path fixes for the organized structure
const finalFixes = [
  // From organized features to shared/core
  { from: '../common/guards/tenant.guard', to: '../../shared/guards/tenant.guard' },
  { from: '../common/decorators/user.decorator', to: '../../shared/decorators/user.decorator' },
  { from: '../common/decorators/tenant.decorator', to: '../../shared/decorators/tenant.decorator' },
  { from: '../common/dto/pagination.dto', to: '../../shared/dto/pagination.dto' },
  { from: '../cache/cache.module', to: '../../core/cache/cache.module' },
  { from: '../cache/cache.service', to: '../../core/cache/cache.service' },
  { from: '../prisma/prisma.service', to: '../../core/prisma/prisma.service' },
  { from: '../auth/guards/jwt-auth.guard', to: '../../shared/guards/jwt-auth.guard' },
  
  // From integrations to shared
  { from: '../auth/guards/jwt-auth.guard', to: '../../shared/guards/jwt-auth.guard' },
  { from: '../common/guards/tenant.guard', to: '../../shared/guards/tenant.guard' },
  { from: '../common/decorators/tenant.decorator', to: '../../shared/decorators/tenant.decorator' },
  
  // From features strategies to core (deeper nesting)
  { from: '../../db/prisma.service', to: '../../../core/prisma/prisma.service' },
];

function fixImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  finalFixes.forEach(fix => {
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
  console.log('🔧 Starting final import path fixes...\n');
  
  // Find all TypeScript files in new organized directories
  const patterns = [
    'src/features/**/*.ts',
    'src/integrations/**/*.ts'
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
  
  console.log(`\n✅ Final import fixing completed! Fixed ${totalFixed} files.\n`);
}

fixAllFiles();