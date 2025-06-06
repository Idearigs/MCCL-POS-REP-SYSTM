import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Filter } from 'lucide-react';

export interface FilterOptions {
  categories: string[];
  materials: string[];
  minPrice: number | null;
  maxPrice: number | null;
  stockStatus: {
    inStock: boolean;
    lowStock: boolean;
    outOfStock: boolean;
  };
}

interface ProductFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  availableCategories: string[];
  availableMaterials: string[];
  currentFilters: FilterOptions;
}

const ProductFilter: React.FC<ProductFilterProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  availableCategories,
  availableMaterials,
  currentFilters
}) => {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  const handleCategoryChange = (category: string, checked: boolean) => {
    setFilters(prev => {
      if (checked) {
        return { ...prev, categories: [...prev.categories, category] };
      } else {
        return { ...prev, categories: prev.categories.filter(c => c !== category) };
      }
    });
  };

  const handleMaterialChange = (material: string, checked: boolean) => {
    setFilters(prev => {
      if (checked) {
        return { ...prev, materials: [...prev.materials, material] };
      } else {
        return { ...prev, materials: prev.materials.filter(m => m !== material) };
      }
    });
  };

  const handleStockStatusChange = (status: keyof FilterOptions['stockStatus'], checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      stockStatus: {
        ...prev.stockStatus,
        [status]: checked
      }
    }));
  };

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setFilters(prev => ({
      ...prev,
      [type === 'min' ? 'minPrice' : 'maxPrice']: numValue
    }));
  };

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      categories: [],
      materials: [],
      minPrice: null,
      maxPrice: null,
      stockStatus: {
        inStock: true,
        lowStock: true,
        outOfStock: true
      }
    };
    setFilters(resetFilters);
    onApplyFilters(resetFilters);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Filter className="mr-2" size={18} />
            Filter Products
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto pr-1 grid gap-6 py-4">
          {/* Categories */}
          <div className="space-y-2">
            <h3 className="font-medium">Categories</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableCategories.map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`category-${category}`} 
                    checked={filters.categories.includes(category)}
                    onCheckedChange={(checked) => handleCategoryChange(category, !!checked)}
                  />
                  <Label htmlFor={`category-${category}`}>{category}</Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Materials */}
          <div className="space-y-2">
            <h3 className="font-medium">Materials</h3>
            <div className="grid grid-cols-2 gap-2">
              {availableMaterials.map(material => (
                <div key={material} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`material-${material}`} 
                    checked={filters.materials.includes(material)}
                    onCheckedChange={(checked) => handleMaterialChange(material, !!checked)}
                  />
                  <Label htmlFor={`material-${material}`}>{material}</Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Price Range */}
          <div className="space-y-2">
            <h3 className="font-medium">Price Range</h3>
            <div className="flex gap-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="min-price">Min Price</Label>
                <Input 
                  id="min-price" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  placeholder="0"
                  value={filters.minPrice === null ? '' : filters.minPrice}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="max-price">Max Price</Label>
                <Input 
                  id="max-price" 
                  type="number" 
                  min="0" 
                  step="0.01"
                  placeholder="No limit"
                  value={filters.maxPrice === null ? '' : filters.maxPrice}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Stock Status */}
          <div className="space-y-2">
            <h3 className="font-medium">Stock Status</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="in-stock" 
                  checked={filters.stockStatus.inStock}
                  onCheckedChange={(checked) => handleStockStatusChange('inStock', !!checked)}
                />
                <Label htmlFor="in-stock">In Stock</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="low-stock" 
                  checked={filters.stockStatus.lowStock}
                  onCheckedChange={(checked) => handleStockStatusChange('lowStock', !!checked)}
                />
                <Label htmlFor="low-stock">Low Stock</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="out-of-stock" 
                  checked={filters.stockStatus.outOfStock}
                  onCheckedChange={(checked) => handleStockStatusChange('outOfStock', !!checked)}
                />
                <Label htmlFor="out-of-stock">Out of Stock</Label>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter className="sticky bottom-0 bg-white pt-2 border-t mt-2">
          <Button variant="outline" onClick={handleReset}>
            Reset All
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFilter;
