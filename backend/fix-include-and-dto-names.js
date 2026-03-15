const fs = require('fs');
const path = require('path');

// Map of all fixes needed
const replacements = [
  // Fix include relation names based on schema
  [/include:\s*\{\s*images:/g, 'include: {\n      product_images:'],
  [/include:\s*\{\s*createdByUser:/g, 'include: {\n      users:'],

  // Fix DTO property names
  [/customersInstructions/g, 'customerInstructions'],
  [/customersNotes/g, 'customerNotes'],

  // Fix response DTO property (from schema analysis - product.images doesn't exist, should be product_images)
  [/category:\s*product\.categories/g, 'category: product.categories'],
  [/images:\s*product\.images/g, 'images: product.product_images'],
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

function walkDirectory(dir, filePattern = /\.(ts|js)$/) {
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

console.log('🔧 Fixing include relations and DTO property names...\n');

const srcDir = path.join(__dirname, 'src');
const modifiedCount = walkDirectory(srcDir);

console.log(`\n✅ Modified ${modifiedCount} file(s)`);
console.log('🎉 All issues should be fixed!');
