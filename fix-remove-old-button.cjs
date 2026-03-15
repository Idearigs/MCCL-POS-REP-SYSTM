const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/pos/TileBasedPOS.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Remove the old "Back to POS" button
const oldButton = `          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to POS
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">
              {showRepairView ? 'Repairs' : showProductGrid ? selectedCategory : 'Quick Mode'}
            </h1>
          </div>`;

const newHeader = `          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {showRepairView ? 'Repairs' : showProductGrid ? selectedCategory : 'Quick Mode'}
            </h1>
          </div>`;

content = content.replace(oldButton, newHeader);

// Also remove the onClose prop from the component interface since it's no longer needed
// But let's keep it for now in case it's used elsewhere

// Write back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully removed old "Back to POS" button from TileBasedPOS!');
