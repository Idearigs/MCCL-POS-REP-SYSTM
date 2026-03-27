import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuth } from '@/contexts/AuthContext';
import { salesService, Sale } from '@/services/salesService';
import {
  ArrowLeft, Save, ChevronLeft, ChevronRight, Loader2, CheckCircle,
  Search, Upload, ChevronDown, ChevronUp, RefreshCw, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { format } from 'date-fns';

// ── helpers ───────────────────────────────────────────────────────────────────

const CONDITION_REGEX = /CONDITION:(BRAND_NEW|USED)/;

function parseCondition(notes?: string): 'BRAND_NEW' | 'USED' | null {
  if (!notes) return null;
  const m = notes.match(CONDITION_REGEX);
  return m ? (m[1] as 'BRAND_NEW' | 'USED') : null;
}

function setConditionInNotes(notes: string | undefined, condition: 'BRAND_NEW' | 'USED'): string {
  const tag = `CONDITION:${condition}`;
  if (!notes) return tag;
  if (CONDITION_REGEX.test(notes)) return notes.replace(CONDITION_REGEX, tag);
  return `${tag} | ${notes}`;
}

interface ItemEdit {
  condition: 'BRAND_NEW' | 'USED';
  originalNotes: string;
  saving: boolean;
  saved: boolean;
}

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSVReceiptNumbers(text: string): Set<string> {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Set();
  const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
  const saleNumIdx = headers.findIndex(h =>
    h.includes('sale') || h.includes('receipt') || h.includes('number') || h.includes('invoice'),
  );
  if (saleNumIdx === -1) return new Set();
  const numbers = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const val = cols[saleNumIdx]?.replace(/"/g, '').trim();
    if (val) numbers.add(val);
  }
  return numbers;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SaleConditionEditPage() {
  const navigate = useNavigate();
  const { auth } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restrict to buymejewellery tenant only
  if (auth.tenantInfo && auth.tenantInfo.tenantSlug !== 'buymejewellery') {
    return <Navigate to="/settings" replace />;
  }

  // data
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');

  // editing
  const [edits, setEdits] = useState<Record<string, ItemEdit>>({});
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  // csv
  const [csvFilter, setCsvFilter] = useState<Set<string> | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);

  // ── fetch ──────────────────────────────────────────────────────────────────

  const fetchSales = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const resp = await salesService.getSales(p, 20, q ? { search: q } : {});
      setSales(resp.data || []);
      setTotalCount(resp.total || 0);
      setTotalPages(Math.max(1, Math.ceil((resp.total || 0) / 20)));
    } catch {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSales(page, search); }, [page, search, fetchSales]);

  // ── editing handlers ───────────────────────────────────────────────────────

  const handleConditionChange = (itemId: string, currentNotes: string | undefined, condition: 'BRAND_NEW' | 'USED') => {
    setEdits(prev => ({
      ...prev,
      [itemId]: {
        condition,
        originalNotes: currentNotes || '',
        saving: false,
        saved: false,
      },
    }));
  };

  const handleSaveItem = async (itemId: string) => {
    const edit = edits[itemId];
    if (!edit) return;
    setEdits(prev => ({ ...prev, [itemId]: { ...prev[itemId], saving: true } }));
    try {
      const newNotes = setConditionInNotes(edit.originalNotes, edit.condition);
      await salesService.updateSaleItemNotes(itemId, newNotes);
      setEdits(prev => ({ ...prev, [itemId]: { ...prev[itemId], saving: false, saved: true } }));
      setSales(prev => prev.map(sale => ({
        ...sale,
        items: sale.items.map((item: any) =>
          item.id === itemId ? { ...item, notes: newNotes } : item,
        ),
      })));
      toast.success('Condition saved');
    } catch {
      setEdits(prev => ({ ...prev, [itemId]: { ...prev[itemId], saving: false } }));
      toast.error('Failed to save — please try again');
    }
  };

  const isDirty = (itemId: string, currentNotes?: string) => {
    const edit = edits[itemId];
    if (!edit) return false;
    return edit.condition !== parseCondition(currentNotes);
  };

  // ── CSV ────────────────────────────────────────────────────────────────────

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const numbers = parseCSVReceiptNumbers(text);
      if (numbers.size === 0) {
        toast.error('No sale numbers found in CSV. Make sure it has a column named "Sale Number" or "Receipt".');
        return;
      }
      setCsvFilter(numbers);
      setCsvFileName(file.name);
      setPage(1);
      toast.success(`CSV loaded — showing ${numbers.size} sale${numbers.size !== 1 ? 's' : ''} from file`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const clearCSV = () => {
    setCsvFilter(null);
    setCsvFileName(null);
  };

  // ── derived list ───────────────────────────────────────────────────────────

  const displayedSales = csvFilter
    ? sales.filter(s => {
        const num = (s as any).saleNumber || s.receiptNumber || '';
        return csvFilter.has(num) || csvFilter.has(`#${num}`);
      })
    : sales;

  // ── formatters (same as SalesPage) ────────────────────────────────────────

  const fmt = (amount: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

  const fmtDate = (ds: string) => {
    const d = new Date(ds);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return `Today ${format(d, 'HH:mm')}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday ${format(d, 'HH:mm')}`;
    return format(d, 'dd MMM yyyy HH:mm');
  };

  const paymentBadge = (status: string) => {
    const cfg: Record<string, { variant: any; label: string; cls?: string }> = {
      PENDING: { variant: 'secondary', label: 'Pending' },
      COMPLETED: { variant: 'default', label: 'Success', cls: 'bg-green-500 text-white' },
      FAILED: { variant: 'destructive', label: 'Failed' },
      REFUNDED: { variant: 'outline', label: 'Refunded' },
      PARTIALLY_REFUNDED: { variant: 'outline', label: 'Partial' },
    };
    const c = cfg[status] || cfg.PENDING;
    return <Badge variant={c.variant} className={`text-xs ${c.cls || ''}`}>{c.label}</Badge>;
  };

  const statusBadge = (status: string) => {
    const cfg: Record<string, { variant: any; label: string }> = {
      DRAFT: { variant: 'secondary', label: 'Draft' },
      COMPLETED: { variant: 'default', label: 'Completed' },
      CANCELLED: { variant: 'destructive', label: 'Cancelled' },
      REFUNDED: { variant: 'outline', label: 'Refunded' },
    };
    const c = cfg[status] || cfg.COMPLETED;
    return <Badge variant={c.variant} className="text-xs">{c.label}</Badge>;
  };

  const paymentLabel = (m: string) =>
    ({ CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Transfer', CHEQUE: 'Cheque', DIGITAL_WALLET: 'Wallet', INSTALLMENT: 'Installment' } as any)[m] || m;

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <MainLayout pageTitle="Edit Sale Conditions">
      <div className="container mx-auto px-4 space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/settings')}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Edit Sale Conditions</h1>
              <p className="text-sm text-gray-500">Correct Brand New / Used classification on existing sales</p>
            </div>
          </div>

          {/* CSV upload */}
          <div className="flex items-center gap-2">
            {csvFilter && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700 font-medium">
                <span>{csvFileName} · {csvFilter.size} records</span>
                <button onClick={clearCSV} className="hover:text-indigo-900">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-700 font-medium transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCSVUpload}
            />
          </div>
        </div>

        {/* ── Search ── */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by receipt # or customer…"
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* ── Table ── */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : displayedSales.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <p className="text-sm">No sales found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold w-8" />
                      <TableHead className="font-semibold">Sale #</TableHead>
                      <TableHead className="font-semibold">Date & Time</TableHead>
                      <TableHead className="font-semibold">Customer</TableHead>
                      <TableHead className="font-semibold text-center">Items</TableHead>
                      <TableHead className="font-semibold text-right">Amount</TableHead>
                      <TableHead className="font-semibold">Payment</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Cashier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedSales.map(sale => {
                      const productItems = (sale.items || []).filter((i: any) => !i.isRepair);
                      const isExpanded = expandedSaleId === sale.id;
                      const dirtyCount = productItems.filter((i: any) => isDirty(i.id, i.notes)).length;

                      return (
                        <React.Fragment key={sale.id}>
                          {/* ── Sale row ── */}
                          <TableRow
                            className={`cursor-pointer hover:bg-indigo-50/40 transition-colors ${isExpanded ? 'bg-indigo-50/60' : ''}`}
                            onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                          >
                            <TableCell className="text-gray-400 pl-4">
                              {isExpanded
                                ? <ChevronUp className="w-4 h-4 text-indigo-500" />
                                : <ChevronDown className="w-4 h-4" />}
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {(sale as any).saleNumber || sale.receiptNumber || `#${sale.id.slice(0, 8)}`}
                                {dirtyCount > 0 && (
                                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title={`${dirtyCount} unsaved`} />
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">{fmtDate(sale.createdAt)}</TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{sale.customerName || 'Walk-in Customer'}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">{sale.items?.length || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{fmt(sale.totalAmount)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-gray-600">{paymentLabel(sale.paymentMethod)}</span>
                                {paymentBadge(sale.paymentStatus)}
                              </div>
                            </TableCell>
                            <TableCell>{statusBadge(sale.status)}</TableCell>
                            <TableCell className="text-sm text-gray-600">{sale.cashierName || 'Unknown'}</TableCell>
                          </TableRow>

                          {/* ── Expanded items editor ── */}
                          {isExpanded && (
                            <TableRow className="bg-indigo-50/30">
                              <TableCell colSpan={9} className="p-0">
                                <div className="px-6 py-4 space-y-2">
                                  {productItems.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic">No product items in this sale.</p>
                                  ) : (
                                    productItems.map((item: any) => {
                                      const itemId = item.id;
                                      const currentCondition = edits[itemId]?.condition ?? parseCondition(item.notes);
                                      const dirty = isDirty(itemId, item.notes);
                                      const saving = edits[itemId]?.saving;
                                      const saved = edits[itemId]?.saved && !dirty;

                                      return (
                                        <div
                                          key={itemId}
                                          className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-sm"
                                        >
                                          {/* Product info */}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                                            <p className="text-xs text-gray-400">{item.productSku || item.sku || '—'}</p>
                                          </div>

                                          {/* Condition toggles */}
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                              onClick={() => handleConditionChange(itemId, item.notes, 'BRAND_NEW')}
                                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                                currentCondition === 'BRAND_NEW'
                                                  ? 'bg-green-500 text-white border-green-500 shadow-sm'
                                                  : 'bg-white text-gray-500 border-gray-200 hover:border-green-300 hover:text-green-600'
                                              }`}
                                            >
                                              Brand New
                                            </button>
                                            <button
                                              onClick={() => handleConditionChange(itemId, item.notes, 'USED')}
                                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                                                currentCondition === 'USED'
                                                  ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                                                  : 'bg-white text-gray-500 border-gray-200 hover:border-amber-300 hover:text-amber-600'
                                              }`}
                                            >
                                              Used
                                            </button>
                                          </div>

                                          {/* Save / saved */}
                                          <div className="flex-shrink-0 w-20 flex justify-end">
                                            {saved ? (
                                              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Saved
                                              </span>
                                            ) : dirty ? (
                                              <button
                                                onClick={() => handleSaveItem(itemId)}
                                                disabled={saving}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                                              >
                                                {saving
                                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                                  : <Save className="w-3 h-3" />}
                                                Update
                                              </button>
                                            ) : (
                                              <span className="text-xs text-gray-300">—</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Footer: count + pagination ── */}
        {!loading && displayedSales.length > 0 && (
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              {csvFilter
                ? `${displayedSales.length} of ${csvFilter.size} CSV records matched`
                : `Showing ${(page - 1) * 20 + 1}–${Math.min(page * 20, totalCount)} of ${totalCount} sales`}
            </span>
            {!csvFilter && totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
