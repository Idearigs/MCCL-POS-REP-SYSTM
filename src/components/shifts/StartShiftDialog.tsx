import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, DollarSign, AlertTriangle } from 'lucide-react';
import { shiftService, StartShiftData, Shift } from '@/services/shiftService';

interface StartShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onShiftStarted: (shift: Shift) => void;
}

const StartShiftDialog: React.FC<StartShiftDialogProps> = ({
  open,
  onClose,
  onShiftStarted,
}) => {
  const [openingFloat, setOpeningFloat] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartShift = async () => {
    // Validate opening float
    const floatValue = parseFloat(openingFloat);
    if (isNaN(floatValue) || floatValue < 0) {
      setError('Please enter a valid opening float amount');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const shiftData: StartShiftData = {
        openingFloat: floatValue,
        openingNotes: openingNotes.trim() || undefined,
      };

      const newShift = await shiftService.startShift(shiftData);

      // Reset form
      setOpeningFloat('');
      setOpeningNotes('');

      // Notify parent and close
      onShiftStarted(newShift);
      onClose();
    } catch (err: any) {
      console.error('Error starting shift:', err);
      setError(err.message || 'Failed to start shift. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setOpeningFloat('');
      setOpeningNotes('');
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Start New Shift
          </DialogTitle>
          <DialogDescription>
            Enter your opening float amount to start a new shift. This will be used to
            track cash flow throughout your shift.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Opening Float Input */}
          <div className="space-y-2">
            <Label htmlFor="openingFloat" className="text-sm font-medium">
              Opening Float Amount <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                £
              </span>
              <Input
                id="openingFloat"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={openingFloat}
                onChange={(e) => setOpeningFloat(e.target.value)}
                className="pl-7"
                disabled={loading}
                autoFocus
              />
            </div>
            <p className="text-xs text-gray-500">
              Enter the total cash amount in your register at shift start
            </p>
          </div>

          {/* Opening Notes */}
          <div className="space-y-2">
            <Label htmlFor="openingNotes" className="text-sm font-medium">
              Opening Notes (Optional)
            </Label>
            <Textarea
              id="openingNotes"
              placeholder="Add any notes about your shift opening..."
              value={openingNotes}
              onChange={(e) => setOpeningNotes(e.target.value)}
              rows={3}
              disabled={loading}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              Any relevant information about starting conditions
            </p>
          </div>

          {/* Information Box */}
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-sm text-blue-900">
              <strong>Tip:</strong> Count your cash carefully before starting. This
              amount will be compared with your closing float to calculate variance.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleStartShift}
            disabled={loading || !openingFloat}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting Shift...
              </>
            ) : (
              'Start Shift'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StartShiftDialog;
