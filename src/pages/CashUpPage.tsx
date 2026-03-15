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
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { salesService } from '@/services/salesService';
import { shiftService } from '@/services/shiftService';
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
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<EndOfDayReportData | null>(null);
  const [reportText, setReportText] = useState<string>('');

  const [filters, setFilters] = useState<FilterState>({
    dateFrom: format(new Date(), 'yyyy-MM-dd'),
    dateTo: format(new Date(), 'yyyy-MM-dd'),
    tillNo: '',
    userId: '',
    shiftId: ''
  });

  const [availableShifts, setAvailableShifts] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableTills, setAvailableTills] = useState<string[]>([]);

  // Load data when date range changes
  useEffect(() => {
    if (filters.dateFrom && filters.dateTo) {
      loadAvailableShifts();
      loadUsersByDateRange();
      loadTillsByDateRange();
    }
  }, [filters.dateFrom, filters.dateTo]);

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

  const loadAvailableShifts = async () => {
    try {
      const shifts = await shiftService.getShiftsByDateRange({
        startDate: filters.dateFrom,
        endDate: filters.dateTo
      });

      const shiftsArray = shifts || [];
      setAvailableShifts(shiftsArray);
      console.log('Loaded shifts:', shiftsArray);
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

      // Process sales data to build report
      const reportData = await processSalesData(filteredSales);
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

  const processSalesData = async (sales: any[]): Promise<EndOfDayReportData> => {
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
    const report: EndOfDayReportData = {
      shopName: 'Andrew McCulloch Jewellers',
      shopAddress: [
        'Andrew McCulloch Jewellers',
        '7 The Square',
        'Beeston',
        'Nottingham',
        'NG9 2JG'
      ],
      shopEmail: 'has@mccullochjewellers.co.uk',

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
        floatAmount: 0,
        totalCash: cashAmount,
        returns: totalRefunds,
        staffing: 0,
        payout: { count: 0, amount: 0 },
        payIn: { count: 0, amount: 0 },
        cashLift: { count: 0, amount: 0 },
        cashback: { count: 0, amount: 0 },
        accountPay: { count: 0, amount: 0 },
        tillDifference: 0
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
                      <div className="text-xs opacity-75">Powered By MCCL POS System</div>
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
      </div>
    </MainLayout>
  );
};

export default CashUpPage;
