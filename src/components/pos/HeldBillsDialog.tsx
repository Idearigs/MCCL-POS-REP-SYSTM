import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Clock, User, Trash2, PlayCircle, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { salesService } from '@/services/salesService';

interface HeldBill {
  id: string;
  saleNumber: string;
  customerName?: string;
  itemCount: number;
  totalAmount: number;
  createdAt: string;
  createdBy?: string;
}

interface HeldBillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: (billId: string) => void;
}

const HeldBillsDialog: React.FC<HeldBillsDialogProps> = ({
  open,
  onOpenChange,
  onResume,
}) => {
  const { toast } = useToast();
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadHeldBills();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const loadHeldBills = async () => {
    setLoading(true);
    try {
      // Fetch DRAFT sales (held bills)
      const response = await salesService.getSales(1, 50, { status: 'DRAFT' });

      const bills: HeldBill[] = (response.data || []).map((sale: any) => ({
        id: sale.id,
        saleNumber: sale.saleNumber,
        customerName: sale.customerName,
        itemCount: sale.items?.length || 0,
        totalAmount: sale.totalAmount || 0,
        createdAt: sale.createdAt,
        createdBy: sale.createdByName,
      }));

      setHeldBills(bills);
    } catch (error) {
      console.error('Failed to load held bills:', error);
      toast({
        title: 'Error',
        description: 'Failed to load held bills',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResume = (billId: string) => {
    onResume(billId);
    onOpenChange(false);
  };

  const handleDelete = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this held bill?')) {
      return;
    }

    try {
      await salesService.deleteSale(billId);

      toast({
        title: 'Deleted',
        description: 'Held bill deleted successfully',
      });

      loadHeldBills();
    } catch (error) {
      console.error('Failed to delete held bill:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete held bill',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Held Bills
          </DialogTitle>
          <DialogDescription>
            Resume or manage temporarily held sales
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading held bills...
            </div>
          ) : heldBills.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Held Bills
              </h3>
              <p className="text-gray-500">
                There are no temporarily held sales at the moment
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Held Since</TableHead>
                  <TableHead>Held By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {heldBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-mono text-sm">
                      {bill.saleNumber}
                    </TableCell>
                    <TableCell>
                      {bill.customerName || (
                        <span className="text-gray-400">Walk-in</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{bill.itemCount} items</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      £{bill.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {format(new Date(bill.createdAt), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {bill.createdBy || '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        onClick={() => handleResume(bill.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Resume
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(bill.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HeldBillsDialog;
