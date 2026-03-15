const fs = require('fs');
const path = require('path');

// Files to fix
const filesToFix = [
  'src/features/repairs/repairs.service.ts',
  'src/features/sales/sales.service.ts',
];

for (const file of filesToFix) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace all instances of createdByUser with users
  // But be careful about property access vs include

  // 1. In include statements
  content = content.replace(/createdByUser:\s*true/g, 'users: true');

  // 2. In property access for the createdBy user (repair.createdByUser should be repair.users)
  // But need to be careful as .users. might conflict with users table reference
  // Let's use a more specific pattern that looks for the full expression
  content = content.replace(/([a-z]+)\.createdByUser/g, '$1.users');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✅ Fixed: ${filePath}`);
}

console.log('\n🎉 All createdByUser references fixed!');
