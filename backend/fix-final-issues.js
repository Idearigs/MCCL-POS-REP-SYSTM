const fs = require('fs');
const path = require('path');

// Map of all fixes needed
const replacements = [
  // Fix user.tenantsId -> user.tenantId (accessing foreign key field)
  [/user\.tenantsId/g, 'user.tenantId'],
  [/\.tenantsId/g, '.tenantId'],

  // Fix DTO property names to match database (singular in DTOs, plural in database)
  // These are used in createDto.customersId patterns
  [/\.customersId/g, '.customerId'],
  [/\.categoriesId/g, '.categoryId'],
  [/\.suppliersId/g, '.supplierId'],

  // Fix sales relation name - sale_sale_items should be sale_items
  [/sale_sale_items/g, 'sale_items'],

  // Fix request.tenants to request.tenant in tenant guard
  [/request\.tenants\s*=/g, 'request.tenant ='],
];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  return false;
}

function walkDirectory(dir, filePattern = /\.ts$/) {
  const files = fs.readdirSync(dir);
  let modifiedCount = 0;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      modifiedCount += walkDirectory(filePath, filePattern);
    } else if (filePattern.test(file)) {
      if (replaceInFile(filePath)) {
        console.log(`✅ Fixed: ${filePath}`);
        modifiedCount++;
      }
    }
  }

  return modifiedCount;
}

console.log('🔧 Fixing final Prisma issues...\n');

const srcDir = path.join(__dirname, 'src');
const modifiedCount = walkDirectory(srcDir);

console.log(`\n✅ Modified ${modifiedCount} file(s)`);
console.log('🎉 All issues should be fixed!');
