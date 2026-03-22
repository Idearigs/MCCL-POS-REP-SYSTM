const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/pages/PointOfSale.tsx');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Find and replace the shift banner section to only show when Quick POS is not open
const oldBanner = `  // Show Quick Mode POS when shift is active
  return (
    <MainLayout pageTitle="Point of Sale">
      {/* Shift Status Banner - Fixed at top */}
      <div className="fixed left-[240px] right-0 top-[72px] z-40 px-6 pt-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <Clock className="text-green-600" size={20} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-green-900">
                  Shift Active: {activeShift.shiftNumber}
                </span>
                <Badge className="bg-green-600 text-white">Active</Badge>
              </div>
              <p className="text-sm text-green-700">
                Started at {new Date(activeShift.startTime).toLocaleTimeString()} •
                Opening Float: £{Number(activeShift.openingFloat).toFixed(2)} •
                Transactions: {activeShift._count?.sales || 0}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCloseShiftDialogOpen(true)}
            className="border-green-600 text-green-700 hover:bg-green-100"
          >
            <Clock size={16} className="mr-2" />
            Close Shift
          </Button>
        </div>
      </div>

      {/* Quick Mode POS - Full Screen */}
      {isQuickPOSOpen ? (`;

const newBanner = `  // Show Quick Mode POS when shift is active
  return (
    <MainLayout pageTitle="Point of Sale">
      {/* Quick Mode POS - Full Screen */}
      {isQuickPOSOpen ? (`;

content = content.replace(oldBanner, newBanner);

// Write back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Successfully removed shift banner from Quick POS mode!');
