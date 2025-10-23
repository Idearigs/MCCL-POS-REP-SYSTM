
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Tag, Filter, Barcode, Package, CreditCard, Coins } from 'lucide-react';
import ProductCard from '@/components/pos/ProductCard';
import CartItem from '@/components/pos/CartItem';
import CustomerInfo from '@/components/pos/CustomerInfo';
import { Customer } from '@/contexts/CustomerContext';
import PaymentPanel from '@/components/pos/PaymentPanel';
import ProductFilter, { FilterOptions } from '@/components/pos/ProductFilter';
import { useInventory, InventoryItem } from '@/contexts/InventoryContext';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { toast } from '@/hooks/use-toast';

// Convert inventory items to product format for display
const convertInventoryToProducts = (inventoryItems: InventoryItem[]) => {
  return inventoryItems.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.category,
    subcategory: item.supplier, // Using supplier as subcategory for filtering
    stock: item.quantity,
    sku: item.sku,
    barcode: item.sku, // Using SKU as barcode since we don't have a separate barcode field
    karat: '', // These fields aren't in our inventory model but kept for compatibility
    weight: '',
    image: item.imageUrl || 'https://images.unsplash.com/photo-1584380931214-dbb5b72e7fd0?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' // Default image if none provided
  }));
};

// Legacy dummy products - will be replaced with inventory items
const dummyProducts = [
  { 
    id: '1', 
    name: 'Diamond Solitaire Ring', 
    price: 1299.99, 
    category: 'Rings', 
    subcategory: 'Gold',
    stock: 5, 
    sku: 'RNG-DS-001',
    barcode: '8901234567890',
    karat: '18K Gold',
    weight: '3.5g',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '2', 
    name: 'Gold Chain Bracelet', 
    price: 499.99, 
    category: 'Bracelets', 
    subcategory: 'Gold',
    stock: 12, 
    sku: 'BRC-GC-002',
    barcode: '8901234567891',
    karat: '14K Gold',
    weight: '8.2g',
    image: 'https://images.unsplash.com/photo-1611652022419-8d43e9b2f380?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '3', 
    name: 'Pearl Stud Earrings', 
    price: 249.99, 
    category: 'Earrings', 
    subcategory: 'Silver',
    stock: 8, 
    sku: 'EAR-PS-003',
    barcode: '8901234567892',
    karat: '925 Silver',
    weight: '2.1g',
    image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '4', 
    name: 'Silver Watch', 
    price: 899.99, 
    category: 'Watches', 
    subcategory: 'Silver',
    stock: 3, 
    sku: 'WTC-SV-004',
    barcode: '8901234567893',
    karat: '925 Silver',
    weight: '45g',
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '5', 
    name: 'Emerald Pendant', 
    price: 649.99, 
    category: 'Necklaces', 
    subcategory: 'Gold',
    stock: 7, 
    sku: 'NCK-EP-005',
    barcode: '8901234567894',
    karat: '18K Gold',
    weight: '4.3g',
    image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '6', 
    name: 'Sapphire Ring', 
    price: 1499.99, 
    category: 'Rings', 
    subcategory: 'Platinum',
    stock: 2, 
    sku: 'RNG-SR-006',
    barcode: '8901234567895',
    karat: 'Platinum 950',
    weight: '5.8g',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '7', 
    name: 'Rose Gold Bangle', 
    price: 349.99, 
    category: 'Bracelets', 
    subcategory: 'Gold',
    stock: 9, 
    sku: 'BRC-RGB-007',
    barcode: '8901234567896',
    karat: '14K Rose Gold',
    weight: '7.5g',
    image: 'https://images.unsplash.com/photo-1611652022419-8d43e9b2f380?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '8', 
    name: 'Diamond Stud Earrings', 
    price: 799.99, 
    category: 'Earrings', 
    subcategory: 'Gold',
    stock: 0, 
    sku: 'EAR-DS-008',
    barcode: '8901234567897',
    karat: '18K Gold',
    weight: '1.8g',
    image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '9', 
    name: 'Platinum Wedding Band', 
    price: 1199.99, 
    category: 'Rings', 
    subcategory: 'Platinum',
    stock: 4, 
    sku: 'RNG-PWB-009',
    barcode: '8901234567898',
    karat: 'Platinum 950',
    weight: '6.2g',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '10', 
    name: 'Gold Hoop Earrings', 
    price: 399.99, 
    category: 'Earrings', 
    subcategory: 'Gold',
    stock: 6, 
    sku: 'EAR-GH-010',
    barcode: '8901234567899',
    karat: '14K Gold',
    weight: '3.0g',
    image: 'https://images.unsplash.com/photo-1617038220319-276d3cfab638?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '11', 
    name: 'Silver Chain Necklace', 
    price: 199.99, 
    category: 'Necklaces', 
    subcategory: 'Silver',
    stock: 15, 
    sku: 'NCK-SCN-011',
    barcode: '8901234567900',
    karat: '925 Silver',
    weight: '12.5g',
    image: 'https://images.unsplash.com/photo-1602173574767-37ac01994b2a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  },
  { 
    id: '12', 
    name: 'Luxury Chronograph Watch', 
    price: 2499.99, 
    category: 'Watches', 
    subcategory: 'Gold',
    stock: 1, 
    sku: 'WTC-LCW-012',
    barcode: '8901234567901',
    karat: '18K Gold',
    weight: '85g',
    image: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60' 
  }
];

// Enhanced cart item interface with additional fields
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  karat?: string;
  weight?: string;
  discount?: number;
}

