import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, DollarSign, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { floatService, OpenFloatSessionDto } from '@/services/floatService';
import { format } from 'date-fns';

interface FloatOpeningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFloatOpened: () => void;
}

const FloatOpeningModal: React.FC<FloatOpeningModalProps> = ({
  open,
  onOpenChange,
  onFloatOpened,
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OpenFloatSessionDto>({
    registerName: '',
    openingBalance: 200,
    notes: '',
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'openingBalance' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.openingBalance < 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Opening balance cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await floatService.openFloatSession(formData);

      toast({
        title: 'Float Opened',
        description: `Float session opened successfully with £${formData.openingBalance.toFixed(2)}`,
      });

      onFloatOpened();
      onOpenChange(false);

      // Reset form
      setFormData({
        registerName: '',
        openingBalance: 200,
        notes: '',
      });
    } catch (error: any) {
      console.error('Failed to open float:', error);
      toast({
        title: 'Failed to Open Float',
        description:
          error.response?.data?.message ||
          'An error occurred while opening the float session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <DollarSign className="h-6 w-6 text-green-600" />
            Open Float Session
          </DialogTitle>
          <DialogDescription>
            Start your shift by recording the opening cash balance
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Date/Time Display */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <div className="text-sm">
              <span className="font-medium text-blue-900">
                {format(new Date(), 'EEEE, MMMM d, yyyy')}
              </span>
              <span className="text-blue-600 ml-2">
                {format(new Date(), 'HH:mm')}
              </span>
            </div>
          </div>

          {/* Register Name */}
          <div className="space-y-2">
            <Label htmlFor="registerName">
              Register Name <span className="text-gray-400">(Optional)</span>
            </Label>
            <Input
              id="registerName"
              name="registerName"
              placeholder="e.g., Register 1, Main Counter"
              value={formData.registerName}
              onChange={handleInputChange}
            />
          </div>

          {/* Opening Balance */}
          <div className="space-y-2">
            <Label htmlFor="openingBalance" className="text-base font-semibold">
              Opening Balance <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                £
              </span>
              <Input
                id="openingBalance"
                name="openingBalance"
                type="number"
                step="0.01"
                min="0"
                placeholder="200.00"
                value={formData.openingBalance}
                onChange={handleInputChange}
                className="pl-8 text-lg font-semibold"
                required
              />
            </div>
            <p className="text-xs text-gray-500">
              Count all cash in the register and enter the total amount
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Notes <span className="text-gray-400">(Optional)</span>
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any notes about starting the shift..."
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>Important:</strong> Make sure you count all cash carefully
              before opening the float. This will be used to calculate your
              closing balance at the end of your shift.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Opening Float...' : 'Open Float'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FloatOpeningModal;
