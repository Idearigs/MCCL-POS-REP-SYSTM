import React, { useState, useEffect, useRef } from 'react';
import { X, Percent, PoundSterling, Tag, FileText, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export interface LineDiscount {
  type: 'percent' | 'fixed';
  value: number;
}

export interface CartItemWithMeta {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  stock?: number;
  condition?: string;
  lineDiscount?: LineDiscount;
  staffId?: string;
  staffName?: string;
  // Spec sheet extras pulled from inventory
  material?: string;
  weight?: string;
  purity?: string;
  category?: string;
  serialNumber?: string;
}

interface StaffOption {
  id: string;
  name: string;
}

interface CartItemPopoverProps {
  item: CartItemWithMeta;
  anchorRef: React.RefObject<HTMLDivElement>;
  staffList: StaffOption[];
  onUpdateDiscount: (discount: LineDiscount | undefined) => void;
  onUpdateStaff: (staffId: string, staffName: string) => void;
  onClose: () => void;
}

const CartItemPopover: React.FC<CartItemPopoverProps> = ({
  item,
  anchorRef,
  staffList,
  onUpdateDiscount,
  onUpdateStaff,
  onClose,
}) => {
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>(
    item.lineDiscount?.type ?? 'percent',
  );
  const [discountValue, setDiscountValue] = useState(
    item.lineDiscount?.value?.toString() ?? '',
  );
  const [selectedStaffId, setSelectedStaffId] = useState(item.staffId ?? '');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Position the popover near the anchor element
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (anchorRef.current && popoverRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const pop = popoverRef.current.getBoundingClientRect();
      const viewH = window.innerHeight;
      const top = rect.bottom + 8 + pop.height > viewH
        ? rect.top - pop.height - 8
        : rect.bottom + 8;
      setStyle({
        position: 'fixed',
        top,
        left: Math.min(rect.left, window.innerWidth - pop.width - 8),
        zIndex: 9999,
      });
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleApplyDiscount = () => {
    const val = parseFloat(discountValue);
    if (!discountValue || isNaN(val) || val <= 0) {
      onUpdateDiscount(undefined);
    } else {
      onUpdateDiscount({ type: discountType, value: val });
    }
  };

  const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const staffId = e.target.value;
    const staff = staffList.find((s) => s.id === staffId);
    setSelectedStaffId(staffId);
    if (staff) onUpdateStaff(staff.id, staff.name);
    else onUpdateStaff('', '');
  };

  const lineRaw = item.price * item.quantity;
  const previewDiscount = () => {
    const val = parseFloat(discountValue);
    if (!discountValue || isNaN(val) || val <= 0) return lineRaw;
    if (discountType === 'percent') return lineRaw * (1 - val / 100);
    return lineRaw - val;
  };

  return (
    <div ref={popoverRef} style={style} className="w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
          <p className="text-slate-400 text-xs font-mono">{item.sku}</p>
        </div>
        <button onClick={onClose} className="ml-2 p-1 rounded-lg hover:bg-slate-200 text-slate-500">
          <X size={14} />
        </button>
      </div>

      {/* Spec Sheet */}
      {(item.condition || item.material || item.weight || item.category || item.serialNumber) && (
        <div className="px-4 py-3 border-b border-slate-100 bg-amber-50/40">
          <div className="flex items-center gap-1.5 mb-2">
            <FileText size={12} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Spec Sheet</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {item.category && <SpecRow label="Category" value={item.category} />}
            {item.condition && <SpecRow label="Condition" value={item.condition} />}
            {item.material && <SpecRow label="Material" value={item.material} />}
            {item.purity && <SpecRow label="Purity" value={item.purity} />}
            {item.weight && <SpecRow label="Weight" value={`${item.weight}g`} />}
            {item.serialNumber && <SpecRow label="Serial" value={item.serialNumber} />}
          </div>
        </div>
      )}

      {/* Line Discount */}
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5 mb-2">
          <Tag size={12} className="text-blue-500" />
          <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Line Discount</span>
          {item.lineDiscount && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-mono">
              {item.lineDiscount.type === 'percent'
                ? `-${item.lineDiscount.value}%`
                : `-£${item.lineDiscount.value.toFixed(2)}`}
            </span>
          )}
        </div>
        <div className="flex gap-1.5 mb-2">
          <button
            onClick={() => setDiscountType('percent')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              discountType === 'percent'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
            }`}
          >
            <Percent size={10} /> Percent
          </button>
          <button
            onClick={() => setDiscountType('fixed')}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              discountType === 'fixed'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
            }`}
          >
            <PoundSterling size={10} /> Fixed £
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            min="0"
            max={discountType === 'percent' ? 100 : lineRaw}
            step={discountType === 'percent' ? 1 : 0.01}
            placeholder={discountType === 'percent' ? 'e.g. 10' : 'e.g. 5.00'}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="flex-1 h-8 text-sm"
          />
          <Button size="sm" className="h-8 text-xs px-3" onClick={handleApplyDiscount}>
            Apply
          </Button>
          {item.lineDiscount && (
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-xs px-2 text-red-500 hover:text-red-700"
              onClick={() => { setDiscountValue(''); onUpdateDiscount(undefined); }}
            >
              <X size={12} />
            </Button>
          )}
        </div>
        {discountValue && parseFloat(discountValue) > 0 && (
          <p className="text-xs text-slate-500 mt-1.5">
            Line total: <span className="font-semibold text-slate-800">£{previewDiscount().toFixed(2)}</span>
            <span className="text-slate-400 ml-1">(was £{lineRaw.toFixed(2)})</span>
          </p>
        )}
      </div>

      {/* Staff Commission Tag */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <User size={12} className="text-purple-500" />
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Commission</span>
          {item.staffName && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">
              {item.staffName}
            </span>
          )}
        </div>
        <select
          value={selectedStaffId}
          onChange={handleStaffChange}
          className="w-full h-8 text-xs rounded-lg border border-slate-200 bg-white px-2 focus:outline-none focus:ring-2 focus:ring-purple-300"
        >
          <option value="">— No commission assigned —</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

const SpecRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-[10px] text-amber-600 uppercase">{label}</span>
    <p className="text-xs text-slate-800 font-medium truncate">{value}</p>
  </div>
);

export default CartItemPopover;
