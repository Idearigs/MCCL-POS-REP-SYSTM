const fs = require('fs');
const path = require('path');

// Map of all fixes needed
const replacements = [
  // Fix typos (double ss)
  [/\.customerss/g, '.customers'],
  [/\.customersName/g, '.customerName'],
  [/\.customersPhone/g, '.customerPhone'],
  [/\.customersDocuments/g, '.customerDocuments'],

  // Fix prisma.sale -> prisma.sales
  [/prisma\.sale(?!s|_)/g, 'prisma.sales'],
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

console.log('🔧 Fixing typos and naming issues...\n');

const srcDir = path.join(__dirname, 'src');
const modifiedCount = walkDirectory(srcDir);

console.log(`\n✅ Modified ${modifiedCount} file(s)`);
console.log('🎉 All typos fixed!');
