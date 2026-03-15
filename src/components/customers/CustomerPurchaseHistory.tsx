import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Eye, Printer, Download, TrendingUp, ShoppingCart, Calendar } from 'lucide-react';
import { salesService, Sale } from '@/services/salesService';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CustomerPurchaseHistoryProps {
  customerId: string;
  customerName: string;
}

const CustomerPurchaseHistory: React.FC<CustomerPurchaseHistoryProps> = ({
  customerId,
  customerName
}) => {
  const { toast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);

  // Statistics
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);

  useEffect(() => {
    loadCustomerSales();
  }, [customerId]);

  const loadCustomerSales = async () => {
    setLoading(true);
    try {
      // Fetch all sales for this customer
      const result = await salesService.getSales(1, 1000);

      const allSales = Array.isArray(result) ? result : result.data || [];

      // Filter sales for this customer
      const customerSales = allSales.filter(sale => sale.customerId === customerId);

      // Sort by date desc
      customerSales.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setSales(customerSales);

      // Calculate statistics
      const total = customerSales.reduce((sum, sale) =>
        sum + (sale.totalAmount || sale.total || 0), 0
      );
      const count = customerSales.length;
      const avg = count > 0 ? total / count : 0;

      setTotalSpent(total);
      setTotalOrders(count);
      setAvgOrderValue(avg);

    } catch (error: any) {
      console.error('Failed to load customer sales:', error);
      // Set empty data instead of breaking the UI
      setSales([]);
      setTotalSpent(0);
      setTotalOrders(0);
      setAvgOrderValue(0);

      // Show a gentle error message
      toast({
        title: 'Purchase History Unavailable',
        description: 'Unable to load purchase history at this time. Please try again later.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const viewSaleDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setIsDetailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'COMPLETED': { label: 'Completed', variant: 'default' },
      'PENDING': { label: 'Pending', variant: 'secondary' },
      'REFUNDED': { label: 'Refunded', variant: 'destructive' },
      'CANCELLED': { label: 'Cancelled', variant: 'outline' }
    };

    const config = statusMap[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodMap: Record<string, { label: string; color: string }> = {
      'CASH': { label: 'Cash', color: 'bg-green-100 text-green-800' },
      'CARD': { label: 'Card', color: 'bg-blue-100 text-blue-800' },
      'BANK_TRANSFER': { label: 'Bank Transfer', color: 'bg-purple-100 text-purple-800' },
      'SPLIT': { label: 'Split Payment', color: 'bg-orange-100 text-orange-800' }
    };

    const config = methodMap[method] || { label: method, color: 'bg-gray-100 text-gray-800' };
    return (
      <Badge className={config.color} variant="outline">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-green-600">£{totalSpent.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg Order Value</p>
                <p className="text-2xl font-bold text-purple-600">£{avgOrderValue.toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Purchase History
          </CardTitle>
          <CardDescription>
            All purchases made by {customerName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading purchase history...</div>
          ) : sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No purchases yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell>
                        {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {sale.receiptNumber || sale.saleNumber}
                      </TableCell>
                      <TableCell>
                        {(sale.items || []).length} items
                      </TableCell>
                      <TableCell>
                        {getPaymentMethodBadge(sale.paymentMethod || 'CASH')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sale.status || 'COMPLETED')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        £{(sale.totalAmount || sale.total || 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => viewSaleDetails(sale)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
            <DialogDescription>
              Receipt #{selectedSale?.receiptNumber || selectedSale?.saleNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-4">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedSale.createdAt), 'dd MMMM yyyy, HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedSale.status || 'COMPLETED')}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Method</p>
                  {getPaymentMethodBadge(selectedSale.paymentMethod || 'CASH')}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-bold text-lg">
                    £{(selectedSale.totalAmount || selectedSale.total || 0).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="font-semibold mb-3">Items Purchased</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedSale.items || []).map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.productName || item.name}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">
                          £{(item.unitPrice || item.price || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          £{((item.unitPrice || item.price || 0) * item.quantity).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>£{(selectedSale.subtotal || 0).toFixed(2)}</span>
                </div>
                {(selectedSale.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span>-£{(selectedSale.discountAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                {(selectedSale.taxAmount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>£{(selectedSale.taxAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>£{(selectedSale.totalAmount || selectedSale.total || 0).toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerPurchaseHistory;
