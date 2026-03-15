import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, TrendingUp, TrendingDown, FileText, User } from 'lucide-react';
import { Shift } from '@/services/shiftService';
import { format } from 'date-fns';

interface ShiftListProps {
  shifts: Shift[];
  onViewReport: (shiftId: string) => void;
  loading?: boolean;
}

const ShiftList: React.FC<ShiftListProps> = ({ shifts, onViewReport, loading }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-500 hover:bg-green-600';
      case 'CLOSED':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'ABANDONED':
        return 'bg-red-500 hover:bg-red-600';
      case 'RECONCILED':
        return 'bg-purple-500 hover:bg-purple-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getVarianceColor = (variance?: number) => {
    if (!variance) return 'text-gray-500';
    return variance >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getVarianceIcon = (variance?: number) => {
    if (!variance) return null;
    return variance >= 0 ? (
      <TrendingUp className="h-4 w-4" />
    ) : (
      <TrendingDown className="h-4 w-4" />
    );
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <Card className="text-center p-8">
        <CardContent className="pt-6">
          <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Shifts Found</h3>
          <p className="text-gray-500">
            No shifts found for the selected date range. Try adjusting your filters.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {shifts.map((shift) => (
        <Card key={shift.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{shift.shiftNumber}</CardTitle>
                <div className="flex items-center text-sm text-gray-500 mt-1">
                  <User className="h-3 w-3 mr-1" />
                  {shift.user
                    ? `${shift.user.firstName} ${shift.user.lastName}`
                    : 'Unknown User'}
                </div>
              </div>
              <Badge className={getStatusColor(shift.status)}>
                {shift.status}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            {/* Time Information */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <Clock className="h-4 w-4 mr-2" />
                <span>Start</span>
              </div>
              <span className="font-medium">
                {format(new Date(shift.startTime), 'MMM dd, HH:mm')}
              </span>
            </div>

            {shift.endTime && (
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>End</span>
                </div>
                <span className="font-medium">
                  {format(new Date(shift.endTime), 'MMM dd, HH:mm')}
                </span>
              </div>
            )}

            {shift.duration && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">{formatDuration(shift.duration)}</span>
              </div>
            )}

            {/* Float Information */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Opening Float</span>
                <span className="font-medium">
                  £{Number(shift.openingFloat).toFixed(2)}
                </span>
              </div>

              {shift.closingFloat !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Closing Float</span>
                  <span className="font-medium">
                    £{Number(shift.closingFloat).toFixed(2)}
                  </span>
                </div>
              )}

              {shift.variance !== undefined && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    {getVarianceIcon(shift.variance)}
                    <span className="ml-1">Variance</span>
                  </div>
                  <span className={`font-semibold ${getVarianceColor(shift.variance)}`}>
                    {shift.variance >= 0 ? '+' : ''}£{Number(shift.variance).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Sales Count */}
            {shift._count?.sales !== undefined && (
              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-gray-600">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span>Total Sales</span>
                  </div>
                  <span className="font-semibold text-blue-600">
                    {shift._count.sales}
                  </span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <Button
                onClick={() => onViewReport(shift.id)}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                View Report
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ShiftList;
