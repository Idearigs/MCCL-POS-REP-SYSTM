import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { salesService, Sale } from '@/services/salesService';

// Local copies of the note-line parser (kept small & self-contained). Recovers
// second-hand / bespoke lines from the sale notes so the owner can attach the
// source-bill number and cost — enabling margin-scheme VAT (profit ÷ 6).
const NON_STOCK_MARKER = /^\s*(GIFT CARD|MANUAL ENTRY|APPRAISAL|CUSTOM TILE|REPAIR SERVICE)\s*:\s*/i;
const CONDITION_TOKEN = /\s*CONDITION:(BRAND_NEW|USED)\s*/i;
const BESPOKE_RE = /bespoke/i;
const SECONDHAND_RE = /(second[-\s]?hand|second\s*sale)/i;

function parseSecondhandBespoke(notes?: string): { title: string; price: number }[] {
  const s = String(notes || '');
  const idx = s.search(/Repair Services:\s*/i);
  if (idx === -1) return [];
  return s
    .slice(idx)
    .replace(/Repair Services:\s*/i, '')
    .split(/,(?=\s)/)
    .map((seg) => {
      const priceM = seg.match(/£\s*([\d.,]+)\s*$/);
      const price = priceM ? parseFloat(priceM[1].replace(/,/g, '')) : 0;
      const title = seg
        .replace(/:\s*£\s*[\d.,]+\s*$/, '')
        .replace(NON_STOCK_MARKER, '')
        .replace(CONDITION_TOKEN, '')
        .trim();
      return { title, price };
    })
    .filter((x) => x.title && (BESPOKE_RE.test(x.title) || SECONDHAND_RE.test(x.title)));
}

const gbp = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);

interface Props {
  sale: Sale;
}

/**
 * OWNER/MANAGER editor to record the source-bill number + cost of a
 * second-hand / bespoke line, so the Sales export can compute VAT on the
 * profit (margin scheme). Shown only when the sale has such a line.
 */
const SecondhandCostEditor: React.FC<Props> = ({ sale }) => {
  const { toast } = useToast();
  const { auth } = useAuth();
  const isPrivileged = auth.user?.role === 'OWNER' || auth.user?.role === 'MANAGER';

  const lines = parseSecondhandBespoke(sale.notes);
  const [values, setValues] = useState<Record<string, { cost: string; bill: string }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (lines.length === 0) return;
    let cancelled = false;
    salesService
      .getManualCosts(sale.id)
      .then((rows) => {
        if (cancelled) return;
        const next: Record<string, { cost: string; bill: string }> = {};
        for (const l of lines) {
          const existing = rows.find((r) => r.lineKey === l.title);
          next[l.title] = {
            cost: existing ? String(existing.cost) : '',
            bill: existing?.sourceBillNumber || '',
          };
        }
        setValues(next);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setLoaded(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale.id]);

  if (lines.length === 0 || !isPrivileged) return null;

  const save = async (title: string, price: number) => {
    const v = values[title] || { cost: '', bill: '' };
    const cost = parseFloat(v.cost);
    if (Number.isNaN(cost) || cost < 0) {
      toast({ title: 'Enter a valid cost', variant: 'destructive' });
      return;
    }
    setSavingKey(title);
    try {
      await salesService.setManualCost(sale.id, {
        lineKey: title,
        cost,
        sourceBillNumber: v.bill.trim() || undefined,
      });
      toast({
        title: 'Cost saved',
        description: `VAT for "${title}" will now be charged on ${gbp(Math.max(0, price - cost))} profit.`,
      });
    } catch {
      toast({ title: 'Could not save cost', variant: 'destructive' });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
        <Tag className="h-4 w-4" />
        Second-hand / Bespoke cost (for VAT on profit)
      </div>
      <p className="text-xs text-amber-700">
        Enter the bill this item's cost came from and the cost. VAT is then
        charged on the profit (margin scheme). Owner/manager only — never on
        customer receipts.
      </p>
      {!loaded && <Loader2 className="h-4 w-4 animate-spin text-amber-600" />}
      {loaded &&
        lines.map((l) => {
          const v = values[l.title] || { cost: '', bill: '' };
          return (
            <div key={l.title} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label className="text-xs">{l.title}</Label>
                <p className="text-[11px] text-gray-500">Sold for {gbp(l.price)}</p>
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Source bill #</Label>
                <Input
                  className="h-8 text-xs bg-white"
                  value={v.bill}
                  onChange={(e) =>
                    setValues((s) => ({ ...s, [l.title]: { ...v, bill: e.target.value } }))
                  }
                  placeholder="e.g. INV-2231"
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Cost (£)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  className="h-8 text-xs bg-white"
                  value={v.cost}
                  onChange={(e) =>
                    setValues((s) => ({ ...s, [l.title]: { ...v, cost: e.target.value } }))
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <Button
                  size="sm"
                  className="h-8 w-full"
                  disabled={savingKey === l.title}
                  onClick={() => save(l.title, l.price)}
                >
                  {savingKey === l.title ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          );
        })}
    </div>
  );
};

export default SecondhandCostEditor;
