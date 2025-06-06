
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Info, Tag, BarChart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
  sku?: string;
  barcode?: string;
  karat?: string;
  weight?: string;
  onAddToCart: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ 
  id, 
  name, 
  price, 
  category, 
  image, 
  stock,
  sku = 'SKU-' + id,
  barcode,
  karat,
  weight,
  onAddToCart 
}) => {
  // Function to determine stock status
  const getStockStatus = () => {
    if (stock <= 0) return { label: "Out of Stock", color: "bg-red-50 text-red-700" };
    if (stock < 3) return { label: "Low Stock", color: "bg-gold/10 text-gold-dark" };
    return { label: "In Stock", color: "bg-green-50 text-green-700" };
  };
  
  const stockStatus = getStockStatus();

  return (
    <Card className="overflow-hidden transition-all h-full border border-white/60 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-shadow duration-200">
      <div className="aspect-square w-full bg-gray-50 relative rounded-t-xl overflow-hidden">
        {image ? (
          <img 
            src={image} 
            alt={name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Image
          </div>
        )}
        {stock <= 0 && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center">
            <p className="text-white font-medium px-4 py-2 bg-black/20 backdrop-blur-md rounded-full">Out of Stock</p>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary" className="bg-white/80 text-gray-700 border border-gray-100 backdrop-blur-md shadow-sm">
            {category}
          </Badge>
        </div>
        {sku && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="outline" className="bg-white/80 text-xs backdrop-blur-sm border border-gray-100 text-gray-600">
              {sku}
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-sm line-clamp-1 text-gray-800">{name}</h3>
          <p className="text-md font-semibold text-gray-800">£{price.toFixed(2)}</p>
        </div>
        
        {/* Product details */}
        <div className="h-[24px]">
          {(karat || weight) && (
            <div className="flex gap-2 text-xs text-gray-500">
              {karat && <span className="flex items-center"><Tag size={12} className="mr-1" /> {karat}</span>}
              {weight && <span className="flex items-center"><BarChart size={12} className="mr-1" /> {weight}</span>}
            </div>
          )}
        </div>
        
        <div className="flex justify-between items-center mt-auto">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  <Badge 
                    className={`rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ${stockStatus.color}`}
                  >
                    {stockStatus.label}
                  </Badge>
                  <Info size={12} className="ml-1 text-gray-400" />
                </div>
              </TooltipTrigger>
              <TooltipContent className="bg-white/90 backdrop-blur-lg border border-gray-100 shadow-md rounded-lg">
                <p>{stock > 0 ? `${stock} items available` : 'Currently unavailable'}</p>
                {barcode && <p className="text-xs mt-1">Barcode: {barcode}</p>}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button 
            size="sm" 
            variant="outline"
            className="border-navy/10 bg-white/80 text-navy hover:bg-navy/5 hover:text-navy rounded-lg shadow-sm" 
            disabled={stock <= 0}
            onClick={() => onAddToCart(id)}
          >
            <Plus size={14} className="mr-1" />
            Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProductCard;
