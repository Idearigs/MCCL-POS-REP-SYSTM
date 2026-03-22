# Shift Tracking System Implementation Plan

**Date**: 2025-01-04
**Feature**: Login/Logout Based Shift Tracking and Reporting
**Status**: Implementation Plan

---

## 📋 Overview

Implement a comprehensive shift tracking system where:
- Each cashier login creates a new shift session
- Sales are associated with active shifts
- Shift reports show performance metrics per session
- Filter sales by date range and view available shifts
- Click on a shift to see detailed reports

---

## 🗄️ Database Schema

### **Table: `shifts`**

```prisma
model Shift {
  id            String    @id @default(cuid())
  shiftNumber   String    @unique // AUTO: SHIFT-YYYYMMDD-001
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  tenantId      String
  tenant        Tenant    @relation(fields: [tenantId], references: [id])

  // Shift Times
  startTime     DateTime  @default(now())
  endTime       DateTime?
  duration      Int?      // Duration in minutes

  // Opening/Closing
  openingFloat  Float     @default(0)
  closingFloat  Float?
  expectedFloat Float?
  variance      Float?    // closingFloat - expectedFloat

  // Shift Metadata
  status        ShiftStatus @default(ACTIVE)
  deviceInfo    String?   // Browser/device info
  ipAddress     String?
  location      String?

  // Notes
  openingNotes  String?
  closingNotes  String?

  // Relations
  sales         Sale[]
  floatTransactions FloatTransaction[]
  pettyCashTransactions PettyCashTransaction[]

  // Timestamps
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([userId, startTime])
  @@index([tenantId, startTime])
  @@index([status])
  @@map("shifts")
}

enum ShiftStatus {
  ACTIVE
  CLOSED
  ABANDONED
  RECONCILED
}
```

### **Update Existing Models**

**Sale Model - Add Shift Relation:**
```prisma
model Sale {
  // ... existing fields
  shiftId       String?
  shift         Shift?    @relation(fields: [shiftId], references: [id])

  @@index([shiftId])
}
```

---

## 🔧 Backend Implementation

### **1. Shift Service**

**File**: `backend/src/features/shifts/shifts.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { ShiftStatus } from '@prisma/client';
import { format } from 'date-fns';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  // Generate unique shift number
  async generateShiftNumber(userId: string): Promise<string> {
    const today = format(new Date(), 'yyyyMMdd');
    const todayShifts = await this.prisma.shift.count({
      where: {
        userId,
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      }
    });

    return `SHIFT-${today}-${String(todayShifts + 1).padStart(3, '0')}`;
  }

  // Start a new shift
  async startShift(data: {
    userId: string;
    tenantId: string;
    openingFloat: number;
    deviceInfo?: string;
    ipAddress?: string;
    openingNotes?: string;
  }) {
    const shiftNumber = await this.generateShiftNumber(data.userId);

    return this.prisma.shift.create({
      data: {
        shiftNumber,
        userId: data.userId,
        tenantId: data.tenantId,
        openingFloat: data.openingFloat,
        deviceInfo: data.deviceInfo,
        ipAddress: data.ipAddress,
        openingNotes: data.openingNotes,
        status: ShiftStatus.ACTIVE
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });
  }

  // Get active shift for user
  async getActiveShift(userId: string, tenantId: string) {
    return this.prisma.shift.findFirst({
      where: {
        userId,
        tenantId,
        status: ShiftStatus.ACTIVE
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  }

  // Close a shift
  async closeShift(
    shiftId: string,
    data: {
      closingFloat: number;
      closingNotes?: string;
    }
  ) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        sales: {
          where: { status: 'COMPLETED' }
        }
      }
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Calculate expected float
    const totalCashSales = shift.sales
      .filter(s => s.paymentMethod === 'CASH')
      .reduce((sum, s) => sum + s.totalAmount, 0);

    const expectedFloat = shift.openingFloat + totalCashSales;
    const variance = data.closingFloat - expectedFloat;

    const duration = Math.floor(
      (new Date().getTime() - shift.startTime.getTime()) / 1000 / 60
    );

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: {
        endTime: new Date(),
        duration,
        closingFloat: data.closingFloat,
        expectedFloat,
        variance,
        closingNotes: data.closingNotes,
        status: ShiftStatus.CLOSED
      }
    });
  }

  // Get shifts by date range
  async getShiftsByDateRange(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    userId?: string
  ) {
    return this.prisma.shift.findMany({
      where: {
        tenantId,
        startTime: {
          gte: startDate,
          lte: endDate
        },
        ...(userId && { userId })
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            sales: true
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });
  }

  // Get shift report/details
  async getShiftReport(shiftId: string) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        sales: {
          include: {
            items: true,
            customer: true
          }
        }
      }
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    // Calculate metrics
    const completedSales = shift.sales.filter(s => s.status === 'COMPLETED');
    const cancelledSales = shift.sales.filter(s => s.status === 'CANCELLED');

    const totalSales = completedSales.length;
    const totalRevenue = completedSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const averageSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment method breakdown
    const paymentBreakdown = completedSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.totalAmount;
      return acc;
    }, {} as Record<string, number>);

    // Items sold
    const itemsSold = completedSales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
    }, 0);

    return {
      shift,
      metrics: {
        totalSales,
        totalRevenue,
        averageSaleValue,
        itemsSold,
        cancelledSales: cancelledSales.length,
        paymentBreakdown,
        cashSales: paymentBreakdown['CASH'] || 0,
        cardSales: paymentBreakdown['CARD'] || 0,
        floatVariance: shift.variance || 0
      },
      sales: completedSales
    };
  }
}
```

