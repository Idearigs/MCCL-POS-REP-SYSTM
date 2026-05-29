import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/services/apiClient';
import { toast } from 'sonner';
import {
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  CalendarDays,
  ShieldCheck,
} from 'lucide-react';

// Extend window for LemonSqueezy overlay
declare global {
  interface Window {
    LemonSqueezy?: {
      Setup: (opts: { eventHandler: (e: { event: string }) => void }) => void;
      Url: { Open: (url: string) => void };
    };
  }
}

interface SubscriptionData {
  id: string;
  plan: string;
  billingCycle: string;
  basePrice: string | number;
  isActive: boolean;
  isOnTrial: boolean;
  currentPeriodEnd: string;
  nextBillingDate: string;
  lsStatus: string | null;
  lsSubscriptionId: string | null;
  lastPaymentAt: string | null;
}

const PLAN_LABEL: Record<string, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  BUSINESS: 'Business',
  ENTERPRISE: 'Enterprise',
  CUSTOM: 'Custom',
};

const STATUS_CONFIG: Record<string, { label: string; colour: string }> = {
  active:     { label: 'Active',       colour: 'text-green-700 bg-green-100' },
  on_trial:   { label: 'Trial',        colour: 'text-blue-700 bg-blue-100' },
  past_due:   { label: 'Payment Due',  colour: 'text-amber-700 bg-amber-100' },
  cancelled:  { label: 'Cancelled',    colour: 'text-red-700 bg-red-100' },
  expired:    { label: 'Expired',      colour: 'text-gray-700 bg-gray-100' },
  paused:     { label: 'Paused',       colour: 'text-gray-700 bg-gray-100' },
};

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtPrice(price: string | number): string {
  return `£${Number(price).toFixed(2)}`;
}

const SubscriptionPage: React.FC = () => {
  const { auth } = useAuth();
  const subdomain = auth.tenantInfo.tenantSlug ?? '';

  const [sub, setSub]               = useState<SubscriptionData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!subdomain) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get(
        `/mainframe/subscriptions/by-subdomain/${subdomain}`,
      );
      setSub(data as SubscriptionData);
    } catch {
      setError('Could not load subscription details.');
    } finally {
      setLoading(false);
    }
  }, [subdomain]);

  useEffect(() => { void fetchSubscription(); }, [fetchSubscription]);

  // Initialise LemonSqueezy overlay listener once
  useEffect(() => {
    if (!window.LemonSqueezy) return;
    window.LemonSqueezy.Setup({
      eventHandler: (e) => {
        if (e.event === 'Checkout.Success') {
          toast.success('Payment successful! Your subscription is being activated…');
          // Poll for a few seconds to pick up the webhook update
          setTimeout(() => { void fetchSubscription(); }, 4000);
        }
      },
    });
  }, [fetchSubscription]);

  const handleSubscribe = async () => {
    if (!subdomain) return;
    setCheckoutLoading(true);
    try {
      const data = await apiClient.post('/mainframe/subscriptions/create-checkout', {
        subdomain,
      }) as { checkoutUrl: string };

      if (window.LemonSqueezy) {
        window.LemonSqueezy.Url.Open(data.checkoutUrl);
      } else {
        // Fallback: open in new tab if the overlay script didn't load
        window.open(data.checkoutUrl, '_blank');
      }
    } catch (err) {
      // Surface the server's actual reason (e.g. billing not enabled) instead
      // of a generic "try again" that invites pointless retries.
      const message =
        (err as { message?: string })?.message ||
        'Could not open checkout. Please try again.';
      toast.error(message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageBilling = async () => {
    if (!subdomain) return;
    setPortalLoading(true);
    try {
      const data = await apiClient.get(
        `/mainframe/subscriptions/portal-url/${subdomain}`,
      ) as { portalUrl: string | null };

      if (data.portalUrl) {
        window.open(data.portalUrl, '_blank');
      } else {
        toast.info('No billing portal available yet — subscribe first.');
      }
    } catch {
      toast.error('Could not open billing portal.');
    } finally {
      setPortalLoading(false);
    }
  };

  const isSubscribed = sub?.lsSubscriptionId != null && sub?.isActive;
  const lsStatus     = sub?.lsStatus ?? (sub?.isActive ? 'active' : null);
  const statusCfg    = lsStatus ? (STATUS_CONFIG[lsStatus] ?? STATUS_CONFIG.active) : null;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your MPS monthly subscription and billing.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <Card>
            <CardContent className="py-12 flex items-center justify-center gap-3 text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading subscription…</span>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {!loading && error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6 flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <Button variant="outline" size="sm" onClick={fetchSubscription}>
                <RefreshCw className="w-4 h-4 mr-1" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Subscription card */}
        {!loading && !error && sub && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg">
                      {PLAN_LABEL[sub.plan] ?? sub.plan} Plan
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {fmtPrice(sub.basePrice)} / {sub.billingCycle.toLowerCase()}
                    </CardDescription>
                  </div>
                  {statusCfg && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusCfg.colour}`}>
                      {statusCfg.label}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-500 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" /> Next billing date
                    </p>
                    <p className="font-medium text-gray-900">{fmtDate(sub.nextBillingDate)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Last payment
                    </p>
                    <p className="font-medium text-gray-900">{fmtDate(sub.lastPaymentAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Period end
                    </p>
                    <p className="font-medium text-gray-900">{fmtDate(sub.currentPeriodEnd)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-500">Billing via</p>
                    <p className="font-medium text-gray-900">
                      {isSubscribed ? 'LemonSqueezy' : '—'}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-4 flex flex-wrap gap-3">
                  {isSubscribed ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={handleManageBilling}
                        disabled={portalLoading}
                      >
                        {portalLoading
                          ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          : <ExternalLink className="w-4 h-4 mr-2" />
                        }
                        Manage Billing
                      </Button>
                      <p className="text-xs text-gray-400 self-center">
                        Cancel, update card, or view invoices in the billing portal.
                      </p>
                    </>
                  ) : (
                    <Button
                      onClick={handleSubscribe}
                      disabled={checkoutLoading}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {checkoutLoading
                        ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        : <CreditCard className="w-4 h-4 mr-2" />
                      }
                      Subscribe Now
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* What's included */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">What's included</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-700">
                  {[
                    'Point of Sale terminal',
                    'Inventory & stock management',
                    'Repair job tracking',
                    'Customer management',
                    'Sales reporting & financials',
                    'Staff & cashier management',
                    'End of day cash-up',
                    'HR management',
                  ].map(feature => (
                    <li key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        {/* No subscription found at all */}
        {!loading && !error && !sub && (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center space-y-4">
              <CreditCard className="w-10 h-10 text-gray-300 mx-auto" />
              <div>
                <p className="font-semibold text-gray-700">No subscription found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Subscribe to activate your MPS system.
                </p>
              </div>
              <Button
                onClick={handleSubscribe}
                disabled={checkoutLoading}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {checkoutLoading
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <CreditCard className="w-4 h-4 mr-2" />
                }
                Subscribe Now
              </Button>
            </CardContent>
          </Card>
        )}

      </div>
    </MainLayout>
  );
};

export default SubscriptionPage;
