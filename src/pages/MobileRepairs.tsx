import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { repairService } from '@/services/repairService';
import RepairStatusBadge from '@/components/repair/RepairStatusBadge';
import {
  ArrowLeft, Plus, RefreshCw, Search, Calendar, Hash, Loader2,
  Check, ChevronRight,
} from 'lucide-react';

interface RepairRow {
  id: string;
  repairNumber?: string;
  customerName?: string;
  itemDescription?: string;
  status: string;
  estimatedCost?: number;
  totalCost?: number;
  expectedCompletionDate?: string;
  estimatedCompletion?: string;
  createdAt?: string;
}

// Status options offered on mobile (value = backend status, label = display).
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'RECEIVED', label: 'Received' },
  { value: 'QUOTED', label: 'Quoted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'READY_FOR_COLLECTION', label: 'Ready for Collection' },
  { value: 'COLLECTED', label: 'Collected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// Filter chips (broad buckets matched against the raw status).
const FILTERS: { key: string; label: string; match?: string[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'RECEIVED', label: 'Received' },
  { key: 'QUOTED', label: 'Quoted' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'READY_FOR_COLLECTION', label: 'Ready' },
  { key: 'COLLECTED', label: 'Collected' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function MobileRepairs() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [repairs, setRepairs] = useState<RepairRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (opts.silent) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await repairService.getRepairs(1, 100, {});
      const list = (res as any)?.data ?? (Array.isArray(res) ? res : []);
      setRepairs(list);
    } catch {
      // Errors surface via the empty state; keep the screen calm.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh when returning to the tab (e.g. after adding a repair).
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') load({ silent: true }); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  const changeStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    try {
      await repairService.updateRepair(id, { status } as any);
      setRepairs(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
      setExpandedId(null);
    } catch {
      // ignore — keep prior status on failure
    } finally {
      setUpdatingId(null);
    }
  };

  const q = search.trim().toLowerCase();
  const visible = repairs.filter(r => {
    if (filter !== 'all' && r.status !== filter) return false;
    if (!q) return true;
    return (
      (r.customerName || '').toLowerCase().includes(q) ||
      (r.itemDescription || '').toLowerCase().includes(q) ||
      (r.repairNumber || '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col"
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight">Repairs</h1>
            <p className="text-xs text-gray-500 truncate">
              {user?.name ?? 'Staff'} · {repairs.length} job{repairs.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={() => load({ silent: true })}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 active:bg-gray-200 flex-shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2.5">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, item or ID…"
              className="flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`whitespace-nowrap text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors ${
                filter === f.key
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div className="flex-1 px-4 py-4 space-y-3 pb-28">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin mb-3" />
            <p className="text-sm">Loading repairs…</p>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Search className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No repairs found</p>
            <p className="text-xs text-gray-400 mt-1">
              {search || filter !== 'all' ? 'Try a different search or filter.' : 'Tap + to add the first repair job.'}
            </p>
          </div>
        ) : (
          visible.map(r => {
            const expanded = expandedId === r.id;
            const price = r.estimatedCost ?? r.totalCost ?? 0;
            return (
              <div
                key={r.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="w-full text-left px-4 py-3.5 active:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold text-gray-900 truncate">
                        {r.customerName || 'Walk-in customer'}
                      </p>
                      {r.repairNumber && (
                        <p className="flex items-center gap-1 text-xs font-mono text-gray-400 mt-0.5">
                          <Hash className="w-3 h-3" />
                          {r.repairNumber}
                        </p>
                      )}
                    </div>
                    <RepairStatusBadge status={r.status} size="sm" />
                  </div>

                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                    {r.itemDescription || 'No description'}
                  </p>

                  <div className="flex items-center justify-between mt-2.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar className="w-3.5 h-3.5" />
                      Due {fmtDate(r.expectedCompletionDate || r.estimatedCompletion)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">£{Number(price).toFixed(2)}</span>
                  </div>
                </button>

                {/* Inline status manager */}
                {expanded && (
                  <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Update Status
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map(opt => {
                        const active = r.status === opt.value;
                        return (
                          <button
                            key={opt.value}
                            disabled={updatingId === r.id}
                            onClick={() => !active && changeStatus(r.id, opt.value)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 ${
                              active
                                ? 'bg-violet-600 text-white border-violet-600'
                                : 'bg-white text-gray-700 border-gray-200 active:bg-violet-50'
                            }`}
                          >
                            {active && <Check className="w-3 h-3 inline mr-1 -mt-0.5" />}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                    {updatingId === r.id && (
                      <p className="flex items-center gap-1.5 text-xs text-violet-600 mt-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating…
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Add FAB ── */}
      <button
        onClick={() => navigate('/mobile/add-repair')}
        className="fixed bottom-6 right-5 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}
        aria-label="New repair job"
      >
        <Plus className="w-7 h-7" />
      </button>
    </div>
  );
}
