import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  X,
  Search,
  Barcode,
  ShoppingCart,
  Star,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  User,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  Receipt,
  FileText,
} from 'lucide-react';
import { useInventory, InventoryItem } from '@/contexts/InventoryContext';
import { Customer } from '@/contexts/CustomerContext';
import { useToast } from '@/hooks/use-toast';
import CustomerInfo from './CustomerInfo';

interface QuickPOSProps {
  isOpen: boolean;
  onClose: () => void;
}

interface QuickCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sku?: string;
  category?: string;
  image?: string;
}

const QuickPOS: React.FC<QuickPOSProps> = ({ isOpen, onClose }) => {
  const { inventory } = useInventory();
  const { toast } = useToast();

  // State
  const [cart, setCart] = useState<QuickCartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discountType, setDiscountType] = useState<'none' | '5' | '10' | '20' | 'custom'>('none');
  const [customDiscount, setCustomDiscount] = useState<string>('');
  const [receiptType, setReceiptType] = useState<'simple' | 'detailed'>('simple');

  const ITEMS_PER_PAGE = 6;

  // Convert inventory to products
  const products = inventory.map(item => ({
    id: item.id,
    name: item.name,
    price: item.price,
    category: item.category,
    stock: item.quantity,
    sku: item.sku,
    image: item.imageUrl || 'https://images.unsplash.com/photo-1584380931214-dbb5b72e7fd0?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
  }));

  // Get unique categories
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  // Get hot items (top 3 most expensive or most popular - for now using price)
  const hotItems = [...products]
    .sort((a, b) => b.price - a.price)
    .slice(0, 3);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && product.stock > 0;
  });

  // Paginate products
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    currentPage * ITEMS_PER_PAGE,
    (currentPage + 1) * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [selectedCategory, searchQuery]);

  // Cart functions
  const addToCart = (product: typeof products[0]) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        sku: product.sku,
        category: product.category,
        image: product.image,
      }]);
    }

    toast({
      title: 'Added to cart',
      description: product.name,
      duration: 1000,
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const getDiscountAmount = () => {
    if (discountType === 'none') return 0;
    if (discountType === 'custom') {
      const value = parseFloat(customDiscount) || 0;
      return (subtotal * value) / 100;
    }
    return (subtotal * parseInt(discountType)) / 100;
  };

  const discountAmount = getDiscountAmount();
  const afterDiscount = subtotal - discountAmount;
  const vatAmount = afterDiscount * 0.2;
  const total = afterDiscount + vatAmount;

  // Cart item count
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Handle checkout
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: 'Cart is empty',
        description: 'Add items to cart before checkout',
        variant: 'destructive',
      });
      return;
    }
    setIsCheckoutOpen(true);
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer | null) => {
    setSelectedCustomer(customer);
    setIsCustomerDialogOpen(false);
  };

  // Handle payment
  const handlePayment = (method: 'cash' | 'card' | 'transfer' | 'wallet') => {
    // TODO: Process payment through PaymentPanel
    toast({
      title: 'Payment Successful',
      description: `${receiptType === 'simple' ? 'Simple' : 'Detailed'} receipt will be generated`,
    });

    // Clear cart and close
    setCart([]);
    setIsCheckoutOpen(false);
    setSelectedCustomer(null);
    setDiscountType('none');
    setCustomDiscount('');
  };

  // Barcode scanning
  const handleBarcodeScan = () => {
    // TODO: Implement barcode scanning
    toast({
      title: 'Barcode Scanner',
      description: 'Barcode scanning feature coming soon',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="container mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <ShoppingCart className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Quick POS</h1>
                <p className="text-[10px] text-gray-500 -mt-0.5">Fast checkout</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search or scan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 w-80 h-9 bg-white border-gray-200 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleBarcodeScan}
                className="absolute right-0.5 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-50 text-gray-500"
              >
                <Barcode className="h-4 w-4" />
              </Button>
            </div>

            {/* Exit Button */}
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 h-9"
              size="sm"
            >
              <X className="h-4 w-4 mr-1.5" />
              Exit
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Hot Items */}
        {hotItems.length > 0 && (
          <div className="bg-gray-50/50 border-b border-gray-100 px-8 py-3 flex-shrink-0">
            <div className="container mx-auto">
              <div className="flex items-center gap-2 mb-2.5">
                <Star className="h-3.5 w-3.5 text-orange-600 fill-orange-600" />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Featured</span>
              </div>
              <div className="flex gap-2">
                {hotItems.map(item => (
                  <Button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    variant="outline"
                    size="sm"
                    className="bg-white hover:bg-gray-50 border-gray-200 hover:border-orange-300 transition-all text-gray-900 h-9"
                  >
                    <span className="font-medium text-sm">{item.name}</span>
                    <span className="ml-2 text-xs font-semibold text-orange-600">£{item.price.toFixed(2)}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="bg-white border-b border-gray-100 px-8 py-2.5 flex-shrink-0">
          <div className="container mx-auto">
            <div className="flex gap-1.5 overflow-x-auto">
              {categories.map(category => (
                <Button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  variant="ghost"
                  size="sm"
                  className={`whitespace-nowrap rounded-lg h-8 px-3 ${
                    selectedCategory === category
                      ? 'bg-orange-50 text-orange-700 hover:bg-orange-100 font-medium'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {category}
                  {category !== 'All' && (
                    <span className={`ml-1.5 text-xs ${
                      selectedCategory === category
                        ? 'text-orange-600'
                        : 'text-gray-400'
                    }`}>
                      ({products.filter(p => p.category === category && p.stock > 0).length})
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto px-8 py-5 bg-gray-50/30">
          <div className="container mx-auto">
            {paginatedProducts.length > 0 ? (
              <>
                <div className="grid grid-cols-4 gap-4 mb-5">
                  {paginatedProducts.map(product => (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="group bg-white rounded-lg border border-gray-200 hover:border-orange-300 hover:shadow-sm transition-all duration-200 overflow-hidden active:scale-98 transform"
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-gray-50 relative overflow-hidden">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                        />
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-white/90 backdrop-blur text-gray-600 text-[10px] shadow-sm border border-gray-200 h-5">
                            {product.category}
                          </Badge>
                        </div>
                        <div className="absolute bottom-2 left-2">
                          <Badge variant="secondary" className="bg-white/90 backdrop-blur text-gray-500 text-[10px] border border-gray-200 h-5">
                            {product.stock}
                          </Badge>
                        </div>
                      </div>

                      {/* Product Info */}
                      <div className="p-3">
                        <h3 className="font-medium text-sm text-gray-900 mb-0.5 line-clamp-2 text-left h-10">
                          {product.name}
                        </h3>
                        {product.sku && (
                          <p className="text-[10px] text-gray-400 mb-2 text-left">SKU: {product.sku}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-base font-bold text-gray-900">
                            £{product.price.toFixed(2)}
                          </span>
                          <div className="w-7 h-7 rounded-md bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                            <Plus className="h-4 w-4 text-orange-600" />
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                      disabled={currentPage === 0}
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 h-9"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-gray-600 text-sm px-3">
                      {currentPage + 1} / {totalPages}
                    </span>
                    <Button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={currentPage === totalPages - 1}
                      variant="outline"
                      size="sm"
                      className="bg-white border-gray-200 text-gray-700 hover:bg-gray-50 h-9"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                  <ShoppingCart className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-base font-medium text-gray-900">No products found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Cart Badge */}
      {cart.length > 0 && (
        <button
          onClick={handleCheckout}
          className="fixed bottom-6 right-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 z-50 flex items-center gap-3 px-5 py-3"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <Badge className="absolute -top-1.5 -right-1.5 bg-red-500 text-white h-5 w-5 flex items-center justify-center p-0 text-[10px] font-bold shadow-md">
              {cartItemCount}
            </Badge>
          </div>
          <div className="text-left">
            <p className="text-[10px] opacity-90 font-medium">Total</p>
            <p className="text-lg font-bold">£{total.toFixed(2)}</p>
          </div>
        </button>
      )}

      {/* Checkout Modal */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Checkout</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              Review and complete your sale
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Cart Items */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-gray-900 mb-3">Items ({cart.length})</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">£{item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 px-1 py-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-7 w-7 p-0 hover:bg-gray-100"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-7 w-7 p-0 hover:bg-gray-100"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="font-bold w-20 text-right text-gray-900">
                      £{(item.price * item.quantity).toFixed(2)}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount */}
            <div>
              <h3 className="font-semibold text-sm text-gray-900 mb-2.5">Discount</h3>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={discountType === 'none' ? 'default' : 'outline'}
                  onClick={() => setDiscountType('none')}
                  size="sm"
                  className={discountType === 'none' ? 'bg-orange-500 hover:bg-orange-600 h-8' : 'border-gray-200 text-gray-700 h-8'}
                >
                  None
                </Button>
                <Button
                  variant={discountType === '5' ? 'default' : 'outline'}
                  onClick={() => setDiscountType('5')}
                  size="sm"
                  className={discountType === '5' ? 'bg-orange-500 hover:bg-orange-600 h-8' : 'border-gray-200 text-gray-700 h-8'}
                >
                  5%
                </Button>
                <Button
                  variant={discountType === '10' ? 'default' : 'outline'}
                  onClick={() => setDiscountType('10')}
                  size="sm"
                  className={discountType === '10' ? 'bg-orange-500 hover:bg-orange-600 h-8' : 'border-gray-200 text-gray-700 h-8'}
                >
                  10%
                </Button>
                <Button
                  variant={discountType === '20' ? 'default' : 'outline'}
                  onClick={() => setDiscountType('20')}
                  size="sm"
                  className={discountType === '20' ? 'bg-orange-500 hover:bg-orange-600 h-8' : 'border-gray-200 text-gray-700 h-8'}
                >
                  20%
                </Button>
                <Button
                  variant={discountType === 'custom' ? 'default' : 'outline'}
                  onClick={() => setDiscountType('custom')}
                  size="sm"
                  className={discountType === 'custom' ? 'bg-orange-500 hover:bg-orange-600 h-8' : 'border-gray-200 text-gray-700 h-8'}
                >
                  Custom
                </Button>
                {discountType === 'custom' && (
                  <Input
                    type="number"
                    placeholder="% off"
                    value={customDiscount}
                    onChange={(e) => setCustomDiscount(e.target.value)}
                    className="w-20 h-8 border-gray-200 text-sm"
                  />
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">£{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Discount ({discountType === 'custom' ? customDiscount : discountType}%)</span>
                  <span className="font-semibold text-green-600">-£{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">VAT (20%)</span>
                <span className="font-semibold text-gray-900">£{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2.5">
                <span className="text-gray-900">Total</span>
                <span className="text-orange-600">£{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Customer Selection */}
            <div>
              <h3 className="font-semibold text-sm text-gray-900 mb-3">
                Customer <span className="text-red-600">*</span>
              </h3>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedCustomer.name}</p>
                      <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCustomerDialogOpen(true)}
                    className="text-gray-700 hover:bg-green-100"
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => setIsCustomerDialogOpen(true)}
                  className="w-full border-2 border-dashed border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 h-14"
                >
                  <User className="h-5 w-5 mr-2" />
                  Select Customer (Optional)
                </Button>
              )}
            </div>

            {/* Receipt Type */}
            <div>
              <h3 className="font-semibold text-sm text-gray-900 mb-2.5">Receipt Type</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={receiptType === 'simple' ? 'default' : 'outline'}
                  onClick={() => setReceiptType('simple')}
                  className={`h-10 ${receiptType === 'simple' ? 'bg-orange-500 hover:bg-orange-600' : 'border-gray-200 text-gray-700'}`}
                >
                  <Receipt className="h-4 w-4 mr-1.5" />
                  <span className="text-sm">Simple</span>
                </Button>
                <Button
                  variant={receiptType === 'detailed' ? 'default' : 'outline'}
                  onClick={() => setReceiptType('detailed')}
                  className={`h-10 ${receiptType === 'detailed' ? 'bg-orange-500 hover:bg-orange-600' : 'border-gray-200 text-gray-700'}`}
                >
                  <FileText className="h-4 w-4 mr-1.5" />
                  <span className="text-sm">Detailed</span>
                </Button>
              </div>
            </div>

            {/* Payment Methods */}
            <div>
              <h3 className="font-semibold text-sm text-gray-900 mb-2.5">Payment Method</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => handlePayment('cash')}
                  className="bg-green-600 hover:bg-green-700 text-white h-12"
                >
                  <Banknote className="h-5 w-5 mr-2" />
                  Cash
                </Button>
                <Button
                  onClick={() => handlePayment('card')}
                  className="bg-orange-500 hover:bg-orange-600 text-white h-12"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Card
                </Button>
                <Button
                  onClick={() => handlePayment('transfer')}
                  variant="outline"
                  className="h-12 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <Building2 className="h-4 w-4 mr-2" />
                  Transfer
                </Button>
                <Button
                  onClick={() => handlePayment('wallet')}
                  variant="outline"
                  className="h-12 border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  <Smartphone className="h-4 w-4 mr-2" />
                  Wallet
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Selection Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>
              Choose a customer for this sale
            </DialogDescription>
          </DialogHeader>
          <CustomerInfo onSelectCustomer={handleCustomerSelect} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuickPOS;
