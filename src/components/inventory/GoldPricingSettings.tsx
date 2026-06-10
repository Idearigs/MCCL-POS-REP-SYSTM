import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  goldPricingService,
  GoldCandidate,
  GoldRate,
} from '@/services/goldPricingService';

const gbp = (n: number | null) =>
  n == null ? '—' : `£${n.toFixed(2)}`;

const GoldPricingSettings: React.FC = () => {
  const [candidates, setCandidates] = useState<GoldCandidate[]>([]);
  const [rate, setRate] = useState<GoldRate | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [rows, r] = await Promise.all([
        goldPricingService.candidates(),
        goldPricingService.goldRateGBP().catch(() => null),
      ]);
      setCandidates(rows);
      setRate(r);
    } catch {
      toast.error('Failed to load gold-pricing data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const enabledCount = candidates.filter((c) => c.goldPricingEnabled).length;
  const allEnabled = candidates.length > 0 && enabledCount === candidates.length;

  const toggleOne = async (c: GoldCandidate, next: boolean) => {
    setSavingId(c.id);
    // optimistic
    setCandidates((prev) =>
      prev.map((p) => (p.id === c.id ? { ...p, goldPricingEnabled: next } : p)),
    );
    try {
      await goldPricingService.setEnabled([c.id], next);
    } catch {
      toast.error('Failed to update');
      setCandidates((prev) =>
        prev.map((p) =>
          p.id === c.id ? { ...p, goldPricingEnabled: !next } : p,
        ),
      );
    } finally {
      setSavingId(null);
    }
  };

  const setAll = async (next: boolean) => {
    const ids = candidates
      .filter((c) => c.goldPricingEnabled !== next)
      .map((c) => c.id);
    if (!ids.length) return;
    setCandidates((prev) => prev.map((p) => ({ ...p, goldPricingEnabled: next })));
    try {
      await goldPricingService.setEnabled(ids, next);
      toast.success(next ? 'All gold items included' : 'All gold items excluded');
    } catch {
      toast.error('Failed to update');
      await load();
    }
  };

  const recalcNow = async () => {
    try {
      setRunning(true);
      const res = await goldPricingService.run();
      if (!res.gramPriceGBP) {
        toast.error('No live gold rate available right now — try again shortly');
      } else {
        toast.success(
          `Repriced ${res.updated} item(s) @ £${res.gramPriceGBP.toFixed(2)}/g` +
            (res.skipped ? ` · ${res.skipped} skipped` : ''),
        );
      }
      await load();
    } catch {
      toast.error('Failed to recalculate prices');
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle>Live Gold Pricing</CardTitle>
            <CardDescription>
              Products with a gold weight are repriced daily to the live gold
              market value (Net Realisable Value). Include all, then exclude any
              you want to keep at a fixed price.
            </CardDescription>
          </div>
          <Button size="sm" onClick={recalcNow} disabled={running}>
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
            Recalculate now
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-2 text-sm">
          <span className="inline-flex items-center gap-1 text-amber-700">
            <TrendingUp className="h-4 w-4" />
            Live gold:{' '}
            <strong>{rate ? `£${rate.pricePerGram.toFixed(2)}/g (24k)` : '—'}</strong>
            {rate?.stale && (
              <Badge variant="outline" className="ml-1 text-amber-600 border-amber-300">
                cached
              </Badge>
            )}
          </span>
          <span className="text-gray-500">
            {enabledCount}/{candidates.length} included
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {loading && candidates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">Loading…</div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No products with a gold weight found. Add weight + carat to gold
            products and they'll appear here.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Button variant="outline" size="sm" onClick={() => setAll(true)} disabled={allEnabled}>
                Select all
              </Button>
              <Button variant="outline" size="sm" onClick={() => setAll(false)} disabled={enabledCount === 0}>
                Clear all
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Weight (g)</TableHead>
                    <TableHead className="text-right">Carat</TableHead>
                    <TableHead className="text-right">Current price</TableHead>
                    <TableHead className="text-right">Live value (NRV)</TableHead>
                    <TableHead className="text-center">Live pricing</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((c) => {
                    const missing = c.weight == null || !c.carat;
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <div className="font-medium text-gray-900">{c.name}</div>
                          <div className="text-xs text-gray-400">{c.sku}</div>
                        </TableCell>
                        <TableCell className="text-right">
                          {c.weight != null ? c.weight : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.carat ? `${c.carat}k` : (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <AlertTriangle className="h-3.5 w-3.5" /> set carat
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{gbp(c.currentPrice)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-700">
                          {gbp(c.liveValue)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <Switch
                              checked={c.goldPricingEnabled}
                              disabled={savingId === c.id || missing}
                              onCheckedChange={(v) => toggleOne(c, v)}
                            />
                            {c.lastGoldPricedAt && (
                              <span className="text-[10px] text-gray-400">
                                {format(new Date(c.lastGoldPricedAt), 'dd MMM HH:mm')}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GoldPricingSettings;
