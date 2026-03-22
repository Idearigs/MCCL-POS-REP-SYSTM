const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/layout/MainLayout.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Check if FloatingShiftButton is already rendered
if (content.includes('<FloatingShiftButton />')) {
  console.log('FloatingShiftButton already rendered in MainLayout!');
  process.exit(0);
}

// Find the section after GlobalNotificationIndicator
const searchPattern = `          {/* Add GlobalNotificationIndicator at the top level */}
          <GlobalNotificationIndicator />

          <Sidebar />`;

const replacement = `          {/* Add GlobalNotificationIndicator at the top level */}
          <GlobalNotificationIndicator />

          {/* Floating Shift Button - Visible throughout the system */}
          <FloatingShiftButton />

          <Sidebar />`;

if (content.includes(searchPattern)) {
  content = content.replace(searchPattern, replacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Successfully added FloatingShiftButton to MainLayout!');
} else {
  console.log('❌ Could not find the expected pattern in MainLayout. Checking alternate pattern...');

  // Try alternate pattern without extra newline
  const altPattern = `          <GlobalNotificationIndicator />

          <Sidebar />`;

  const altReplacement = `          <GlobalNotificationIndicator />

          {/* Floating Shift Button - Visible throughout the system */}
          <FloatingShiftButton />

          <Sidebar />`;

  if (content.includes(altPattern)) {
    content = content.replace(altPattern, altReplacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Successfully added FloatingShiftButton to MainLayout (alternate pattern)!');
  } else {
    console.log('❌ Could not find pattern to insert FloatingShiftButton.');
    console.log('Manual inspection needed.');
  }
}
