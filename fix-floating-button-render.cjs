const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/layout/MainLayout.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Check if FloatingShiftButton is already rendered
if (content.includes('<FloatingShiftButton />')) {
  console.log('✅ FloatingShiftButton already rendered in MainLayout!');
  process.exit(0);
}

// The exact pattern from the file
const pattern = `          <GlobalNotificationIndicator />

          <Sidebar />`;

const replacement = `          <GlobalNotificationIndicator />

          {/* Floating Shift Button - Visible throughout the system */}
          <FloatingShiftButton />

          <Sidebar />`;

if (content.includes(pattern)) {
  content = content.replace(pattern, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully added FloatingShiftButton to MainLayout JSX!');
  console.log('   The floating button should now appear after you refresh the browser.');
} else {
  console.log('❌ Pattern not found. Trying alternative approach...');

  // Try using line-by-line approach
  const lines = content.split('\n');
  let foundIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<GlobalNotificationIndicator />')) {
      foundIndex = i;
      break;
    }
  }

  if (foundIndex !== -1) {
    // Insert after the blank line following GlobalNotificationIndicator
    const insertIndex = foundIndex + 2; // Skip the comment line and blank line
    lines.splice(insertIndex, 0, '          {/* Floating Shift Button - Visible throughout the system */}');
    lines.splice(insertIndex + 1, 0, '          <FloatingShiftButton />');
    lines.splice(insertIndex + 2, 0, '');

    content = lines.join('\n');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully added FloatingShiftButton using line insertion!');
  } else {
    console.log('❌ Could not find GlobalNotificationIndicator in file.');
  }
}