---

### **2. Shift Controller**

**File**: `backend/src/features/shifts/shifts.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req
} from '@nestjs/common';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
@UseGuards(JwtAuthGuard)
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  // Start new shift
  @Post('start')
  async startShift(@Req() req, @Body() body: {
    openingFloat: number;
    openingNotes?: string;
  }) {
    return this.shiftsService.startShift({
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      openingFloat: body.openingFloat,
      deviceInfo: req.headers['user-agent'],
      ipAddress: req.ip,
      openingNotes: body.openingNotes
    });
  }

  // Get active shift
  @Get('active')
  async getActiveShift(@Req() req) {
    return this.shiftsService.getActiveShift(
      req.user.userId,
      req.user.tenantId
    );
  }

  // Close shift
  @Patch(':id/close')
  async closeShift(
    @Param('id') shiftId: string,
    @Body() body: {
      closingFloat: number;
      closingNotes?: string;
    }
  ) {
    return this.shiftsService.closeShift(shiftId, body);
  }

  // Get shifts by date range
  @Get()
  async getShifts(
    @Req() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string
  ) {
    return this.shiftsService.getShiftsByDateRange(
      req.user.tenantId,
      new Date(startDate),
      new Date(endDate),
      userId
    );
  }

  // Get shift report
  @Get(':id/report')
  async getShiftReport(@Param('id') shiftId: string) {
    return this.shiftsService.getShiftReport(shiftId);
  }
}
```

---

### **3. Update Auth Service to Track Shifts**

**File**: `backend/src/features/auth/auth.service.ts`

```typescript
// Add to login method
async login(loginDto: LoginDto) {
  // ... existing login logic

  // Check for active shift
  const activeShift = await this.shiftsService.getActiveShift(
    user.id,
    user.tenantId
  );

  return {
    access_token,
    user: userResponse,
    activeShift // Include active shift info
  };
}

// Add to logout method
async logout(userId: string, tenantId: string) {
  // Check if user has active shift
  const activeShift = await this.shiftsService.getActiveShift(userId, tenantId);

  if (activeShift) {
    // Optionally auto-close shift or warn user
    // For now, just return shift info
    return {
      message: 'Logged out successfully',
      activeShift,
      warning: 'You have an active shift. Please close it before ending your session.'
    };
  }

  return { message: 'Logged out successfully' };
}
```

---

### **4. Update Sales Service**

**File**: `backend/src/features/sales/sales.service.ts`

