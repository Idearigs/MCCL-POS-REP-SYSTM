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
import { Eye, Printer, RotateCcw, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { salesService, Sale, SaleFilters as SaleFiltersType } from '@/services/salesService';
import SalesStatsCards from '@/components/sales/SalesStatsCards';
import SalesFilters, { SalesFilterValues } from '@/components/sales/SalesFilters';
import SaleDetailModal from '@/components/sales/SaleDetailModal';
import RefundSaleDialog from '@/components/sales/RefundSaleDialog';
import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

const SalesPage = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [refundingSale, setRefundingSale] = useState<Sale | null>(null);
  const [isRefundProcessing, setIsRefundProcessing] = useState(false);

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
    dateTo: undefined
  });

  const { toast } = useToast();

  // Load sales data
  useEffect(() => {
    loadSales();
    loadStatistics();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [sales, filters]);

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
    const statusConfig: Record<string, { variant: any; label: string }> = {
      DRAFT: { variant: 'secondary', label: 'Draft' },
      COMPLETED: { variant: 'default', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      REFUNDED: { variant: 'outline', label: 'Refunded' }
    };

    const config = statusConfig[status] || statusConfig.COMPLETED;
    return <Badge variant={config.variant} className="text-xs">{config.label}</Badge>;
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
      const headers = [
        'Sale Number',
        'Date',
        'Customer',
        'Items',
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
        />

        {/* Sales List */}
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
                      <TableHead className="font-semibold text-center">Items</TableHead>
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
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">
                            {sale.items?.length || 0}
                          </Badge>
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
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Summary */}
        {!loading && filteredSales.length > 0 && (
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
    </MainLayout>
  );
};

export default SalesPage;
