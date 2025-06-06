
import React, { useState } from 'react';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Filter, Check } from "lucide-react";

interface FilterOptions {
  categories: string[];
  minPrice: number | null;
  maxPrice: number | null;
  stockStatus: {
    inStock: boolean;
    lowStock: boolean;
    outOfStock: boolean;
  };
}

interface InventoryFilterProps {
  availableCategories: string[];
  onFilterChange: (filters: FilterOptions) => void;
}

const InventoryFilter: React.FC<InventoryFilterProps> = ({
  availableCategories,
  onFilterChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    minPrice: null,
    maxPrice: null,
    stockStatus: {
      inStock: true,
      lowStock: true,
      outOfStock: true
    }
  });

  const handleCategoryChange = (category: string) => {
    const updatedCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    
    const updatedFilters = {
      ...filters,
      categories: updatedCategories
    };
    
    setFilters(updatedFilters);
  };

  const handleStockStatusChange = (status: keyof typeof filters.stockStatus) => {
    const updatedStatus = {
      ...filters.stockStatus,
      [status]: !filters.stockStatus[status]
    };
    
    const updatedFilters = {
      ...filters,
      stockStatus: updatedStatus
    };
    
    setFilters(updatedFilters);
  };

  const handlePriceChange = (
    type: 'min' | 'max', 
    value: string
  ) => {
    const numValue = value === '' ? null : Number(value);
    
    const updatedFilters = {
      ...filters,
      [type === 'min' ? 'minPrice' : 'maxPrice']: numValue
    };
    
    setFilters(updatedFilters);
  };

  const applyFilters = () => {
    onFilterChange(filters);
    setIsOpen(false);
  };

  const clearFilters = () => {
    const resetFilters = {
      categories: [],
      minPrice: null,
      maxPrice: null,
      stockStatus: {
        inStock: true,
        lowStock: true,
        outOfStock: true
      }
    };
    
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };
  
  // Count active filters
  const activeFilterCount = [
    filters.categories.length > 0,
    filters.minPrice !== null,
    filters.maxPrice !== null,
    !filters.stockStatus.inStock || !filters.stockStatus.lowStock || !filters.stockStatus.outOfStock
  ].filter(Boolean).length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1">
          <Filter size={14} />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary w-4 h-4 text-[10px] flex items-center justify-center text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4">
        <h4 className="font-medium mb-4">Filter Inventory</h4>
        
        <div className="space-y-6">
          {/* Categories filter */}
          <div>
            <h5 className="text-sm font-medium mb-2">Categories</h5>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {availableCategories.map(category => (
                <div key={category} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`category-${category}`} 
                    checked={filters.categories.includes(category)}
                    onCheckedChange={() => handleCategoryChange(category)}
                  />
                  <Label htmlFor={`category-${category}`} className="text-sm">
                    {category}
                  </Label>
                </div>
              ))}
            </div>
          </div>
          
          {/* Price range filter */}
          <div>
            <h5 className="text-sm font-medium mb-2">Price Range</h5>
            <div className="flex space-x-2">
              <div className="w-1/2">
                <Label htmlFor="min-price" className="text-xs">
                  Min (£)
                </Label>
                <Input 
                  id="min-price" 
                  type="number"
                  placeholder="0" 
                  className="h-8 mt-1"
                  value={filters.minPrice === null ? '' : filters.minPrice}
                  onChange={(e) => handlePriceChange('min', e.target.value)}
                />
              </div>
              <div className="w-1/2">
                <Label htmlFor="max-price" className="text-xs">
                  Max (£)
                </Label>
                <Input 
                  id="max-price" 
                  type="number"
                  placeholder="Any" 
                  className="h-8 mt-1"
                  value={filters.maxPrice === null ? '' : filters.maxPrice}
                  onChange={(e) => handlePriceChange('max', e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {/* Stock status filter */}
          <div>
            <h5 className="text-sm font-medium mb-2">Stock Status</h5>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="in-stock" 
                  checked={filters.stockStatus.inStock}
                  onCheckedChange={() => handleStockStatusChange('inStock')}
                />
                <Label htmlFor="in-stock" className="text-sm">In Stock</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="low-stock" 
                  checked={filters.stockStatus.lowStock}
                  onCheckedChange={() => handleStockStatusChange('lowStock')}
                />
                <Label htmlFor="low-stock" className="text-sm">Low Stock</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="out-of-stock" 
                  checked={filters.stockStatus.outOfStock}
                  onCheckedChange={() => handleStockStatusChange('outOfStock')}
                />
                <Label htmlFor="out-of-stock" className="text-sm">Out of Stock</Label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear Filters
          </Button>
          <Button size="sm" onClick={applyFilters}>
            <Check size={16} className="mr-1" /> Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default InventoryFilter;
