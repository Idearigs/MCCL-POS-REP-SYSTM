import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import VoidTransactionDialog from '@/components/sales/VoidTransactionDialog';
import { XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Eye, Printer, RotateCcw, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { salesService, Sale, SaleFilters as SaleFiltersType } from '@/services/salesService';
import SalesStatsCards from '@/components/sales/SalesStatsCards';
import SalesFilters, { SalesFilterValues } from '@/components/sales/SalesFilters';
import SaleDetailModal from '@/components/sales/SaleDetailModal';
import RefundSaleDialog from '@/components/sales/RefundSaleDialog';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/userService';
import { shiftService, Shift } from '@/services/shiftService';
import ShiftList from '@/components/shifts/ShiftList';
import ShiftReport from '@/components/shifts/ShiftReport';
import ProductSalesReport from '@/components/sales/ProductSalesReport';

const SalesPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);
  const [isRefundProcessing, setIsRefundProcessing] = useState(false);

  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [voidingSale, setVoidingSale] = useState<Sale | null>(null);
  const [isVoidProcessing, setIsVoidProcessing] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const [cashiers, setCashiers] = useState<{id: string; name: string}[]>([]);

  // Shift management
  const [viewMode, setViewMode] = useState<'sales' | 'shifts' | 'products'>('sales');
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [selectedShiftForReport, setSelectedShiftForReport] = useState<string | null>(null);

  const { auth } = useAuth();

  // Statistics
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [weekRevenue, setWeekRevenue] = useState(0);
  const [weekSales, setWeekSales] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [monthSales, setMonthSales] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);

  // Filters
  const [filters, setFilters] = useState<SalesFilterValues>({
    search: '',
    paymentMethod: 'all',
    paymentStatus: 'all',
    status: 'all',
    dateFrom: undefined,
    dateTo: undefined,
    cashierId: 'all',
    shift: 'all'
  });

  const { toast } = useToast();

  // Load sales data
  useEffect(() => {
    loadSales();
    loadStatistics();
    loadCashiers();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [sales, filters]);

  // Load shifts when date range changes for filtering
  const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
  useEffect(() => {
    if (filters.dateFrom && filters.dateTo) {
      loadAvailableShifts();
    }
  }, [filters.dateFrom, filters.dateTo]);

  const loadAvailableShifts = async () => {
    if (!filters.dateFrom || !filters.dateTo) return;

    try {
      const shiftsData = await shiftService.getShiftsByDateRange({
        startDate: filters.dateFrom.toISOString(),
        endDate: filters.dateTo.toISOString(),
      });
      setAvailableShifts(shiftsData || []);
    } catch (error) {
      console.error('Error loading available shifts:', error);
      setAvailableShifts([]);
    }
  };

  // Load shifts when switching to shifts view
  useEffect(() => {
    if (viewMode === 'shifts') {
      loadShifts();
    }
  }, [viewMode]);

  const loadSales = async () => {
    try {
      setLoading(true);

      // For STAFF users, filter by their cashier ID
      const filters: SaleFiltersType = {};
      if (auth.user?.role === 'STAFF') {
        filters.cashierId = auth.user.id;
      }

      const response = await salesService.getSales(1, 100, filters); // Load sales with max limit
      setSales(response.data || []);
    } catch (error) {
      console.error('Error loading sales:', error);
      toast({
        title: 'Error',
        description: 'Failed to load sales data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await salesService.getSalesStats();
      setTodayRevenue(stats.revenueToday || 0);
      setTodaySales(stats.salesToday || 0);
      setWeekRevenue(stats.revenueThisMonth || 0); // Adjust based on your API
      setWeekSales(stats.salesThisMonth || 0);
      setMonthRevenue(stats.revenueThisMonth || 0);
      setMonthSales(stats.salesThisMonth || 0);
      setTotalRevenue(stats.totalSalesAmount || 0); // Fixed: Use totalSalesAmount instead of totalRevenue
      setTotalSales(stats.totalSales || 0);
    } catch (error) {
      console.error('Error loading statistics:', error);
      // Continue without statistics
    }
  };

  const loadCashiers = async () => {
    try {
      const response = await userService.getUsers();
      const usersData = response.data || [];
      const cashierList = usersData.map((user: any) => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown'
      }));
      setCashiers(cashierList);
    } catch (error) {
      console.error('Failed to load cashiers:', error);
      // Continue without cashiers list
    }
  };

  const loadShifts = async () => {
    // Only load shifts if date range is provided
    if (!filters.dateFrom || !filters.dateTo) {
      toast({
        title: 'Date Range Required',
        description: 'Please select a date range to view shifts',
        variant: 'destructive'
      });
      return;
    }

    try {
      setShiftsLoading(true);
      const shiftsData = await shiftService.getShiftsByDateRange({
        startDate: filters.dateFrom.toISOString(),
        endDate: filters.dateTo.toISOString(),
        userId: filters.cashierId !== 'all' ? filters.cashierId : undefined,
      });
      setShifts(shiftsData);
    } catch (error) {
      console.error('Error loading shifts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shifts',
        variant: 'destructive'
      });
    } finally {
      setShiftsLoading(false);
    }
  };

  const handleViewShift = (shift: Shift) => {
    setSelectedShiftForReport(shift.id);
  };

  const applyFilters = () => {
    let result = [...sales];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(sale =>
        sale.receiptNumber?.toLowerCase().includes(searchLower) ||
        sale.customerName?.toLowerCase().includes(searchLower) ||
        sale.id.toLowerCase().includes(searchLower)
      );
    }

    // Payment method filter
    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      result = result.filter(sale => sale.paymentMethod === filters.paymentMethod);
    }

    // Payment status filter
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      result = result.filter(sale => sale.paymentStatus === filters.paymentStatus);
    }

    // Sale status filter
    if (filters.status && filters.status !== 'all') {
      result = result.filter(sale => sale.status === filters.status);
    }

    // Date range filter
    if (filters.dateFrom) {
      result = result.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate >= filters.dateFrom!;
      });
    }
    if (filters.dateTo) {
      result = result.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        const endOfDay = new Date(filters.dateTo!);
        endOfDay.setHours(23, 59, 59, 999);
        return saleDate <= endOfDay;
      });
    }

    // Cashier filter
    if (filters.cashierId && filters.cashierId !== 'all') {
      result = result.filter(sale => sale.cashierId === filters.cashierId);
    }

    // Shift filter - now using actual shift IDs
    if (filters.shift && filters.shift !== 'all') {
      result = result.filter(sale => {
        // Check if sale has a shiftId that matches the selected shift
        return (sale as any).shiftId === filters.shift;
      });
    }

    setFilteredSales(result);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today ${format(date, 'HH:mm')}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'dd MMM yyyy HH:mm');
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string; className?: string }> = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      COMPLETED: { variant: 'default', label: 'Success', className: 'bg-green-500 text-white hover:bg-green-600' },
      FAILED: { variant: 'destructive', label: 'Failed' },
      REFUNDED: { variant: 'outline', label: 'Refunded' },
      PARTIALLY_REFUNDED: { variant: 'outline', label: 'Partial' }
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return <Badge variant={config.variant} className={`text-xs ${config.className || ''}`}>{config.label}</Badge>;
  };

  const getSaleStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string; className?: string }> = {
      DRAFT: { variant: 'secondary', label: 'Draft' },
      COMPLETED: { variant: 'default', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      REFUNDED: { variant: 'outline', label: 'Refunded', className: 'border-orange-400 text-orange-700 bg-orange-50' },
      PARTIALLY_REFUNDED: { variant: 'outline', label: 'Part-Refunded', className: 'border-amber-400 text-amber-700 bg-amber-50' },
    };

    const config = statusConfig[status] || statusConfig.COMPLETED;
    return (
      <Badge variant={config.variant} className={`text-xs ${config.className ?? ''}`}>
        {config.label}
      </Badge>
    );
  };

  const getConditionSummary = (items: any[]): { brandNew: number; used: number } => {
    let brandNew = 0;
    let used = 0;
    (items || []).forEach(item => {
      if (!(item as any).isRepair) {
        const m = (item.notes || '').match(/CONDITION:(BRAND_NEW|USED)/);
        if (m?.[1] === 'BRAND_NEW') brandNew++;
        else if (m?.[1] === 'USED') used++;
      }
    });
    return { brandNew, used };
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      CASH: 'Cash',
      CARD: 'Card',
      BANK_TRANSFER: 'Transfer',
      CHEQUE: 'Cheque',
      DIGITAL_WALLET: 'Wallet',
      INSTALLMENT: 'Installment'
    };
    return methods[method] || method;
  };

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailModalOpen(true);
  };

  const handlePrintReceipt = async (saleId: string) => {
    try {
      // Get the sale details
      const sale = await salesService.getSaleById(saleId);

      // Generate invoice/receipt PDF using the invoice generator
      const { downloadInvoice } = await import('@/utils/invoiceGenerator');

      const invoiceData = {
        invoiceNumber: sale.receiptNumber || sale.saleNumber,
        date: new Date(sale.createdAt).toLocaleDateString('en-GB', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        customerName: sale.customerName || 'Walk-in Customer',
        customerPhone: undefined,
        customerEmail: undefined,
        customerAddress: undefined,
        items: sale.items.map(item => ({
          id: item.productId,
          name: item.productName,
          price: item.unitPrice,
          quantity: item.quantity,
          sku: item.productSku,
          discount: item.discountPercentage || 0
        })),
        subtotal: sale.subtotal,
        tax: sale.taxAmount,
        total: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
      };

      downloadInvoice(invoiceData);

      toast({
        title: 'Success',
        description: 'Receipt downloaded successfully'
      });
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast({
        title: 'Error',
        description: 'Failed to download receipt',
        variant: 'destructive'
      });
    }
  };


  const handleVoid = (sale: Sale) => {
    setVoidingSale(sale);
    setIsVoidDialogOpen(true);
  };

  const handleVoidConfirm = async (reason: string, details: string) => {
    if (!voidingSale) return;

    setIsVoidProcessing(true);
    try {
      await salesService.voidSale(voidingSale.id, reason, details);
      
      toast({
        title: 'Transaction Voided',
        description: `Sale ${voidingSale.receiptNumber} has been successfully voided.`,
      });

      setIsVoidDialogOpen(false);
      setVoidingSale(null);
      loadSales();
    } catch (error) {
      console.error('Error voiding sale:', error);
      toast({
        title: 'Error',
        description: 'Failed to void transaction. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsVoidProcessing(false);
    }
  };

  const handleRefund = (sale: Sale) => {
    setRefundingSale(sale);
    setIsDetailModalOpen(false);
    setIsRefundDialogOpen(true);
  };

  const handleConfirmRefund = async (refundData: any) => {
    try {
      setIsRefundProcessing(true);
      await salesService.refundSale(refundData.saleId, refundData);

      toast({
        title: 'Refund Processed',
        description: `Refund of ${formatCurrency(refundData.amount || 0)} has been processed successfully`
      });

      setIsRefundDialogOpen(false);
      setRefundingSale(null);

      // Reload data
      await loadSales();
      await loadStatistics();
    } catch (error) {
      console.error('Error processing refund:', error);
      toast({
        title: 'Error',
        description: 'Failed to process refund',
        variant: 'destructive'
      });
    } finally {
      setIsRefundProcessing(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const conditionLabel = (notes?: string) => {
        const m = (notes || '').match(/CONDITION:(BRAND_NEW|USED)/);
        if (!m) return '';
        return m[1] === 'BRAND_NEW' ? 'Brand New' : 'Used';
      };

      const saleConditionSummary = (items: any[]) => {
        const productItems = (items || []).filter(i => !i.isRepair);
        if (productItems.length === 0) return '—';
        const labels = productItems.map(i => conditionLabel((i as any).notes)).filter(Boolean);
        if (labels.length === 0) return '—';
        const brandNew = labels.filter(l => l === 'Brand New').length;
        const used = labels.filter(l => l === 'Used').length;
        const parts: string[] = [];
        if (brandNew > 0) parts.push(brandNew === productItems.length ? 'Brand New' : `Brand New (${brandNew})`);
        if (used > 0) parts.push(used === productItems.length ? 'Used' : `Used (${used})`);
        return parts.join(' / ') || '—';
      };

      // One row per sale — summary condition column
      const headers = [
        'Sale Number',
        'Date',
        'Customer',
        'Items',
        'Condition',
        'Subtotal',
        'Tax',
        'Total',
        'Payment Method',
        'Payment Status',
        'Status',
        'Cashier'
      ];

      const csvRows = [
        headers.join(','),
        ...filteredSales.map(sale => [
          sale.receiptNumber || sale.id.slice(0, 8),
          format(new Date(sale.createdAt), 'yyyy-MM-dd HH:mm'),
          `"${sale.customerName || 'Walk-in'}"`,
          sale.items?.length || 0,
          `"${saleConditionSummary(sale.items || [])}"`,
          sale.subtotal,
          sale.taxAmount,
          sale.totalAmount,
          sale.paymentMethod,
          sale.paymentStatus,
          sale.status,
          `"${sale.cashierName || 'Unknown'}"`
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `sales-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Exported ${filteredSales.length} sales to CSV`
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export sales data',
        variant: 'destructive'
      });
    }
  };

  const handleExportPDF = () => {
    toast({
      title: 'Coming Soon',
      description: 'PDF export functionality will be available soon'
    });
  };

  return (
    <MainLayout pageTitle="Sales Management">
      <div className="container mx-auto px-4">
        {/* Statistics Cards */}
        <SalesStatsCards
          todayRevenue={todayRevenue}
          todaySales={todaySales}
          weekRevenue={weekRevenue}
          weekSales={weekSales}
          monthRevenue={monthRevenue}
          monthSales={monthSales}
          totalRevenue={totalRevenue}
          totalSales={totalSales}
          loading={loading}
        />

        {/* Filters */}
        <SalesFilters
          filters={filters}
          onFilterChange={setFilters}
          onExportCSV={handleExportCSV}
          onExportPDF={handleExportPDF}
          cashiers={cashiers}
          shifts={availableShifts}
        />

        {/* View Mode Selector */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={viewMode === 'sales' ? 'default' : 'outline'}
            onClick={() => setViewMode('sales')}
          >
            Sales
          </Button>
          <Button
            variant={viewMode === 'shifts' ? 'default' : 'outline'}
            onClick={() => setViewMode('shifts')}
          >
            Shifts
          </Button>
          <Button
            variant={viewMode === 'products' ? 'default' : 'outline'}
            onClick={() => setViewMode('products')}
          >
            Products
          </Button>
        </div>

        {/* Sales List */}
        {viewMode === 'sales' && (
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-navy mx-auto mb-2" />
                  <p className="text-gray-600">Loading sales...</p>
                </div>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <p className="text-lg font-medium mb-2">No sales found</p>
                <p className="text-sm">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Sale #</TableHead>
                      <TableHead className="font-semibold">Date & Time</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold">Products / SKU</TableHead>
                      <TableHead className="font-semibold">Condition</TableHead>
                      <TableHead className="font-semibold text-right">Amount</TableHead>
                      <TableHead className="font-semibold">Payment</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Cashier</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => (
                      <TableRow key={sale.id} className="hover:bg-gray-50 transition-colors">
                        <TableCell className="font-medium">
                          {sale.receiptNumber || `#${sale.id.slice(0, 8)}`}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(sale.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {sale.customerName || 'Walk-in Customer'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5 max-w-[200px]">
                            {(sale.items || []).slice(0, 2).map((item, i) => (
                              <div key={i} className="text-xs text-gray-700 leading-tight">
                                <span className="font-medium truncate block" title={item.productName}>
                                  {item.productName || '—'}
                                </span>
                                {item.sku && (
                                  <span className="text-gray-400 font-mono">SKU: {item.sku}</span>
                                )}
                              </div>
                            ))}
                            {(sale.items?.length ?? 0) > 2 && (
                              <span className="text-xs text-gray-400">
                                +{sale.items.length - 2} more
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const { brandNew, used } = getConditionSummary(sale.items || []);
                            if (brandNew === 0 && used === 0) return <span className="text-xs text-gray-400">—</span>;
                            return (
                              <div className="flex flex-wrap gap-1">
                                {brandNew > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                                    {brandNew > 1 ? `${brandNew}× ` : ''}New
                                  </span>
                                )}
                                {used > 0 && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                                    {used > 1 ? `${used}× ` : ''}Used
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(sale.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-gray-600">
                              {getPaymentMethodLabel(sale.paymentMethod)}
                            </span>
                            {getPaymentStatusBadge(sale.paymentStatus)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getSaleStatusBadge(sale.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {sale.cashierName || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(sale)}
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePrintReceipt(sale.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {sale.paymentStatus === 'COMPLETED' && sale.status === 'COMPLETED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRefund(sale)}
                                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            {sale.status === 'COMPLETED' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleVoid(sale)}
                                className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                title="Void Transaction"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {(sale.status === 'REFUNDED' || sale.status === 'PARTIALLY_REFUNDED' || sale.paymentStatus === 'REFUNDED' || sale.paymentStatus === 'PARTIALLY_REFUNDED') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)}
                                className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                title="Show refund details"
                              >
                                {expandedSaleId === sale.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Refund details row */}
                      {expandedSaleId === sale.id && (
                        <TableRow className="bg-orange-50">
                          <TableCell colSpan={10} className="py-3 px-6">
                            <div className="text-sm font-medium text-orange-800 mb-2">Refunded Items</div>
                            <div className="grid gap-1">
                              {(sale.items || []).map((item, i) => (
                                <div key={i} className="flex items-center gap-3 text-xs text-gray-700">
                                  <span className="font-mono bg-white border border-orange-200 rounded px-1.5 py-0.5 text-orange-700">
                                    {item.sku || 'N/A'}
                                  </span>
                                  <span className="flex-1">{item.productName}</span>
                                  <span className="text-gray-500">Qty: {item.quantity}</span>
                                  <span className="font-medium">£{Number(item.unitPrice).toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-2 text-xs text-orange-700">
                              Receipt: <span className="font-mono font-medium">{sale.receiptNumber || sale.saleNumber || sale.id.slice(0, 8)}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Shifts View */}
        {viewMode === 'shifts' && (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <ShiftList
                shifts={shifts}
                onViewReport={handleViewShift}
                loading={shiftsLoading}
              />
            </CardContent>
          </Card>
        )}

        {/* Products Sales Report View */}
        {viewMode === 'products' && (
          <ProductSalesReport />
        )}

        {/* Results Summary */}
        {viewMode === 'sales' && !loading && filteredSales.length > 0 && (
          <div className="mt-4 text-sm text-gray-600 text-center">
            Showing {filteredSales.length} of {sales.length} sales
            {filters.search && ` • Filtered by: "${filters.search}"`}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <SaleDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSale(null);
        }}
        sale={selectedSale}
        onPrintReceipt={handlePrintReceipt}
        onRefund={handleRefund}
      />

      {/* Refund Dialog */}
      <RefundSaleDialog
        isOpen={isRefundDialogOpen}
        onClose={() => {
          setIsRefundDialogOpen(false);
          setRefundingSale(null);
        }}
        sale={refundingSale}
        onConfirmRefund={handleConfirmRefund}
        isProcessing={isRefundProcessing}
      />

      {/* Void Transaction Dialog */}
      <VoidTransactionDialog
        open={isVoidDialogOpen}
        onOpenChange={setIsVoidDialogOpen}
        onConfirm={handleVoidConfirm}
        saleNumber={voidingSale?.receiptNumber || voidingSale?.id}
        totalAmount={voidingSale?.totalAmount || 0}
        loading={isVoidProcessing}
      />

      {/* Shift Report Dialog */}
      {selectedShiftForReport && (
        <ShiftReport
          open={!!selectedShiftForReport}
          onClose={() => setSelectedShiftForReport(null)}
          shiftId={selectedShiftForReport}
        />
      )}
    </MainLayout>
  );
};

export default SalesPage;
