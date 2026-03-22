const fs = require('fs');
const path = require('path');

// Define import mappings for the reorganized structure
const importMappings = {
  // Old -> New path mappings
  '../auth/': '../../security/',
  '../common/': '../../lib/',
  '../prisma/': '../../db/',
  '../cache/': '../../core/',
  '../sms/': '../../modules/notifications/',
  '../google-drive/': '../../services/ext/',
  '../file-storage/': '../../services/ext/',
  '../users/': '../../modules/settings/',
  '../customers/': '../../modules/customers/',
  '../products/': '../../modules/inventory/',
  '../sales/': '../../modules/pos/',
  '../repairs/': '../../modules/repairs/',
};

function updateImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Update each import mapping
    Object.entries(importMappings).forEach(([oldPath, newPath]) => {
      const regex = new RegExp(`import\\s+([^;]+)\\s+from\\s+['"](${oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^'"]*)['"];`, 'g');
      const newContent = content.replace(regex, (match, importPart, _, remainingPath) => {
        modified = true;
        return `import ${importPart} from '${newPath}${remainingPath}';`;
      });
      content = newContent;
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`Updated imports in: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

function walkDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  entries.forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      walkDirectory(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      updateImportsInFile(fullPath);
    }
  });
}

// Process all TypeScript files in the modules directory
const modulesDir = path.join(__dirname, 'src', 'modules');
const securityDir = path.join(__dirname, 'src', 'security');
const coreDir = path.join(__dirname, 'src', 'core');

console.log('Updating import paths in reorganized backend...');
walkDirectory(modulesDir);
walkDirectory(securityDir);
walkDirectory(coreDir);

console.log('Import path updates completed.');