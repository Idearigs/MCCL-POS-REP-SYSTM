import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserPlus,
  MoreVertical,
  Edit,
  Ban,
  CheckCircle,
  Search,
  Trash2,
  Download,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import CashierStatsCards from '@/components/cashiers/CashierStatsCards';
import AddCashierDialog, { CashierFormData } from '@/components/cashiers/AddCashierDialog';
import { cashierService, Cashier, CashierStats } from '@/services/cashierService';

const CashiersPage: React.FC = () => {
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [cashierStats, setCashierStats] = useState<CashierStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [deletingCashierId, setDeletingCashierId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadCashiers();
    loadCashierStats();
  }, []);

  const loadCashiers = async () => {
    setLoading(true);
    try {
      const response = await cashierService.getCashiers(1, 100);
      setCashiers(response.data || []);
    } catch (error) {
      console.error('Error loading cashiers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load cashiers',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCashierStats = async () => {
    try {
      const stats = await cashierService.getCashierStats();
      setCashierStats(stats);
    } catch (error) {
      console.error('Error loading cashier stats:', error);
    }
  };

  const handleAddCashier = async (data: CashierFormData) => {
    try {
      await cashierService.createCashier({
        email: data.email,
        password: data.password!,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role
      });

      toast({
        title: 'Success',
        description: 'Cashier added successfully'
      });

      await loadCashiers();
      setIsAddDialogOpen(false);
    } catch (error: any) {
      const raw = error.response?.data?.message;
      const errorMessage = Array.isArray(raw)
        ? raw.map((e: any) => Object.values(e.constraints || {}).join(', ')).join('; ')
        : raw || error.message || 'Failed to add cashier';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleEditCashier = async (data: CashierFormData) => {
    if (!editingCashier) return;

    try {
      const updateData: any = {
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        isActive: data.isActive
      };

      if (data.password) {
        updateData.password = data.password;
      }

      await cashierService.updateCashier(editingCashier.id, updateData);

      toast({
        title: 'Success',
        description: 'Cashier updated successfully'
      });

      await loadCashiers();
      setEditingCashier(null);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update cashier',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleToggleActive = async (cashier: Cashier) => {
    try {
      if (cashier.isActive) {
        await cashierService.deactivateCashier(cashier.id);
      } else {
        await cashierService.activateCashier(cashier.id);
      }

      toast({
        title: 'Success',
        description: `Cashier ${cashier.isActive ? 'deactivated' : 'activated'} successfully`
      });

      await loadCashiers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update cashier status',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (cashier: Cashier) => {
    setEditingCashier(cashier);
    setDialogMode('edit');
  };

  const closeDialog = () => {
    setEditingCashier(null);
    setIsAddDialogOpen(false);
  };

  const handleDeleteCashier = async (cashier: Cashier) => {
    try {
      await cashierService.deleteCashier(cashier.id);
      toast({ title: 'Success', description: `${cashierService.formatCashierName(cashier)} has been deleted` });
      setDeletingCashierId(null);
      await loadCashiers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete cashier', variant: 'destructive' });
    }
  };

  const getCashierStat = (cashierId: string) => {
    return cashierStats.find(stat => stat.cashierId === cashierId);
  };

  const handleExportCSV = async (cashier: Cashier) => {
    try {
      const response = await cashierService.getCashierSales(cashier.id, 1, 1000) as any;
      const sales: any[] = response.data || [];

      const headers = ['Date', 'Receipt No', 'Customer', 'Payment Method', 'Status', 'Total (GBP)'];
      const rows = sales.map((sale: any) => [
        format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm'),
        sale.receiptNumber || sale.saleNumber || '',
        sale.customerName || 'Walk-in',
        sale.paymentMethod || '',
        sale.status || '',
        (sale.totalAmount || 0).toFixed(2),
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${cashierService.formatCashierName(cashier)}_sales_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({ title: 'Export Complete', description: `${sales.length} sales exported to CSV` });
    } catch {
      toast({ title: 'Export Failed', description: 'Could not export sales report', variant: 'destructive' });
    }
  };

  // Only show STAFF (Cashier) role — OWNER and MANAGER belong in User Management
  const filteredCashiers = cashiers
    .filter(cashier => cashier.role === 'STAFF')
    .filter(cashier =>
      cashier.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cashier.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cashier.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const staffOnly = cashiers.filter(c => c.role === 'STAFF');
  const totalCashiers = staffOnly.length;
  const activeCashiers = staffOnly.filter(c => c.isActive).length;
  const topPerformer = cashierStats.length > 0
    ? cashierStats.reduce((max, stat) => stat.monthRevenue > max.monthRevenue ? stat : max, cashierStats[0])
    : null;
  const totalRevenue = cashierStats.reduce((sum, stat) => sum + stat.totalRevenue, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const getRoleBadge = (role: string) => {
    const roleConfig: Record<string, { variant: any; label: string }> = {
      OWNER: { variant: 'default', label: 'Owner' },
      MANAGER: { variant: 'secondary', label: 'Manager' },
      STAFF: { variant: 'outline', label: 'Cashier' },
      READONLY: { variant: 'outline', label: 'Read Only' }
    };

    const config = roleConfig[role] || roleConfig.STAFF;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <MainLayout pageTitle="Cashier Management">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cashier Management</h1>
            <p className="text-muted-foreground">
              Manage cashiers and track their sales performance
            </p>
          </div>
          <Button onClick={() => {
            setDialogMode('add');
            setIsAddDialogOpen(true);
          }}>
            <UserPlus size={16} className="mr-2" />
            Add Cashier
          </Button>
        </div>

      {/* Stats Cards */}
      <CashierStatsCards
        totalCashiers={totalCashiers}
        activeCashiers={activeCashiers}
        topPerformer={topPerformer ? {
          name: topPerformer.cashierName,
          revenue: topPerformer.monthRevenue
        } : undefined}
        totalRevenue={totalRevenue}
        loading={loading}
      />

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cashiers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Cashiers Table */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sales (Month)</TableHead>
              <TableHead>Revenue (Month)</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10">
                  Loading cashiers...
                </TableCell>
              </TableRow>
            ) : filteredCashiers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                  No cashiers found
                </TableCell>
              </TableRow>
            ) : (
              filteredCashiers.map((cashier) => {
                const stat = getCashierStat(cashier.id);
                return (
                  <TableRow key={cashier.id}>
                    <TableCell className="font-medium">
                      {cashierService.formatCashierName(cashier)}
                    </TableCell>
                    <TableCell>{cashier.email}</TableCell>
                    <TableCell>{getRoleBadge(cashier.role)}</TableCell>
                    <TableCell>
                      <Badge variant={cashier.isActive ? 'default' : 'secondary'}>
                        {cashier.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{stat?.monthSales || 0}</TableCell>
                    <TableCell>{formatCurrency(stat?.monthRevenue || 0)}</TableCell>
                    <TableCell>
                      {cashier.lastLogin
                        ? format(new Date(cashier.lastLogin), 'PPp')
                        : 'Never'}
                    </TableCell>
                    <TableCell className="text-right relative">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditDialog(cashier)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(cashier)}>
                            {cashier.isActive ? (
                              <>
                                <Ban className="mr-2 h-4 w-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportCSV(cashier)}>
                            <Download className="mr-2 h-4 w-4" />
                            Export Sales Report (CSV)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setDeletingCashierId(cashier.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Inline confirm */}
                      {deletingCashierId === cashier.id && (
                        <div className="absolute right-0 z-50 mt-1 w-64 rounded-lg border border-red-200 bg-white p-3 shadow-lg">
                          <p className="text-sm font-medium text-gray-900 mb-1">Delete cashier?</p>
                          <p className="text-xs text-gray-500 mb-3">
                            This permanently removes <strong>{cashierService.formatCashierName(cashier)}</strong> and cannot be undone.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteCashier(cashier)}
                              className="flex-1 rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeletingCashierId(null)}
                              className="flex-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <AddCashierDialog
        isOpen={isAddDialogOpen || editingCashier !== null}
        onClose={closeDialog}
        onSubmit={dialogMode === 'add' ? handleAddCashier : handleEditCashier}
        cashier={editingCashier}
        mode={dialogMode}
      />
      </div>
    </MainLayout>
  );
};

export default CashiersPage;