```typescript
// Update createSale to associate with active shift
async createSale(userId: string, tenantId: string, saleData: CreateSaleDto) {
  // Get active shift
  const activeShift = await this.prisma.shift.findFirst({
    where: {
      userId,
      tenantId,
      status: 'ACTIVE'
    }
  });

  // Create sale with shift association
  return this.prisma.sale.create({
    data: {
      ...saleData,
      shiftId: activeShift?.id, // Associate with shift if exists
      cashierId: userId,
      tenantId
    }
  });
}
```

---

## 🎨 Frontend Implementation

### **1. Shift Service**

**File**: `src/services/shiftService.ts`

```typescript
import { apiClient } from './apiClient';
import { API_CONFIG } from '../config/api';

export interface Shift {
  id: string;
  shiftNumber: string;
  userId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
  };
  startTime: string;
  endTime?: string;
  duration?: number;
  openingFloat: number;
  closingFloat?: number;
  expectedFloat?: number;
  variance?: number;
  status: 'ACTIVE' | 'CLOSED' | 'ABANDONED' | 'RECONCILED';
  openingNotes?: string;
  closingNotes?: string;
  _count?: {
    sales: number;
  };
}

export interface ShiftReport {
  shift: Shift;
  metrics: {
    totalSales: number;
    totalRevenue: number;
    averageSaleValue: number;
    itemsSold: number;
    cancelledSales: number;
    paymentBreakdown: Record<string, number>;
    cashSales: number;
    cardSales: number;
    floatVariance: number;
  };
  sales: any[];
}

class ShiftService {
  async startShift(data: { openingFloat: number; openingNotes?: string }): Promise<Shift> {
    return await apiClient.post<Shift>('/shifts/start', data);
  }

  async getActiveShift(): Promise<Shift | null> {
    try {
      return await apiClient.get<Shift>('/shifts/active');
    } catch (error) {
      return null;
    }
  }

  async closeShift(shiftId: string, data: {
    closingFloat: number;
    closingNotes?: string;
  }): Promise<Shift> {
    return await apiClient.patch<Shift>(`/shifts/${shiftId}/close`, data);
  }

  async getShiftsByDateRange(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<Shift[]> {
    const params: any = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    };

    if (userId) params.userId = userId;

    return await apiClient.get<Shift[]>('/shifts', params);
  }

  async getShiftReport(shiftId: string): Promise<ShiftReport> {
    return await apiClient.get<ShiftReport>(`/shifts/${shiftId}/report`);
  }

  formatDuration(minutes?: number): string {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }
}

export const shiftService = new ShiftService();
export default shiftService;
```

---

### **2. Shift List Component**

**File**: `src/components/shifts/ShiftList.tsx`

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Shift } from '@/services/shiftService';
import { format } from 'date-fns';

interface ShiftListProps {
  shifts: Shift[];
  onSelectShift: (shift: Shift) => void;
  selectedShiftId?: string;
  loading?: boolean;
}

