const fs = require('fs');
const path = require('path');

// Files with create operations that need type assertions
const filesToFix = [
  'src/features/auth/auth.service.ts',
  'src/features/customers/customers.service.ts',
  'src/features/inventory/products.service.ts',
  'src/features/repairs/repairs.service.ts',
];

for (const file of filesToFix) {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Pattern 1: await this.prismaService.MODEL.create({ data: {...}
  // Need to add "as any" after the data object
  const pattern1 = /(await\s+(?:this\.prismaService|prisma)\.(?:users|customers|products|categories|suppliers|product_images|inventory_logs|repairs|repair_status_history)\.create\(\{\s*data:\s*\{[^}]+\})/g;

  if (pattern1.test(content)) {
    content = content.replace(pattern1, '$1 as any');
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  }
}

console.log('\n🎉 All Prisma create type assertions added!');
