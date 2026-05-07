import { useState, useEffect } from 'react';
import { Building2, Lock, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { outletService, type Outlet, type SelectedOutlet } from '../../services/outletService';
import { useOutlet } from '../../contexts/OutletContext';

interface Props {
  open: boolean;
  onSelected: () => void;
}

type Step = 'list' | 'password';

export function OutletSelectorDialog({ open, onSelected }: Props) {
  const { selectOutlet } = useOutlet();

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>('list');
  const [picked, setPicked] = useState<Outlet | null>(null);
  const [password, setPassword] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('list');
    setPicked(null);
    setPassword('');
    setError('');
    setLoading(true);
    outletService
      .getOutlets()
      .then(setOutlets)
      .catch(() => setError('Failed to load outlets — please refresh.'))
      .finally(() => setLoading(false));
  }, [open]);

  const handlePickOutlet = (outlet: Outlet) => {
    setPicked(outlet);
    setPassword('');
    setError('');
    setStep('password');
  };

  const handleVerify = async () => {
    if (!picked || !password) return;
    setVerifying(true);
    setError('');
    try {
      const result: SelectedOutlet = await outletService.verifyPassword(
        picked.id,
        password,
      );
      selectOutlet(result);
      onSelected();
    } catch {
      setError('Incorrect outlet password. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg">Select Outlet</DialogTitle>
              <DialogDescription className="text-xs">
                Choose your working location to continue
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {step === 'list' && (
          <div className="space-y-2 mt-2">
            {loading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading outlets…
              </div>
            )}

            {!loading && outlets.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                No outlets configured. Contact your administrator.
              </p>
            )}

            {!loading &&
              outlets
                .filter((o) => o.isActive)
                .map((outlet) => (
                  <button
                    key={outlet.id}
                    onClick={() => handlePickOutlet(outlet)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border hover:bg-accent hover:border-orange-300 transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-sm">
                        {outlet.code.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{outlet.name}</p>
                        {outlet.address && (
                          <p className="text-xs text-muted-foreground">
                            {outlet.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-orange-500 transition-colors" />
                  </button>
                ))}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive mt-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {step === 'password' && picked && (
          <div className="space-y-4 mt-2">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-md bg-orange-100 flex items-center justify-center font-bold text-orange-600 text-sm">
                {picked.code.slice(0, 2)}
              </div>
              <div>
                <p className="font-medium text-sm">{picked.name}</p>
                <p className="text-xs text-muted-foreground">
                  Enter outlet password to continue
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outlet-password" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Outlet Password
              </Label>
              <Input
                id="outlet-password"
                type="password"
                placeholder="Enter outlet password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                autoFocus
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStep('list');
                  setError('');
                }}
                disabled={verifying}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleVerify}
                disabled={!password || verifying}
              >
                {verifying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Lock className="h-4 w-4 mr-2" />
                )}
                {verifying ? 'Verifying…' : 'Enter Outlet'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
