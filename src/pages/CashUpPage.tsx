import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calculator,
  Printer,
  Mail,
  Download,
  Search,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Receipt,
  PoundSterling,
  Percent,
  Scale
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { salesService } from '@/services/salesService';
import { shiftService, ShiftSummary } from '@/services/shiftService';
import {
  printShiftSummaryThermal,
  printDetailedJournal,
  buildDepartmentsFromShiftReport,
  DetailedJournalEntry,
} from '@/utils/thermalReceipt';
import { format } from 'date-fns';
import {
  EndOfDayReportData,
  generateEndOfDayReportText,
  downloadEndOfDayReport,
  printEndOfDayReport,
  emailEndOfDayReport
} from '@/utils/endOfDayReportGenerator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiClient } from '@/services/apiClient';
import { pettyCashService, PettyCashStatus } from '@/services/pettyCashService';
import { useSettings } from '@/contexts/SettingsContext';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  tillNo: string;
  userId: string;
  shiftId: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const CashUpPage = () => {
  const { toast } = useToast();
  const { settings } = useSettings();
  const { auth } = useAuth();
  // STAFF + READONLY are treated as "cashier": Expected/Variance are masked.
  const isManager =
    auth.user?.role === 'OWNER' || auth.user?.role === 'MANAGER';
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<EndOfDayReportData | null>(null);
  const [reportText, setReportText] = useState<string>('');

  // Consolidated master summary across the active filter
  const [summary, setSummary] = useState<ShiftSummary | null>(null);
  // Expandable shift row (tender accordion)
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);
  // Variance audit modal
  const [auditShift, setAuditShift] = useState<any | null>(null);
  const [auditNote, setAuditNote] = useState('');
  const [auditSaving, setAuditSaving] = useState(false);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: format(thirtyDaysAgo, 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    tillNo: '',
    userId: '',
    shiftId: ''
  });

  const [availableShifts, setAvailableShifts] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableTills, setAvailableTills] = useState<string[]>([]);

  // Load data when date range changes; on first mount auto-select most recent closed shift
  const isMounted = React.useRef(false);
  useEffect(() => {
    if (filters.dateFrom && filters.dateTo) {
      const autoSelect = !isMounted.current;
      isMounted.current = true;
      loadAvailableShifts(autoSelect);
      loadUsersByDateRange();
      loadTillsByDateRange();
      loadSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, filters.userId]);

  const loadSummary = async () => {
    try {
      const data = await shiftService.getShiftSummary(
        filters.dateFrom,
        filters.dateTo,
        filters.userId,
      );
      setSummary(data);
    } catch (error) {
      console.error('Failed to load shift summary:', error);
      setSummary(null);
    }
  };

  const handleSaveAudit = async () => {
    if (!auditShift) return;
    setAuditSaving(true);
    try {
      await shiftService.saveAuditResolution(auditShift.id, auditNote.trim());
      toast({
        title: 'Audit note saved',
        description: `Variance for ${auditShift.shiftNumber} resolved`,
      });
      setAuditShift(null);
      setAuditNote('');
      loadAvailableShifts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save audit note',
        variant: 'destructive',
      });
    } finally {
      setAuditSaving(false);
    }
  };

  const gbp = (n: number) =>
    `£${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // The shift currently selected for per-shift print actions
  const selectedShift =
    filters.shiftId && filters.shiftId !== 'all'
      ? availableShifts.find((s: any) => s.id === filters.shiftId)
      : null;

  const handleReprintZReport = async () => {
    if (!selectedShift) return;
    try {
      const report = await shiftService.getShiftReport(selectedShift.id);
      const printerName = settings?.printer?.printerName;
      await printShiftSummaryThermal(
        {
          storeName: settings.general.storeName || 'Store',
          storeAddress: settings.general.address,
          storePhone: settings.general.phone,
          vatNumber: settings.printer?.vatNumber,
          companyRegNumber: settings.cashUp?.companyRegistrationNumber,
          registerId: settings.cashUp?.registerId,
          shiftNumber: selectedShift.shiftNumber,
          cashierName: selectedShift.user
            ? `${selectedShift.user.firstName} ${selectedShift.user.lastName}`
            : 'Staff',
          startTime: selectedShift.startTime,
          endTime: selectedShift.endTime || new Date().toISOString(),
          openingFloat: Number(selectedShift.openingFloat ?? 0),
          closingFloat: Number(
            selectedShift.declaredCash ?? selectedShift.closingFloat ?? 0,
          ),
          expectedCash: Number(selectedShift.expectedFloat ?? 0),
          declaredCash: Number(
            selectedShift.declaredCash ?? selectedShift.closingFloat ?? 0,
          ),
          totalSales: report.metrics.totalSales,
          totalRevenue: report.metrics.totalRevenue,
          paymentBreakdown: report.metrics.paymentBreakdown,
          cashSales: report.metrics.cashSales,
          cardSales: report.metrics.cardSales,
          giftCardSales: Number(selectedShift.giftCardSales ?? 0),
          layawayDeposits: Number(selectedShift.layawayDeposits ?? 0),
          payIns: Number(selectedShift.cashPayIns ?? 0),
          payOuts: Number(selectedShift.cashPayOuts ?? 0),
          departments: buildDepartmentsFromShiftReport(report.sales),
          totalDiscount: report.metrics.totalDiscount,
          totalTax: report.metrics.totalTax,
          variance: Number(selectedShift.variance ?? 0),
        },
        printerName,
      );
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to print Z-report',
        variant: 'destructive',
      });
    }
  };

  const handlePrintJournal = async () => {
    if (!selectedShift) {
      toast({
        title: 'Select a shift',
        description: 'Choose a specific shift to print its detailed journal',
        variant: 'destructive',
      });
      return;
    }
    try {
      const report = await shiftService.getShiftReport(selectedShift.id);
      const entries: DetailedJournalEntry[] = [];
      report.sales.forEach((sale) => {
        const customerName = sale.customers
          ? `${sale.customers.firstName} ${sale.customers.lastName}`.trim()
          : undefined;
        sale.sale_items.forEach((item) => {
          entries.push({
            time: sale.createdAt,
            saleNumber: sale.saleNumber,
            productName: item.products?.name || 'Item',
            sku: item.products?.sku,
            quantity: item.quantity,
            amount: Number((item as any).totalPrice ?? sale.totalAmount),
            paymentMethod: sale.paymentMethod,
            customerName,
          });
        });
      });
      entries.sort(
        (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
      );
      await printDetailedJournal(
        {
          storeName: settings.general.storeName || 'Store',
          shiftNumber: selectedShift.shiftNumber,
          cashierName: selectedShift.user
            ? `${selectedShift.user.firstName} ${selectedShift.user.lastName}`
            : 'Staff',
          registerId: settings.cashUp?.registerId,
          rangeLabel: `${format(new Date(selectedShift.startTime), 'dd MMM yy HH:mm')}`,
          entries,
        },
        settings?.printer?.printerName,
      );
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to print journal',
        variant: 'destructive',
      });
    }
  };

  // Auto-generate report when a specific shift is selected
  useEffect(() => {
    if (filters.shiftId && filters.shiftId !== 'all') {
      generateReport();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.shiftId]);

  const loadUsersByDateRange = async () => {
    try {
      const users = await shiftService.getUsersByDateRange(
        filters.dateFrom,
        filters.dateTo
      );
      setAvailableUsers(users || []);
      console.log('Loaded users for date range:', users);
    } catch (error) {
      console.error('Failed to load users by date range:', error);
      setAvailableUsers([]);
    }
  };

  const loadTillsByDateRange = async () => {
    try {
      const tills = await shiftService.getTillsByDateRange(
        filters.dateFrom,
        filters.dateTo
      );
      setAvailableTills(tills || []);
      console.log('Loaded tills for date range:', tills);
    } catch (error) {
      console.error('Failed to load tills by date range:', error);
      // Fallback to default tills
      setAvailableTills(['1', '2', '3']);
    }
  };

  const loadAvailableShifts = async (autoSelect = false) => {
    try {
      const shifts = await shiftService.getShiftsByDateRange({
        startDate: filters.dateFrom,
        endDate: filters.dateTo
      });

      const shiftsArray = (shifts || []) as any[];
      setAvailableShifts(shiftsArray);

      if (autoSelect) {
        // Auto-select the most recent CLOSED shift and generate its report
        const lastClosed = shiftsArray
          .filter((s: any) => s.status === 'CLOSED')
          .sort((a: any, b: any) => new Date(b.endTime || b.startTime).getTime() - new Date(a.endTime || a.startTime).getTime())[0];
        if (lastClosed) {
          setFilters(prev => ({ ...prev, shiftId: lastClosed.id }));
        }
      }
    } catch (error) {
      console.error('Failed to load shifts:', error);
      setAvailableShifts([]);
    }
  };

  const generateReport = async () => {
    setLoading(true);
    try {
      // Fetch sales data with pagination (backend limit is 1000)
      // Note: Backend uses startDate/endDate, not dateFrom/dateTo
      let allSales: any[] = [];
      let currentPage = 1;
      let hasMore = true;

      // Fetch all pages
      while (hasMore) {
        const result = await salesService.getSales(currentPage, 1000, {
          startDate: filters.dateFrom,
          endDate: filters.dateTo
        });

        const pageData = Array.isArray(result) ? result : result.data;
        allSales = [...allSales, ...pageData];

        // Show progress for multiple pages
        if (currentPage > 1) {
          console.log(`Fetched page ${currentPage}, total records: ${allSales.length}`);
        }

        // Check if there are more pages
        if (!Array.isArray(result) && result.meta) {
          hasMore = result.meta.hasNextPage;
          currentPage++;
        } else {
          hasMore = false;
        }

        // Safety break to prevent infinite loops
        if (currentPage > 100) {
          console.warn('Reached maximum page limit (100)');
          toast({
            title: 'Warning',
            description: 'Fetched maximum allowed pages (100,000 records)',
            variant: 'default'
          });
          break;
        }
      }

      // Fetch approved petty cash for this date range
      let pettyCashExpenses: any[] = [];
      try {
        const pcResult = await pettyCashService.getTransactions({
          status: PettyCashStatus.APPROVED,
          startDate: filters.dateFrom,
          endDate: filters.dateTo,
          limit: 500,
        });
        pettyCashExpenses = pcResult.data || [];
      } catch {
        // non-fatal — report without petty cash
      }

      const sales = allSales;

      // Filter by user if selected (ignore "all")
      let filteredSales = sales;
      if (filters.userId && filters.userId !== 'all') {
        filteredSales = sales.filter((s: any) => s.userId === filters.userId || s.cashierId === filters.userId);
      }

      // Filter by shift if selected (ignore "all")
      if (filters.shiftId && filters.shiftId !== 'all') {
        filteredSales = filteredSales.filter((s: any) => s.shiftId === filters.shiftId);
      }

      // Note: Till filtering removed because backend doesn't store tillNumber with shifts
      // If you need till filtering, update the backend schema to include tillNumber
      // Filter by till if selected (ignore "all")
      // if (filters.tillNo && filters.tillNo !== 'all') {
      //   filteredSales = filteredSales.filter((s: any) => {
      //     // Try to match shift's till number if available
      //     const shift = availableShifts.find(sh => sh.id === s.shiftId);
      //     return shift?.tillNumber === filters.tillNo;
      //   });
      // }

      // Check if there are any sales
      if (!filteredSales || filteredSales.length === 0) {
        toast({
          title: 'No Data Found',
          description: 'No transactions found for the selected filters',
          variant: 'destructive'
        });
        setReportData(null);
        setReportText('');
        setLoading(false);
        return;
      }

      // Find selected shift data for float reconciliation
      const selectedShift = (filters.shiftId && filters.shiftId !== 'all')
        ? availableShifts.find((s: any) => s.id === filters.shiftId)
        : null;

      // Process sales data to build report
      const reportData = await processSalesData(filteredSales, pettyCashExpenses, selectedShift);
      setReportData(reportData);

      // Generate text version
      const text = generateEndOfDayReportText(reportData);
      setReportText(text);

      toast({
        title: 'Report Generated',
        description: `Found ${filteredSales.length} transactions`
      });
    } catch (error: any) {
      console.error('Failed to generate report:', error);
      toast({
        title: 'Error generating report',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const processSalesData = async (sales: any[], pettyCashExpenses: any[] = [], selectedShift: any = null): Promise<EndOfDayReportData> => {
    // Initialize counters
    let creditCardCount = 0, creditCardAmount = 0;
    let debitCardCount = 0, debitCardAmount = 0;
    let cashCount = 0, cashAmount = 0;
    let voucherCount = 0, voucherAmount = 0;
    let otherCount = 0, otherAmount = 0;

    const departmentMap: Map<string, { count: number; refund: number; sales: number }> = new Map();
    const hourlyMap: Map<string, { items: number; refund: number; sales: number }> = new Map();
    const vatMap: Map<string, { vatAmount: number; totalAmount: number }> = new Map();

    let totalVoids = 0;
    let voidItems = 0;
    let voidAmount = 0;
    let totalRefunds = 0;

    // Process each sale
    sales.forEach(sale => {
      const saleTotal = sale.total || 0;
      const saleTime = new Date(sale.createdAt);
      const hour = `${saleTime.getHours().toString().padStart(2, '0')}:00 - ${(saleTime.getHours() + 1).toString().padStart(2, '0')}:00`;

      // Handle voids and refunds
      if (sale.status === 'VOIDED') {
        totalVoids++;
        voidItems += sale.items?.length || 0;
        voidAmount += saleTotal;
        return;
      }

      if (sale.status === 'REFUNDED') {
        totalRefunds += saleTotal;
      }

      // Process payments - handle both array and single payment
      const payments = Array.isArray(sale.payments) ? sale.payments : (sale.paymentMethod ? [{ method: sale.paymentMethod, amount: saleTotal, cardType: sale.cardType }] : []);

      if (payments.length > 0) {
        payments.forEach((payment: any) => {
          const amount = payment.amount || 0;
          const method = (payment.method || '').toUpperCase();

          if (method === 'CARD' || method === 'CREDIT_CARD' || method === 'DEBIT_CARD') {
            if (payment.cardType === 'CREDIT' || method === 'CREDIT_CARD') {
              creditCardCount++;
              creditCardAmount += amount;
            } else {
              debitCardCount++;
              debitCardAmount += amount;
            }
          } else if (method === 'CASH') {
            cashCount++;
            cashAmount += amount;
          } else if (method === 'VOUCHER' || method === 'GIFT_CARD') {
            voucherCount++;
            voucherAmount += amount;
          } else if (amount > 0) {
            otherCount++;
            otherAmount += amount;
          }
        });
      } else if (saleTotal > 0) {
        // If no payment info, assume cash
        cashCount++;
        cashAmount += saleTotal;
      }

      // Process items for department breakdown
      const items = sale.items || sale.saleItems || [];
      items.forEach((item: any) => {
        const category = item.product?.category?.name || item.category?.name || 'UNCATEGORIZED';
        const itemPrice = (item.price || item.unitPrice || 0) * (item.quantity || 1);

        if (!departmentMap.has(category)) {
          departmentMap.set(category, { count: 0, refund: 0, sales: 0 });
        }

        const dept = departmentMap.get(category)!;
        dept.count += (item.quantity || 1);
        if (sale.status === 'REFUNDED') {
          dept.refund += itemPrice;
        } else {
          dept.sales += itemPrice;
        }
      });

      // Hourly breakdown
      if (!hourlyMap.has(hour)) {
        hourlyMap.set(hour, { items: 0, refund: 0, sales: 0 });
      }

      const hourData = hourlyMap.get(hour)!;
      hourData.items += items.length;
      if (sale.status === 'REFUNDED') {
        hourData.refund += saleTotal;
      } else {
        hourData.sales += saleTotal;
      }

      // VAT breakdown (simplified)
      const vatExempt = items.filter((i: any) => i.product?.isVATExempt || i.isVATExempt).reduce((sum: number, i: any) => {
        const price = i.price || i.unitPrice || 0;
        const qty = i.quantity || 1;
        return sum + (price * qty);
      }, 0);
      const vatStandard = saleTotal - vatExempt;

      if (!vatMap.has('0.00%')) {
        vatMap.set('0.00%', { vatAmount: 0, totalAmount: 0 });
      }
      if (!vatMap.has('Exmt')) {
        vatMap.set('Exmt', { vatAmount: 0, totalAmount: 0 });
      }

      if (vatExempt > 0) {
        const exemptData = vatMap.get('Exmt')!;
        exemptData.totalAmount += vatExempt;
      }

      if (vatStandard > 0) {
        const standardData = vatMap.get('0.00%')!;
        standardData.vatAmount += 0;
        standardData.totalAmount += vatStandard;
      }
    });

    // Convert maps to arrays
    const departments = Array.from(departmentMap.entries()).map(([name, data]) => ({
      name,
      itemCount: data.count,
      refundAmount: data.refund,
      salesAmount: data.sales
    }));

    const hourlySales = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({
        hour,
        items: data.items,
        refund: data.refund,
        sales: data.sales
      }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    const vatBreakdown = Array.from(vatMap.entries()).map(([rate, data]) => ({
      rate,
      vatAmount: data.vatAmount,
      totalAmount: data.totalAmount
    }));

    const totalSales = creditCardAmount + debitCardAmount + cashAmount + voucherAmount + otherAmount;

    // Find selected user name
    const selectedUser = availableUsers.find(u => u.id === filters.userId);
    const operatorName = selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName}` : 'All Users';

    // Build complete report data
    const storeName = settings.general.storeName || 'Store';
    const report: EndOfDayReportData = {
      shopName: storeName,
      shopAddress: [storeName, ...(settings.general.address?.split('\n') || [])],
      shopEmail: settings.general.email || '',

      tillNo: filters.tillNo && filters.tillNo !== 'all' ? filters.tillNo : '1',
      operator: operatorName,
      operatorId: filters.userId && filters.userId !== 'all' ? filters.userId.substring(0, 10) : 'All',
      dateFrom: filters.dateFrom ? format(new Date(filters.dateFrom + ' 00:00:00'), 'yyyy-MM-dd HH:mm:ss') : '',
      dateTo: filters.dateTo ? format(new Date(filters.dateTo + ' 23:59:59'), 'yyyy-MM-dd HH:mm:ss') : '0000-00-00 00:00:00',

      payments: {
        creditCard: { count: creditCardCount, amount: creditCardAmount },
        debitCard: { count: debitCardCount, amount: debitCardAmount },
        cash: { count: cashCount, amount: cashAmount },
        voucher: { count: voucherCount, amount: voucherAmount },
        other: { count: otherCount, amount: otherAmount }
      },

      cashDetails: {
        floatAmount: selectedShift?.openingFloat ?? 0,
        totalCash: cashAmount,
        returns: totalRefunds,
        staffing: 0,
        payout: {
          count: pettyCashExpenses.length,
          amount: pettyCashExpenses.reduce((s: number, t: any) => s + Number(t.amount), 0),
        },
        payIn: { count: 0, amount: 0 },
        cashLift: { count: 0, amount: 0 },
        cashback: { count: 0, amount: 0 },
        accountPay: { count: 0, amount: 0 },
        tillDifference: selectedShift?.variance ?? 0,
      },

      departments,
      vatBreakdown,

      exceptions: {
        totalSales: { count: sales.length, amount: totalSales },
        xReading: 0,
        noSale: 0,
        promotions: { count: 0, amount: 0 },
        voids: { count: totalVoids, items: voidItems, amount: voidAmount }
      },

      voidDetails: [],
      discounts: [],
      discountTotal: 0,
      hourlySales,
      promotionDetails: [],
      staffingDetails: [],
      deliveryDetails: [],
      accountPayments: []
    };

    return report;
  };

  const handlePrint = () => {
    if (reportData) {
      printEndOfDayReport(reportData);
    } else {
      toast({
        title: 'No Report',
        description: 'Generate a report first',
        variant: 'destructive'
      });
    }
  };

  const handleDownload = () => {
    if (reportData) {
      downloadEndOfDayReport(reportData);
      toast({
        title: 'Downloaded',
        description: 'Report has been downloaded'
      });
    } else {
      toast({
        title: 'No Report',
        description: 'Generate a report first',
        variant: 'destructive'
      });
    }
  };

  const handleEmail = async () => {
    if (reportData) {
      const result = await emailEndOfDayReport(reportData, '');
      toast({
        title: result.success ? 'Success' : 'Error',
        description: result.message
      });
    } else {
      toast({
        title: 'No Report',
        description: 'Generate a report first',
        variant: 'destructive'
      });
    }
  };

  return (
    <MainLayout pageTitle="Day End Report">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Calculator className="h-8 w-8 text-blue-600" />
            Day End Report
          </h1>
          <p className="text-gray-600">
            Day End Report Manager
          </p>
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
              {/* From Date */}
              <div>
                <Label htmlFor="dateFrom">From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                />
              </div>

              {/* To Date */}
              <div>
                <Label htmlFor="dateTo">To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                />
              </div>

              {/* Till No Dropdown */}
              <div>
                <Label htmlFor="tillNo">Till No</Label>
                <Select
                  value={filters.tillNo}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, tillNo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Till" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tills</SelectItem>
                    {availableTills.map((till) => (
                      <SelectItem key={till} value={till}>
                        Till {till}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Dropdown */}
              <div>
                <Label htmlFor="userId">User</Label>
                <Select
                  value={filters.userId}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, userId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shift Dropdown */}
              <div>
                <Label htmlFor="shift">Shift</Label>
                <Select
                  value={filters.shiftId}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, shiftId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Shifts</SelectItem>
                    {availableShifts.map((shift) => (
                      <SelectItem key={shift.id} value={shift.id}>
                        {shift.shiftNumber} - {shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : 'Unknown'} - {format(new Date(shift.startTime), 'MMM dd, HH:mm')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={() => loadAvailableShifts()} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button onClick={generateReport} disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Consolidated Master Report */}
        {summary && summary.shiftCount > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <PoundSterling className="h-3.5 w-3.5" /> Total Revenue
                </div>
                <div className="text-xl font-bold text-gray-900">{gbp(summary.totalRevenue)}</div>
                <div className="text-xs text-gray-400 mt-0.5">{summary.totalSales} sales · {summary.shiftCount} shifts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Receipt className="h-3.5 w-3.5" /> Total Tax (VAT)
                </div>
                <div className="text-xl font-bold text-gray-900">{gbp(summary.totalTax)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Percent className="h-3.5 w-3.5" /> Total Discounts
                </div>
                <div className="text-xl font-bold text-gray-900">{gbp(summary.totalDiscounts)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                  <Calculator className="h-3.5 w-3.5" /> Non-Cash Tenders
                </div>
                <div className="text-xl font-bold text-gray-900">{gbp(summary.totalNonCashTenders)}</div>
                <div className="text-xs text-gray-400 mt-0.5">Card {gbp(summary.totalCardTender)} · Gift {gbp(summary.totalGiftCard)}</div>
              </CardContent>
            </Card>
            {/* Variance — managers only */}
            {isManager && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Scale className="h-3.5 w-3.5" /> Total Variance
                  </div>
                  <div className={`text-xl font-bold ${summary.totalVariance === 0 ? 'text-gray-900' : summary.totalVariance > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {summary.totalVariance >= 0 ? '+' : ''}{gbp(summary.totalVariance)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Historical Shifts Table */}
        {availableShifts.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3">Recent Shifts</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500 text-xs uppercase">
                      <th className="pb-2 pr-2 w-6"></th>
                      <th className="pb-2 pr-4">Shift</th>
                      <th className="pb-2 pr-4">Staff</th>
                      <th className="pb-2 pr-4">Date</th>
                      <th className="pb-2 pr-4">Status</th>
                      <th className="pb-2 pr-4 text-right">Opening Float</th>
                      {isManager && <th className="pb-2 pr-4 text-right">Expected</th>}
                      <th className="pb-2 pr-4 text-right">Declared</th>
                      {isManager && <th className="pb-2 text-right">Variance</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {availableShifts
                      .slice()
                      .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
                      .map((shift: any) => {
                        const variance = shift.variance ?? null;
                        const isExpanded = expandedShiftId === shift.id;
                        const resolved = !!shift.auditResolutionNote;
                        const colSpan = isManager ? 9 : 7;
                        return (
                          <React.Fragment key={shift.id}>
                          <tr
                            className={`border-b cursor-pointer hover:bg-blue-50 transition-colors ${filters.shiftId === shift.id ? 'bg-blue-50' : ''}`}
                            onClick={() => setFilters(prev => ({ ...prev, shiftId: shift.id }))}
                          >
                            <td className="py-2 pr-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); setExpandedShiftId(isExpanded ? null : shift.id); }}
                                className="text-gray-400 hover:text-gray-700"
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="py-2 pr-4 font-mono text-xs">{shift.shiftNumber}</td>
                            <td className="py-2 pr-4">{shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : '—'}</td>
                            <td className="py-2 pr-4">{format(new Date(shift.startTime), 'dd MMM yy HH:mm')}</td>
                            <td className="py-2 pr-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${shift.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {shift.status}
                              </span>
                            </td>
                            <td className="py-2 pr-4 text-right">{gbp(shift.openingFloat ?? 0)}</td>
                            {isManager && (
                              <td className="py-2 pr-4 text-right">{shift.expectedFloat != null ? gbp(shift.expectedFloat) : '—'}</td>
                            )}
                            <td className="py-2 pr-4 text-right">{(shift.declaredCash ?? shift.closingFloat) != null ? gbp(shift.declaredCash ?? shift.closingFloat) : '—'}</td>
                            {isManager && (
                              <td className="py-2 text-right">
                                {variance === null ? (
                                  <span className="text-gray-400">—</span>
                                ) : (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setAuditShift(shift); setAuditNote(shift.auditResolutionNote || ''); }}
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors ${variance === 0 ? 'bg-gray-100 text-gray-500' : variance > 0 ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
                                    title={resolved ? 'Variance reviewed — click to view' : 'Click to review variance'}
                                  >
                                    {variance >= 0 ? '+' : ''}{gbp(variance)}
                                    {variance !== 0 && (resolved ? ' ✓' : ' !')}
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                          {isExpanded && (
                            <tr className="bg-gray-50 border-b">
                              <td colSpan={colSpan} className="px-6 py-3">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-xs">
                                  <div className="flex justify-between"><span className="text-gray-500">Card Expected</span><span className="font-medium">{shift.cardExpected != null ? gbp(shift.cardExpected) : '—'}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Card Actual (Z-Read)</span><span className="font-medium">{shift.cardActual != null ? gbp(shift.cardActual) : '—'}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Gift Card Sales</span><span className="font-medium">{gbp(shift.giftCardSales ?? 0)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Layaway Deposits</span><span className="font-medium">{gbp(shift.layawayDeposits ?? 0)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Pay-Ins</span><span className="font-medium text-emerald-600">{gbp(shift.cashPayIns ?? 0)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Pay-Outs</span><span className="font-medium text-red-600">{gbp(shift.cashPayOuts ?? 0)}</span></div>
                                  <div className="flex justify-between"><span className="text-gray-500">Cash Refunds</span><span className="font-medium">{gbp(shift.cashRefunds ?? 0)}</span></div>
                                  {isManager && shift.cardVariance != null && (
                                    <div className="flex justify-between"><span className="text-gray-500">Card Variance</span><span className={`font-medium ${shift.cardVariance === 0 ? 'text-gray-700' : 'text-red-600'}`}>{gbp(shift.cardVariance)}</span></div>
                                  )}
                                </div>
                                {shift.varianceReason && (
                                  <div className="mt-2 text-xs"><span className="text-gray-500">Cashier reason: </span><span className="text-gray-800 italic">"{shift.varianceReason}"</span></div>
                                )}
                              </td>
                            </tr>
                          )}
                          </React.Fragment>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Report Display and Actions */}
        {reportText && (
          <>
            {/* Action Buttons */}
            <div className="flex gap-3 mb-4">
              <Button onClick={handlePrint} variant="outline">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleEmail} variant="outline">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              {selectedShift && (
                <>
                  <Button onClick={handleReprintZReport} variant="outline">
                    <Receipt className="h-4 w-4 mr-2" />
                    Z-Report
                  </Button>
                  <Button onClick={handlePrintJournal} variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Detailed Journal
                  </Button>
                </>
              )}
            </div>

            {/* Report Display - Modern Receipt UI */}
            <Card className="shadow-lg">
              <CardContent className="p-0">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
                  {/* Receipt Container */}
                  <div className="max-w-2xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
                    {/* Receipt Header - Shop Details */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 text-center">
                      <h2 className="text-2xl font-bold mb-2">{reportData?.shopName}</h2>
                      <div className="text-sm opacity-90 space-y-1">
                        {reportData?.shopAddress.slice(1).map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                        <div className="mt-2">{reportData?.shopEmail}</div>
                      </div>
                    </div>

                    {/* Receipt Body */}
                    <div className="p-6 space-y-6">
                      {/* Report Meta Info */}
                      <div className="border-b-2 border-dashed border-gray-300 pb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-600">Till No {reportData?.tillNo}</span>
                          <span className="text-sm font-bold text-blue-600">Shift End Report</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div><span className="text-gray-600">Operator:</span> <span className="font-medium">{reportData?.operator}</span></div>
                          <div className="text-right"><span className="text-gray-600">ID:</span> <span className="font-medium">{reportData?.operatorId}</span></div>
                          <div><span className="text-gray-600">From:</span> <span className="font-medium">{reportData?.dateFrom.split(' ')[0]}</span></div>
                          <div className="text-right"><span className="text-gray-600">To:</span> <span className="font-medium">{reportData?.dateTo.split(' ')[0]}</span></div>
                        </div>
                      </div>

                      {/* Payment Types */}
                      <div>
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                          <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm mr-2">Payment Summary</span>
                        </h3>
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-200 text-xs text-gray-600">
                              <th className="text-left py-2">Type</th>
                              <th className="text-center py-2">Count</th>
                              <th className="text-right py-2">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="text-sm">
                            <tr className="border-b border-gray-100">
                              <td className="py-2 text-gray-700">Credit Card</td>
                              <td className="text-center text-gray-600">{reportData?.payments.creditCard.count}</td>
                              <td className="text-right font-semibold">£{reportData?.payments.creditCard.amount.toFixed(2)}</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="py-2 text-gray-700">Debit Card</td>
                              <td className="text-center text-gray-600">{reportData?.payments.debitCard.count}</td>
                              <td className="text-right font-semibold">£{reportData?.payments.debitCard.amount.toFixed(2)}</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="py-2 text-gray-700">Cash</td>
                              <td className="text-center text-gray-600">{reportData?.payments.cash.count}</td>
                              <td className="text-right font-semibold">£{reportData?.payments.cash.amount.toFixed(2)}</td>
                            </tr>
                            <tr className="border-b border-gray-100">
                              <td className="py-2 text-gray-700">Voucher</td>
                              <td className="text-center text-gray-600">{reportData?.payments.voucher.count}</td>
                              <td className="text-right font-semibold">£{reportData?.payments.voucher.amount.toFixed(2)}</td>
                            </tr>
                            {reportData && reportData.payments.other.amount > 0 && (
                              <tr className="border-b border-gray-100">
                                <td className="py-2 text-gray-700">Other</td>
                                <td className="text-center text-gray-600">{reportData.payments.other.count}</td>
                                <td className="text-right font-semibold">£{reportData.payments.other.amount.toFixed(2)}</td>
                              </tr>
                            )}
                            <tr className="bg-blue-50 font-bold">
                              <td className="py-3 text-gray-800">Total</td>
                              <td className="text-center"></td>
                              <td className="text-right text-blue-600 text-lg">£{(
                                reportData?.payments.creditCard.amount +
                                reportData?.payments.debitCard.amount +
                                reportData?.payments.cash.amount +
                                reportData?.payments.voucher.amount +
                                reportData?.payments.other.amount
                              ).toFixed(2)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Cash in Till */}
                      <div className="border-t-2 border-dashed border-gray-300 pt-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                          <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm mr-2">Cash in Till</span>
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between py-1">
                            <span className="text-gray-600">Float Amount</span>
                            <span className="font-semibold">£{reportData?.cashDetails.floatAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between py-1 bg-gray-50 px-2 rounded">
                            <span className="text-gray-700 font-medium">Total Cash</span>
                            <span className="font-bold text-green-600">£{reportData?.cashDetails.totalCash.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-gray-600">Returns</span>
                            <span className="font-semibold text-red-600">-£{reportData?.cashDetails.returns.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span className="text-gray-600">Till Difference</span>
                            <span className={`font-bold ${reportData?.cashDetails.tillDifference === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              £{reportData?.cashDetails.tillDifference.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Departments */}
                      {reportData && reportData.departments.length > 0 && (
                        <div className="border-t-2 border-dashed border-gray-300 pt-4">
                          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                            <span className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm mr-2">Departments</span>
                          </h3>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 text-xs text-gray-600">
                                <th className="text-left py-2">Department</th>
                                <th className="text-center py-2">Items</th>
                                <th className="text-right py-2">Sales</th>
                              </tr>
                            </thead>
                            <tbody className="text-sm">
                              {reportData.departments.map((dept, idx) => (
                                <tr key={idx} className="border-b border-gray-100">
                                  <td className="py-2 text-gray-700">{dept.name}</td>
                                  <td className="text-center text-gray-600">{dept.itemCount}</td>
                                  <td className="text-right font-semibold">£{dept.salesAmount.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Hourly Sales */}
                      {reportData && reportData.hourlySales.length > 0 && (
                        <div className="border-t-2 border-dashed border-gray-300 pt-4">
                          <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm mr-2">Hourly Breakdown</span>
                          </h3>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {reportData.hourlySales.map((hour, idx) => (
                              <div key={idx} className="flex justify-between bg-gray-50 p-2 rounded">
                                <span className="text-gray-600 font-medium">{hour.hour}</span>
                                <span className="font-semibold text-gray-800">£{hour.sales.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Exceptions */}
                      <div className="border-t-2 border-dashed border-gray-300 pt-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                          <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm mr-2">Exceptions</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-blue-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Total Sales</div>
                            <div className="text-lg font-bold text-blue-600">{reportData?.exceptions.totalSales.count}</div>
                            <div className="text-sm text-gray-700">£{reportData?.exceptions.totalSales.amount.toFixed(2)}</div>
                          </div>
                          <div className="bg-red-50 p-3 rounded-lg">
                            <div className="text-xs text-gray-600 mb-1">Voids</div>
                            <div className="text-lg font-bold text-red-600">{reportData?.exceptions.voids.count}</div>
                            <div className="text-sm text-gray-700">£{reportData?.exceptions.voids.amount.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Receipt Footer */}
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white p-4 text-center">
                      <div className="text-xs opacity-75">Powered By TrueDesk</div>
                      <div className="text-xs opacity-60 mt-1">Generated: {new Date().toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty State */}
        {!reportText && !loading && (
          <Card>
            <CardContent className="pt-12 pb-12 text-center">
              <Calculator className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Report Generated
              </h3>
              <p className="text-gray-600 mb-6">
                Select date range and filters, then click Search to generate an end of day report
              </p>
              <Button onClick={generateReport} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Variance Audit Modal */}
        <Dialog open={!!auditShift} onOpenChange={(open) => !open && setAuditShift(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                Variance Review — {auditShift?.shiftNumber}
              </DialogTitle>
              <DialogDescription>
                Review the cash variance and record a resolution note for the audit trail.
              </DialogDescription>
            </DialogHeader>
            {auditShift && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Expected</div>
                    <div className="font-semibold">{auditShift.expectedFloat != null ? gbp(auditShift.expectedFloat) : '—'}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Declared</div>
                    <div className="font-semibold">{(auditShift.declaredCash ?? auditShift.closingFloat) != null ? gbp(auditShift.declaredCash ?? auditShift.closingFloat) : '—'}</div>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <div className="text-xs text-gray-500">Variance</div>
                    <div className={`font-semibold ${(auditShift.variance ?? 0) === 0 ? 'text-gray-900' : (auditShift.variance ?? 0) > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {(auditShift.variance ?? 0) >= 0 ? '+' : ''}{gbp(auditShift.variance ?? 0)}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="text-xs font-semibold text-amber-700 mb-1">Cashier's reason</div>
                  <div className="text-sm text-gray-800">
                    {auditShift.varianceReason ? `"${auditShift.varianceReason}"` : <span className="text-gray-400 italic">No reason recorded</span>}
                  </div>
                </div>

                {auditShift.managerOverrideAt && (
                  <p className="text-xs text-gray-500">
                    Closed with a manager PIN override on {format(new Date(auditShift.managerOverrideAt), 'dd MMM yy HH:mm')}.
                  </p>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="auditNote" className="text-sm font-medium">Audit Resolution Note</Label>
                  <Textarea
                    id="auditNote"
                    value={auditNote}
                    onChange={(e) => setAuditNote(e.target.value)}
                    rows={3}
                    placeholder="Record how this variance was investigated / resolved…"
                    className="resize-none"
                  />
                  {auditShift.auditResolvedAt && (
                    <p className="text-xs text-gray-400">
                      Last resolved {format(new Date(auditShift.auditResolvedAt), 'dd MMM yy HH:mm')}
                      {auditShift.auditResolvedBy ? ` by ${auditShift.auditResolvedBy.firstName} ${auditShift.auditResolvedBy.lastName}` : ''}.
                    </p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAuditShift(null)} disabled={auditSaving}>Cancel</Button>
              <Button onClick={handleSaveAudit} disabled={auditSaving || !auditNote.trim()}>
                {auditSaving ? 'Saving…' : 'Save Note'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default CashUpPage;
