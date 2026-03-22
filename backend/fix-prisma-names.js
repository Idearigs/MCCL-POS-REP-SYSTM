const fs = require('fs');
const path = require('path');

// Map of old names to new names (PascalCase to lowercase)
const replacements = {
  '.product.': '.products.',
  '.customer.': '.customers.',
  '.sale.': '.sales.',
  '.category.': '.categories.',
  '.supplier.': '.suppliers.',
  '.tenant.': '.tenants.',
  '.repair.': '.repairs.',
  '.document.': '.documents.',
  '.productImage.': '.product_images.',
  '.inventoryLog.': '.inventory_logs.',
  '.saleItem.': '.sale_items.',
  '.payment.': '.payments.',
  '.repairStatusHistory.': '.repair_status_history.',
  'Prisma.ProductWhereInput': 'Prisma.productsWhereInput',
};

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  for (const [oldName, newName] of Object.entries(replacements)) {
    if (content.includes(oldName)) {
      const regex = new RegExp(oldName.replace(/\./g, '\\.'), 'g');
      content = content.replace(regex, newName);
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

console.log('🔧 Fixing Prisma model names in TypeScript files...\n');

const srcDir = path.join(__dirname, 'src');
const modifiedCount = walkDirectory(srcDir);

console.log(`\n✅ Modified ${modifiedCount} file(s)`);
console.log('🎉 All Prisma model names have been updated!');
