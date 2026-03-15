const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing both issues...\n');

// 1. Remove old Back to POS button from TileBasedPOS
const tileBasedPOSPath = path.join(__dirname, 'src/components/pos/TileBasedPOS.tsx');
let tileContent = fs.readFileSync(tileBasedPOSPath, 'utf8');

const oldBackButton = `            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="hover:bg-gray-100"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to POS
            </Button>`;

if (tileContent.includes(oldBackButton)) {
  tileContent = tileContent.replace(oldBackButton, '');
  fs.writeFileSync(tileBasedPOSPath, tileContent, 'utf8');
  console.log('✅ 1. Removed old "Back to POS" button from TileBasedPOS');
} else {
  console.log('⚠️  1. Old "Back to POS" button pattern not found in TileBasedPOS');
}

// 2. Fix FloatingShiftButton component to ensure it renders
const floatingButtonPath = path.join(__dirname, 'src/components/shifts/FloatingShiftButton.tsx');
let floatingContent = fs.readFileSync(floatingButtonPath, 'utf8');

// Check if the component returns null when loading
if (floatingContent.includes('if (loading || !activeShift) {')) {
  console.log('⚠️  2. FloatingShiftButton has early return when loading or no shift');
  console.log('   This is correct - button only shows when shift is active');

  // Add console.log for debugging
  const oldReturnNull = `  // Don't render if loading or no active shift
  if (loading || !activeShift) {
    return null;
  }`;

  const newReturnNull = `  // Don't render if loading or no active shift
  if (loading || !activeShift) {
    console.log('FloatingShiftButton: Not rendering -', { loading, hasShift: !!activeShift });
    return null;
  }

  console.log('FloatingShiftButton: Rendering with shift:', activeShift.shiftNumber);`;

  if (floatingContent.includes(oldReturnNull)) {
    floatingContent = floatingContent.replace(oldReturnNull, newReturnNull);
    fs.writeFileSync(floatingButtonPath, floatingContent, 'utf8');
    console.log('✅ 2. Added debug logging to FloatingShiftButton');
  } else {
    console.log('ℹ️  2. Debug logging already exists or pattern different');
  }
}

console.log('\n✅ All fixes applied!');
console.log('\n📋 Next steps:');
console.log('1. Refresh your browser');
console.log('2. Open browser console (F12)');
console.log('3. Look for FloatingShiftButton logs');
console.log('4. If it says "Not rendering - hasShift: false", start a shift first');
