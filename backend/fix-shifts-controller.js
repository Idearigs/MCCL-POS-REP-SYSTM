const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/shifts/shifts.controller.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Add BadRequestException to imports if not already there
if (!content.includes('BadRequestException')) {
  content = content.replace(
    'import {',
    'import {\n  BadRequestException,'
  );
}

// Define the old getShifts method
const oldGetShifts = `  // Get shifts by date range
  @Get()
  async getShifts(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('status') status?: ShiftStatus
  ) {
    return this.shiftsService.getShiftsByDateRange(
      req.user.tenantId,
      new Date(startDate),
      new Date(endDate),
      userId,
      status
    );
  }`;

// Define the new getShifts method with validation
const newGetShifts = `  // Get shifts by date range
  @Get()
  async getShifts(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
    @Query('status') status?: ShiftStatus
  ) {
    // Validate date parameters
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format provided');
    }

    // Validate date range
    if (start > end) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    return this.shiftsService.getShiftsByDateRange(
      req.user.tenantId,
      start,
      end,
      userId,
      status
    );
  }`;

// Replace the method
content = content.replace(oldGetShifts, newGetShifts);

// Define the old getShiftStatistics method
const oldGetStatistics = `  // Get shift statistics
  @Get('statistics')
  async getShiftStatistics(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    return this.shiftsService.getShiftStatistics(
      req.user.tenantId,
      new Date(startDate),
      new Date(endDate)
    );
  }`;

// Define the new getShiftStatistics method with validation
const newGetStatistics = `  // Get shift statistics
  @Get('statistics')
  async getShiftStatistics(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string
  ) {
    // Validate date parameters
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Check for invalid dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format provided');
    }

    // Validate date range
    if (start > end) {
      throw new BadRequestException('Start date must be before or equal to end date');
    }

    return this.shiftsService.getShiftStatistics(
      req.user.tenantId,
      start,
      end
    );
  }`;

// Replace the method
content = content.replace(oldGetStatistics, newGetStatistics);

// Write back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed shifts controller with date validation successfully!');
