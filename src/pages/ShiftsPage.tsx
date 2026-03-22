import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { shiftService, Shift, ShiftStatistics } from '@/services/shiftService';
import ShiftList from '@/components/shifts/ShiftList';
import ShiftReport from '@/components/shifts/ShiftReport';
import { userService } from '@/services/userService';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  AlertTriangle,
  Download,
  RefreshCw,
} from 'lucide-react';

const ShiftsPage = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [statistics, setStatistics] = useState<ShiftStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [cashiers, setCashiers] = useState<{ id: string; name: string }[]>([]);

  // Filters
  const [dateFrom, setDateFrom] = useState<Date>(startOfDay(subDays(new Date(), 7)));
  const [dateTo, setDateTo] = useState<Date>(endOfDay(new Date()));
  const [selectedCashier, setSelectedCashier] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const { toast } = useToast();

  useEffect(() => {
    loadCashiers();
    loadShifts();
  }, []);

  const loadCashiers = async () => {
    try {
      const response = await userService.getUsers();
      const usersData = response.data || [];
      const cashierList = usersData.map((user: any) => ({
        id: user.id,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
      }));
      setCashiers(cashierList);
    } catch (error) {
      console.error('Failed to load cashiers:', error);
    }
  };

  const loadShifts = async () => {
    try {
      setLoading(true);

      // Load shifts
      const shiftsData = await shiftService.getShiftsByDateRange({
        startDate: dateFrom.toISOString(),
        endDate: dateTo.toISOString(),
        userId: selectedCashier !== 'all' ? selectedCashier : undefined,
        status: selectedStatus !== 'all' ? (selectedStatus as any) : undefined,
      });
      setShifts(shiftsData);

      // Load statistics
      const stats = await shiftService.getShiftStatistics(
        dateFrom.toISOString(),
        dateTo.toISOString()
      );
      setStatistics(stats);
    } catch (error: any) {
      console.error('Error loading shifts:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load shifts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    loadShifts();
  };

  const handleViewShift = (shiftId: string) => {
    setSelectedShiftId(shiftId);
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        'Shift Number',
        'Cashier',
        'Start Time',
        'End Time',
        'Duration (minutes)',
        'Opening Float',
        'Closing Float',
        'Expected Float',
        'Variance',
        'Status',
        'Transactions',
      ];

      const csvRows = [
        headers.join(','),
        ...shifts.map((shift) => [
          shift.shiftNumber,
          shift.user
            ? `"${shift.user.firstName} ${shift.user.lastName}"`
            : 'Unknown',
          format(new Date(shift.startTime), 'yyyy-MM-dd HH:mm'),
          shift.endTime
            ? format(new Date(shift.endTime), 'yyyy-MM-dd HH:mm')
            : 'N/A',
          shift.duration || 'N/A',
          shift.openingFloat,
          shift.closingFloat || 'N/A',
          shift.expectedFloat || 'N/A',
          shift.variance || 'N/A',
          shift.status,
          shift._count?.sales || 0,
        ].join(',')),
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `shifts-export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: `Exported ${shifts.length} shifts to CSV`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export shifts data',
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  return (
    <MainLayout pageTitle="Shift Management">
      <div className="container mx-auto px-4">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Shifts</p>
                  <p className="text-2xl font-bold">
                    {loading ? '...' : statistics?.totalShifts || 0}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Shifts</p>
                  <p className="text-2xl font-bold text-green-600">
                    {loading ? '...' : statistics?.activeShifts || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Variance</p>
                  <p
                    className={`text-2xl font-bold ${
                      (statistics?.averageVariance || 0) >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {loading
                      ? '...'
                      : statistics
                      ? formatCurrency(statistics.averageVariance)
                      : '£0.00'}
                  </p>
                </div>
                <DollarSign
                  className={`h-8 w-8 ${
                    (statistics?.averageVariance || 0) >= 0
                      ? 'text-green-500'
                      : 'text-red-500'
                  }`}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Discrepancies</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {loading ? '...' : statistics?.negativeVariances || 0}
                  </p>
                  <p className="text-xs text-gray-500">Negative variances</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label htmlFor="dateFrom">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={format(dateFrom, 'yyyy-MM-dd')}
                  onChange={(e) => setDateFrom(new Date(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="dateTo">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={format(dateTo, 'yyyy-MM-dd')}
                  onChange={(e) => setDateTo(endOfDay(new Date(e.target.value)))}
                />
              </div>

              <div>
                <Label htmlFor="cashier">Cashier</Label>
                <Select value={selectedCashier} onValueChange={setSelectedCashier}>
                  <SelectTrigger id="cashier">
                    <SelectValue placeholder="All Cashiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cashiers</SelectItem>
                    {cashiers.map((cashier) => (
                      <SelectItem key={cashier.id} value={cashier.id}>
                        {cashier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                    <SelectItem value="ABANDONED">Abandoned</SelectItem>
                    <SelectItem value="RECONCILED">Reconciled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleApplyFilters} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-4 w-4" />
                    Apply Filters
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={loading || shifts.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Variance Breakdown */}
        {statistics && (statistics.positiveVariances > 0 || statistics.negativeVariances > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">Positive Variances</h3>
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {statistics.positiveVariances}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Shifts with surplus cash
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">Negative Variances</h3>
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-red-600">
                  {statistics.negativeVariances}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Shifts with cash shortage
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Shifts List */}
        <ShiftList shifts={shifts} onViewReport={handleViewShift} loading={loading} />

        {/* Shift Report Dialog */}
        {selectedShiftId && (
          <ShiftReport
            open={!!selectedShiftId}
            onClose={() => setSelectedShiftId(null)}
            shiftId={selectedShiftId}
          />
        )}
      </div>
    </MainLayout>
  );
};

export default ShiftsPage;
