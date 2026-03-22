import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

interface VoidTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, details: string) => void;
  saleNumber?: string;
  totalAmount?: number;
  loading?: boolean;
}

const VoidTransactionDialog: React.FC<VoidTransactionDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  saleNumber = 'N/A',
  totalAmount = 0,
  loading = false,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Delete Sale</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete sale <strong>#{saleNumber}</strong> for <strong>£{totalAmount.toFixed(2)}</strong>? This cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm('deleted', 'Sale deleted by user')}
            disabled={loading}
          >
            {loading ? 'Deleting...' : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Sale
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoidTransactionDialog;
