const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/shifts/shifts.controller.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define the old closeShift controller method
const oldCloseShift = `  // Close shift
  @Patch(':id/close')
  async closeShift(
    @Param('id') shiftId: string,
    @Body() body: CloseShiftDto
  ) {
    return this.shiftsService.closeShift(shiftId, body);
  }`;

// Define the new closeShift controller method with userId
const newCloseShift = `  // Close shift
  @Patch(':id/close')
  async closeShift(
    @Req() req,
    @Param('id') shiftId: string,
    @Body() body: CloseShiftDto
  ) {
    return this.shiftsService.closeShift(shiftId, req.user.id, body);
  }`;

// Replace the method
content = content.replace(oldCloseShift, newCloseShift);

// Write back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Updated closeShift controller to pass userId successfully!');
