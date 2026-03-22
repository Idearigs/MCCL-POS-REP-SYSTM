const fs = require('fs');
const path = require('path');

// Map of all fixes needed
const replacements = [
  // User model (singular to plural)
  [/\.user\./g, '.users.'],

  // Relation names in include statements (these need to match schema relation names)
  [/tenant:\s*true/g, 'tenants: true'],
  [/tenant:\s*\{/g, 'tenants: {'],
  [/customer:\s*true/g, 'customers: true'],
  [/customer:\s*\{/g, 'customers: {'],
  [/category:\s*\{/g, 'categories: {'],
  [/supplier:\s*\{/g, 'suppliers: {'],
  [/items:\s*\{/g, 'sale_items: {'],
  [/product:\s*true/g, 'products: true'],
  [/product:\s*\{/g, 'products: {'],

  // Property access for relations - be careful with order to avoid double replacements
  [/\.tenant(?!s)/g, '.tenants'],  // tenant but not already tenants
  [/\.customer(?!s)/g, '.customers'],  // customer but not already customers
  [/\.category(?!s)/g, '.categories'],  // category but not already categories
  [/\.supplier(?!s)/g, '.suppliers'],  // supplier but not already suppliers
  [/sale\.items/g, 'sale.sale_items'],
  [/product\.category/g, 'product.categories'],

  // TypeScript type names
  [/Prisma\.CustomerWhereInput/g, 'Prisma.customersWhereInput'],
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

console.log('🔧 Fixing all Prisma relation and model issues...\n');

const srcDir = path.join(__dirname, 'src');
const modifiedCount = walkDirectory(srcDir);

console.log(`\n✅ Modified ${modifiedCount} file(s)`);
console.log('🎉 All issues should be fixed!');
