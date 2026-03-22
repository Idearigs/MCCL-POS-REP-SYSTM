const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/pos/TileBasedPOS.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Split into lines
const lines = content.split('\n');

// Find the line with "Back to POS" (line 773, but array is 0-indexed so it's 772)
const backToPOSLineIndex = lines.findIndex(line => line.includes('Back to POS'));

if (backToPOSLineIndex === -1) {
  console.log('❌ "Back to POS" text not found');
  process.exit(1);
}

console.log(`Found "Back to POS" on line ${backToPOSLineIndex + 1}`);

// Remove lines 766-774 (indices 765-773)
// The button starts at around line 766 and ends around line 774
const startLine = backToPOSLineIndex - 7; // Go back 7 lines to get the Button opening tag
const endLine = backToPOSLineIndex + 1;   // Go forward 1 line to get the closing tag

console.log(`Removing lines ${startLine + 1} to ${endLine + 1}`);

// Remove the lines
lines.splice(startLine, endLine - startLine + 1);

// Join back
content = lines.join('\n');

// Write back
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Successfully removed old "Back to POS" button!');
