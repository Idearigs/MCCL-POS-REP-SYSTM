import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { salesService } from '@/services/salesService';

/**
 * OWNER-only card to set the shared 4-digit refund PIN.
 * One PIN per tenant, applied to every user: anyone processing a refund must
 * enter it. The PIN is never read back from the server — we only learn whether
 * one is configured (isSet).
 */
const RefundPasswordCard: React.FC = () => {
  const { toast } = useToast();
  const [isSet, setIsSet] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 4);

  const loadStatus = async () => {
    try {
      const { isSet } = await salesService.getRefundPasswordStatus();
      setIsSet(isSet);
    } catch {
      setIsSet(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSave = async () => {
    if (!/^\d{4}$/.test(pin)) {
      toast({
        title: 'Enter a 4-digit PIN',
        description: 'The refund PIN must be exactly 4 digits.',
        variant: 'destructive',
      });
      return;
    }
    if (pin !== confirm) {
      toast({
        title: 'PINs do not match',
        description: 'Re-enter the same 4-digit PIN in both fields.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await salesService.setRefundPassword(pin);
      toast({
        title: isSet ? 'Refund PIN updated' : 'Refund PIN set',
        description: 'Every user must enter this PIN to process a refund.',
      });
      setPin('');
      setConfirm('');
      await loadStatus();
    } catch (err: any) {
      toast({
        title: 'Could not save',
        description:
          err?.message ||
          err?.response?.data?.message ||
          'Failed to set the refund PIN.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const pinInputClass =
    'w-32 text-center text-2xl tracking-[0.5em] bg-white';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Refund Authorisation PIN
        </CardTitle>
        <CardDescription>
          A single 4-digit PIN required to process any refund — quick to enter at
          the till. It applies to every user; only an owner can set or change it
          here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSet !== null && (
          <div
            className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
              isSet ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {isSet ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                A refund PIN is currently set. Refunds are protected.
              </>
            ) : (
              <>
                No refund PIN set yet — refunds are <strong>not</strong>{' '}
                protected until you set one.
              </>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="refund-pin">
            {isSet ? 'New refund PIN' : 'Refund PIN'}
          </Label>
          <Input
            id="refund-pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(onlyDigits(e.target.value))}
            placeholder="• • • •"
            autoComplete="new-password"
            className={pinInputClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="refund-pin-confirm">Confirm PIN</Label>
          <Input
            id="refund-pin-confirm"
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={confirm}
            onChange={(e) => setConfirm(onlyDigits(e.target.value))}
            placeholder="• • • •"
            autoComplete="new-password"
            className={pinInputClass}
          />
        </div>

        <Button onClick={handleSave} disabled={saving || pin.length < 4}>
          {saving ? 'Saving…' : isSet ? 'Update PIN' : 'Set PIN'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RefundPasswordCard;
