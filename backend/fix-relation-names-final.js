const fs = require('fs');
const path = require('path');

// Map of all fixes needed
const replacements = [
  // Fix include relation names to match schema exactly
  [/,\s*images:\s*true/g, ',\n        product_images: true'],
  [/include:\s*\{\s*images:\s*true/g, 'include: {\n      product_images: true'],

  [/,\s*statusHistory:\s*true/g, ',\n        repair_status_history: true'],
  [/include:\s*\{\s*statusHistory:\s*true/g, 'include: {\n      repair_status_history: true'],

  [/,\s*photos:\s*true/g, ',\n        repair_photos: true'],
  [/include:\s*\{\s*photos:\s*true/g, 'include: {\n      repair_photos: true'],

  // Fix property access in code
  [/repair\.statusHistory/g, 'repair.repair_status_history'],
  [/repair\.photos/g, 'repair.repair_photos'],
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

console.log('🔧 Fixing all relation names to match schema...\n');

const srcDir = path.join(__dirname, 'src');
const modifiedCount = walkDirectory(srcDir);

console.log(`\n✅ Modified ${modifiedCount} file(s)`);
console.log('🎉 All relation names fixed!');
