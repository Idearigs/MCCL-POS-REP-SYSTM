
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { normalizeImageUrl } from '@/lib/utils';

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
    <Card className="overflow-hidden transition-all border border-gray-200 bg-white hover:shadow-md transition-shadow duration-200 rounded-lg">
      {/* Product Image */}
      <div className="aspect-square w-full bg-gray-100 relative overflow-hidden">
        {image ? (
          <img
            src={normalizeImageUrl(image)}
            alt={name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gradient-to-br from-gray-50 to-gray-100">
            <Package size={48} className="text-gray-300" />
          </div>
        )}
        {stock <= 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <p className="text-white font-semibold px-3 py-1.5 bg-red-500 rounded-full text-sm">Out of Stock</p>
          </div>
        )}
        <div className="absolute top-2 right-2">
          <Badge className="bg-blue-500 text-white text-xs">
            {category}
          </Badge>
        </div>
      </div>

      {/* Product Info */}
      <CardContent className="p-3 space-y-2">
        {/* Name and Price */}
        <div>
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1">{name}</h3>
          <p className="text-lg font-bold text-blue-600">£{price.toFixed(2)}</p>
        </div>

        {/* SKU */}
        {sku && (
          <p className="text-xs text-gray-500">SKU: {sku}</p>
        )}

        {/* Stock Badge and Add Button */}
        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge
            variant={stock <= 0 ? "destructive" : stock < 3 ? "secondary" : "default"}
            className="text-xs"
          >
            {stock <= 0 ? "Out" : stock < 3 ? `Low (${stock})` : `Stock: ${stock}`}
          </Badge>

          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
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
