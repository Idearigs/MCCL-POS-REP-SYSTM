import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Calendar,
  User,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, subDays } from 'date-fns';
import MainLayout from '@/components/layout/MainLayout';
import { shiftService, Shift } from '@/services/shiftService';

const FloatManagementPage: React.FC = () => {
  const { toast } = useToast();
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [shiftHistory, setShiftHistory] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load active shift
      const active = await shiftService.getActiveShift();
      setActiveShift(active);

      // Load shift history for the last 30 days
      const endDate = new Date();
      const startDate = subDays(endDate, 30);

      const history = await shiftService.getShiftsByDateRange({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Sort by most recent first
      const sortedHistory = history.sort((a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );

      setShiftHistory(sortedHistory);
    } catch (error: any) {
      console.error('Failed to load float data:', error);
      toast({
        title: 'Failed to Load Data',
        description: error.message || 'Could not load float information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      ACTIVE: { label: 'Active', variant: 'default' },
      CLOSED: { label: 'Closed', variant: 'secondary' },
      RECONCILED: { label: 'Reconciled', variant: 'default' },
      ABANDONED: { label: 'Abandoned', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getVarianceBadge = (variance: number | string | undefined | null) => {
    if (variance === undefined || variance === null) return null;

    const numVariance = typeof variance === 'number' ? variance : Number(variance) || 0;
    const isBalanced = Math.abs(numVariance) < 0.01;

    if (isBalanced) {
      return (
        <span className="text-green-600 font-semibold flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Balanced
        </span>
      );
    }

    return (
      <span className={`font-semibold ${numVariance > 0 ? 'text-blue-600' : 'text-red-600'}`}>
        {numVariance > 0 ? '+' : ''}£{numVariance.toFixed(2)}
      </span>
    );
  };

  // Calculate statistics
  const totalShifts = shiftHistory.length;
  const closedShifts = shiftHistory.filter(s => s.status === 'CLOSED' || s.status === 'RECONCILED');
  const totalVariance = closedShifts.reduce((sum, s) => {
    const variance = typeof s.variance === 'number' ? s.variance : Number(s.variance) || 0;
    return sum + variance;
  }, 0);
  const balancedShifts = closedShifts.filter(s => {
    const variance = typeof s.variance === 'number' ? s.variance : Number(s.variance) || 0;
    return Math.abs(variance) < 0.01;
  }).length;

  return (
    <MainLayout pageTitle="Float Management">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Float Management</h1>
            <p className="text-muted-foreground mt-1">
              Track your shift float balances and variances
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Float tracking is integrated with your shifts.</strong> When you start a shift, you enter your opening float.
              When you close a shift, you enter your closing float. The system automatically calculates any variance.
            </p>
          </div>
        </div>

        {/* Active Shift / Current Float */}
        {activeShift ? (
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Clock className="h-6 w-6" />
                    Active Shift
                  </CardTitle>
                  <CardDescription className="text-blue-100 mt-1">
                    {activeShift.shiftNumber}
                    {activeShift.user && ` • ${activeShift.user.firstName} ${activeShift.user.lastName}`}
                  </CardDescription>
                </div>
                <Badge className="bg-white text-blue-600">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Opening Float */}
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-blue-100 text-sm mb-1">Opening Float</p>
                <p className="text-4xl font-bold">£{Number(activeShift.openingFloat || 0).toFixed(2)}</p>
                <p className="text-blue-100 text-xs mt-1">
                  Started {format(new Date(activeShift.startTime), 'dd/MM/yyyy HH:mm')}
                </p>
              </div>

              {/* Shift Details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/10 rounded p-3">
                  <p className="text-blue-100 text-xs">Duration</p>
                  <p className="text-xl font-bold">
                    {activeShift.duration
                      ? `${Math.floor(activeShift.duration / 60)}h ${activeShift.duration % 60}m`
                      : 'In Progress'
                    }
                  </p>
                </div>
                <div className="bg-white/10 rounded p-3">
                  <p className="text-blue-100 text-xs">Sales Count</p>
                  <p className="text-xl font-bold">
                    {activeShift._count?.sales || 0}
                  </p>
                </div>
              </div>

              {activeShift.openingNotes && (
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-sm font-semibold mb-1">Opening Notes</p>
                  <p className="text-blue-50 text-sm">{activeShift.openingNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/50">
            <CardContent className="pt-12 pb-12 text-center">
              <DollarSign className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No Active Shift
              </h3>
              <p className="text-muted-foreground mb-6">
                Start a new shift to begin tracking your float. Use the floating shift button or go to the Shifts page.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Shifts (30 days)</p>
                  <p className="text-2xl font-bold">{totalShifts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Balanced Shifts</p>
                  <p className="text-2xl font-bold">{balancedShifts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${totalVariance >= 0 ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {totalVariance >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Variance</p>
                  <p className={`text-2xl font-bold ${totalVariance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {totalVariance >= 0 ? '+' : ''}£{totalVariance.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Closed Shifts</p>
                  <p className="text-2xl font-bold">{closedShifts.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Float History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Float History (Last 30 Days)
            </CardTitle>
            <CardDescription>Your shift float records and variances</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading history...</div>
            ) : shiftHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No shift history yet</p>
                <p className="text-sm mt-1">Start a shift to begin tracking your float</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Shift</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ended</TableHead>
                      <TableHead className="text-right">Opening Float</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Closing Float</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftHistory.map((shift) => (
                      <TableRow key={shift.id}>
                        <TableCell className="font-mono text-sm">
                          {shift.shiftNumber}
                        </TableCell>
                        <TableCell>
                          {shift.user ? (
                            <div className="text-sm">
                              {shift.user.firstName} {shift.user.lastName}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(shift.startTime), 'dd/MM/yyyy')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(shift.startTime), 'HH:mm')}
                          </div>
                        </TableCell>
                        <TableCell>
                          {shift.endTime ? (
                            <>
                              <div className="text-sm">
                                {format(new Date(shift.endTime), 'dd/MM/yyyy')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(shift.endTime), 'HH:mm')}
                              </div>
                            </>
                          ) : (
                            <Badge variant="outline">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          £{Number(shift.openingFloat || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {shift.expectedFloat !== null && shift.expectedFloat !== undefined
                            ? `£${Number(shift.expectedFloat).toFixed(2)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {shift.closingFloat !== null && shift.closingFloat !== undefined
                            ? `£${Number(shift.closingFloat).toFixed(2)}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {getVarianceBadge(shift.variance)}
                        </TableCell>
                        <TableCell>{getStatusBadge(shift.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default FloatManagementPage;
