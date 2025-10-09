const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Import path fixes needed
const fixes = [
  // Security and guards paths
  {
    find: "../../security/guards/jwt-auth.guard",
    replace: "../../../auth/guards/jwt-auth.guard"
  },
  {
    find: "../../lib/guards/tenant.guard", 
    replace: "../../../common/guards/tenant.guard"
  },
  {
    find: "../../lib/decorators/tenant.decorator",
    replace: "../../../common/decorators/tenant.decorator"
  },
  {
    find: "../../lib/decorators/user.decorator",
    replace: "../../../common/decorators/user.decorator"
  },
  
  // Common DTOs and services
  {
    find: "../../lib/dto/pagination.dto",
    replace: "../../../common/dto/pagination.dto"
  },
  {
    find: "../../core/cache.service",
    replace: "../../../cache/cache.service"
  },
  {
    find: "../../db/prisma.service",
    replace: "../../../prisma/prisma.service"
  },
  
  // Inventory module fixes
  {
    find: "../../lib/dto/pagination.dto",
    replace: "../../common/dto/pagination.dto"
  }
];

function fixImportsInFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  fixes.forEach(fix => {
    if (content.includes(fix.find)) {
      content = content.replace(new RegExp(fix.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.replace);
      changed = true;
      console.log(`   ✅ Fixed: ${fix.find} -> ${fix.replace}`);
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`📝 Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

console.log('🔧 Starting comprehensive import fixes...\n');

// Files that need fixing based on compilation errors
const filesToFix = [
  'src/modules/customers/dto/customer.dto.ts',
  'src/modules/integrations/controllers/google-drive.controller.ts', 
  'src/modules/inventory/dto/product.dto.ts',
  'src/modules/notifications/controllers/sms.controller.ts',
  'src/security/auth.controller.ts',
  'src/security/auth.service.ts'
];

let totalFixed = 0;

filesToFix.forEach(file => {
  const fullPath = path.join(__dirname, file);
  console.log(`\n🔍 Processing: ${file}`);
  
  if (fixImportsInFile(fullPath)) {
    totalFixed++;
  } else {
    console.log(`   ⚪ No changes needed`);
  }
});

console.log(`\n✅ Import fixing completed! Fixed ${totalFixed} files.\n`);

// Test compilation
console.log('🧪 Testing compilation...');
exec('npm run build', (error, stdout, stderr) => {
  if (error) {
    console.log('\n❌ Still have compilation errors:');
    console.log(stderr);
  } else {
    console.log('\n✅ Compilation successful!');
  }
});