const ShiftList: React.FC<ShiftListProps> = ({
  shifts,
  onSelectShift,
  selectedShiftId,
  loading = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'CLOSED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ABANDONED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'RECONCILED':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getVarianceColor = (variance?: number) => {
    if (!variance) return 'text-gray-600';
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">No shifts found for the selected date range</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {shifts.map(shift => (
        <Card
          key={shift.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedShiftId === shift.id ? 'ring-2 ring-blue-500' : ''
          }`}
          onClick={() => onSelectShift(shift)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{shift.shiftNumber}</h3>
                <p className="text-sm text-gray-600">
                  {shift.user.firstName} {shift.user.lastName}
                </p>
              </div>
              <Badge className={getStatusColor(shift.status)}>
                {shift.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-gray-500" />
                <div>
                  <p className="text-xs text-gray-500">Start Time</p>
                  <p className="text-sm font-medium">
                    {format(new Date(shift.startTime), 'HH:mm')}
                  </p>
                </div>
              </div>

              {shift.endTime && (
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-500" />
                  <div>
                    <p className="text-xs text-gray-500">End Time</p>
                    <p className="text-sm font-medium">
                      {format(new Date(shift.endTime), 'HH:mm')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className="text-gray-500" />
                <span className="text-sm text-gray-600">
                  {shift._count?.sales || 0} sales
                </span>
              </div>

              {shift.variance !== undefined && shift.variance !== null && (
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-gray-500" />
                  <span className={`text-sm font-medium ${getVarianceColor(shift.variance)}`}>
                    {shift.variance >= 0 ? '+' : ''}£{shift.variance.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ShiftList;
```

---

### **3. Shift Report Component**

**File**: `src/components/shifts/ShiftReport.tsx`

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  DollarSign,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  Printer
} from 'lucide-react';
import { ShiftReport as ShiftReportType } from '@/services/shiftService';
import { format } from 'date-fns';

interface ShiftReportProps {
  report: ShiftReportType;
  onClose: () => void;
  onPrint: () => void;
}

const ShiftReport: React.FC<ShiftReportProps> = ({
  report,
  onClose,
  onPrint
}) => {
  const { shift, metrics } = report;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '0h 0m';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{shift.shiftNumber}</h2>
          <p className="text-gray-600">
            {shift.user.firstName} {shift.user.lastName}
          </p>
          <p className="text-sm text-gray-500">
            {format(new Date(shift.startTime), 'PPP p')}
            {shift.endTime && ` - ${format(new Date(shift.endTime), 'p')}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onPrint}>
            <Printer size={16} className="mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <ShoppingCart className="mx-auto h-8 w-8 text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{metrics.totalSales}</p>
              <p className="text-sm text-gray-600">Total Sales</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <DollarSign className="mx-auto h-8 w-8 text-green-600 mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
              <p className="text-sm text-gray-600">Revenue</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="mx-auto h-8 w-8 text-purple-600 mb-2" />
              <p className="text-2xl font-bold">{formatCurrency(metrics.averageSaleValue)}</p>
              <p className="text-sm text-gray-600">Avg Sale</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="mx-auto h-8 w-8 text-orange-600 mb-2" />
              <p className="text-2xl font-bold">{formatDuration(shift.duration)}</p>
              <p className="text-sm text-gray-600">Duration</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Float Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Float Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-600">Opening Float</p>
              <p className="text-lg font-semibold">{formatCurrency(shift.openingFloat)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Expected Float</p>
              <p className="text-lg font-semibold">
                {formatCurrency(shift.expectedFloat || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Closing Float</p>
              <p className="text-lg font-semibold">
                {formatCurrency(shift.closingFloat || 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Variance</p>
              <p className={`text-lg font-semibold ${
                (shift.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {shift.variance !== undefined ? formatCurrency(shift.variance) : '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(metrics.paymentBreakdown).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between py-2 border-b">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-gray-500" />
                  <span className="font-medium">{method}</span>
                </div>
                <span className="font-semibold">{formatCurrency(amount)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales History ({metrics.totalSales})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {report.sales.map((sale, index) => (
              <div key={sale.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">Sale #{index + 1}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(sale.createdAt), 'HH:mm:ss')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(sale.totalAmount)}</p>
                  <Badge variant="outline" className="text-xs">
                    {sale.paymentMethod}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {(shift.openingNotes || shift.closingNotes) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {shift.openingNotes && (
              <div>
                <p className="text-sm font-medium text-gray-600">Opening Notes:</p>
                <p className="text-sm mt-1">{shift.openingNotes}</p>
              </div>
            )}
            {shift.closingNotes && (
              <div>
                <p className="text-sm font-medium text-gray-600">Closing Notes:</p>
                <p className="text-sm mt-1">{shift.closingNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ShiftReport;
```

---

## 📱 Integration into SalesPage

Update `src/pages/SalesPage.tsx` to add shift functionality:

```typescript
// Add state for shifts
const [shifts, setShifts] = useState<Shift[]>([]);
const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
const [shiftReport, setShiftReport] = useState<ShiftReport | null>(null);
const [showShiftList, setShowShiftList] = useState(false);
const [showShiftReport, setShowShiftReport] = useState(false);

// Load shifts when date range changes
const loadShifts = async () => {
  if (!filters.dateFrom || !filters.dateTo) return;

  try {
    const shiftsData = await shiftService.getShiftsByDateRange(
      filters.dateFrom,
      filters.dateTo,
      filters.cashierId !== 'all' ? filters.cashierId : undefined
    );
    setShifts(shiftsData);
  } catch (error) {
    console.error('Failed to load shifts:', error);
  }
};

// Handle shift selection
const handleSelectShift = async (shift: Shift) => {
  setSelectedShift(shift);
  try {
    const report = await shiftService.getShiftReport(shift.id);
    setShiftReport(report);
    setShowShiftReport(true);
  } catch (error) {
    console.error('Failed to load shift report:', error);
    toast({
      title: 'Error',
      description: 'Failed to load shift report',
      variant: 'destructive'
    });
  }
};
```

---

## 🎯 User Flow

### **1. Cashier Login Flow**
```
User logs in
  ↓
System checks for active shift
  ↓
IF NO ACTIVE SHIFT:
  → Show "Start Shift" dialog
  → Enter opening float
  → Add optional notes
  → Click "Start Shift"
  → Shift created (ACTIVE status)

IF ACTIVE SHIFT EXISTS:
  → Show shift info banner
  → Continue to POS
```

### **2. Making Sales**
```
Cashier creates sale
  ↓
Sale automatically linked to active shift
  ↓
All sales during session tracked under this shift
```

### **3. Viewing Shifts in Sales Page**
```
Navigate to Sales page
  ↓
Select date range in filters
  ↓
Click "View Shifts" button
  ↓
Shift list appears (grouped by date)
  ↓
Click on a shift
  ↓
Detailed shift report displayed
  ↓
View all metrics, sales, float info
```

### **4. Cashier Logout Flow**
```
User clicks logout
  ↓
System checks for active shift
  ↓
IF ACTIVE SHIFT:
  → Show "Close Shift" dialog
  → Enter closing float
  → System calculates variance
  → Add optional notes
  → Click "Close Shift"
  → Shift status: ACTIVE → CLOSED

THEN:
  → User logged out
```

---

## 🔍 Key Features

### **Shift Management**
- ✅ Automatic shift creation on login
- ✅ Associate all sales with active shift
- ✅ Track opening/closing float
- ✅ Calculate float variance automatically
- ✅ Track shift duration
- ✅ Opening and closing notes

### **Reporting**
- ✅ Filter shifts by date range
- ✅ Filter shifts by cashier
- ✅ View shift summary (sales count, revenue, duration)
- ✅ Detailed shift report with all metrics
- ✅ Payment method breakdown
- ✅ Individual sale history per shift
- ✅ Float reconciliation details

### **Analytics**
- ✅ Average sale value per shift
- ✅ Items sold per shift
- ✅ Sales velocity (sales per hour)
- ✅ Cancelled sales tracking
- ✅ Float variance analysis
- ✅ Payment method distribution

---

## 📊 Benefits

1. **Accountability**: Each sale is tied to a specific cashier shift
2. **Performance Tracking**: Compare cashier performance across shifts
3. **Float Management**: Automatic float reconciliation
4. **Audit Trail**: Complete history of who sold what and when
5. **Loss Prevention**: Track discrepancies and variances
6. **Reporting**: Detailed shift-based analytics
7. **Compliance**: Proper session tracking for regulatory purposes

---

## 🚀 Implementation Steps

1. **Database Migration** - Create shifts table
2. **Backend Services** - Implement shift tracking logic
3. **Auth Integration** - Add shift start/close to login/logout
4. **Sales Integration** - Link sales to active shifts
5. **Frontend Components** - Build shift list and report UI
6. **SalesPage Integration** - Add shift viewing functionality
7. **Testing** - Test complete flow
8. **Documentation** - Update user guides

---

## 📝 Next Steps

After approval, I will:
1. Create the Prisma migration for the shifts table
2. Implement the backend shift service and controller
3. Update auth service to handle shift creation
4. Create frontend shift components
5. Integrate into SalesPage with proper UI/UX
6. Add shift management to POS login/logout flow

---

**Implementation Date**: 2025-01-04
**Status**: Awaiting Approval
**Estimated Implementation Time**: 4-6 hours

---

Would you like me to proceed with the implementation?
