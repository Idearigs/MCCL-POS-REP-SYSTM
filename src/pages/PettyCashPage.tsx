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
  Wallet,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  AlertCircle,
  Eye,
  Printer,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import MainLayout from '@/components/layout/MainLayout';
import {
  pettyCashService,
  PettyCashAccount,
  PettyCashTransaction,
  PettyCashStatus,
  PettyCashCategory,
} from '@/services/pettyCashService';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PettyCashPage: React.FC = () => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<PettyCashAccount[]>([]);
  const [pendingTransactions, setPendingTransactions] = useState<PettyCashTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<PettyCashTransaction | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);

  // New account form state
  const [accountForm, setAccountForm] = useState({
    accountName: '',
    location: '',
    openingBalance: 0,
    monthlyBudget: 0,
  });

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({
    accountId: '',
    category: PettyCashCategory.OFFICE_SUPPLIES,
    amount: 0,
    description: '',
    vendor: '',
    receiptNumber: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsData, transactionsData] = await Promise.all([
        pettyCashService.getAccounts(),
        pettyCashService.getTransactions({ status: PettyCashStatus.PENDING, limit: 50 }),
      ]);

      setAccounts(accountsData);
      setPendingTransactions(transactionsData.data);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      toast({
        title: 'Failed to Load Data',
        description: 'Could not load petty cash information',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (expenseForm.amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Amount must be greater than zero',
        variant: 'destructive',
      });
      return;
    }

    try {
      await pettyCashService.createTransaction(expenseForm);

      toast({
        title: 'Expense Submitted',
        description: 'Your expense has been submitted for approval',
      });

      setExpenseDialogOpen(false);
      setExpenseForm({
        accountId: '',
        category: PettyCashCategory.OFFICE_SUPPLIES,
        amount: 0,
        description: '',
        vendor: '',
        receiptNumber: '',
        notes: '',
      });

      loadData();
    } catch (error: any) {
      console.error('Failed to create expense:', error);
      toast({
        title: 'Failed to Submit Expense',
        description: error.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountForm.accountName.trim()) {
      toast({ title: 'Account name required', variant: 'destructive' });
      return;
    }
    try {
      await pettyCashService.createAccount({
        accountName: accountForm.accountName.trim(),
        location: accountForm.location.trim() || undefined,
        openingBalance: accountForm.openingBalance,
        monthlyBudget: accountForm.monthlyBudget || undefined,
      });
      toast({ title: 'Account Created', description: `${accountForm.accountName} is ready to use` });
      setAccountDialogOpen(false);
      setAccountForm({ accountName: '', location: '', openingBalance: 0, monthlyBudget: 0 });
      loadData();
    } catch (error: any) {
      toast({ title: 'Failed to Create Account', description: error.response?.data?.message || 'An error occurred', variant: 'destructive' });
    }
  };

  const handlePrintExpenseReceipt = (transaction: PettyCashTransaction) => {
    const account = accounts.find(a => a.id === transaction.accountId);
    const lines = [
      '================================',
      '         PETTY CASH EXPENSE     ',
      '================================',
      `Date:     ${format(new Date(transaction.createdAt), 'dd MMM yyyy HH:mm')}`,
      `Ref:      ${transaction.transactionNumber || transaction.id.slice(0, 8).toUpperCase()}`,
      `Account:  ${account?.accountName || 'N/A'}`,
      '--------------------------------',
      `Category: ${transaction.category.replace(/_/g, ' ')}`,
      `Vendor:   ${transaction.vendor || 'N/A'}`,
      `Desc:     ${transaction.description}`,
      '--------------------------------',
      `AMOUNT:   £${transaction.amount.toFixed(2)}`,
      `Status:   ${transaction.status}`,
      '================================',
      transaction.notes ? `Notes: ${transaction.notes}` : '',
      '',
      'Authorised signature: ___________',
      '',
    ].filter(l => l !== null);

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Petty Cash Receipt</title>
      <style>
        body { font-family: monospace; font-size: 12px; margin: 20px; white-space: pre-wrap; }
        @media print { body { margin: 0; } }
      </style></head>
      <body>${lines.join('\n')}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  const handleApprove = async (transactionId: string) => {
    try {
      await pettyCashService.approveTransaction(transactionId);

      toast({
        title: 'Expense Approved',
        description: 'The expense has been approved and deducted from the account',
      });

      loadData();
    } catch (error: any) {
      console.error('Failed to approve:', error);
      toast({
        title: 'Failed to Approve',
        description: error.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (transactionId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: 'Reason Required',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    try {
      await pettyCashService.rejectTransaction(transactionId, { rejectionReason: reason });

      toast({
        title: 'Expense Rejected',
        description: 'The expense has been rejected',
      });

      loadData();
    } catch (error: any) {
      console.error('Failed to reject:', error);
      toast({
        title: 'Failed to Reject',
        description: error.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: PettyCashStatus) => {
    const config: Record<
      PettyCashStatus,
      { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
      PENDING: { label: 'Pending', variant: 'secondary' },
      APPROVED: { label: 'Approved', variant: 'default' },
      REJECTED: { label: 'Rejected', variant: 'destructive' },
      CANCELLED: { label: 'Cancelled', variant: 'outline' },
    };

    const { label, variant } = config[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.currentBalance, 0);
  const totalPending = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Petty Cash Management</h1>
            <p className="text-gray-500 mt-1">
              Manage expenses and petty cash accounts
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAccountDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
            <Button onClick={() => setExpenseDialogOpen(true)} disabled={accounts.filter(a => a.isActive).length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Record Expense
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Balance</p>
                  <p className="text-3xl font-bold text-blue-600">£{totalBalance.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending Approval</p>
                  <p className="text-3xl font-bold text-orange-600">£{totalPending.toFixed(2)}</p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Active Accounts</p>
                  <p className="text-3xl font-bold text-green-600">
                    {accounts.filter(a => a.isActive).length}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Petty Cash Accounts
            </CardTitle>
            <CardDescription>Active petty cash accounts</CardDescription>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No petty cash accounts yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {accounts.map((account) => (
                  <Card key={account.id} className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{account.accountName}</h3>
                          <p className="text-sm text-gray-500 font-mono">
                            {account.accountNumber}
                          </p>
                          {account.location && (
                            <p className="text-xs text-gray-500 mt-1">{account.location}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Current Balance</p>
                          <p className="text-2xl font-bold text-blue-600">
                            £{account.currentBalance.toFixed(2)}
                          </p>
                          {account.monthlyBudget && (
                            <p className="text-xs text-gray-500 mt-1">
                              Budget: £{account.monthlyBudget.toFixed(2)}/mo
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Pending Approvals
            </CardTitle>
            <CardDescription>Expenses awaiting approval</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : pendingTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No pending approvals</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transaction #</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.transactionDate), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {transaction.transactionNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {pettyCashService.getCategoryLabel(transaction.category)}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          {transaction.requester
                            ? `${transaction.requester.firstName} ${transaction.requester.lastName}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          £{transaction.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedTransaction(transaction);
                              setDetailDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePrintExpenseReceipt(transaction)}
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(transaction.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
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
      </div>

      {/* Create Account Dialog */}
      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create Petty Cash Account</DialogTitle>
            <DialogDescription>Add a new account to track petty cash expenses</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div className="space-y-2">
              <Label>Account Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Main Till, Back Office"
                value={accountForm.accountName}
                onChange={e => setAccountForm(p => ({ ...p, accountName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                placeholder="e.g. Shop Floor"
                value={accountForm.location}
                onChange={e => setAccountForm(p => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Opening Balance (£)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={accountForm.openingBalance}
                onChange={e => setAccountForm(p => ({ ...p, openingBalance: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Budget (£) — optional</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={accountForm.monthlyBudget}
                onChange={e => setAccountForm(p => ({ ...p, monthlyBudget: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAccountDialogOpen(false)}>Cancel</Button>
              <Button type="submit">Create Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>
              Submit a new petty cash expense for approval
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExpense} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="accountId">
                Account <span className="text-red-500">*</span>
              </Label>
              <Select
                value={expenseForm.accountId}
                onValueChange={(value) =>
                  setExpenseForm((prev) => ({ ...prev, accountId: value }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.isActive)
                    .map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.accountName} - £{account.currentBalance.toFixed(2)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={expenseForm.category}
                onValueChange={(value) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    category: value as PettyCashCategory,
                  }))
                }
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(PettyCashCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {pettyCashService.getCategoryLabel(cat)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  £
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount || ''}
                  onChange={(e) =>
                    setExpenseForm((prev) => ({
                      ...prev,
                      amount: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="description"
                placeholder="What was this expense for?"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor/Payee</Label>
              <Input
                id="vendor"
                placeholder="e.g., Office Depot, Tesco"
                value={expenseForm.vendor}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, vendor: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptNumber">Receipt Number</Label>
              <Input
                id="receiptNumber"
                placeholder="Receipt or reference number"
                value={expenseForm.receiptNumber}
                onChange={(e) =>
                  setExpenseForm((prev) => ({
                    ...prev,
                    receiptNumber: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes..."
                value={expenseForm.notes}
                onChange={(e) =>
                  setExpenseForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setExpenseDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Submit Expense</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Transaction Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>
              {selectedTransaction?.transactionNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedTransaction.transactionDate),
                      'dd MMMM yyyy'
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-xl font-bold text-blue-600">
                    £{selectedTransaction.amount.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Category</p>
                  <Badge variant="outline">
                    {pettyCashService.getCategoryLabel(selectedTransaction.category)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedTransaction.status)}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="font-medium">{selectedTransaction.description}</p>
              </div>

              {selectedTransaction.vendor && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Vendor</p>
                  <p className="font-medium">{selectedTransaction.vendor}</p>
                </div>
              )}

              {selectedTransaction.receiptNumber && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Receipt Number</p>
                  <p className="font-mono text-sm">{selectedTransaction.receiptNumber}</p>
                </div>
              )}

              {selectedTransaction.notes && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Notes</p>
                  <p className="text-sm">{selectedTransaction.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">Requested By</p>
                <p className="font-medium">
                  {selectedTransaction.requester
                    ? `${selectedTransaction.requester.firstName} ${selectedTransaction.requester.lastName}`
                    : '-'}
                </p>
              </div>

              {selectedTransaction.status === PettyCashStatus.PENDING && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    onClick={() => {
                      handleApprove(selectedTransaction.id);
                      setDetailDialogOpen(false);
                    }}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      const reason = prompt('Enter rejection reason:');
                      if (reason) {
                        handleReject(selectedTransaction.id, reason);
                        setDetailDialogOpen(false);
                      }
                    }}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default PettyCashPage;
