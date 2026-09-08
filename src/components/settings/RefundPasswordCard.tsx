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
import { ShieldCheck, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { salesService } from '@/services/salesService';

/**
 * OWNER-only card to set the shared refund-authorisation password.
 * One password per tenant, applied to every user: anyone processing a refund
 * must enter it. The password itself is never read back from the server — we
 * only learn whether one is configured (isSet).
 */
const RefundPasswordCard: React.FC = () => {
  const { toast } = useToast();
  const [isSet, setIsSet] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

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
    if (password.trim().length < 4) {
      toast({
        title: 'Password too short',
        description: 'The refund password must be at least 4 characters.',
        variant: 'destructive',
      });
      return;
    }
    if (password !== confirm) {
      toast({
        title: 'Passwords do not match',
        description: 'Re-enter the same password in both fields.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      await salesService.setRefundPassword(password);
      toast({
        title: isSet ? 'Refund password updated' : 'Refund password set',
        description: 'Every user must enter this password to process a refund.',
      });
      setPassword('');
      setConfirm('');
      await loadStatus();
    } catch (err: any) {
      toast({
        title: 'Could not save',
        description:
          err?.response?.data?.message ||
          err?.message ||
          'Failed to set the refund password.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Refund Authorisation Password
        </CardTitle>
        <CardDescription>
          A single password required to process any refund. It applies to every
          user — only an owner can set or change it here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSet !== null && (
          <div
            className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${
              isSet
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {isSet ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                A refund password is currently set. Refunds are protected.
              </>
            ) : (
              <>
                No refund password set yet — refunds are <strong>not</strong>{' '}
                protected until you set one.
              </>
            )}
          </div>
        )}

        <div className="space-y-2 max-w-sm">
          <Label htmlFor="refund-pw">
            {isSet ? 'New refund password' : 'Refund password'}
          </Label>
          <div className="relative">
            <Input
              id="refund-pw"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 4 characters"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2 max-w-sm">
          <Label htmlFor="refund-pw-confirm">Confirm password</Label>
          <Input
            id="refund-pw-confirm"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter the password"
            autoComplete="new-password"
          />
        </div>

        <Button onClick={handleSave} disabled={saving || !password}>
          {saving ? 'Saving…' : isSet ? 'Update Password' : 'Set Password'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default RefundPasswordCard;
