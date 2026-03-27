import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { salesService, Sale } from '@/services/salesService';
import { ArrowLeft, Save, ChevronLeft, ChevronRight, Loader2, CheckCircle, Search } from 'lucide-react';
import { toast } from 'sonner';

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

interface EditedItem {
  itemId: string;
  condition: 'BRAND_NEW' | 'USED';
  originalNotes: string;
  saving: boolean;
  saved: boolean;
}

export default function SaleConditionEditPage() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<string, EditedItem>>({});

  const fetchSales = useCallback(async (p: number, q: string) => {
    setLoading(true);
    try {
      const resp = await salesService.getSales(p, 20, q ? { search: q } : {});
      setSales(resp.data || []);
      setTotalPages(Math.ceil((resp.total || 0) / 20));
    } catch {
      toast.error('Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSales(page, search); }, [page, search, fetchSales]);

  const handleConditionChange = (itemId: string, currentNotes: string | undefined, condition: 'BRAND_NEW' | 'USED') => {
    setEdits(prev => ({
      ...prev,
      [itemId]: {
        itemId,
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
      // Update local sale data
      setSales(prev => prev.map(sale => ({
        ...sale,
        items: sale.items.map(item =>
          (item as any).id === itemId ? { ...item, notes: newNotes } : item
        ),
      })));
      toast.success('Condition updated');
    } catch {
      setEdits(prev => ({ ...prev, [itemId]: { ...prev[itemId], saving: false } }));
      toast.error('Failed to save — please try again');
    }
  };

  const hasEdit = (itemId: string, currentNotes?: string) => {
    const edit = edits[itemId];
    if (!edit) return false;
    const current = parseCondition(currentNotes);
    return edit.condition !== current;
  };

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/settings')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Sale Item Conditions</h1>
            <p className="text-sm text-gray-500 mt-0.5">Correct Brand New / Used classification on existing sale records</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by receipt number or customer…"
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Sales list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-24 text-gray-400 text-sm">No sales found</div>
        ) : (
          <div className="space-y-4">
            {sales.map(sale => {
              const productItems = sale.items?.filter(item => !(item as any).isRepair) || [];
              if (productItems.length === 0) return null;

              return (
                <div key={sale.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Sale header */}
                  <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
                    <div>
                      <span className="text-sm font-bold text-gray-800">
                        #{sale.receiptNumber || sale.id.slice(0, 8)}
                      </span>
                      <span className="ml-3 text-xs text-gray-400">
                        {sale.customerName || 'Walk-in'} · {new Date(sale.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500">
                      {productItems.length} item{productItems.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-50">
                    {productItems.map((item: any) => {
                      const itemId = item.id;
                      const currentCondition = edits[itemId]?.condition ?? parseCondition(item.notes);
                      const isDirty = hasEdit(itemId, item.notes);
                      const isSaving = edits[itemId]?.saving;
                      const isSaved = edits[itemId]?.saved && !isDirty;

                      return (
                        <div key={itemId} className="flex items-center gap-4 px-5 py-3.5">
                          {/* Product name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{item.productSku || item.sku || '—'}</p>
                          </div>

                          {/* Condition toggle */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleConditionChange(itemId, item.notes, 'BRAND_NEW')}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                currentCondition === 'BRAND_NEW'
                                  ? 'bg-green-500 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'
                              }`}
                            >
                              Brand New
                            </button>
                            <button
                              onClick={() => handleConditionChange(itemId, item.notes, 'USED')}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                currentCondition === 'USED'
                                  ? 'bg-amber-500 text-white shadow-sm'
                                  : 'bg-gray-100 text-gray-500 hover:bg-amber-50 hover:text-amber-600'
                              }`}
                            >
                              Used
                            </button>
                          </div>

                          {/* Save / status */}
                          <div className="flex-shrink-0 w-16 flex justify-end">
                            {isSaved && !isDirty ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : isDirty ? (
                              <button
                                onClick={() => handleSaveItem(itemId)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                              >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Save
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
