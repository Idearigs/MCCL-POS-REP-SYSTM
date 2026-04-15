import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  AlertTriangle,
  FileText,
  User,
  Clock,
  CreditCard,
} from 'lucide-react';
import { shiftService, ShiftReport as ShiftReportType } from '@/services/shiftService';
import { generateShiftReportPDF, downloadShiftReportPDF } from '@/utils/shiftReportPDF';
import { format } from 'date-fns';

interface ShiftReportProps {
  open: boolean;
  onClose: () => void;
  shiftId: string;
}

const ShiftReport: React.FC<ShiftReportProps> = ({ open, onClose, shiftId }) => {
  const [report, setReport] = useState<ShiftReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (open && shiftId) {
      loadShiftReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shiftId]);

  const loadShiftReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const reportData = await shiftService.getShiftReport(shiftId);
      setReport(reportData);
    } catch (err: any) {
      console.error('Error loading shift report:', err);
      setError(err.message || 'Failed to load shift report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report) return;

    setGeneratingPDF(true);
    try {
      downloadShiftReportPDF(report);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-green-600';
    if (variance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return <TrendingUp className="h-4 w-4" />;
    if (variance < 0) return <TrendingDown className="h-4 w-4" />;
    return null;
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Shift Report
          </DialogTitle>
          <DialogDescription>
            Detailed report of shift activities and transactions
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {report && (
            <div className="space-y-6 pb-4">
              {/* Shift Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Shift Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Shift Number</p>
                      <p className="font-semibold">{report.shift.shiftNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Cashier</p>
                      <p className="font-semibold">
                        {report.shift.user
                          ? `${report.shift.user.firstName} ${report.shift.user.lastName}`
                          : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Status</p>
                      <Badge
                        className={
                          report.shift.status === 'ACTIVE'
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }
                      >
                        {report.shift.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Duration</p>
                      <p className="font-semibold">
                        {formatDuration(report.shift.duration)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Start Time</p>
                      <p className="font-semibold">
                        {format(
                          new Date(report.shift.startTime),
                          'MMM dd, yyyy HH:mm'
                        )}
                      </p>
                    </div>
                    {report.shift.endTime && (
                      <div>
                        <p className="text-gray-600 mb-1">End Time</p>
                        <p className="font-semibold">
                          {format(new Date(report.shift.endTime), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Financial Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Opening Float */}
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-blue-600 mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm font-medium">Opening Float</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-900">
                          £{Number(report.shift.openingFloat).toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>

                    {/* Closing Float */}
                    {report.shift.closingFloat !== undefined && (
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <DollarSign className="h-4 w-4" />
                            <span className="text-sm font-medium">Closing Float</span>
                          </div>
                          <p className="text-2xl font-bold text-purple-900">
                            £{Number(report.shift.closingFloat).toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Variance */}
                    {report.shift.variance !== undefined && (
                      <Card
                        className={
                          report.shift.variance >= 0
                            ? 'bg-green-50 border-green-200'
                            : 'bg-red-50 border-red-200'
                        }
                      >
                        <CardContent className="pt-4">
                          <div
                            className={`flex items-center gap-2 mb-1 ${getVarianceColor(
                              report.shift.variance
                            )}`}
                          >
                            {getVarianceIcon(report.shift.variance)}
                            <span className="text-sm font-medium">Variance</span>
                          </div>
                          <p
                            className={`text-2xl font-bold ${getVarianceColor(
                              report.shift.variance
                            )}`}
                          >
                            {report.shift.variance >= 0 ? '+' : ''}£
                            {Number(report.shift.variance).toFixed(2)}
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Total Revenue */}
                    <Card className="bg-emerald-50 border-emerald-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 text-emerald-600 mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-sm font-medium">Total Revenue</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-900">
                          £{report.metrics.totalRevenue.toFixed(2)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Sales Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sales Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 mb-1">Total Sales</p>
                      <p className="text-xl font-bold text-blue-600">
                        {report.metrics.totalSales}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Items Sold</p>
                      <p className="text-xl font-bold text-purple-600">
                        {report.metrics.itemsSold}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Average Sale</p>
                      <p className="text-xl font-bold text-green-600">
                        £{report.metrics.averageSaleValue.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600 mb-1">Total Discount</p>
                      <p className="text-xl font-bold text-orange-600">
                        £{report.metrics.totalDiscount.toFixed(2)}
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gray-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          <span className="font-medium">Cash Sales</span>
                        </div>
                        <p className="text-2xl font-bold">
                          £{report.metrics.cashSales.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {report.metrics.paymentBreakdown.CASH || 0} transactions
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                          <span className="font-medium">Card Sales</span>
                        </div>
                        <p className="text-2xl font-bold">
                          £{report.metrics.cardSales.toFixed(2)}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {report.metrics.paymentBreakdown.CARD || 0} transactions
                        </p>
                      </CardContent>
                    </Card>

                    {report.metrics.paymentBreakdown.SPLIT && (
                      <Card className="bg-gray-50">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-5 w-5 text-purple-600" />
                            <span className="font-medium">Split Payments</span>
                          </div>
                          <p className="text-2xl font-bold">
                            {report.metrics.paymentBreakdown.SPLIT}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">transactions</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Sales List */}
              {report.sales && report.sales.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Sales Transactions ({report.sales.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sale #</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.sales.map((sale) => (
                          <TableRow key={sale.id}>
                            <TableCell className="font-medium">
                              {sale.saleNumber}
                            </TableCell>
                            <TableCell>
                              {format(new Date(sale.createdAt), 'HH:mm')}
                            </TableCell>
                            <TableCell>
                              {sale.customers
                                ? `${sale.customers.firstName} ${sale.customers.lastName}`
                                : 'Guest'}
                            </TableCell>
                            <TableCell>
                              {sale.sale_items.reduce(
                                (sum, item) => sum + item.quantity,
                                0
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{sale.paymentMethod}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              £{sale.totalAmount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {(report.shift.openingNotes || report.shift.closingNotes) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.shift.openingNotes && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          Opening Notes:
                        </p>
                        <p className="text-sm bg-blue-50 p-3 rounded border border-blue-200">
                          {report.shift.openingNotes}
                        </p>
                      </div>
                    )}
                    {report.shift.closingNotes && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          Closing Notes:
                        </p>
                        <p className="text-sm bg-purple-50 p-3 rounded border border-purple-200">
                          {report.shift.closingNotes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {report && (
            <Button onClick={handleDownloadPDF} disabled={generatingPDF}>
              {generatingPDF ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShiftReport;
