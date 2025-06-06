
import React, { useState } from 'react';
import { Trash2, Plus, Minus, Percent, Tag, BarChart, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CartItemProps {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  karat?: string;
  weight?: string;
  discount?: number;
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onUpdateDiscount?: (id: string, discount: number) => void;
}

const CartItem: React.FC<CartItemProps> = ({
  id,
  name,
  price,
  quantity,
  sku = 'SKU-' + id,
  karat,
  weight,
  discount = 0,
  onRemove,
  onUpdateQuantity,
  onUpdateDiscount = () => {},
}) => {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>(discount.toString());
  
  // Calculate the final price after discount
  const calculateDiscountedPrice = () => {
    const numericDiscount = parseFloat(discountValue) || 0;
    if (discountType === 'percentage') {
      return price * quantity * (1 - numericDiscount / 100);
    } else {
      return Math.max(0, (price * quantity) - numericDiscount);
    }
  };
  
  const finalPrice = calculateDiscountedPrice();
  
  // Handle discount change
  const handleDiscountChange = (value: string) => {
    setDiscountValue(value);
    const numericValue = parseFloat(value) || 0;
    const effectiveDiscount = discountType === 'percentage' 
      ? numericValue / 100 
      : numericValue / (price * quantity);
    onUpdateDiscount(id, effectiveDiscount * 100);
  };
  return (
    <div className="p-3 rounded-lg mb-2 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg border border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-200 flex flex-col w-full relative">
      <div className="flex justify-between items-start mb-1">
        <div>
          <h4 className="text-xs font-medium text-gray-800">{name}</h4>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-[10px] text-gray-500">{sku}</span>
            {karat && <span className="text-[10px] text-gray-500 ml-1">• {karat}</span>}
            {weight && <span className="text-[10px] text-gray-500 ml-1">• {weight}</span>}
          </div>
        </div>
      </div>
      
      <div className="flex justify-between items-center mt-1 mb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-white/60 rounded-md bg-white/80 shadow-sm h-6">
            <button 
              className="px-1 hover:bg-gray-100/80 rounded-l-md" 
              onClick={() => quantity > 1 && onUpdateQuantity(id, quantity - 1)}
              disabled={quantity <= 1}
            >
              <Minus size={12} className="text-gray-600" />
            </button>
            <span className="w-6 text-xs text-center text-gray-800">{quantity}</span>
            <button 
              className="px-1 hover:bg-gray-100/80 rounded-r-md" 
              onClick={() => onUpdateQuantity(id, quantity + 1)}
            >
              <Plus size={12} className="text-gray-600" />
            </button>
          </div>
          <span className="text-xs text-gray-500">× £{price.toFixed(2)}</span>
        </div>
        <span className="text-xs font-medium text-gray-800">£{(price * quantity).toFixed(2)}</span>
      </div>
      
      <div className="flex items-center justify-between mt-1 mb-1">
        <div className="flex items-center gap-1">
          <Percent size={10} className="text-gray-500" />
          <span className="text-[10px] text-gray-500">Discount:</span>
          <Select 
            value={discountType} 
            onValueChange={(value) => setDiscountType(value as 'percentage' | 'fixed')}
          >
            <SelectTrigger className="w-16 h-5 text-[10px] bg-white/80 border border-white/60 rounded-md shadow-sm px-1 py-0">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-white/90 backdrop-blur-lg border border-white/60 rounded-md shadow-sm">
              <SelectItem value="percentage" className="text-xs">Percent %</SelectItem>
              <SelectItem value="fixed" className="text-xs">Fixed £</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          type="number"
          min="0"
          max={discountType === 'percentage' ? '100' : undefined}
          value={discountValue}
          onChange={(e) => handleDiscountChange(e.target.value)}
          className="w-16 h-5 text-[10px] bg-white/80 border border-white/60 rounded-md shadow-sm px-1 py-0"
        />
      </div>
      
      {parseFloat(discountValue) > 0 && (
        <div className="flex justify-between items-center mt-1 mb-1">
          <span className="text-[10px] text-gray-500">
            Discount: {discountType === 'percentage' ? `${discountValue}%` : `£${discountValue}`}
          </span>
          <span className="text-[10px] text-red-500">-£{((price * quantity) - finalPrice).toFixed(2)}</span>
        </div>
      )}
      
      <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/40">
        <span className="text-[10px] text-gray-500">Final Price:</span>
        <span className="text-xs font-medium text-navy">£{finalPrice.toFixed(2)}</span>
      </div>
      
      <div className="flex justify-end gap-1 mt-1">
        <Button 
          variant="outline"
          size="sm"
          className="text-red-500 hover:text-red-600 border-red-100 hover:bg-red-50 h-5 w-5 p-0 flex items-center justify-center rounded-full" 
          onClick={() => onRemove(id)}
        >
          <Trash2 size={10} />
        </Button>
      </div>
    </div>
  );
};

export default CartItem;
