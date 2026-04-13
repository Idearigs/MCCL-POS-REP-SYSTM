
import React from 'react';
import { 
  Card, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, Tag, Image as ImageIcon } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { normalizeImageUrl } from "@/lib/utils";

export interface InventoryItemProps {
  id: string;
  name: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  quantity: number;
  threshold: number;
  imageUrl?: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  className?: string;
}

const InventoryItem: React.FC<InventoryItemProps> = ({
  id,
  name,
  sku,
  category,
  price,
  cost,
  quantity,
  threshold,
  imageUrl,
  onEdit,
  onDelete,
  className
}) => {
  // Determine stock status
  const getStockStatus = () => {
    if (quantity <= 0) return { label: "Out of Stock", variant: "destructive", color: "bg-red-50 text-red-700" };
    if (quantity <= threshold) return { label: "Low Stock", variant: "warning", color: "bg-gold/10 text-gold-dark" };
    return { label: "In Stock", variant: "success", color: "bg-green-50 text-green-700" };
  };

  const stockStatus = getStockStatus();
  const profit = price - cost;
  const profitMargin = ((profit / price) * 100).toFixed(0);

  return (
    <Card className={`overflow-hidden h-full ${className || 'bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg border border-gray-100 rounded-xl shadow-sm'}`}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10 rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {imageUrl ? (
                <AvatarImage src={normalizeImageUrl(imageUrl)} alt={name} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-gray-50 to-gray-100">
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <h3 className="font-medium text-sm text-gray-800 line-clamp-1">{name}</h3>
              <div className="flex items-center gap-1 mt-1">
                <Tag size={12} className="text-gray-400" />
                <p className="text-xs text-gray-500">{sku}</p>
              </div>
              <Badge variant="outline" className="text-xs py-0 h-5 mt-1 rounded-full border-gray-200 text-gray-600">{category}</Badge>
            </div>
          </div>
          <Badge 
            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${stockStatus.color}`}
          >
            {stockStatus.label}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-3 bg-gray-50/50 p-2 rounded-lg">
          <div className="flex flex-col h-[40px] justify-between">
            <p className="text-[10px] text-gray-500">Price</p>
            <p className="font-medium text-sm text-gray-800">£{price.toFixed(2)}</p>
          </div>
          <div className="flex flex-col h-[40px] justify-between">
            <p className="text-[10px] text-gray-500">Cost</p>
            <p className="font-medium text-sm text-gray-800">£{cost.toFixed(2)}</p>
          </div>
          <div className="flex flex-col h-[40px] justify-between">
            <p className="text-[10px] text-gray-500">Profit</p>
            <p className="font-medium text-sm text-gray-800">£{profit.toFixed(2)} <span className="text-green-600">({profitMargin}%)</span></p>
          </div>
          <div className="flex flex-col h-[40px] justify-between">
            <p className="text-[10px] text-gray-500">Quantity</p>
            <p className="font-medium text-sm text-gray-800">{quantity}</p>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="border-t border-gray-100 p-2 flex justify-between mt-auto">
        <Button variant="ghost" size="sm" onClick={() => onEdit(id)} className="text-navy hover:bg-navy/5 rounded-full">
          <Edit size={16} className="mr-1" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(id)} className="text-red-600 hover:bg-red-50 rounded-full">
          <Trash2 size={16} className="mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};

export default InventoryItem;
