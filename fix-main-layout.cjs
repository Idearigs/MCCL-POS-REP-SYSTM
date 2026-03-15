const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/layout/MainLayout.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Add FloatingShiftButton import
if (!content.includes("import FloatingShiftButton from '@/components/shifts/FloatingShiftButton'")) {
  content = content.replace(
    "import GlobalNotificationIndicator from '@/components/notifications/GlobalNotificationIndicator';",
    "import GlobalNotificationIndicator from '@/components/notifications/GlobalNotificationIndicator';\nimport FloatingShiftButton from '@/components/shifts/FloatingShiftButton';"
  );
}

// Add FloatingShiftButton component after GlobalNotificationIndicator
const oldMainDiv = `        <div className="flex h-screen w-full bg-gray-50 relative">
          {/* Add GlobalNotificationIndicator at the top level */}
          <GlobalNotificationIndicator />

          <Sidebar />`;

const newMainDiv = `        <div className="flex h-screen w-full bg-gray-50 relative">
          {/* Add GlobalNotificationIndicator at the top level */}
          <GlobalNotificationIndicator />

          {/* Floating Shift Button - Visible throughout the system */}
          <FloatingShiftButton />

          <Sidebar />`;

content = content.replace(oldMainDiv, newMainDiv);

// Write back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully integrated FloatingShiftButton into MainLayout!');
