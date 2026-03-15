const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/shifts/shifts.service.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define the old closeShift method
const oldCloseShift = `  // Close a shift
  async closeShift(
    shiftId: string,
    data: CloseShiftDto
  ) {
    const shift = await this.prisma.shifts.findUnique({
      where: { id: shiftId },
      include: {
        sales: {
          where: {
            status: 'COMPLETED',
            paymentStatus: 'COMPLETED'
          }
        }
      }
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    if (shift.status !== ShiftStatus.ACTIVE) {
      throw new BadRequestException('Only active shifts can be closed');
    }`;

// Define the new closeShift method with ownership check
const newCloseShift = `  // Close a shift
  async closeShift(
    shiftId: string,
    userId: string,
    data: CloseShiftDto
  ) {
    const shift = await this.prisma.shifts.findUnique({
      where: { id: shiftId },
      include: {
        sales: {
          where: {
            status: 'COMPLETED',
            paymentStatus: 'COMPLETED'
          }
        }
      }
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Verify shift ownership
    if (shift.userId !== userId) {
      throw new BadRequestException('You can only close your own shifts');
    }

    if (shift.status !== ShiftStatus.ACTIVE) {
      throw new BadRequestException('Only active shifts can be closed');
    }`;

// Replace the method
content = content.replace(oldCloseShift, newCloseShift);

// Write back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Added shift ownership verification to closeShift method successfully!');
