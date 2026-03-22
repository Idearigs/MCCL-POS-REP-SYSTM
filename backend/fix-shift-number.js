const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/features/shifts/shifts.service.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Define the old function
const oldFunction = `  // Generate unique shift number
  async generateShiftNumber(userId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    const todayShifts = await this.prisma.shifts.count({
      where: {
        userId,
        startTime: {
          gte: new Date(today.setHours(0, 0, 0, 0))
        }
      }
    });

    return \`SHIFT-\${dateStr}-\${String(todayShifts + 1).padStart(3, '0')}\`;
  }`;

// Define the new function
const newFunction = `  // Generate unique shift number
  async generateShiftNumber(userId: string): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

    // Create a new date object for start of day to avoid mutation
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const todayShifts = await this.prisma.shifts.count({
      where: {
        userId,
        startTime: {
          gte: startOfDay
        }
      }
    });

    // Include userId prefix for uniqueness across different users
    const userPrefix = userId.substring(0, 6).toUpperCase();
    return \`SHIFT-\${dateStr}-\${userPrefix}-\${String(todayShifts + 1).padStart(3, '0')}\`;
  }`;

// Replace the function
content = content.replace(oldFunction, newFunction);

// Write back to the file
fs.writeFileSync(filePath, content, 'utf8');

console.log('Fixed generateShiftNumber function successfully!');