const PointOfSale = () => {
  // Get inventory items
  const { inventory } = useInventory();
  
  // Convert inventory items to product format
  const products = convertInventoryToProducts(inventory);
  
  // Search and filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'sku' | 'barcode'>('name');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    categories: [],
    materials: [],
    minPrice: null,
    maxPrice: null,
    stockStatus: {
      inStock: true,
      lowStock: true,
      outOfStock: true
    }
  });
  
  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  
  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Filter products based on search query, search type, category, subcategory, and advanced filters
  const allFilteredProducts = products.filter(product => {
    // Match search query based on search type
    let matchesSearch = true;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      switch (searchType) {
        case 'name':
          matchesSearch = product.name.toLowerCase().includes(lowerQuery);
          break;
        case 'sku':
          matchesSearch = product.sku?.toLowerCase().includes(lowerQuery) || false;
          break;
        case 'barcode':
          matchesSearch = product.barcode?.includes(searchQuery) || false;
          break;
      }
    }

    // Match category and subcategory from tabs
    const matchesCategory = activeCategory ? product.category === activeCategory : true;
    const matchesSubcategory = activeSubcategory ? product.subcategory === activeSubcategory : true;

    // Match advanced filters
    let matchesAdvancedFilters = true;

    // Filter by categories
    if (filters.categories.length > 0) {
      matchesAdvancedFilters = matchesAdvancedFilters && filters.categories.includes(product.category);
    }

    // Filter by materials
    if (filters.materials.length > 0) {
      matchesAdvancedFilters = matchesAdvancedFilters && filters.materials.includes(product.subcategory);
    }

    // Filter by price range
    if (filters.minPrice !== null) {
      matchesAdvancedFilters = matchesAdvancedFilters && product.price >= filters.minPrice;
    }
    if (filters.maxPrice !== null) {
      matchesAdvancedFilters = matchesAdvancedFilters && product.price <= filters.maxPrice;
    }

    // Filter by stock status
    const isOutOfStock = product.stock <= 0;
    const isLowStock = product.stock > 0 && product.stock <= 5; // Assuming 5 is the threshold
    const isInStock = product.stock > 5;

    if (isOutOfStock && !filters.stockStatus.outOfStock) matchesAdvancedFilters = false;
    if (isLowStock && !filters.stockStatus.lowStock) matchesAdvancedFilters = false;
    if (isInStock && !filters.stockStatus.inStock) matchesAdvancedFilters = false;

    return matchesSearch && matchesCategory && matchesSubcategory && matchesAdvancedFilters;
  });

  // Limit to 4 products when no search query
  const hasSearch = searchQuery.trim().length > 0;
  const filteredProducts = hasSearch ? allFilteredProducts : allFilteredProducts.slice(0, 4);
  const totalProducts = allFilteredProducts.length;

  // Get unique categories and subcategories for filter buttons
  const categories = Array.from(new Set(products.map(product => product.category)));
  const subcategories = Array.from(new Set(products.map(product => product.subcategory)));

  // Add product to cart with enhanced details
  const handleAddToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    // Check if there's enough stock
    if (product.stock <= 0) {
      toast({
        title: "Out of stock",
        description: `${product.name} is currently out of stock.`,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    setCart(currentCart => {
      // Check if product is already in cart
      const existingItem = currentCart.find(item => item.id === productId);
      
      if (existingItem) {
        // Update quantity if already in cart
        return currentCart.map(item => 
          item.id === productId 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        // Add new item to cart with enhanced details
        return [...currentCart, { 
          id: product.id, 
          name: product.name, 
          price: product.price, 
          quantity: 1,
          sku: product.sku,
          karat: product.karat,
          weight: product.weight,
          discount: 0
        }];
      }
    });

    toast({
      title: "Item added",
      description: `${product.name} has been added to the cart.`,
      duration: 2000,
    });
  };

  // Update cart item quantity
  const handleUpdateQuantity = (id: string, quantity: number) => {
    setCart(currentCart => 
      currentCart.map(item => 
        item.id === id ? { ...item, quantity } : item
      )
    );
  };
  
  // Update cart item discount
  const handleUpdateDiscount = (id: string, discount: number) => {
    setCart(currentCart => 
      currentCart.map(item => 
        item.id === id ? { ...item, discount } : item
      )
    );
  };

  // Remove item from cart
  const handleRemoveFromCart = (id: string) => {
    setCart(currentCart => currentCart.filter(item => item.id !== id));
    toast({
      title: "Item removed",
      description: "Item has been removed from the cart.",
      duration: 2000,
    });
  };

  // Calculate cart total with discounts
  const cartTotal = cart.reduce((total, item) => {
    const itemDiscount = item.discount || 0;
    const itemTotal = item.price * item.quantity;
    return total + (itemTotal * (1 - itemDiscount / 100));
  }, 0);

  // Handle payment processing
  const handlePayment = (paymentMethod: string) => {
    // In a real app, this would process the payment via payment gateway
    toast({
      title: "Payment successful",
      description: `Payment of £${cartTotal.toFixed(2)} processed via ${paymentMethod}`,
      duration: 3000,
    });
    
    setCart([]);
    setIsPaymentDialogOpen(false);
  };
  
  // Handle payment completion from PaymentPanel
  const handlePaymentComplete = () => {
    setCart([]);
  };
  
  // Handle admin actions from PaymentPanel
  const handleAdminAction = (action: 'delete' | 'return', transactionId?: string) => {
    if (action === 'delete') {
      toast({
        title: "Transaction deleted",
        description: `Transaction ${transactionId} has been deleted.`,
        duration: 3000,
      });
    } else {
      toast({
        title: "Return processed",
        description: "Return has been processed successfully.",
        duration: 3000,
      });
    }
  };
  
  // Handle customer selection
  const handleSelectCustomer = (customer: Customer | null) => {
    setSelectedCustomer(customer);
  };

  // Handle edit product
  const handleEditProduct = (productId: string) => {
    // For now, just show a toast notification
    const product = products.find(p => p.id === productId);
    if (product) {
      toast({
        title: "Edit Product",
        description: `Editing ${product.name}`,
      });
    }
  };

  // Handle delete product
  const handleDeleteProduct = (productId: string) => {
    // For now, just show a toast notification
    const product = products.find(p => p.id === productId);
    if (product) {
      toast({
        title: "Delete Product",
        description: `${product.name} would be deleted from inventory.`,
        variant: "destructive"
      });
    }
  };

  return (
    <MainLayout pageTitle="Point of Sale">
      <div className="fixed left-[240px] right-0 top-[72px] bottom-0 overflow-hidden px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Left Column: Product Search & Catalog (40% width) */}
          <div className="lg:col-span-5 flex flex-col bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm p-5 h-full overflow-hidden">
            <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-800 flex-shrink-0">
              <Package size={18} className="mr-2 text-gray-600" />
              Products
            </h2>

            {/* Advanced Search */}
            <div className="mb-4 flex-shrink-0">
              <div className="flex gap-2 mb-2">
                <Select value={searchType} onValueChange={(value) => setSearchType(value as any)}>
                  <SelectTrigger className="w-[110px] bg-white/80 border border-gray-200 rounded-lg shadow-sm">
                    <SelectValue placeholder="Search by" />
                  </SelectTrigger>
                  <SelectContent className="bg-white/90 backdrop-blur-lg border border-gray-200 rounded-lg shadow-md">
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="sku">SKU</SelectItem>
                    <SelectItem value="barcode">Barcode</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1">
                  {searchType === 'barcode' ? (
                    <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  ) : (
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  )}
                  <Input
                    placeholder={`Search by ${searchType}...`}
                    className="pl-10 bg-white/80 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setIsFilterDialogOpen(true)}
                  className="bg-white/80 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100/80"
                >
                  <Filter size={16} className="text-gray-600" />
                </Button>
              </div>
            </div>
          
          {/* Removed Category and Subcategory Filters */}

          {/* Product Count Information */}
          {!hasSearch && totalProducts > 4 && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex-shrink-0">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Showing 4 of {totalProducts} products.</span>
                {" "}Use the search bar above to find specific products.
              </p>
            </div>
          )}

          {hasSearch && totalProducts > 0 && (
            <div className="mb-3 p-2 bg-gray-50 border border-gray-200 rounded-lg flex-shrink-0">
              <p className="text-sm text-gray-600">
                Found {totalProducts} product{totalProducts !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          {/* Products Grid - Scrollable */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto flex-1 pb-4 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ minHeight: '200px' }}>
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <div key={product.id} className="h-fit">
                  <ProductCard
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    category={product.category}
                    image={product.image}
                    stock={product.stock}
                    sku={product.sku}
                    barcode={product.barcode}
                    karat={product.karat}
                    weight={product.weight}
                    onAddToCart={handleAddToCart}
                  />
                </div>
              ))
            ) : (
              <div className="col-span-full flex items-center justify-center h-32 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm">
                <p className="text-gray-400">
                  {hasSearch ? 'No products match your search' : 'No products available'}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Middle Column: Selected Items & Cart (35% width) */}
        <div className="lg:col-span-4 flex flex-col bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-all duration-200 p-5 h-full overflow-hidden">
          <h2 className="text-lg font-semibold mb-4 flex items-center text-gray-800 flex-shrink-0">
            <Tag size={18} className="mr-2 text-gray-600" />
            Current Sale
          </h2>

          {/* Cart Items List - Scrollable with fixed height */}
          <div className="flex-1 overflow-y-auto mb-4 pr-2 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {cart.length > 0 ? (
              cart.map(item => (
                <CartItem
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  price={item.price}
                  quantity={item.quantity}
                  sku={item.sku}
                  karat={item.karat}
                  weight={item.weight}
                  discount={item.discount}
                  onRemove={handleRemoveFromCart}
                  onUpdateQuantity={handleUpdateQuantity}
                  onUpdateDiscount={handleUpdateDiscount}
                />
              ))
            ) : (
              <div className="flex items-center justify-center h-32 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm">
                <p className="text-gray-400">Cart is empty</p>
              </div>
            )}
          </div>

          {/* Cart Summary - Fixed at bottom, taller */}
          <div className="border-t-2 border-gray-200 pt-5 pb-2 flex-shrink-0 bg-white/50 backdrop-blur-sm rounded-lg -mx-5 px-5 mt-auto">
            <div className="flex justify-between mb-3 text-base text-gray-700">
              <span className="font-medium">Subtotal:</span>
              <span className="font-semibold">£{cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4 text-base text-gray-700">
              <span className="font-medium">VAT (20%):</span>
              <span className="font-semibold">£{(cartTotal * 0.2).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xl font-bold mb-6 text-gray-900 py-3 border-t-2 border-gray-300">
              <span>Total:</span>
              <span className="text-blue-600">£{(cartTotal * 1.2).toFixed(2)}</span>
            </div>

            <Button
              variant="outline"
              className="w-full mb-2 bg-white/80 border border-gray-200 rounded-lg shadow-sm hover:bg-gray-100/80 text-gray-700 h-10"
              onClick={() => setCart([])}
              disabled={cart.length === 0}
            >
              Clear Cart
            </Button>
          </div>
        </div>
        
        {/* Right Column: Customer Info & Transaction (25% width) */}
        <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-hidden">
          {/* Customer Information Section - Fixed height with scrollbar */}
          <div className="flex-shrink-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1" style={{ height: '45%', minHeight: '300px' }}>
            <CustomerInfo onSelectCustomer={handleSelectCustomer} />
          </div>

          {/* Payment Panel - Fixed height with scrollbar */}
          <div className="flex-shrink-0 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-1" style={{ height: '55%', minHeight: '350px' }}>
            <PaymentPanel
              cartItems={cart}
              customer={selectedCustomer}
              onPaymentComplete={handlePaymentComplete}
              onAdminAction={handleAdminAction}
            />
          </div>
        </div>
      </div>
      </div>

      {/* Product Filter Dialog */}
      <ProductFilter
        isOpen={isFilterDialogOpen}
        onClose={() => setIsFilterDialogOpen(false)}
        onApplyFilters={(newFilters) => {
          setFilters(newFilters);
          // Reset tab filters when applying advanced filters
          if (newFilters.categories.length > 0) {
            setActiveCategory(null);
          }
          if (newFilters.materials.length > 0) {
            setActiveSubcategory(null);
          }
        }}
        availableCategories={categories}
        availableMaterials={subcategories}
        currentFilters={filters}
      />
    </MainLayout>
  );
};

export default PointOfSale;
