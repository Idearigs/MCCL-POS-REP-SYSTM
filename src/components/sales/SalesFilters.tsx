import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Search, Filter, X, Calendar as CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export interface SalesFilterValues {
  search: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  dateFrom?: Date;
  cashierId?: string;
  shift?: string;
  dateTo?: Date;
}

interface Shift {
  id: string;
  shiftNumber: string;
  startTime: string;
  endTime?: string;
  status: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface SalesFiltersProps {
  filters: SalesFilterValues;
  onFilterChange: (filters: SalesFilterValues) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
  cashiers?: {id: string; name: string}[];
  shifts?: Shift[];
}

const SalesFilters: React.FC<SalesFiltersProps> = ({
  filters,
  onFilterChange,
  onExportCSV,
  onExportPDF,
  cashiers = [],
  shifts = []
}) => {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filters, search: value });
  };

  const handlePaymentMethodChange = (value: string) => {
    onFilterChange({ ...filters, paymentMethod: value });
  };

  const handlePaymentStatusChange = (value: string) => {
    onFilterChange({ ...filters, paymentStatus: value });
  };

  const handleStatusChange = (value: string) => {
    onFilterChange({ ...filters, status: value });
  };

  const handleDateFromChange = (date: Date | undefined) => {
    onFilterChange({ ...filters, dateFrom: date });
  };

  const handleDateToChange = (date: Date | undefined) => {
    onFilterChange({ ...filters, dateTo: date });
  };

  const handleCashierChange = (value: string) => {
    onFilterChange({ ...filters, cashierId: value });
  };

  const handleShiftChange = (value: string) => {
    onFilterChange({ ...filters, shift: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: '',
      paymentMethod: 'all',
      paymentStatus: 'all',
      status: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      cashierId: 'all',
      shift: 'all'
    });
    setIsFilterOpen(false);
  };

  const activeFilterCount = () => {
    let count = 0;
    if (filters.paymentMethod && filters.paymentMethod !== 'all') count++;
    if (filters.paymentStatus && filters.paymentStatus !== 'all') count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.dateFrom) count++;
    if (filters.dateTo) count++;
    if (filters.cashierId && filters.cashierId !== 'all') count++;
    if (filters.shift && filters.shift !== 'all') count++;
    return count;
  };

  const hasActiveFilters = activeFilterCount() > 0;

  return (
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
      {/* Search Input */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-navy/70" size={18} />
        <Input
          className="pl-10 bg-white/90 backdrop-blur-sm border border-navy/10 rounded-xl shadow-sm focus:ring-2 focus:ring-navy/10 focus:border-navy/20 text-navy"
          placeholder="Search by sale #, receipt, customer..."
          value={filters.search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Quick Date Filters */}
        <div className="hidden lg:flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy text-xs"
            onClick={() => {
              const today = new Date();
              onFilterChange({ ...filters, dateFrom: today, dateTo: today });
            }}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy text-xs"
            onClick={() => {
              const today = new Date();
              const weekAgo = new Date(today);
              weekAgo.setDate(today.getDate() - 7);
              onFilterChange({ ...filters, dateFrom: weekAgo, dateTo: today });
            }}
          >
            This Week
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy text-xs"
            onClick={() => {
              const today = new Date();
              const monthAgo = new Date(today);
              monthAgo.setMonth(today.getMonth() - 1);
              onFilterChange({ ...filters, dateFrom: monthAgo, dateTo: today });
            }}
          >
            This Month
          </Button>
        </div>

        {/* Advanced Filters Popover */}
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy hover:text-navy shadow-sm relative"
            >
              <Filter size={16} className="mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 bg-navy text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFilterCount()}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filter Sales</h4>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-navy hover:text-navy-dark"
                  >
                    <X size={14} className="mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs",
                          !filters.dateFrom && "text-muted-foreground"
                        )}
                        size="sm"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateFrom ? format(filters.dateFrom, "MMM dd") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateFrom}
                        onSelect={handleDateFromChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs",
                          !filters.dateTo && "text-muted-foreground"
                        )}
                        size="sm"
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateTo ? format(filters.dateTo, "MMM dd") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateTo}
                        onSelect={handleDateToChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <Select value={filters.paymentMethod} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="DIGITAL_WALLET">Digital Wallet</SelectItem>
                    <SelectItem value="INSTALLMENT">Installment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Status</Label>
                <Select value={filters.paymentStatus} onValueChange={handlePaymentStatusChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                    <SelectItem value="PARTIALLY_REFUNDED">Partially Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sale Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sale Status</Label>
                <Select value={filters.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REFUNDED">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cashier Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Cashier</Label>
                <Select value={filters.cashierId || 'all'} onValueChange={handleCashierChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="All cashiers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cashiers</SelectItem>
                    {cashiers.map(cashier => (<SelectItem key={cashier.id} value={cashier.id}>{cashier.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              {/* Shift Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Shift</Label>
                {!filters.dateFrom || !filters.dateTo ? (
                  <div className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded border border-gray-200">
                    Select a date range to load available shifts
                  </div>
                ) : shifts.length === 0 ? (
                  <div className="text-xs text-gray-500 italic p-2 bg-gray-50 rounded border border-gray-200">
                    No shifts found for selected date range
                  </div>
                ) : (
                  <Select value={filters.shift || 'all'} onValueChange={handleShiftChange}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="All shifts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shifts</SelectItem>
                      {shifts.map(shift => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.shiftNumber} - {shift.user ? `${shift.user.firstName} ${shift.user.lastName}` : 'Unknown'}
                          ({format(new Date(shift.startTime), 'MMM dd, HH:mm')})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Dropdown */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy hover:text-navy shadow-sm"
            >
              <Download size={16} className="mr-2" />
              Export
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48" align="end">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={onExportCSV}
              >
                Export as CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={onExportPDF}
              >
                Export as PDF
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default SalesFilters;
