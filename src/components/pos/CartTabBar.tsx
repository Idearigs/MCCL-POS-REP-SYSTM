import React from 'react';
import { X, Plus, ShoppingBag } from 'lucide-react';

export interface CartTabState {
  id: string;
  label: string;
  cart: any[];
  selectedCustomer: any;
  discountPercentage: number;
}

interface CartTabBarProps {
  tabs: CartTabState[];
  activeTabId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onClose: (id: string) => void;
}

const CartTabBar: React.FC<CartTabBarProps> = ({ tabs, activeTabId, onSwitch, onAdd, onClose }) => {
  return (
    <div className="flex items-end gap-0.5 px-3 pt-3 overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl text-xs font-semibold cursor-pointer transition-all duration-150 flex-shrink-0 select-none ${
              isActive
                ? 'bg-white border border-b-white border-slate-200 text-slate-900 shadow-sm z-10'
                : 'bg-slate-100/80 text-slate-500 hover:text-slate-700 hover:bg-slate-200/80 border border-transparent'
            }`}
            onClick={() => onSwitch(tab.id)}
          >
            <ShoppingBag size={10} className={isActive ? 'text-blue-500' : 'text-slate-400'} />
            <span className="truncate max-w-[70px]">{tab.label}</span>
            {tab.cart.length > 0 && (
              <span className={`flex-shrink-0 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-300 text-slate-600'
              }`}>
                {tab.cart.length}
              </span>
            )}
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose(tab.id);
                }}
                className={`flex-shrink-0 rounded-full p-0.5 transition-colors ${
                  isActive
                    ? 'opacity-0 group-hover:opacity-100 hover:bg-slate-200 hover:text-red-500 text-slate-400'
                    : 'opacity-0 group-hover:opacity-100 hover:text-red-500 text-slate-400'
                }`}
                title="Close cart"
              >
                <X size={9} />
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={onAdd}
        className="flex items-center justify-center w-7 h-7 mb-0.5 ml-1 rounded-lg bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-600 transition-all flex-shrink-0 border border-slate-200"
        title="New cart (add customer)"
      >
        <Plus size={12} />
      </button>
    </div>
  );
};

export default CartTabBar;
