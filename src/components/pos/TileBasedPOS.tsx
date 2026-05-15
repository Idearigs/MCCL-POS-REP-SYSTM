import React, { useState, useMemo, useEffect, useRef } from 'react';
import { normalizeImageUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Search,
  Tag,
  Percent,
  Truck,
  ShoppingBag,
  Package,
  TrendingUp,
  Users,
  Star,
  Plus,
  Minus,
  X,
  CreditCard,
  Banknote,
  Building2,
  Smartphone,
  ArrowLeft,
  Watch,
  Gem,
  Sparkles,
  Wrench,
  Battery,
  Clock,
  Gift,
  Scissors,
  Ruler,
  FileText,
  DollarSign,
  Percent as PercentIcon,
  Repeat,
  Heart,
  Crown,
  Award,
  Zap,
  Box,
  ShoppingCart,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Filter,
  Calculator,
  Delete,
  Divide,
  Equal,
  Scale,
  Coins,
  Gift as GiftCard,
  PenLine,
  Check,
  CheckCircle2,
  Calendar,
  Printer,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Archive,
  Lock,
  Shuffle,
  CalendarClock,
  PauseCircle,
  ListOrdered,
  UserPlus,
  Beaker,
  LogOut,
} from 'lucide-react';
import { useInventory, InventoryItem } from '@/contexts/InventoryContext';
import { Customer, useCustomers } from '@/contexts/CustomerContext';
import { useToast } from '@/hooks/use-toast';
import CustomerInfo from './CustomerInfo';
import LiveGoldRate from './LiveGoldRate';
import { repairService, Repair } from '@/services/repairService';
import { salesService, CreateSaleData, Sale } from '@/services/salesService';
import { customerService } from '@/services/customerService';
import { productService } from '@/services/productService';
import { giftCardService } from '@/services/giftCardService';
import { useSettings } from '@/contexts/SettingsContext';
import { useOutlet } from '@/contexts/OutletContext';
import { useAuth } from '@/contexts/AuthContext';
import { printThermalReceipt } from '@/utils/thermalReceipt';
import { PrinterStatusBadge } from './PrinterStatusBadge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import NewRepairJobForm from '@/components/repair/NewRepairJobForm';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  stock?: number; // Available stock for out-of-stock validation
  image?: string;
  sku?: string;
  isRepair?: boolean; // Flag to identify repair items
  repairId?: string;  // Original repair ID if it's a repair
  condition?: string; // BRAND_NEW | USED — recorded in sale notes
}

interface TileBasedPOSProps {
  onClose: () => void;
}

const TileBasedPOS: React.FC<TileBasedPOSProps> = ({ onClose }) => {
  const { inventory, refreshInventory } = useInventory();
  const { settings, updateMetalSettings } = useSettings();
  const { currentOutlet } = useOutlet();
  const { auth } = useAuth();
  const { toast } = useToast();

  // Held / suspended transactions
  const [heldTransactions, setHeldTransactions] = useState<Array<{
    id: string;
    label: string;
    items: typeof cart;
    customer: typeof selectedCustomer;
    discountPercentage: number;
    timestamp: string;
    type: 'hold' | 'suspend';
  }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('mps_held_transactions') || '[]');
    } catch { return []; }
  });
  const [showHeldDialog, setShowHeldDialog] = useState(false);

  // Stores the last completed sale so we can show the print receipt screen
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);

  // Cash drawer PIN shortcut
  const [showDrawerPinDialog, setShowDrawerPinDialog] = useState(false);
  const [drawerPinInput, setDrawerPinInput] = useState('');
  const [drawerPinError, setDrawerPinError] = useState('');
  const [openingDrawer, setOpeningDrawer] = useState(false);
  const drawerPinRef = useRef<HTMLInputElement>(null);

  // Load cart from localStorage on mount
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem('quickPosCart');
      return savedCart ? JSON.parse(savedCart) : [];
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
      return [];
    }
  });

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Customer state - starts empty (no localStorage loading on mount)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const { customers, refreshCustomers } = useCustomers();

  // Discount state - starts at 0 (no localStorage loading on mount)
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);

  const [showProductGrid, setShowProductGrid] = useState(false);

  // Repair states
  const [showRepairView, setShowRepairView] = useState(false);
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [repairSearchQuery, setRepairSearchQuery] = useState('');
  const [loadingRepairs, setLoadingRepairs] = useState(false);
  const [repairLoadingMore, setRepairLoadingMore] = useState(false);
  const [repairPage, setRepairPage] = useState(1);
  const [repairHasMore, setRepairHasMore] = useState(false);
  const [editingRepairPrices, setEditingRepairPrices] = useState<Record<string, number>>({});
  const [showNewRepairDialog, setShowNewRepairDialog] = useState(false);
  const [creatingRepair, setCreatingRepair] = useState(false);

  // Backend categories state
  const [backendCategories, setBackendCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Payment states
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET' | 'SPLIT' | 'INSTALLMENT'>('CASH');
  const [cashAmount, setCashAmount] = useState<string>('');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [changeGiven, setChangeGiven] = useState<number>(0);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Monthly Account states (create-sale flow)
  const [showMonthlyDialog, setShowMonthlyDialog] = useState(false);
  const [monthlySearch, setMonthlySearch] = useState('');
  const [monthlySearching, setMonthlySearching] = useState(false);
  const [monthlyResults, setMonthlyResults] = useState<any[]>([]);
  const [monthlyDepositAmount, setMonthlyDepositAmount] = useState<string>('0');

  // Monthly Accounts panel (recall & pay existing installment sales)
  const [showAccountsPanel, setShowAccountsPanel] = useState(false);
  const [accountSales, setAccountSales] = useState<Sale[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');
  const [accountStep, setAccountStep] = useState<'customers' | 'orders' | 'pay'>('customers');
  const [accountSelectedCustomerId, setAccountSelectedCustomerId] = useState<string | null>(null);
  const [accountSelectedSale, setAccountSelectedSale] = useState<Sale | null>(null);
  const [accountPayAmount, setAccountPayAmount] = useState('');
  const [accountPayMethod, setAccountPayMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [processingAccountPayment, setProcessingAccountPayment] = useState(false);

  // Quick Product states
  const [showQuickProductDialog, setShowQuickProductDialog] = useState(false);
  const [quickProductName, setQuickProductName] = useState('');
  const [quickProductSku, setQuickProductSku] = useState('');
  const [quickProductCategory, setQuickProductCategory] = useState('');
  const [quickProductSupplier, setQuickProductSupplier] = useState('');
  const [quickProductMaterial, setQuickProductMaterial] = useState('NONE'); // Default to NONE for non-jewelry items
  const [quickProductPurity, setQuickProductPurity] = useState('');
  const [quickProductWeight, setQuickProductWeight] = useState('');
  const [quickProductCondition, setQuickProductCondition] = useState<'BRAND_NEW' | 'USED'>('BRAND_NEW');
  const [quickProductPrice, setQuickProductPrice] = useState('');
  const [quickProductCost, setQuickProductCost] = useState('');
  const [quickProductQuantity, setQuickProductQuantity] = useState('1');
  const [quickProductDescription, setQuickProductDescription] = useState('');
  const [quickProductBarcode, setQuickProductBarcode] = useState('');
  const [isAddingQuickProduct, setIsAddingQuickProduct] = useState(false);

  // Discount states
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage');
  const [discountValue, setDiscountValue] = useState('');

  // Category view state (inline, not dialog)
  const [showCategoryView, setShowCategoryView] = useState(false);
  const [activeCategoryName, setActiveCategoryName] = useState<string>('');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryConditionFilter, setCategoryConditionFilter] = useState<'all' | 'new' | 'used'>('all');
  const [categorySortBy, setCategorySortBy] = useState<'name' | 'price-low' | 'price-high' | 'newest'>('name');
  const [categoryPage, setCategoryPage] = useState(0);
  const [showCategoryAddForm, setShowCategoryAddForm] = useState(false);

  // Smooth transition state for Apple-like view switching
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const [pendingView, setPendingView] = useState<{type: string, data?: any} | null>(null);

  // Category add product form
  const [catNewProduct, setCatNewProduct] = useState({
    name: '',
    sku: '',
    price: '',
    cost: '',
    quantity: '1',
    material: 'GOLD',
    purity: '',
    weight: '',
    condition: 'BRAND_NEW' as 'BRAND_NEW' | 'USED',
    description: '',
  });
  const [isAddingCatProduct, setIsAddingCatProduct] = useState(false);

  // Appraisal view state (inline, not dialog)
  const [showAppraisalView, setShowAppraisalView] = useState(false);
  const [appraisalData, setAppraisalData] = useState({
    itemType: '' as string,
    material: 'GOLD' as string,
    purity: '' as string,
    weight: '' as string,
    condition: 'EXCELLENT' as 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR',
    description: '' as string,
    stones: '' as string,
    brandMaker: '' as string,
    estimatedValue: '' as string,
    appraisalFee: '25' as string, // Default appraisal fee
    notes: '' as string,
    purpose: 'INSURANCE' as 'INSURANCE' | 'RESALE' | 'ESTATE' | 'DONATION' | 'OTHER',
  });
  const [isProcessingAppraisal, setIsProcessingAppraisal] = useState(false);

  // Calculator state (Apple-like popup calculator)
  const [showCalculatorDialog, setShowCalculatorDialog] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPreviousValue, setCalcPreviousValue] = useState<number | null>(null);
  const [calcOperation, setCalcOperation] = useState<string | null>(null);
  const [calcWaitingForOperand, setCalcWaitingForOperand] = useState(false);

  // Trade-In / Scrap Gold Calculator state
  const [showTradeInDialog, setShowTradeInDialog] = useState(false);
  const [tradeInWeight, setTradeInWeight] = useState('');
  const [tradeInMetal, setTradeInMetal] = useState<'10K' | '14K' | '18K' | '22K' | '24K' | 'PLATINUM' | 'SILVER'>('18K');
  const [tradeInGoldPrice, setTradeInGoldPrice] = useState('85.00'); // Price per gram
  const [tradeInPayoutPercent] = useState(80); // 80% payout margin

  // Manual Entry state
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [manualEntryName, setManualEntryName] = useState('');
  const [manualEntryPrice, setManualEntryPrice] = useState('');

  // Gift Card state
  const [showGiftCardDialog, setShowGiftCardDialog] = useState(false);
  const [giftCardMode, setGiftCardMode] = useState<'sell' | 'redeem'>('sell');
  const [giftCardAmount, setGiftCardAmount] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftCardValidation, setGiftCardValidation] = useState<{ valid: boolean; balance?: number; reason?: string; recipientName?: string } | null>(null);
  const [giftCardValidating, setGiftCardValidating] = useState(false);

  // Layaway state
  const [showLayawayDialog, setShowLayawayDialog] = useState(false);
  const [layawayDeposit, setLayawayDeposit] = useState('');
  const [layawayDuration, setLayawayDuration] = useState<3 | 6>(3);
  const [layawayCustomerName, setLayawayCustomerName] = useState('');
  const [layawayCustomerPhone, setLayawayCustomerPhone] = useState('');
  const [layawayCustomerEmail, setLayawayCustomerEmail] = useState('');
  const [isProcessingLayaway, setIsProcessingLayaway] = useState(false);
  const [cartShake, setCartShake] = useState(false);
  const [layawayCustomerSearch, setLayawayCustomerSearch] = useState('');
  const [layawayCustomerResults, setLayawayCustomerResults] = useState<Customer[]>([]);
  const [isSearchingCustomers, setIsSearchingCustomers] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [layawaySelectedCustomer, setLayawaySelectedCustomer] = useState<Customer | null>(null);

  // Quick Service Price Dialog (for Cleaning, Watch Battery, Watch Links, Spring Bar, Watch Straps)
  const [showServicePriceDialog, setShowServicePriceDialog] = useState(false);
  const [serviceType, setServiceType] = useState<'cleaning' | 'battery' | 'watch-links' | 'spring-bar' | 'watch-straps'>('cleaning');
  const [servicePrice, setServicePrice] = useState('');

  // Purity multipliers for different metals
  const metalPurityMap: Record<string, { purity: number; color: string; bgColor: string }> = {
    '10K': { purity: 0.417, color: 'text-amber-700', bgColor: 'bg-amber-100 border-amber-400' },
    '14K': { purity: 0.585, color: 'text-amber-600', bgColor: 'bg-amber-200 border-amber-500' },
    '18K': { purity: 0.750, color: 'text-yellow-600', bgColor: 'bg-yellow-200 border-yellow-500' },
    '22K': { purity: 0.916, color: 'text-yellow-500', bgColor: 'bg-yellow-300 border-yellow-600' },
    '24K': { purity: 1.000, color: 'text-yellow-400', bgColor: 'bg-yellow-400 border-yellow-600' },
    'PLATINUM': { purity: 0.950, color: 'text-gray-600', bgColor: 'bg-gray-200 border-gray-500' },
    'SILVER': { purity: 0.925, color: 'text-gray-500', bgColor: 'bg-gray-100 border-gray-400' },
  };

  // Calculate trade-in offer value
  const tradeInOfferValue = useMemo(() => {
    const weight = parseFloat(tradeInWeight) || 0;
    const goldPrice = parseFloat(tradeInGoldPrice) || 0;
    const purity = metalPurityMap[tradeInMetal]?.purity || 0;
    const payoutMultiplier = tradeInPayoutPercent / 100;

    // For platinum and silver, use their own market prices (simplified)
    let basePrice = goldPrice;
    if (tradeInMetal === 'PLATINUM') {
      basePrice = goldPrice * 1.1; // Platinum typically slightly higher
    } else if (tradeInMetal === 'SILVER') {
      basePrice = goldPrice * 0.012; // Silver much lower than gold
    }

    return weight * basePrice * purity * payoutMultiplier;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeInWeight, tradeInGoldPrice, tradeInMetal, tradeInPayoutPercent]);

  // Quick Add Customer state
  const [showQuickAddCustomer, setShowQuickAddCustomer] = useState(false);
  const [quickAddFirstName, setQuickAddFirstName] = useState('');
  const [quickAddLastName, setQuickAddLastName] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('');
  const [quickAddEmail, setQuickAddEmail] = useState('');
  const [quickAddAddress, setQuickAddAddress] = useState('');
  const [quickAddCity, setQuickAddCity] = useState('');
  const [isCreatingQuickCustomer, setIsCreatingQuickCustomer] = useState(false);

  // Metal Price Calculator state
  const [showMetalCalcDialog, setShowMetalCalcDialog] = useState(false);
  const [metalCalcType, setMetalCalcType] = useState<'GOLD' | 'SILVER' | 'PLATINUM'>('GOLD');
  const [metalCalcKarat, setMetalCalcKarat] = useState<'10K' | '14K' | '18K' | '22K' | '24K'>('18K');
  const [metalCalcGrams, setMetalCalcGrams] = useState('');
  const [metalCalcSilverPrice, setMetalCalcSilverPrice] = useState('0.82');
  const [metalCalcPlatinumPrice, setMetalCalcPlatinumPrice] = useState('26.50');
  const [metalCalcGoldColour, setMetalCalcGoldColour] = useState<'YELLOW' | 'WHITE' | 'ROSE'>('YELLOW');
  const [showMarginEditor, setShowMarginEditor] = useState(false);
  const [marginGold, setMarginGold] = useState('');
  const [marginSilver, setMarginSilver] = useState('');
  const [marginPlatinum, setMarginPlatinum] = useState('');
  const [savingMargins, setSavingMargins] = useState(false);
  const [metalCalcSilverLive, setMetalCalcSilverLive] = useState(false);
  const [metalCalcPlatinumLive, setMetalCalcPlatinumLive] = useState(false);
  const [metalCalcFetching, setMetalCalcFetching] = useState(false);

  // Fetch live silver + platinum from goldapi.io (same key/pattern as LiveGoldRate)
  const fetchSilverPlatinum = async () => {
    const GOLD_API_KEY = 'goldapi-1inbzfsmice24ik-io';
    const USD_TO_GBP = 0.79;
    const TROY_TO_GRAM = 31.1035;
    const CACHE_TTL = 60 * 60 * 1000; // 60 min

    const loadCache = (key: string) => {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
    };
    const saveCache = (key: string, data: object) => {
      try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* ignore */ }
    };

    let silverFetched = false;
    let platinumFetched = false;

    // Silver
    const silverCache = loadCache('liveMetalCache_silver');
    if (silverCache && Date.now() - silverCache.timestamp < CACHE_TTL) {
      setMetalCalcSilverPrice(silverCache.pricePerGram.toFixed(4));
      setMetalCalcSilverLive(true);
      silverFetched = true;
    }

    // Platinum
    const platCache = loadCache('liveMetalCache_platinum');
    if (platCache && Date.now() - platCache.timestamp < CACHE_TTL) {
      setMetalCalcPlatinumPrice(platCache.pricePerGram.toFixed(2));
      setMetalCalcPlatinumLive(true);
      platinumFetched = true;
    }

    if (silverFetched && platinumFetched) return;

    setMetalCalcFetching(true);
    try {
      const fetchMetal = async (symbol: string) => {
        const res = await fetch(`https://www.goldapi.io/api/${symbol}/USD`, {
          headers: { 'x-access-token': GOLD_API_KEY, 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error(`${symbol} API error ${res.status}`);
        return res.json();
      };

      if (!silverFetched) {
        try {
          const data = await fetchMetal('XAG');
          const pricePerGram = (data.price * USD_TO_GBP) / TROY_TO_GRAM;
          setMetalCalcSilverPrice(pricePerGram.toFixed(4));
          setMetalCalcSilverLive(true);
          saveCache('liveMetalCache_silver', { pricePerGram, timestamp: Date.now() });
        } catch { /* keep default */ }
      }

      if (!platinumFetched) {
        try {
          const data = await fetchMetal('XPT');
          const pricePerGram = (data.price * USD_TO_GBP) / TROY_TO_GRAM;
          setMetalCalcPlatinumPrice(pricePerGram.toFixed(2));
          setMetalCalcPlatinumLive(true);
          saveCache('liveMetalCache_platinum', { pricePerGram, timestamp: Date.now() });
        } catch { /* keep default */ }
      }
    } finally {
      setMetalCalcFetching(false);
    }
  };

  const metalCalcResult = useMemo(() => {
    const grams = parseFloat(metalCalcGrams) || 0;
    const metals = settings.metals ?? { goldMarginPercent: 0, silverMarginPercent: 0, platinumMarginPercent: 0 };
    let spotValue = 0;
    let marginPct = 0;
    if (metalCalcType === 'GOLD') {
      spotValue = grams * (parseFloat(tradeInGoldPrice) || 0) * (metalPurityMap[metalCalcKarat]?.purity || 0);
      marginPct = metals.goldMarginPercent || 0;
    } else if (metalCalcType === 'SILVER') {
      spotValue = grams * (parseFloat(metalCalcSilverPrice) || 0) * 0.925;
      marginPct = metals.silverMarginPercent || 0;
    } else {
      spotValue = grams * (parseFloat(metalCalcPlatinumPrice) || 0) * 0.950;
      marginPct = metals.platinumMarginPercent || 0;
    }
    return spotValue * (1 + marginPct / 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metalCalcGrams, metalCalcType, metalCalcKarat, tradeInGoldPrice, metalCalcSilverPrice, metalCalcPlatinumPrice, settings.metals]);

  // Get categories with product counts from inventory
  const categories = useMemo(() => {
    const categoryMap = new Map<string, { id: string; name: string; count: number }>();

    // Add categories from existing inventory
    inventory.forEach(item => {
      if (item.category) {
        const key = item.category; // This is the category ID
        const existing = categoryMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          categoryMap.set(key, {
            id: key,
            name: item.categoryName || key,
            count: 1
          });
        }
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory]);

  // Count products per named category (for tile badges)
  const categoryCountByName = useMemo(() => {
    const counts: Record<string, number> = {};
    inventory.forEach(item => {
      const name = item.categoryName;
      if (name) counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [inventory]);

  // Filter products — when searchQuery is active with no selectedCategory, search ALL inventory
  const filteredProducts = useMemo(() => {
    return inventory.filter(item => {
      const matchesCategory = !selectedCategory || item.category === selectedCategory || item.categoryName === selectedCategory;
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [inventory, selectedCategory, searchQuery]);

  // Filter products for category view (Rings, etc.)
  const categoryViewProducts = useMemo(() => {
    if (!activeCategoryName) return [];

    // Resolve category UUID for the active category name
    const categoryId = backendCategories.find(
      cat => cat.name.toLowerCase() === activeCategoryName.toLowerCase()
    )?.id;

    let products = inventory.filter(item => {
      const matchesCategory =
        item.categoryName?.toLowerCase() === activeCategoryName.toLowerCase() ||
        (categoryId && item.category === categoryId);
      return matchesCategory;
    });

    // Search filter
    if (categorySearchQuery) {
      const query = categorySearchQuery.toLowerCase();
      products = products.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    // Condition filter
    if (categoryConditionFilter !== 'all') {
      products = products.filter(p => {
        const condition = (p as any).condition?.toLowerCase() || 'brand_new';
        if (categoryConditionFilter === 'new') return condition === 'brand_new';
        if (categoryConditionFilter === 'used') return condition === 'used';
        return true;
      });
    }

    // Sorting
    switch (categorySortBy) {
      case 'name':
        products.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'price-low':
        products.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        products.sort((a, b) => b.price - a.price);
        break;
      case 'newest':
        products.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
    }

    return products;
  }, [inventory, activeCategoryName, categorySearchQuery, categoryConditionFilter, categorySortBy, backendCategories]);

  // Pagination for category view
  const CATEGORY_ITEMS_PER_PAGE = 8;
  const categoryTotalPages = Math.ceil(categoryViewProducts.length / CATEGORY_ITEMS_PER_PAGE);
  const paginatedCategoryProducts = categoryViewProducts.slice(
    categoryPage * CATEGORY_ITEMS_PER_PAGE,
    (categoryPage + 1) * CATEGORY_ITEMS_PER_PAGE
  );

  // Repairs are fetched from backend with search — no local filter needed

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('quickPosCart', JSON.stringify(cart));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [cart]);

  // Save selected customer to localStorage whenever it changes
  useEffect(() => {
    try {
      if (selectedCustomer) {
        localStorage.setItem('quickPosCustomer', JSON.stringify(selectedCustomer));
      } else {
        localStorage.removeItem('quickPosCustomer');
      }
    } catch (error) {
      console.error('Failed to save customer to localStorage:', error);
    }
  }, [selectedCustomer]);

  // Save discount to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('quickPosDiscount', discountPercentage.toString());
    } catch (error) {
      console.error('Failed to save discount to localStorage:', error);
    }
  }, [discountPercentage]);

  // Clear customer and discount from localStorage when Quick POS closes (component unmounts)
  useEffect(() => {
    return () => {
      // Cleanup on unmount - clear customer and discount so next session starts fresh
      localStorage.removeItem('quickPosCustomer');
      localStorage.removeItem('quickPosDiscount');
    };
  }, []);

  // Fetch repairs when repair view is opened (fresh load)
  useEffect(() => {
    if (showRepairView) {
      fetchRepairs(1, '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRepairView]);

  // Debounced backend search when repair search query changes
  useEffect(() => {
    if (!showRepairView) return;
    const timer = setTimeout(() => {
      fetchRepairs(1, repairSearchQuery);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repairSearchQuery]);

  // When search query is typed on the main screen, switch to product grid view
  useEffect(() => {
    if (!showCategoryView && !showRepairView && !showAppraisalView) {
      if (searchQuery.trim().length >= 1) {
        setSelectedCategory(null);
        setShowProductGrid(true);
      } else {
        setShowProductGrid(false);
      }
    }
  }, [searchQuery, showCategoryView, showRepairView, showAppraisalView]);

  // Fetch backend categories on mount, when Quick Product dialog opens, or when category view opens
  useEffect(() => {
    const fetchBackendCategories = async () => {
      try {
        const response = await productService.getCategories();
        console.log('📂 Fetched backend categories:', response);
        setBackendCategories(response);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchBackendCategories();
  }, [showQuickProductDialog, activeCategoryName]);

  // Debounced customer search for Layaway
  useEffect(() => {
    const searchCustomers = async () => {
      if (layawayCustomerSearch.trim().length < 2) {
        setLayawayCustomerResults([]);
        setShowCustomerDropdown(false);
        return;
      }

      setIsSearchingCustomers(true);
      try {
        const response = await customerService.getCustomers(layawayCustomerSearch, 1, 10);
        const customers = Array.isArray(response) ? response : response.data;
        setLayawayCustomerResults(customers);
        setShowCustomerDropdown(customers.length > 0);
      } catch (error) {
        console.error('Failed to search customers:', error);
        setLayawayCustomerResults([]);
      } finally {
        setIsSearchingCustomers(false);
      }
    };

    const debounceTimer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounceTimer);
  }, [layawayCustomerSearch]);

  const fetchRepairs = async (page: number, search: string) => {
    const isFirstPage = page === 1;
    if (isFirstPage) setLoadingRepairs(true);
    else setRepairLoadingMore(true);

    try {
      const filters: any = { search: search || undefined };
      const response = await repairService.getRepairs(page, 10, filters);
      const incoming = response.data ?? [];

      if (isFirstPage) {
        setRepairs(incoming);
      } else {
        setRepairs(prev => [...prev, ...incoming]);
      }

      setRepairPage(page);
      setRepairHasMore(response.meta?.hasNextPage ?? false);
    } catch (error) {
      console.error('Failed to fetch repairs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load repairs',
        variant: 'destructive'
      });
    } finally {
      setLoadingRepairs(false);
      setRepairLoadingMore(false);
    }
  };

  // Smooth view transition helper - creates Apple-like fade transition
  const smoothTransition = (callback: () => void) => {
    setIsViewTransitioning(true);
    // Wait for fade-out (250ms), then execute callback, then fade-in
    setTimeout(() => {
      callback();
      // Small delay before starting fade-in for smoother effect
      setTimeout(() => {
        setIsViewTransitioning(false);
      }, 100);
    }, 250);
  };

  // Add to cart
  const addToCart = (product: InventoryItem) => {
    if (product.stock !== undefined && product.stock <= 0) {
      toast({ title: 'Out of stock', description: `"${product.name}" has no stock available`, variant: 'destructive', duration: 2000 });
      return;
    }
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      if (product.stock !== undefined && existing.quantity >= product.stock) {
        toast({ title: 'Out of stock', description: `Only ${product.stock} unit(s) of "${product.name}" available`, variant: 'destructive', duration: 2000 });
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        stock: product.stock,
        image: product.imageUrl,
        sku: product.sku,
        condition: (product as any).condition || undefined,
      }]);
    }
    toast({ title: 'Added to cart', description: product.name, duration: 1000 });
  };

  // Add repair to cart
  const addRepairToCart = async (repair: Repair) => {
    const existing = cart.find(item => item.repairId === repair.id);
    if (existing) {
      toast({
        title: 'Already in cart',
        description: 'This repair is already added',
        variant: 'destructive'
      });
      return;
    }

    // Use edited price if available, otherwise use estimated cost
    const finalPrice = editingRepairPrices[repair.id] ?? repair.estimatedCost ?? 0;

    setCart([...cart, {
      id: `repair-${repair.id}`, // Use a prefixed ID to avoid conflicts
      name: `Repair: ${repair.itemDescription}`,
      price: finalPrice,
      quantity: 1,
      sku: `REP-${repair.id.slice(0, 8)}`,
      isRepair: true,
      repairId: repair.id,
    }]);

    // Auto-load customer data from repair
    if (repair.customerId && !selectedCustomer) {
      try {
        const customer = await customerService.getCustomerById(repair.customerId);
        setSelectedCustomer(customer);
        toast({
          title: 'Customer Loaded',
          description: `Customer: ${customer.firstName} ${customer.lastName}`,
          duration: 2000
        });
      } catch (error) {
        console.error('Failed to load customer:', error);
        // Don't show error toast, just continue without customer
      }
    }

    toast({
      title: 'Added to cart',
      description: `${repair.itemDescription} - ${repair.customerName}`,
      duration: 1500
    });

    // Close repair view after adding
    setShowRepairView(false);
  };

  // Handle repair price change
  const handleRepairPriceChange = (repairId: string, newPrice: string) => {
    const priceValue = parseFloat(newPrice);
    if (!isNaN(priceValue) && priceValue >= 0) {
      setEditingRepairPrices(prev => ({
        ...prev,
        [repairId]: priceValue
      }));
    }
  };

  // Get repair price (edited or original)
  const getRepairPrice = (repair: Repair): number => {
    return editingRepairPrices[repair.id] ?? repair.estimatedCost ?? 0;
  };

  // Handle repair tile click (smooth Apple-like transition)
  const handleRepairTileClick = () => {
    smoothTransition(() => {
      setShowProductGrid(false);
      setShowRepairView(true);
    });
  };

  // Handle back from repair view (smooth Apple-like transition)
  const handleBackFromRepairs = () => {
    smoothTransition(() => {
      setShowRepairView(false);
      setRepairSearchQuery('');
      setRepairs([]);
      setRepairPage(1);
      setRepairHasMore(false);
    });
  };

  // Handle new repair job creation from POS tile
  const handleNewRepairSubmit = async (formData: any) => {
    setCreatingRepair(true);
    try {
      let customerId = formData.customerId;

      // Create customer if not selected from existing
      if (!customerId) {
        const nameParts = formData.customerName.trim().split(' ');
        const customer = await customerService.createCustomer({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || 'Customer',
          phone: formData.phoneNumber || '',
          email: formData.email || undefined,
          notes: 'Created via POS repair quick-add',
          dataProcessingConsent: true,
          marketingEmail: false,
          marketingSms: false,
          marketingPhone: false,
        });
        customerId = customer.id;
      }

      const newRepair = await repairService.createRepair({
        customerId,
        problemDescription: formData.notes || 'Repair required',
        priority: 'NORMAL',
        expectedCompletionDate: formData.dueDate,
        customerInstructions: formData.notes || '',
        rmaId: formData.repairId || undefined,
        items: [{
          itemDescription: formData.itemDescription,
          repairType: 'OTHER',
          repairDescription: formData.notes || 'General repair work required',
          estimatedCost: parseFloat(formData.estimatedPrice) || 0,
        }],
      });

      if (formData.images?.length > 0) {
        await repairService.uploadRepairImages(newRepair.id, formData.images, 'before').catch(() => {});
      }

      toast({ title: 'Repair Job Created', description: `Job #${newRepair.id.slice(0, 8)} created successfully.` });
      setShowNewRepairDialog(false);
    } catch (err: any) {
      toast({ title: 'Failed to Create Repair', description: err?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setCreatingRepair(false);
    }
  };

  // Handle Quick Product - save to inventory and add to cart
  const handleQuickProduct = async () => {
    // Validation - only required fields
    if (!quickProductName.trim()) {
      toast({ title: 'Missing Field', description: 'Please enter product name', variant: 'destructive' });
      return;
    }
    if (!quickProductSku.trim()) {
      toast({ title: 'Missing Field', description: 'Please enter SKU', variant: 'destructive' });
      return;
    }
    if (!quickProductPrice) {
      toast({ title: 'Missing Field', description: 'Please enter price', variant: 'destructive' });
      return;
    }
    if (!quickProductCategory) {
      toast({ title: 'Missing Field', description: 'Please select category', variant: 'destructive' });
      return;
    }

    const price = parseFloat(quickProductPrice);
    const cost = parseFloat(quickProductCost) || 0;
    const qty = parseInt(quickProductQuantity) || 1;
    const weight = parseFloat(quickProductWeight) || undefined;

    if (price <= 0 || qty <= 0) {
      toast({ title: 'Invalid Values', description: 'Price and quantity must be greater than 0', variant: 'destructive' });
      return;
    }

    setIsAddingQuickProduct(true);

    try {
      // Create product in inventory database
      const productData: any = {
        name: quickProductName.trim(),
        sku: quickProductSku.trim(),
        category: quickProductCategory, // This is now the category ID
        price: price,
        cost: cost,
        stock: qty,
        minStockLevel: 1, // Default minimum stock level
      };

      // Add optional fields only if they have values
      if (quickProductMaterial && quickProductMaterial !== 'NONE') {
        productData.material = quickProductMaterial;
      }
      if (quickProductSupplier) productData.supplier = quickProductSupplier;
      if (quickProductPurity) productData.purity = quickProductPurity;
      if (quickProductCondition) productData.condition = quickProductCondition;
      if (quickProductDescription) productData.description = quickProductDescription;
      if (quickProductBarcode) productData.barcode = quickProductBarcode;
      if (weight) productData.weight = weight;

      console.log('📦 Creating quick product with data:', productData);

      const createdProduct = await productService.createProduct(productData);

      console.log('✅ Product created successfully:', createdProduct);

      // Add the created product to cart
      const cartItem = {
        id: createdProduct.id,
        name: createdProduct.name,
        price: createdProduct.price,
        quantity: qty,
        sku: createdProduct.sku,
        image: createdProduct.images?.[0] || undefined,
      };

      setCart([...cart, cartItem]);

      // Refresh inventory so new product appears immediately
      await refreshInventory();

      toast({
        title: 'Product Added',
        description: `${quickProductName} saved to inventory and added to cart`,
        duration: 2000
      });

      // Reset all fields
      setQuickProductName('');
      setQuickProductSku('');
      setQuickProductCategory('');
      setQuickProductSupplier('');
      setQuickProductMaterial('NONE');
      setQuickProductPurity('');
      setQuickProductWeight('');
      setQuickProductCondition('BRAND_NEW');
      setQuickProductPrice('');
      setQuickProductCost('');
      setQuickProductQuantity('1');
      setQuickProductDescription('');
      setQuickProductBarcode('');
      setShowQuickProductDialog(false);

    } catch (error: any) {
      console.error('Failed to create quick product:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive'
      });
    } finally {
      setIsAddingQuickProduct(false);
    }
  };

  // Handle Apply Discount
  const handleApplyDiscount = () => {
    if (!discountValue) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a discount value',
        variant: 'destructive'
      });
      return;
    }

    const value = parseFloat(discountValue);
    if (value <= 0) {
      toast({
        title: 'Invalid Value',
        description: 'Discount value must be greater than 0',
        variant: 'destructive'
      });
      return;
    }

    if (discountType === 'percentage') {
      if (value > 100) {
        toast({
          title: 'Invalid Percentage',
          description: 'Percentage cannot exceed 100%',
          variant: 'destructive'
        });
        return;
      }
      setDiscountPercentage(value);
      toast({
        title: 'Discount Applied',
        description: `${value}% discount applied to cart`,
      });
    } else {
      // For fixed amount discount, convert to percentage based on subtotal
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (value > subtotal) {
        toast({
          title: 'Invalid Amount',
          description: 'Discount cannot exceed cart total',
          variant: 'destructive'
        });
        return;
      }
      const percentage = (value / subtotal) * 100;
      setDiscountPercentage(percentage);
      toast({
        title: 'Discount Applied',
        description: `£${value.toFixed(2)} discount applied to cart`,
      });
    }

    setDiscountValue('');
    setShowDiscountDialog(false);
  };

  // Update quantity
  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  // Remove from cart
  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = subtotal * (discountPercentage / 100);
  const afterDiscount = subtotal - discount;
  const tax = 0; // No VAT - prices already include VAT
  const total = afterDiscount; // Total equals after discount (no additional tax)

  // Handle category click
  const handleCategoryClick = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setShowProductGrid(true);
  };

  // Handle category view open (inline with smooth Apple-like transition)
  const handleCategoryViewOpen = (categoryName: string) => {
    smoothTransition(() => {
      // Reset form state
      setActiveCategoryName(categoryName);
      setCategorySearchQuery('');
      setCategoryConditionFilter('all');
      setCategorySortBy('name');
      setCategoryPage(0);
      setShowCategoryAddForm(false);
      setCatNewProduct({
        name: '',
        sku: '',
        price: '',
        cost: '',
        quantity: '1',
        material: 'GOLD',
        purity: '',
        weight: '',
        condition: 'BRAND_NEW',
        description: '',
      });
      setShowCategoryView(true);
    });
  };

  // Handle back from category view (smooth Apple-like transition)
  const handleBackFromCategoryView = () => {
    smoothTransition(() => {
      setShowCategoryView(false);
      setActiveCategoryName('');
    });
  };

  // Quick Add Customer
  const handleQuickAddCustomer = async () => {
    if (!quickAddFirstName.trim() || !quickAddPhone.trim()) return;
    setIsCreatingQuickCustomer(true);
    try {
      const newCustomer = await customerService.createCustomer({
        name: `${quickAddFirstName.trim()}${quickAddLastName.trim() ? ' ' + quickAddLastName.trim() : ''}`,
        phone: quickAddPhone.trim(),
        email: quickAddEmail.trim() || undefined,
        address: quickAddAddress.trim() || undefined,
        city: quickAddCity.trim() || undefined,
        dataProcessingConsent: true, // customer is physically present in-store
      } as any);
      setSelectedCustomer(newCustomer);
      refreshCustomers(); // update the Select Customer list immediately
      toast({ title: 'Customer Added', description: `${newCustomer.firstName || quickAddFirstName} added and selected` });
      setShowQuickAddCustomer(false);
      setQuickAddFirstName(''); setQuickAddLastName(''); setQuickAddPhone('');
      setQuickAddEmail(''); setQuickAddAddress(''); setQuickAddCity('');
    } catch {
      toast({ title: 'Failed to add customer', variant: 'destructive' });
    } finally {
      setIsCreatingQuickCustomer(false);
    }
  };

  // Monthly Accounts panel: load all outstanding INSTALLMENT sales
  const openAccountsPanel = async () => {
    setShowAccountsPanel(true);
    setAccountStep('customers');
    setAccountSearch('');
    setAccountSelectedCustomerId(null);
    setAccountSelectedSale(null);
    setAccountsLoading(true);
    try {
      const res = await salesService.getInstallmentSales(1, 200);
      setAccountSales(res.data || []);
    } catch {
      setAccountSales([]);
    } finally {
      setAccountsLoading(false);
    }
  };

  const handleAccountPayment = async () => {
    if (!accountSelectedSale || !accountPayAmount) return;
    const amount = parseFloat(accountPayAmount);
    if (isNaN(amount) || amount <= 0) return;
    setProcessingAccountPayment(true);
    try {
      await salesService.recordInstallmentPayment(accountSelectedSale.id, amount, accountPayMethod);
      toast({ title: 'Payment recorded', description: `£${amount.toFixed(2)} recorded against ${accountSelectedSale.saleNumber || accountSelectedSale.id}` });
      // Refresh the list
      const res = await salesService.getInstallmentSales(1, 200);
      setAccountSales(res.data || []);
      setAccountStep('customers');
      setAccountSelectedCustomerId(null);
      setAccountSelectedSale(null);
      setAccountPayAmount('');
    } catch {
      toast({ title: 'Payment failed', variant: 'destructive' });
    } finally {
      setProcessingAccountPayment(false);
    }
  };

  // Handle appraisal view open (inline with smooth Apple-like transition)
  const handleAppraisalOpen = () => {
    smoothTransition(() => {
      // Reset appraisal form
      setAppraisalData({
        itemType: '',
        material: 'GOLD',
        purity: '',
        weight: '',
        condition: 'EXCELLENT',
        description: '',
        stones: '',
        brandMaker: '',
        estimatedValue: '',
        appraisalFee: '25',
        notes: '',
        purpose: 'INSURANCE',
      });
      setShowAppraisalView(true);
    });
  };

  // Handle back from appraisal view (smooth Apple-like transition)
  const handleBackFromAppraisalView = () => {
    smoothTransition(() => {
      setShowAppraisalView(false);
    });
  };

  // Handle add appraisal to cart
  const handleAddAppraisalToCart = () => {
    if (!appraisalData.itemType.trim()) {
      toast({ title: 'Required', description: 'Please enter item type', variant: 'destructive' });
      return;
    }

    const fee = parseFloat(appraisalData.appraisalFee) || 25;
    const itemDescription = `${appraisalData.itemType}${appraisalData.material ? ` - ${appraisalData.material}` : ''}${appraisalData.purity ? ` ${appraisalData.purity}` : ''}`;

    // Add appraisal service to cart
    const appraisalItem: CartItem = {
      id: `appraisal-${Date.now()}`,
      name: `Appraisal: ${itemDescription}`,
      price: fee,
      quantity: 1,
      sku: 'APPRAISAL-SERVICE',
    };

    setCart(prev => [...prev, appraisalItem]);
    toast({
      title: 'Appraisal Added',
      description: `${itemDescription} appraisal added to cart (£${fee.toFixed(2)})`,
    });

    // Go back to tile view
    handleBackFromAppraisalView();
  };

  // ===== CALCULATOR FUNCTIONS =====
  const calcClear = () => {
    setCalcDisplay('0');
    setCalcPreviousValue(null);
    setCalcOperation(null);
    setCalcWaitingForOperand(false);
  };

  const calcInputDigit = (digit: string) => {
    if (calcWaitingForOperand) {
      setCalcDisplay(digit);
      setCalcWaitingForOperand(false);
    } else {
      setCalcDisplay(calcDisplay === '0' ? digit : calcDisplay + digit);
    }
  };

  const calcInputDecimal = () => {
    if (calcWaitingForOperand) {
      setCalcDisplay('0.');
      setCalcWaitingForOperand(false);
    } else if (!calcDisplay.includes('.')) {
      setCalcDisplay(calcDisplay + '.');
    }
  };

  const calcPerformOperation = (nextOperation: string) => {
    const inputValue = parseFloat(calcDisplay);

    if (calcPreviousValue === null) {
      setCalcPreviousValue(inputValue);
    } else if (calcOperation) {
      const currentValue = calcPreviousValue;
      let result = currentValue;

      switch (calcOperation) {
        case '+':
          result = currentValue + inputValue;
          break;
        case '-':
          result = currentValue - inputValue;
          break;
        case '×':
          result = currentValue * inputValue;
          break;
        case '÷':
          result = inputValue !== 0 ? currentValue / inputValue : 0;
          break;
      }

      setCalcDisplay(String(result));
      setCalcPreviousValue(result);
    }

    setCalcWaitingForOperand(true);
    setCalcOperation(nextOperation);
  };

  const calcEquals = () => {
    if (calcOperation === null || calcPreviousValue === null) return;

    const inputValue = parseFloat(calcDisplay);
    let result = calcPreviousValue;

    switch (calcOperation) {
      case '+':
        result = calcPreviousValue + inputValue;
        break;
      case '-':
        result = calcPreviousValue - inputValue;
        break;
      case '×':
        result = calcPreviousValue * inputValue;
        break;
      case '÷':
        result = inputValue !== 0 ? calcPreviousValue / inputValue : 0;
        break;
    }

    setCalcDisplay(String(result));
    setCalcPreviousValue(null);
    setCalcOperation(null);
    setCalcWaitingForOperand(true);
  };

  const calcToggleSign = () => {
    const value = parseFloat(calcDisplay);
    setCalcDisplay(String(value * -1));
  };

  const calcPercent = () => {
    const value = parseFloat(calcDisplay);
    setCalcDisplay(String(value / 100));
  };

  const calcBackspace = () => {
    if (calcDisplay.length > 1) {
      setCalcDisplay(calcDisplay.slice(0, -1));
    } else {
      setCalcDisplay('0');
    }
  };

  // Handle add product in category view
  const handleCategoryAddProduct = async () => {
    if (!catNewProduct.name.trim()) {
      toast({ title: 'Required', description: 'Please enter product name', variant: 'destructive' });
      return;
    }
    if (!catNewProduct.sku.trim()) {
      toast({ title: 'Required', description: 'Please enter SKU', variant: 'destructive' });
      return;
    }
    if (!catNewProduct.price) {
      toast({ title: 'Required', description: 'Please enter price', variant: 'destructive' });
      return;
    }

    const price = parseFloat(catNewProduct.price);
    const cost = parseFloat(catNewProduct.cost) || 0;
    const qty = parseInt(catNewProduct.quantity) || 1;
    const weight = parseFloat(catNewProduct.weight) || undefined;

    if (price <= 0) {
      toast({ title: 'Invalid', description: 'Price must be greater than 0', variant: 'destructive' });
      return;
    }

    // Ensure categories are loaded — fetch inline if not yet available
    let cats = backendCategories;
    if (!cats.find(c => c.name.toLowerCase() === activeCategoryName.toLowerCase())) {
      try {
        cats = await productService.getCategories();
        setBackendCategories(cats);
      } catch {
        toast({ title: 'Category Error', description: 'Failed to load categories. Please try again.', variant: 'destructive' });
        return;
      }
    }

    const categoryMatch = cats.find(
      cat => cat.name.toLowerCase() === activeCategoryName.toLowerCase()
    );

    if (!categoryMatch) {
      toast({ title: 'Category Error', description: `Category "${activeCategoryName}" not found. Please contact support.`, variant: 'destructive' });
      return;
    }

    setIsAddingCatProduct(true);

    try {
      const productData: any = {
        name: catNewProduct.name.trim(),
        sku: catNewProduct.sku.trim(),
        category: categoryMatch.id,
        price,
        cost,
        stock: qty,
        minStockLevel: 1,
        condition: catNewProduct.condition,
      };

      if (catNewProduct.material && catNewProduct.material !== 'NONE') {
        productData.material = catNewProduct.material;
      }
      if (catNewProduct.purity) productData.purity = catNewProduct.purity;
      if (weight) productData.weight = weight;
      if (catNewProduct.description) productData.description = catNewProduct.description;

      const createdProduct = await productService.createProduct(productData);

      // Add to cart
      const cartItem: CartItem = {
        id: createdProduct.id,
        name: createdProduct.name,
        price: createdProduct.price,
        quantity: qty,
        sku: createdProduct.sku,
        image: createdProduct.images?.[0],
      };

      setCart([...cart, cartItem]);

      // Refresh inventory so the new product appears in the list immediately
      await refreshInventory();

      toast({
        title: 'Product Added',
        description: `${catNewProduct.name} saved and added to cart`,
      });

      // Reset form
      setCatNewProduct({
        name: '',
        sku: '',
        price: '',
        cost: '',
        quantity: '1',
        material: 'GOLD',
        purity: '',
        weight: '',
        condition: 'BRAND_NEW',
        description: '',
      });
      setShowCategoryAddForm(false);

    } catch (error: any) {
      console.error('Failed to create product:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create product',
        variant: 'destructive',
      });
    } finally {
      setIsAddingCatProduct(false);
    }
  };

  // Handle back to tiles
  const handleBackToTiles = () => {
    setShowProductGrid(false);
    setSelectedCategory(null);
    setSearchQuery('');
  };

  // Print thermal receipt for a completed sale
  // cartSnapshot is passed for immediate post-sale prints so repair/service items
  // (which are stored as notes in the backend, not as sale_items) appear on the receipt.
  const handlePrintReceipt = async (sale: Sale, cartSnapshot?: CartItem[]) => {
    const cashMatch = sale.notes?.match(/Cash received: £([\d.]+)/);
    const cashReceived = sale.paymentMethod === 'CASH' && cashMatch
      ? parseFloat(cashMatch[1]) || undefined
      : undefined;
    const change = cashReceived ? cashReceived - sale.totalAmount : undefined;

    await printThermalReceipt(
      {
        storeName: settings.general.storeName,
        tradingName: settings.general.tradingName,
        storeAddress: settings.general.address,
        storePhone: settings.general.phone,
        storeEmail: settings.general.email,
        vatNumber: settings.printer.vatNumber,
        tillNumber: currentOutlet?.code ?? '01',
        receiptNumber: (sale as any).saleNumber ?? sale.receiptNumber ?? 'N/A',
        date: sale.createdAt,
        cashierName: sale.cashierName || auth.user?.name || 'Staff',
        customerName: sale.customerName || undefined,
        items: (() => {
          // Prefer API response items (have DB-confirmed names/SKUs).
          // Fall back to cart snapshot so repair/service items — stored as notes,
          // not as sale_items — still appear on the printed receipt.
          const apiItems = sale.items || [];
          if (apiItems.length > 0) {
            return apiItems.map((item: any) => ({
              name: item.productName || item.name ||
                (item.notes?.startsWith('REPAIR SERVICE:') ? item.notes.replace('REPAIR SERVICE: ', '') : 'Item'),
              sku: item.productSku || item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice ?? 0,
              discount: item.discountAmount ?? item.discount ?? 0,
              total: item.totalPrice ?? item.total ?? 0,
              isRepair: item.isRepair,
            }));
          }
          return (cartSnapshot || []).map((item) => ({
            name: item.name,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.price,
            discount: 0,
            total: item.price * item.quantity,
            isRepair: item.isRepair,
          }));
        })(),
        subtotal: sale.subtotal,
        discountAmount: sale.discountAmount,
        taxAmount: sale.taxAmount,
        taxRate: settings.general.taxRate,
        totalAmount: sale.totalAmount,
        paymentMethod: sale.paymentMethod,
        cashReceived,
        change,
        footerMessage: settings.printer.footerText || 'Thank you for shopping\nKEEP THIS RECEIPT AS PROOF OF PURCHASE',
      },
      {
        model: settings.printer.model,
        copies: settings.printer.copies,
      },
      settings.printer.printerName || undefined,
    );
  };

  // Manual drawer open via PIN (for non-sale drawer access)
  const handleDrawerPinSubmit = async () => {
    const pin = settings.printer.drawerPin;
    if (!pin) {
      setDrawerPinError('Drawer PIN not set. Ask the store owner to configure one in Settings → Printer.');
      return;
    }
    if (drawerPinInput !== pin) {
      setDrawerPinError('Incorrect PIN. Try again.');
      setDrawerPinInput('');
      drawerPinRef.current?.focus();
      return;
    }
    if (!settings.printer.printerName) {
      setDrawerPinError('No printer configured.');
      return;
    }
    setOpeningDrawer(true);
    try {
      const { openCashDrawer } = await import('../../utils/qzBridge');
      await openCashDrawer(settings.printer.printerName, settings.printer.model, 'manual');
      setShowDrawerPinDialog(false);
      setDrawerPinInput('');
      setDrawerPinError('');
      toast({ title: 'Cash drawer opened' });
    } catch (e: any) {
      setDrawerPinError(e?.message ?? 'Failed to open drawer');
    } finally {
      setOpeningDrawer(false);
    }
  };

  // Close the post-sale screen and start a new sale
  const handleNewSale = () => {
    setCompletedSale(null);
    setShowPaymentDialog(false);
    setChangeGiven(0);
    setCashAmount('');
    setSplitCashAmount('');
    setMonthlyDepositAmount('0');
    setSelectedPaymentMethod('CASH');
  };

  // Monthly Account — search customers (monthly payers first) by name/phone
  const handleMonthlySearch = async (query: string) => {
    setMonthlySearch(query);
    if (!query.trim()) { setMonthlyResults([]); return; }
    setMonthlySearching(true);
    try {
      const { customerService } = await import('@/services/customerService');
      const result = await customerService.getCustomers(query, 1, 20) as any;
      const customers = result.data || result;
      // Monthly payers first, then others
      const sorted = [...customers].sort((a: any, b: any) =>
        (b.isMonthlyPayer ? 1 : 0) - (a.isMonthlyPayer ? 1 : 0)
      );
      setMonthlyResults(sorted);
    } catch {
      setMonthlyResults([]);
    } finally {
      setMonthlySearching(false);
    }
  };

  const handleSelectMonthlyCustomer = (customer: any) => {
    setSelectedCustomer({
      id: customer.id,
      name: customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim(),
      phone: customer.phone || '',
      email: customer.email || '',
    });
    setShowMonthlyDialog(false);
    setMonthlySearch('');
    setMonthlyResults([]);
    // Default to INSTALLMENT for monthly payers
    if (customer.isMonthlyPayer) {
      setSelectedPaymentMethod('CARD'); // owner can change — INSTALLMENT not in UI type yet
    }
    toast({
      title: 'Customer loaded',
      description: `${customer.name || `${customer.firstName} ${customer.lastName}`} selected. Add their items then complete payment.`,
    });
  };

  // Checkout - Open payment dialog
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', variant: 'destructive' });
      return;
    }
    setShowPaymentDialog(true);
    setCashAmount(total.toFixed(2));
  };

  const parkTransaction = (type: 'hold' | 'suspend') => {
    if (cart.length === 0) {
      toast({ title: 'Cart is empty', variant: 'destructive' });
      return;
    }
    const label = selectedCustomer?.name || `Sale ${new Date().toLocaleTimeString()}`;
    const entry = {
      id: Date.now().toString(),
      label,
      items: cart,
      customer: selectedCustomer,
      discountPercentage,
      timestamp: new Date().toISOString(),
      type,
    };
    const updated = [...heldTransactions, entry];
    setHeldTransactions(updated);
    localStorage.setItem('mps_held_transactions', JSON.stringify(updated));
    handleNewSale();
    toast({
      title: type === 'hold' ? 'Transaction held' : 'Transaction suspended',
      description: `"${label}" parked — recall it from the ${type === 'hold' ? 'Hold' : 'Suspended'} list`,
    });
  };

  const recallTransaction = (id: string) => {
    const entry = heldTransactions.find(h => h.id === id);
    if (!entry) return;
    if (cart.length > 0) {
      toast({ title: 'Clear cart first', description: 'Complete or hold the current sale before recalling', variant: 'destructive' });
      return;
    }
    setCart(entry.items);
    setSelectedCustomer(entry.customer);
    setDiscountPercentage(entry.discountPercentage);
    const updated = heldTransactions.filter(h => h.id !== id);
    setHeldTransactions(updated);
    localStorage.setItem('mps_held_transactions', JSON.stringify(updated));
    setShowHeldDialog(false);
    toast({ title: 'Transaction recalled', description: `"${entry.label}" restored to cart` });
  };

  const deleteHeld = (id: string) => {
    const updated = heldTransactions.filter(h => h.id !== id);
    setHeldTransactions(updated);
    localStorage.setItem('mps_held_transactions', JSON.stringify(updated));
  };

  // Process payment
  const handleProcessPayment = async () => {
    setProcessingPayment(true);

    try {
      // Validate payment amounts and calculate change
      let change = 0;
      let splitCash = 0;
      let splitCard = 0;

      if (selectedPaymentMethod === 'CASH') {
        const cash = parseFloat(cashAmount) || 0;
        if (cash < total) {
          toast({
            title: 'Insufficient amount',
            description: `Please enter at least £${total.toFixed(2)}`,
            variant: 'destructive'
          });
          setProcessingPayment(false);
          return;
        }
        change = cash - total;
      } else if (selectedPaymentMethod === 'SPLIT') {
        splitCash = parseFloat(splitCashAmount) || 0;
        splitCard = parseFloat((total - splitCash).toFixed(2));
        if (splitCash <= 0 || splitCard <= 0) {
          toast({
            title: 'Invalid split amount',
            description: 'Cash and card portions must both be greater than £0',
            variant: 'destructive'
          });
          setProcessingPayment(false);
          return;
        }
        if (splitCash >= total) {
          toast({
            title: 'Invalid split amount',
            description: 'Cash portion must be less than the total — use Cash payment instead',
            variant: 'destructive'
          });
          setProcessingPayment(false);
          return;
        }
      } else if (selectedPaymentMethod === 'INSTALLMENT') {
        if (!selectedCustomer) {
          toast({
            title: 'Customer required',
            description: 'Select a customer before using Monthly Account payment',
            variant: 'destructive'
          });
          setProcessingPayment(false);
          return;
        }
      }

      // Separate products and repairs
      const productItems = cart.filter(item => !item.isRepair);
      const repairItems = cart.filter(item => item.isRepair);

      // Check if cart has any items
      if (productItems.length === 0 && repairItems.length === 0) {
        toast({
          title: 'Cart is empty',
          description: 'Please add items to cart',
          variant: 'destructive'
        });
        setProcessingPayment(false);
        return;
      }

      // Check stock availability before hitting the API
      const outOfStockItems = productItems.filter(item => item.stock !== undefined && item.stock < item.quantity);
      if (outOfStockItems.length > 0) {
        toast({
          title: 'Insufficient Stock',
          description: outOfStockItems.map(i => `"${i.name}" has only ${i.stock ?? 0} in stock`).join(', '),
          variant: 'destructive'
        });
        setProcessingPayment(false);
        return;
      }

      // Prepare all sale items (products + repairs)
      const saleItems = [];

      // Add regular products (and in-session service items that have no DB product ID)
      for (const item of productItems) {
        const isServiceItem = item.sku?.startsWith('SERVICE-') || item.id?.startsWith('battery-') || item.id?.startsWith('cleaning-');
        saleItems.push({
          productId: item.id,
          quantity: item.quantity,
          unitPrice: item.price,
          discountAmount: 0,
          taxRate: 0,
          // Service items use the same "REPAIR SERVICE" marker so backend skips product DB lookup
          notes: isServiceItem ? `REPAIR SERVICE: ${item.name}` : undefined,
        });
      }

      // Add repair items with special marker for backend
      // Backend will skip product validation for items with "REPAIR SERVICE" in notes
      for (const item of repairItems) {
        if (item.repairId) {
          saleItems.push({
            productId: item.repairId, // Use repair ID (backend won't validate it)
            quantity: 1,
            unitPrice: item.price,
            discountAmount: 0,
            taxRate: 0, // No VAT - prices already include VAT
            notes: `REPAIR SERVICE: ${item.name}`, // This marker tells backend to skip validation
          });
        }
      }

      // Prepare sale note
      const saleNote = repairItems.length > 0 && productItems.length > 0
        ? `Quick Mode POS: ${productItems.length} product(s), ${repairItems.length} repair(s)`
        : repairItems.length > 0
        ? `Quick Mode POS: Repair payment - ${repairItems.map(r => r.name).join(', ')}`
        : 'Quick Mode POS Sale';

      // Build payments array — split sends two entries, everything else sends one
      const paymentsPayload: CreateSaleData['payments'] =
        selectedPaymentMethod === 'SPLIT'
          ? [
              { method: 'CASH', amount: splitCash, notes: `Split payment: £${splitCash.toFixed(2)} cash` },
              { method: 'CARD', amount: splitCard, notes: `Split payment: £${splitCard.toFixed(2)} card` },
            ]
          : selectedPaymentMethod === 'INSTALLMENT'
          ? (() => {
              const deposit = parseFloat(monthlyDepositAmount) || 0;
              const remaining = parseFloat((total - deposit).toFixed(2));
              if (deposit > 0) {
                return [
                  { method: 'CASH' as const, amount: deposit, notes: `Initial deposit for monthly account` },
                  { method: 'INSTALLMENT' as const, amount: remaining, notes: `Monthly account balance for ${selectedCustomer?.name}` },
                ];
              }
              return [{ method: 'INSTALLMENT' as const, amount: total, notes: `Monthly account charge for ${selectedCustomer?.name}` }];
            })()
          : [{
              method: selectedPaymentMethod as 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'DIGITAL_WALLET',
              amount: total,
              notes: selectedPaymentMethod === 'CASH' && change > 0
                ? `Cash received: £${parseFloat(cashAmount).toFixed(2)}, Change: £${change.toFixed(2)}`
                : undefined,
            }];

      // Append cash-change info to order notes so the receipt printer can parse it
      const deposit = selectedPaymentMethod === 'INSTALLMENT' ? (parseFloat(monthlyDepositAmount) || 0) : 0;
      const finalNote = selectedPaymentMethod === 'CASH' && change > 0
        ? `${saleNote}\nCash received: £${parseFloat(cashAmount).toFixed(2)}, Change: £${change.toFixed(2)}`
        : selectedPaymentMethod === 'INSTALLMENT' && deposit > 0
        ? `${saleNote}\nMonthly account. Deposit paid: £${deposit.toFixed(2)}, Balance: £${(total - deposit).toFixed(2)}`
        : saleNote;

      // Create the sale record for ALL items (products + repairs)
      const saleData: CreateSaleData = {
        customerId: selectedCustomer?.id,
        items: saleItems,
        payments: paymentsPayload,
        discountPercentage: discountPercentage > 0 ? discountPercentage : undefined,
        discountAmount: discount > 0 ? discount : undefined,
        taxRate: 0, // No VAT - prices already include VAT
        notes: finalNote,
      };

      // Create the sale
      const createdSale = await salesService.createSale(saleData);

      // Update repair statuses to COLLECTED (collected/finished)
      if (repairItems.length > 0) {
        for (const repairItem of repairItems) {
          if (repairItem.repairId) {
            try {
              // Update repair status to COLLECTED (payment collected, item picked up)
              await repairService.updateRepairStatus(
                repairItem.repairId,
                'COLLECTED',
                `Item collected. Payment received: £${repairItem.price.toFixed(2)} via ${selectedPaymentMethod}. Receipt: ${createdSale.receiptNumber}`,
                false // Don't send SMS for now
              );
            } catch (error) {
              console.error('Failed to update repair status:', error);
              // Continue - sale is already created
            }
          }
        }
      }

      // Refresh repair list and inventory in background
      if (repairItems.length > 0) {
        fetchRepairs().catch(() => {});
      }
      refreshInventory().catch(() => {});

      // Snapshot cart before clearing — used for receipt so service/repair items appear
      const cartSnapshot = [...cart];

      // Clear cart state
      setCart([]);
      setSelectedCustomer(null);
      setDiscountPercentage(0);
      setCashAmount('');
      setSelectedPaymentMethod('CASH');
      setEditingRepairPrices({});
      localStorage.removeItem('quickPosCart');
      localStorage.removeItem('quickPosCustomer');
      localStorage.removeItem('quickPosDiscount');

      // Show the post-sale receipt screen inside the payment dialog
      setCompletedSale(createdSale);

      // Store change so the post-sale screen can display it from state (not from notes parsing)
      setChangeGiven(change);

      // Open cash drawer BEFORE printing — cashier needs the drawer open to give change
      if ((selectedPaymentMethod === 'CASH' || selectedPaymentMethod === 'SPLIT') && settings.printer.printerName) {
        try {
          const { openCashDrawer } = await import('../../utils/qzBridge');
          await openCashDrawer(settings.printer.printerName, settings.printer.model, 'sale');
        } catch {
          // Non-fatal — drawer may not be connected
        }
      }

      // Print receipt after drawer has opened
      if (settings.printer.printerName) {
        setTimeout(() => handlePrintReceipt(createdSale, cartSnapshot), 200);
      }

    } catch (error: any) {
      console.error('Payment failed:', error);
      toast({
        title: 'Payment Failed',
        description: error?.message || 'Unable to process payment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  return (
    <div className="h-full flex bg-gray-50 gap-6 p-6">
      {/* Left Side - Categories/Products */}
      <div className="flex-1 flex flex-col bg-white rounded-2xl overflow-hidden shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {/* Back Button for Category View or Appraisal View */}
            {(showCategoryView || showAppraisalView) && (
              <Button
                onClick={showAppraisalView ? handleBackFromAppraisalView : handleBackFromCategoryView}
                variant="ghost"
                size="sm"
                className="mr-2 hover:bg-gray-100"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-2xl font-bold text-gray-900">
              {showAppraisalView ? 'Appraisal' : showCategoryView ? activeCategoryName : showRepairView ? 'Repairs' : showProductGrid ? selectedCategory : 'Quick Mode'}
            </h1>
            {showCategoryView && (
              <Badge variant="secondary" className="ml-2 bg-orange-100 text-orange-700">
                {categoryViewProducts.length} items
              </Badge>
            )}
            {showAppraisalView && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">
                Valuation Service
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* Live Gold Rate Widget + Metal Price Calculator */}
            {!showCategoryView && !showAppraisalView && !showRepairView && (
              <div className="flex items-center gap-2">
                <LiveGoldRate
                  compact
                  onPriceUpdate={(price) => {
                    setTradeInGoldPrice(price.toFixed(2));
                  }}
                />
                <button
                  onClick={() => { setMetalCalcType('GOLD'); setMetalCalcKarat('18K'); setMetalCalcGrams(''); setShowMetalCalcDialog(true); fetchSilverPlatinum(); }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-full shadow-lg shadow-black/5 hover:shadow-xl hover:scale-105 transition-all duration-300 text-xs font-medium text-gray-700"
                  title="Metal Price Calculator"
                >
                  <Beaker className="w-3.5 h-3.5 text-violet-600" />
                  <span className="hidden sm:inline">Calculate</span>
                </button>
              </div>
            )}

            <PrinterStatusBadge />

            {/* Manual drawer shortcut — always visible */}
            <button
              onClick={() => { setDrawerPinInput(''); setDrawerPinError(''); setShowDrawerPinDialog(true); }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors text-xs font-medium"
              title="Open cash drawer"
            >
              <Archive className="h-3.5 w-3.5" />
              <Lock className="h-3 w-3" />
            </button>

            {/* Search - hidden in category view and appraisal view */}
            {!showCategoryView && !showAppraisalView && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder={showRepairView ? "Search by RMA, name, phone, or repair item..." : "Search products..."}
                  value={showRepairView ? repairSearchQuery : searchQuery}
                  onChange={(e) => showRepairView ? setRepairSearchQuery(e.target.value) : setSearchQuery(e.target.value)}
                  className="pl-10 w-80 bg-white border-gray-300"
                />
              </div>
            )}
            {/* Add New Button for Category View */}
            {showCategoryView && !showCategoryAddForm && (
              <Button
                onClick={() => setShowCategoryAddForm(true)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New {activeCategoryName.slice(0, -1)}
              </Button>
            )}
            {showProductGrid && !showRepairView && !showCategoryView && (
              <Button
                onClick={handleBackToTiles}
                variant="outline"
                className="hover:bg-gray-100"
              >
                Back to Categories
              </Button>
            )}
            {showRepairView && (
              <Button
                onClick={handleBackFromRepairs}
                variant="outline"
                className="hover:bg-gray-100"
              >
                Back to Categories
              </Button>
            )}

            {/* Exit POS — always visible */}
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 transition-colors text-xs font-medium"
              title="Exit POS / Back to Admin"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Exit POS</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative">
          {/* Apple-like transition overlay - smooth fade with subtle blur */}
          <div
            className={`absolute inset-0 bg-white/95 backdrop-blur-sm z-50 pointer-events-none transition-all ${
              isViewTransitioning ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transitionDuration: '250ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          />

          {showAppraisalView ? (
            /* APPRAISAL VIEW - Modern Apple-like UI */
            <div className="h-full flex flex-col animate-scale-in">
              <div className="flex-1 overflow-y-auto">
                {/* Hero Section */}
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-8 mb-6 text-white">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <FileText className="h-8 w-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">Professional Appraisal</h2>
                      <p className="text-blue-100">Certified jewelry valuation service</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-blue-100 text-xs uppercase tracking-wide">Service Fee</p>
                      <p className="text-2xl font-bold mt-1">£{appraisalData.appraisalFee || '25'}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-blue-100 text-xs uppercase tracking-wide">Purpose</p>
                      <p className="text-lg font-semibold mt-1">{appraisalData.purpose || 'Insurance'}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-blue-100 text-xs uppercase tracking-wide">Est. Value</p>
                      <p className="text-2xl font-bold mt-1">£{appraisalData.estimatedValue || '0'}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                      <p className="text-blue-100 text-xs uppercase tracking-wide">Condition</p>
                      <p className="text-lg font-semibold mt-1">{appraisalData.condition}</p>
                    </div>
                  </div>
                </div>

                {/* Form Sections */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left Column - Item Details */}
                  <div className="space-y-6">
                    {/* Item Information Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Gem className="h-5 w-5 text-blue-600" />
                        Item Information
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-600 text-sm font-medium">Item Type *</Label>
                          <Input
                            placeholder="e.g., Engagement Ring, Necklace, Watch"
                            value={appraisalData.itemType}
                            onChange={e => setAppraisalData({ ...appraisalData, itemType: e.target.value })}
                            className="mt-1.5 bg-gray-50 border-gray-200 rounded-xl focus:bg-white transition-colors"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-600 text-sm font-medium">Material</Label>
                            <Select value={appraisalData.material} onValueChange={v => setAppraisalData({ ...appraisalData, material: v })}>
                              <SelectTrigger className="mt-1.5 bg-gray-50 border-gray-200 rounded-xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GOLD">Gold</SelectItem>
                                <SelectItem value="SILVER">Silver</SelectItem>
                                <SelectItem value="PLATINUM">Platinum</SelectItem>
                                <SelectItem value="PALLADIUM">Palladium</SelectItem>
                                <SelectItem value="WHITE_GOLD">White Gold</SelectItem>
                                <SelectItem value="ROSE_GOLD">Rose Gold</SelectItem>
                                <SelectItem value="MIXED">Mixed Metals</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-gray-600 text-sm font-medium">Purity/Karat</Label>
                            <Input
                              placeholder="e.g., 18K, 24K, 925"
                              value={appraisalData.purity}
                              onChange={e => setAppraisalData({ ...appraisalData, purity: e.target.value })}
                              className="mt-1.5 bg-gray-50 border-gray-200 rounded-xl"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-gray-600 text-sm font-medium">Weight (grams)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={appraisalData.weight}
                              onChange={e => setAppraisalData({ ...appraisalData, weight: e.target.value })}
                              className="mt-1.5 bg-gray-50 border-gray-200 rounded-xl"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-600 text-sm font-medium">Brand/Maker</Label>
                            <Input
                              placeholder="e.g., Tiffany, Cartier"
                              value={appraisalData.brandMaker}
                              onChange={e => setAppraisalData({ ...appraisalData, brandMaker: e.target.value })}
                              className="mt-1.5 bg-gray-50 border-gray-200 rounded-xl"
                            />
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-600 text-sm font-medium">Stones/Gems</Label>
                          <Input
                            placeholder="e.g., 1ct Diamond, Ruby accents"
                            value={appraisalData.stones}
                            onChange={e => setAppraisalData({ ...appraisalData, stones: e.target.value })}
                            className="mt-1.5 bg-gray-50 border-gray-200 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Description Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Description
                      </h3>
                      <Textarea
                        placeholder="Detailed description of the item including any unique features, hallmarks, engravings, or notable characteristics..."
                        value={appraisalData.description}
                        onChange={e => setAppraisalData({ ...appraisalData, description: e.target.value })}
                        className="bg-gray-50 border-gray-200 rounded-xl min-h-[120px] resize-none"
                      />
                    </div>
                  </div>

                  {/* Right Column - Valuation Details */}
                  <div className="space-y-6">
                    {/* Condition & Purpose Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Star className="h-5 w-5 text-blue-600" />
                        Condition & Purpose
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-600 text-sm font-medium mb-3 block">Item Condition</Label>
                          <div className="grid grid-cols-4 gap-2">
                            {(['EXCELLENT', 'GOOD', 'FAIR', 'POOR'] as const).map(cond => (
                              <button
                                key={cond}
                                onClick={() => setAppraisalData({ ...appraisalData, condition: cond })}
                                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                                  appraisalData.condition === cond
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {cond}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <Label className="text-gray-600 text-sm font-medium mb-3 block">Appraisal Purpose</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['INSURANCE', 'RESALE', 'ESTATE', 'DONATION', 'OTHER'] as const).map(purpose => (
                              <button
                                key={purpose}
                                onClick={() => setAppraisalData({ ...appraisalData, purpose: purpose })}
                                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                                  appraisalData.purpose === purpose
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {purpose}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Valuation Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-blue-600" />
                        Valuation
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-600 text-sm font-medium">Estimated Value (£)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={appraisalData.estimatedValue}
                            onChange={e => setAppraisalData({ ...appraisalData, estimatedValue: e.target.value })}
                            className="mt-1.5 bg-gray-50 border-gray-200 rounded-xl text-2xl font-bold h-14"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-600 text-sm font-medium">Appraisal Fee (£)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="25.00"
                            value={appraisalData.appraisalFee}
                            onChange={e => setAppraisalData({ ...appraisalData, appraisalFee: e.target.value })}
                            className="mt-1.5 bg-gray-50 border-gray-200 rounded-xl"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Notes Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Additional Notes
                      </h3>
                      <Textarea
                        placeholder="Any additional notes or observations..."
                        value={appraisalData.notes}
                        onChange={e => setAppraisalData({ ...appraisalData, notes: e.target.value })}
                        className="bg-gray-50 border-gray-200 rounded-xl min-h-[100px] resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="mt-8 flex justify-end gap-4">
                  <Button
                    onClick={handleBackFromAppraisalView}
                    variant="outline"
                    className="px-8 py-3 rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddAppraisalToCart}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200"
                    disabled={isProcessingAppraisal}
                  >
                    {isProcessingAppraisal ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5 mr-2" />
                        Add Appraisal to Cart
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : showCategoryView ? (
            /* CATEGORY VIEW (Rings, etc.) - Apple-like smooth transition */
            <div className="h-full flex flex-col animate-scale-in">
              {/* Add Product Form (Collapsible) */}
              {showCategoryAddForm && (
                <div className="bg-gray-50 border-b border-gray-200 p-5 animate-slide-down">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Add New {activeCategoryName.slice(0, -1)}
                  </h3>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div>
                      <Label className="text-gray-700 text-sm">Name *</Label>
                      <Input
                        placeholder={`e.g., Diamond ${activeCategoryName.slice(0, -1)}`}
                        value={catNewProduct.name}
                        onChange={e => setCatNewProduct({ ...catNewProduct, name: e.target.value })}
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-sm">SKU *</Label>
                      <Input
                        placeholder="e.g., RNG-001"
                        value={catNewProduct.sku}
                        onChange={e => setCatNewProduct({ ...catNewProduct, sku: e.target.value })}
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-sm">Price (£) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={catNewProduct.price}
                        onChange={e => setCatNewProduct({ ...catNewProduct, price: e.target.value })}
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-sm">Cost (£)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={catNewProduct.cost}
                        onChange={e => setCatNewProduct({ ...catNewProduct, cost: e.target.value })}
                        className="mt-1 bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-4 mb-4">
                    <div>
                      <Label className="text-gray-700 text-sm">Material</Label>
                      <Select
                        value={catNewProduct.material}
                        onValueChange={value => setCatNewProduct({ ...catNewProduct, material: value })}
                      >
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GOLD">Gold</SelectItem>
                          <SelectItem value="SILVER">Silver</SelectItem>
                          <SelectItem value="PLATINUM">Platinum</SelectItem>
                          <SelectItem value="DIAMOND">Diamond</SelectItem>
                          <SelectItem value="GEMSTONE">Gemstone</SelectItem>
                          <SelectItem value="STAINLESS_STEEL">Stainless Steel</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-gray-700 text-sm">Purity/Karat</Label>
                      <Input
                        placeholder="e.g., 18K"
                        value={catNewProduct.purity}
                        onChange={e => setCatNewProduct({ ...catNewProduct, purity: e.target.value })}
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-sm">Weight (g)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={catNewProduct.weight}
                        onChange={e => setCatNewProduct({ ...catNewProduct, weight: e.target.value })}
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-sm">Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={catNewProduct.quantity}
                        onChange={e => setCatNewProduct({ ...catNewProduct, quantity: e.target.value })}
                        className="mt-1 bg-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700 text-sm">Condition *</Label>
                      <Select
                        value={catNewProduct.condition}
                        onValueChange={(value: 'BRAND_NEW' | 'USED') =>
                          setCatNewProduct({ ...catNewProduct, condition: value })
                        }
                      >
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BRAND_NEW">Brand New</SelectItem>
                          <SelectItem value="USED">Used / Pre-owned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Label className="text-gray-700 text-sm">Description (Optional)</Label>
                      <Input
                        placeholder="Brief description..."
                        value={catNewProduct.description}
                        onChange={e => setCatNewProduct({ ...catNewProduct, description: e.target.value })}
                        className="mt-1 bg-white"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowCategoryAddForm(false)}
                      className="border-gray-300"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCategoryAddProduct}
                      disabled={isAddingCatProduct}
                      className="bg-orange-600 hover:bg-orange-700 px-8"
                    >
                      {isAddingCatProduct ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Save & Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Filters Bar */}
              <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, SKU..."
                    value={categorySearchQuery}
                    onChange={e => setCategorySearchQuery(e.target.value)}
                    className="pl-10 bg-gray-50 border-gray-200"
                  />
                </div>

                {/* Condition Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Filter:</span>
                  <div className="flex gap-1">
                    {(['all', 'new', 'used'] as const).map(condition => (
                      <Button
                        key={condition}
                        variant={categoryConditionFilter === condition ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCategoryConditionFilter(condition)}
                        className={
                          categoryConditionFilter === condition
                            ? 'bg-gray-900 hover:bg-gray-800 h-8'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50 h-8'
                        }
                      >
                        {condition === 'all' ? 'All' : condition === 'new' ? 'New' : 'Used'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <Select value={categorySortBy} onValueChange={(v: any) => setCategorySortBy(v)}>
                  <SelectTrigger className="w-40 bg-gray-50 border-gray-200 h-9">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Name A-Z</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="newest">Newest First</SelectItem>
                  </SelectContent>
                </Select>

                <span className="text-sm text-gray-500">
                  {categoryViewProducts.length} items
                </span>
              </div>

              {/* Product Grid */}
              <div className="flex-1 overflow-y-auto p-5">
                {paginatedCategoryProducts.length > 0 ? (
                  <div className="grid grid-cols-4 gap-4">
                    {paginatedCategoryProducts.map(product => {
                      const outOfStock = product.quantity <= 0;
                      return (
                      <button
                        key={product.id}
                        onClick={() => !outOfStock && addToCart(product)}
                        disabled={outOfStock}
                        className={`bg-white rounded-xl border overflow-hidden transition-all text-left group ${
                          outOfStock
                            ? 'border-gray-100 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-orange-400 hover:shadow-lg'
                        }`}
                      >
                        {/* Product Image */}
                        <div className="aspect-square bg-gray-100 relative overflow-hidden">
                          {product.imageUrl ? (
                            <img
                              src={normalizeImageUrl(product.imageUrl)}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-12 w-12 text-gray-300" />
                            </div>
                          )}
                          {/* Condition Badge */}
                          {!outOfStock && (
                            <div className="absolute top-2 left-2">
                              <Badge
                                className={
                                  (product as any).condition === 'USED'
                                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                                    : 'bg-green-100 text-green-700 border-green-200'
                                }
                              >
                                {(product as any).condition === 'USED' ? 'Used' : 'New'}
                              </Badge>
                            </div>
                          )}
                          {/* Stock Badge */}
                          <div className="absolute bottom-2 right-2">
                            <Badge variant="secondary" className={outOfStock ? 'bg-red-100 text-red-600 text-xs' : 'bg-white/90 text-gray-600 text-xs'}>
                              {outOfStock ? 'Out of Stock' : `Stock: ${product.quantity}`}
                            </Badge>
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-3">
                          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 mb-1 h-10">
                            {product.name}
                          </h3>
                          <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">
                              £{product.price.toFixed(2)}
                            </span>
                            <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                              <Plus className="h-4 w-4 text-orange-600" />
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                      <Package className="h-10 w-10 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 mb-1">No {activeCategoryName} Found</p>
                    <p className="text-gray-500 text-sm mb-4">
                      {categorySearchQuery
                        ? 'Try adjusting your search or filters'
                        : `No ${activeCategoryName.toLowerCase()} in inventory`}
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        variant="outline"
                        onClick={() => refreshInventory()}
                      >
                        <Loader2 className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                      <Button
                        onClick={() => setShowCategoryAddForm(true)}
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add New {activeCategoryName.slice(0, -1)}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Pagination */}
                {categoryTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryPage(p => Math.max(0, p - 1))}
                      disabled={categoryPage === 0}
                      className="border-gray-200"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {categoryPage + 1} of {categoryTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCategoryPage(p => Math.min(categoryTotalPages - 1, p + 1))}
                      disabled={categoryPage === categoryTotalPages - 1}
                      className="border-gray-200"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : showRepairView ? (
            /* REPAIR VIEW - Apple-like smooth transition */
            <div className="space-y-3 animate-scale-in">
              {loadingRepairs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-gray-600">Loading repairs...</p>
                  </div>
                </div>
              ) : repairs.length > 0 ? (
                <>
                  {repairs.map(repair => (
                    <div
                      key={repair.id}
                      className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-500 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-gray-900 font-semibold text-lg">{repair.itemDescription}</h3>
                            <Badge
                              className={`${
                                repair.status === 'COMPLETED' ? 'bg-green-500' :
                                repair.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                                repair.status === 'READY_FOR_PICKUP' ? 'bg-purple-500' :
                                'bg-gray-500'
                              }`}
                            >
                              {repair.status.replace(/_/g, ' ')}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`${
                                repair.priority === 'URGENT' ? 'border-red-500 text-red-600' :
                                repair.priority === 'HIGH' ? 'border-orange-500 text-orange-600' :
                                repair.priority === 'MEDIUM' ? 'border-yellow-500 text-yellow-600' :
                                'border-green-500 text-green-600'
                              }`}
                            >
                              {repair.priority}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="flex items-center gap-1">
                              <Users className="h-4 w-4" />
                              {repair.customerName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="h-4 w-4" />
                              {repair.repairType}
                            </span>
                            <span>ID: {repair.id.slice(0, 8)}</span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2 line-clamp-2">{repair.problemDescription}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>Received: {new Date(repair.dateReceived).toLocaleDateString()}</span>
                            {repair.estimatedCompletion && (
                              <span>Due: {new Date(repair.estimatedCompletion).toLocaleDateString()}</span>
                            )}
                            {repair.technicianName && (
                              <span>Tech: {repair.technicianName}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-3 ml-6">
                          <div className="text-right">
                            <p className="text-gray-600 text-xs mb-1">Price</p>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-700 font-medium">£</span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={getRepairPrice(repair).toFixed(2)}
                                onChange={(e) => handleRepairPriceChange(repair.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-24 h-9 text-right font-bold text-lg border-gray-300 focus:border-blue-500"
                              />
                            </div>
                            {repair.estimatedCost !== getRepairPrice(repair) && (
                              <p className="text-gray-500 text-xs mt-1">
                                Original: £{repair.estimatedCost.toFixed(2)}
                              </p>
                            )}
                            {repair.actualCost && repair.actualCost !== repair.estimatedCost && (
                              <p className="text-gray-500 text-xs">
                                Actual: £{repair.actualCost.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addRepairToCart(repair)}
                            className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                          >
                            Add to Cart
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {repairHasMore && (
                    <div className="flex justify-center pt-2 pb-4">
                      <Button
                        variant="outline"
                        onClick={() => fetchRepairs(repairPage + 1, repairSearchQuery)}
                        disabled={repairLoadingMore}
                        className="w-full max-w-xs border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600"
                      >
                        {repairLoadingMore ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2" />
                            Loading...
                          </>
                        ) : (
                          'Load More Repairs'
                        )}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Wrench className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-gray-600 text-lg mb-2">No repairs found</p>
                  <p className="text-gray-500 text-sm">
                    {repairSearchQuery ? 'Try a different search term' : 'No active repairs available'}
                  </p>
                </div>
              )}
            </div>
          ) : !showProductGrid ? (
            /* TILE VIEW - Organized POS Grid - Apple-like smooth transition */
            <div className="space-y-6 animate-scale-in">

              {/* ===== ROW 1 & 2: INVENTORY CATEGORIES ===== */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Inventory</p>
                <div className="grid grid-cols-4 gap-3">
                  {/* Rings */}
                  <div
                    onClick={() => handleCategoryViewOpen('Rings')}
                    className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 cursor-pointer hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Gem className="h-7 w-7 text-amber-600 mb-3" />
                    <h3 className="text-gray-900 font-semibold text-base">Rings</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{categoryCountByName['Rings'] ? `${categoryCountByName['Rings']} items` : 'Wedding & Engagement'}</p>
                  </div>

                  {/* Necklaces */}
                  <div
                    onClick={() => handleCategoryViewOpen('Necklaces')}
                    className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 cursor-pointer hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Sparkles className="h-7 w-7 text-amber-600 mb-3" />
                    <h3 className="text-gray-900 font-semibold text-base">Necklaces</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{categoryCountByName['Necklaces'] ? `${categoryCountByName['Necklaces']} items` : 'Chains & Pendants'}</p>
                  </div>

                  {/* Earrings */}
                  <div
                    onClick={() => handleCategoryViewOpen('Earrings')}
                    className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 cursor-pointer hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Crown className="h-7 w-7 text-amber-600 mb-3" />
                    <h3 className="text-gray-900 font-semibold text-base">Earrings</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{categoryCountByName['Earrings'] ? `${categoryCountByName['Earrings']} items` : 'Studs & Hoops'}</p>
                  </div>

                  {/* Bracelets */}
                  <div
                    onClick={() => handleCategoryViewOpen('Bracelets')}
                    className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 cursor-pointer hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Heart className="h-7 w-7 text-amber-600 mb-3" />
                    <h3 className="text-gray-900 font-semibold text-base">Bracelets</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{categoryCountByName['Bracelets'] ? `${categoryCountByName['Bracelets']} items` : 'Bangles & Tennis'}</p>
                  </div>

                  {/* Watches */}
                  <div
                    onClick={() => handleCategoryViewOpen('Watches')}
                    className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 cursor-pointer hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Watch className="h-7 w-7 text-amber-600 mb-3" />
                    <h3 className="text-gray-900 font-semibold text-base">Watches</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{categoryCountByName['Watches'] ? `${categoryCountByName['Watches']} items` : "Men's & Women's"}</p>
                  </div>

                  {/* Chains */}
                  <div
                    onClick={() => handleCategoryViewOpen('Chains')}
                    className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 cursor-pointer hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <ShoppingBag className="h-7 w-7 text-amber-600 mb-3" />
                    <h3 className="text-gray-900 font-semibold text-base">Chains</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{categoryCountByName['Chains'] ? `${categoryCountByName['Chains']} items` : 'Gold & Silver'}</p>
                  </div>

                  {/* Pendants */}
                  <div
                    onClick={() => handleCategoryViewOpen('Pendants')}
                    className="bg-amber-50/60 border border-amber-100 rounded-xl p-5 cursor-pointer hover:border-amber-300 hover:bg-amber-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Award className="h-7 w-7 text-amber-600 mb-3" />
                    <h3 className="text-gray-900 font-semibold text-base">Pendants</h3>
                    <p className="text-gray-400 text-xs mt-0.5">{categoryCountByName['Pendants'] ? `${categoryCountByName['Pendants']} items` : 'Custom & Religious'}</p>
                  </div>

                  {/* Gift Card */}
                  <div
                    onClick={() => {
                      setGiftCardMode('sell');
                      setGiftCardAmount('');
                      setGiftCardCode('');
                      setGiftCardValidation(null);
                      setShowGiftCardDialog(true);
                    }}
                    className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl p-5 cursor-pointer hover:from-pink-400 hover:to-rose-400 hover:shadow-lg hover:scale-[1.02] transition-all"
                  >
                    <GiftCard className="h-7 w-7 text-white mb-3" />
                    <h3 className="text-white font-semibold text-base">Gift Card</h3>
                    <p className="text-pink-100 text-xs mt-0.5">Sell or Redeem</p>
                  </div>
                </div>
              </div>

              {/* ===== CUSTOMERS ROW ===== */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Customers</p>
                <div className="grid grid-cols-1 gap-3">
                  <div
                    onClick={() => { setQuickAddFirstName(''); setQuickAddLastName(''); setQuickAddPhone(''); setQuickAddEmail(''); setQuickAddAddress(''); setQuickAddCity(''); setShowQuickAddCustomer(true); }}
                    className="bg-violet-50/60 border border-violet-100 rounded-xl p-4 cursor-pointer hover:border-violet-300 hover:bg-violet-50 hover:shadow-md hover:scale-[1.02] transition-all flex items-center gap-4"
                  >
                    <UserPlus className="h-7 w-7 text-violet-600 shrink-0" />
                    <div>
                      <h3 className="text-violet-900 font-semibold text-base">Quick Add Customer</h3>
                      <p className="text-violet-500 text-xs mt-0.5">Name &amp; phone — saved to customer database</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== ROW 3: SERVICES ===== */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Services</p>
                <div className="grid grid-cols-4 gap-3">
                  {/* Watch Battery */}
                  <div
                    onClick={() => {
                      setServiceType('battery');
                      setServicePrice('15.00');
                      setShowServicePriceDialog(true);
                    }}
                    className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Battery className="h-7 w-7 text-blue-600 mb-3" />
                    <h3 className="text-blue-900 font-semibold text-base">Watch Battery</h3>
                    <p className="text-blue-500 text-xs mt-0.5">Quick Add</p>
                  </div>

                  {/* Watch Links */}
                  <div
                    onClick={() => {
                      setServiceType('watch-links');
                      setServicePrice('');
                      setShowServicePriceDialog(true);
                    }}
                    className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Watch className="h-7 w-7 text-blue-600 mb-3" />
                    <h3 className="text-blue-900 font-semibold text-base">Watch Links</h3>
                    <p className="text-blue-500 text-xs mt-0.5">Quick Add</p>
                  </div>

                  {/* Spring Bar */}
                  <div
                    onClick={() => {
                      setServiceType('spring-bar');
                      setServicePrice('');
                      setShowServicePriceDialog(true);
                    }}
                    className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Ruler className="h-7 w-7 text-blue-600 mb-3" />
                    <h3 className="text-blue-900 font-semibold text-base">Spring Bar</h3>
                    <p className="text-blue-500 text-xs mt-0.5">Quick Add</p>
                  </div>

                  {/* Watch Straps */}
                  <div
                    onClick={() => {
                      setServiceType('watch-straps');
                      setServicePrice('');
                      setShowServicePriceDialog(true);
                    }}
                    className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Scissors className="h-7 w-7 text-blue-600 mb-3" />
                    <h3 className="text-blue-900 font-semibold text-base">Watch Straps</h3>
                    <p className="text-blue-500 text-xs mt-0.5">Quick Add</p>
                  </div>

                  {/* Repair - list existing */}
                  <div
                    onClick={handleRepairTileClick}
                    className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Wrench className="h-7 w-7 text-blue-600 mb-3" />
                    <h3 className="text-blue-900 font-semibold text-base">Repair</h3>
                    <p className="text-blue-500 text-xs mt-0.5">Job Orders</p>
                  </div>

                  {/* New Repair Job - quick create */}
                  <div
                    onClick={() => setShowNewRepairDialog(true)}
                    className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Wrench className="h-7 w-7 text-blue-600 mb-3" />
                    <h3 className="text-blue-900 font-semibold text-base">New Repair</h3>
                    <p className="text-blue-500 text-xs mt-0.5">Quick Add Job</p>
                  </div>

                  {/* Cleaning */}
                  <div
                    onClick={() => {
                      setServiceType('cleaning');
                      setServicePrice('25.00');
                      setShowServicePriceDialog(true);
                    }}
                    className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Sparkles className="h-7 w-7 text-blue-600 mb-3" />
                    <h3 className="text-blue-900 font-semibold text-base">Cleaning</h3>
                    <p className="text-blue-500 text-xs mt-0.5">Quick Add</p>
                  </div>

                  {/* Appraisal */}
                  <div
                    onClick={handleAppraisalOpen}
                    className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 cursor-pointer hover:border-blue-300 hover:bg-blue-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <FileText className="h-7 w-7 text-blue-600 mb-3" />
                    <h3 className="text-blue-900 font-semibold text-base">Appraisal</h3>
                    <p className="text-blue-500 text-xs mt-0.5">Valuation</p>
                  </div>
                </div>
              </div>

              {/* ===== ROW 4: MONEY & ADMIN ===== */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Money & Admin</p>
                <div className="grid grid-cols-3 gap-3">
                  {/* Trade-In */}
                  <div
                    onClick={() => {
                      setTradeInWeight('');
                      setTradeInMetal('18K');
                      setShowTradeInDialog(true);
                    }}
                    className="bg-green-50/60 border border-green-100 rounded-xl p-5 cursor-pointer hover:border-green-300 hover:bg-green-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Scale className="h-7 w-7 text-green-600 mb-3" />
                    <h3 className="text-green-900 font-semibold text-base">Trade-In</h3>
                    <p className="text-green-500 text-xs mt-0.5">Scrap Gold</p>
                  </div>

                  {/* Calculator */}
                  <div
                    onClick={() => {
                      calcClear();
                      setShowCalculatorDialog(true);
                    }}
                    className="bg-green-50/60 border border-green-100 rounded-xl p-5 cursor-pointer hover:border-green-300 hover:bg-green-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Calculator className="h-7 w-7 text-green-600 mb-3" />
                    <h3 className="text-green-900 font-semibold text-base">Calculator</h3>
                    <p className="text-green-500 text-xs mt-0.5">Quick Math</p>
                  </div>

                  {/* Layaway */}
                  <div
                    onClick={() => {
                      if (cart.length === 0) {
                        // Trigger shake animation and show toast
                        setCartShake(true);
                        setTimeout(() => setCartShake(false), 500);
                        toast({
                          title: 'Cart is Empty',
                          description: 'Add items to cart first before creating a layaway plan.',
                          variant: 'destructive',
                        });
                        return;
                      }
                      // Calculate 20% default deposit
                      const defaultDeposit = (total * 0.20).toFixed(2);
                      setLayawayDeposit(defaultDeposit);
                      setLayawayDuration(3);
                      // Reset customer search states
                      setLayawayCustomerSearch('');
                      setLayawayCustomerResults([]);
                      setShowCustomerDropdown(false);
                      setLayawaySelectedCustomer(selectedCustomer || null);
                      // Pre-fill customer info if customer is already selected in cart
                      setLayawayCustomerName(selectedCustomer?.firstName ? `${selectedCustomer.firstName} ${selectedCustomer.lastName || ''}`.trim() : '');
                      setLayawayCustomerPhone(selectedCustomer?.phone || '');
                      setLayawayCustomerEmail(selectedCustomer?.email || '');
                      setShowLayawayDialog(true);
                    }}
                    className="bg-green-50/60 border border-green-100 rounded-xl p-5 cursor-pointer hover:border-green-300 hover:bg-green-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <Calendar className="h-7 w-7 text-green-600 mb-3" />
                    <h3 className="text-green-900 font-semibold text-base">Layaway</h3>
                    <p className="text-green-500 text-xs mt-0.5">Payment Plan</p>
                  </div>

                  {/* Discount */}
                  <div
                    onClick={() => setShowDiscountDialog(true)}
                    className="bg-green-50/60 border border-green-100 rounded-xl p-5 cursor-pointer hover:border-green-300 hover:bg-green-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <PercentIcon className="h-7 w-7 text-green-600 mb-3" />
                    <h3 className="text-green-900 font-semibold text-base">Discount</h3>
                    <p className="text-green-500 text-xs mt-0.5">Manager Override</p>
                  </div>

                  {/* Manual Entry */}
                  <div
                    onClick={() => {
                      setManualEntryName('');
                      setManualEntryPrice('');
                      setShowManualEntryDialog(true);
                    }}
                    className="bg-green-50/60 border border-green-100 rounded-xl p-5 cursor-pointer hover:border-green-300 hover:bg-green-50 hover:shadow-md hover:scale-[1.02] transition-all"
                  >
                    <PenLine className="h-7 w-7 text-green-600 mb-3" />
                    <h3 className="text-green-900 font-semibold text-base">Manual Entry</h3>
                    <p className="text-green-500 text-xs mt-0.5">Custom Price</p>
                  </div>

                  {/* Monthly Accounts — recall & pay outstanding installment sales */}
                  <div
                    onClick={openAccountsPanel}
                    className="bg-orange-50/60 border border-orange-100 rounded-xl p-5 cursor-pointer hover:border-orange-300 hover:bg-orange-50 hover:shadow-md hover:scale-[1.02] transition-all col-span-1"
                  >
                    <CalendarClock className="h-7 w-7 text-orange-600 mb-3" />
                    <h3 className="text-orange-900 font-semibold text-base">Monthly Accounts</h3>
                    <p className="text-orange-500 text-xs mt-0.5">Outstanding Balances</p>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            /* PRODUCT GRID VIEW - search results across all inventory */
            <div className="animate-scale-in">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">
                {searchQuery ? `${filteredProducts.length} result${filteredProducts.length !== 1 ? 's' : ''} for "${searchQuery}"` : `${filteredProducts.length} products`}
              </p>
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Package className="h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">No products found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {filteredProducts.map(product => {
                    const outOfStock = product.quantity <= 0;
                    return (
                      <button
                        key={product.id}
                        onClick={() => !outOfStock && addToCart(product)}
                        disabled={outOfStock}
                        className={`bg-white border-2 rounded-xl overflow-hidden transition-all text-left group ${
                          outOfStock
                            ? 'border-gray-100 opacity-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-blue-500 hover:shadow-lg'
                        }`}
                      >
                        <div className="aspect-square bg-gray-100 relative">
                          {product.imageUrl ? (
                            <img
                              src={normalizeImageUrl(product.imageUrl)}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                          {outOfStock && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                              <span className="text-xs font-semibold text-red-500 bg-white px-2 py-1 rounded-full border border-red-200">Out of Stock</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-gray-900 font-medium mb-1 line-clamp-2">{product.name}</h3>
                          {product.categoryName && (
                            <p className="text-amber-600 text-xs mb-1">{product.categoryName}</p>
                          )}
                          <p className="text-gray-500 text-xs mb-1">SKU: {product.sku}</p>
                          <p className="text-gray-600 text-sm mb-1">{outOfStock ? 'Out of Stock' : `Stock: ${product.quantity}`}</p>
                          <p className="text-blue-600 font-bold text-lg">£{product.price.toFixed(2)}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart Panel — LEFT in beta layout, RIGHT in default layout */}
      <div className={`flex flex-col bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-white/50 transition-transform w-[420px] ${cartShake ? 'animate-shake' : ''}`}>
        {/* Premium Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
                Shopping Bag
              </h2>
              {cart.length > 0 && (
                <p className="text-slate-500 text-sm mt-0.5">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
              )}
            </div>
            {cart.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCart([])}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 text-xs font-semibold transition-colors border border-red-200"
                  title="Clear cart"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear
                </button>
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cart Items - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-3 scrollbar-thin">
          {cart.length > 0 ? (
            cart.map(item => (
              <div key={item.id} className="group bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/80 rounded-2xl p-4 flex gap-4 hover:shadow-md hover:border-slate-300 transition-all duration-200">
                {/* Product Image */}
                <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl overflow-hidden flex-shrink-0 shadow-inner">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-6 w-6 text-slate-400" />
                    </div>
                  )}
                </div>
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-900 font-semibold text-sm mb-0.5 truncate">{item.name}</h3>
                  <p className="text-slate-500 text-xs mb-2 font-mono">{item.sku}</p>
                  {/* Quantity Controls - iOS Style */}
                  <div className="flex items-center">
                    <div className="inline-flex items-center bg-white rounded-full border border-slate-200 shadow-sm">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-7 w-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-slate-900">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-7 w-7 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
                {/* Price & Remove */}
                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="h-9 w-9 flex items-center justify-center text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                    title="Remove item"
                  >
                    <Trash2 className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                  </button>
                  <p className="text-slate-900 font-bold text-base">£{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))
          ) : (
            /* Empty State - Premium Illustration */
            <div className="flex flex-col items-center justify-center py-16">
              {/* Gradient Shopping Bag Illustration */}
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100 flex items-center justify-center shadow-lg shadow-blue-100">
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="bagGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#6366F1" />
                      </linearGradient>
                    </defs>
                    <path d="M12 16C12 14.8954 12.8954 14 14 14H34C35.1046 14 36 14.8954 36 16V38C36 39.1046 35.1046 40 34 40H14C12.8954 40 12 39.1046 12 38V16Z" fill="url(#bagGradient)" />
                    <path d="M18 14V12C18 8.68629 20.6863 6 24 6C27.3137 6 30 8.68629 30 12V14" stroke="url(#bagGradient)" strokeWidth="3" strokeLinecap="round" fill="none" />
                    <circle cx="20" cy="22" r="2" fill="white" opacity="0.8" />
                    <circle cx="28" cy="22" r="2" fill="white" opacity="0.8" />
                  </svg>
                </div>
                {/* Floating Arrow */}
                <div className="absolute -right-2 -bottom-2 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/40 animate-bounce">
                  <ArrowRight className="h-5 w-5 text-white" />
                </div>
              </div>
              <h3 className="text-slate-900 font-semibold text-lg mb-1">Your bag is empty</h3>
              <p className="text-slate-500 text-sm text-center max-w-[200px]">Add items from the product tiles to get started</p>
            </div>
          )}
        </div>

        {/* Bottom Section - Totals, Customer & Checkout */}
        <div className="px-6 pb-6 pt-2 border-t border-slate-200/80 bg-gradient-to-t from-slate-50/80 to-transparent">
          {/* Totals - Clean Typography */}
          <div className="space-y-2 py-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Subtotal</span>
              <span className="text-slate-900 font-medium tabular-nums">£{subtotal.toFixed(2)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-emerald-600 text-sm flex items-center gap-1">
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-bold">%</span>
                  Discount ({discountPercentage}%)
                  <button
                    onClick={() => { setDiscountPercentage(0); setDiscountValue(''); }}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                    title="Remove discount"
                  >
                    <X size={10} />
                  </button>
                </span>
                <span className="text-emerald-600 font-medium tabular-nums">-£{discount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t border-slate-200">
              <span className="text-slate-900 font-semibold text-lg">Total</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tabular-nums">
                £{total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Customer Selection */}
          {selectedCustomer ? (
            <div
              onClick={() => setIsCustomerDialogOpen(true)}
              className="mb-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl cursor-pointer hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-md">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-emerald-800 text-xs font-medium mb-0.5">Customer</p>
                    <p className="text-slate-900 font-semibold text-sm">{selectedCustomer.name}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsCustomerDialogOpen(true)}
              className="w-full mb-4 p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-slate-500" />
                </div>
                <span className="text-slate-500 text-sm font-medium">Select Customer (Optional)</span>
              </div>
              <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-500 transition-colors" />
            </button>
          )}

          {/* Hold / Suspend buttons */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={() => parkTransaction('hold')}
              disabled={cart.length === 0}
              className="flex-1 h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 border-2 border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <PauseCircle className="h-4 w-4" />
              Hold
            </button>
            <button
              onClick={() => parkTransaction('suspend')}
              disabled={cart.length === 0}
              className="flex-1 h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 border-2 border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Clock className="h-4 w-4" />
              Suspend
            </button>
            {heldTransactions.length > 0 && (
              <button
                onClick={() => setShowHeldDialog(true)}
                className="relative h-10 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 border-2 border-slate-200 text-slate-700 bg-slate-50 hover:bg-slate-100 transition-all"
              >
                <ListOrdered className="h-4 w-4" />
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {heldTransactions.length}
                </span>
              </button>
            )}
          </div>

          {/* Checkout Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`
              relative w-full h-14 mt-2 rounded-2xl font-semibold text-base
              flex items-center justify-center gap-2
              transition-all duration-300 ease-out
              ${cart.length === 0
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/40 hover:shadow-xl hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98]'
              }
            `}
          >
            <ShoppingBag className="h-5 w-5" />
            <span>Checkout Now</span>
            {cart.length > 0 && <Sparkles className="h-4 w-4 ml-1 animate-pulse" />}
          </button>
        </div>
      </div>


      {/* New Repair Job Dialog */}
      <Dialog open={showNewRepairDialog} onOpenChange={setShowNewRepairDialog}>
        <NewRepairJobForm
          onSubmit={handleNewRepairSubmit}
          onCancel={() => setShowNewRepairDialog(false)}
        />
      </Dialog>

      {/* Customer Dialog — single popup with search */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={(open) => { setIsCustomerDialogOpen(open); if (!open) setCustomerSearchQuery(''); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
            <DialogDescription>Search by name, phone or email</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="Search customers..."
                className="pl-10"
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
              {customers
                .filter(c => {
                  const q = customerSearchQuery.toLowerCase();
                  return !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
                })
                .map(customer => (
                  <div
                    key={customer.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center"
                    onClick={() => { setSelectedCustomer(customer); setIsCustomerDialogOpen(false); setCustomerSearchQuery(''); }}
                  >
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.phone}{customer.email ? ` • ${customer.email}` : ''}</p>
                    </div>
                    {customer.redFlag && (
                      <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                        <AlertTriangle size={10} />
                        Flag
                      </Badge>
                    )}
                  </div>
                ))}
              {customers.filter(c => {
                const q = customerSearchQuery.toLowerCase();
                return !q || c.name.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q);
              }).length === 0 && (
                <div className="p-4 text-center text-muted-foreground text-sm">No customers found</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCustomerDialogOpen(false); setCustomerSearchQuery(''); }}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Product Dialog */}
      <Dialog open={showQuickProductDialog} onOpenChange={setShowQuickProductDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Quick Product Import</DialogTitle>
            <DialogDescription>Add product to inventory and cart during checkout</DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Required Fields Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-lg text-gray-900">Required Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quick-name">Product Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="quick-name"
                    placeholder="e.g., Gold Ring"
                    value={quickProductName}
                    onChange={(e) => setQuickProductName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="quick-sku">SKU <span className="text-red-500">*</span></Label>
                  <Input
                    id="quick-sku"
                    placeholder="e.g., GR-001"
                    value={quickProductSku}
                    onChange={(e) => setQuickProductSku(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quick-category">Category <span className="text-red-500">*</span></Label>
                  <Select value={quickProductCategory} onValueChange={setQuickProductCategory}>
                    <SelectTrigger id="quick-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Show backend categories - these have the correct IDs */}
                      {backendCategories.length > 0 ? (
                        backendCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))
                      ) : (
                        /* Fallback to inventory categories if backend not loaded */
                        categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quick-material">Material (Optional)</Label>
                  <Select value={quickProductMaterial} onValueChange={setQuickProductMaterial}>
                    <SelectTrigger id="quick-material">
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">None / Other</SelectItem>
                      <SelectItem value="GOLD">Gold</SelectItem>
                      <SelectItem value="SILVER">Silver</SelectItem>
                      <SelectItem value="PLATINUM">Platinum</SelectItem>
                      <SelectItem value="DIAMOND">Diamond</SelectItem>
                      <SelectItem value="PEARL">Pearl</SelectItem>
                      <SelectItem value="GEMSTONE">Gemstone</SelectItem>
                      <SelectItem value="STAINLESS_STEEL">Stainless Steel</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quick-price">Selling Price (£) <span className="text-red-500">*</span></Label>
                  <Input
                    id="quick-price"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={quickProductPrice}
                    onChange={(e) => setQuickProductPrice(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="quick-quantity">Quantity <span className="text-red-500">*</span></Label>
                  <Input
                    id="quick-quantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={quickProductQuantity}
                    onChange={(e) => setQuickProductQuantity(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold text-lg text-gray-900">Optional Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quick-cost">Cost Price (£)</Label>
                  <Input
                    id="quick-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={quickProductCost}
                    onChange={(e) => setQuickProductCost(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="quick-supplier">Supplier</Label>
                  <Input
                    id="quick-supplier"
                    placeholder="Supplier name"
                    value={quickProductSupplier}
                    onChange={(e) => setQuickProductSupplier(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quick-purity">Purity/Karat</Label>
                  <Input
                    id="quick-purity"
                    placeholder="e.g., 18K, 925"
                    value={quickProductPurity}
                    onChange={(e) => setQuickProductPurity(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="quick-weight">Weight (g)</Label>
                  <Input
                    id="quick-weight"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={quickProductWeight}
                    onChange={(e) => setQuickProductWeight(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="quick-barcode">Barcode</Label>
                  <Input
                    id="quick-barcode"
                    placeholder="Barcode"
                    value={quickProductBarcode}
                    onChange={(e) => setQuickProductBarcode(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="quick-description">Description</Label>
                <Textarea
                  id="quick-description"
                  placeholder="Product description (optional)"
                  value={quickProductDescription}
                  onChange={(e) => setQuickProductDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            {/* Condition Section */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Condition <span className="text-red-500">*</span></Label>
              <RadioGroup value={quickProductCondition} onValueChange={(value: any) => setQuickProductCondition(value)}>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50" onClick={() => setQuickProductCondition('BRAND_NEW')}>
                  <RadioGroupItem value="BRAND_NEW" id="condition-new" />
                  <Label htmlFor="condition-new" className="flex-1 cursor-pointer">
                    <div className="font-medium">Brand New</div>
                    <div className="text-sm text-gray-500">Unused, in original packaging</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3 cursor-pointer hover:bg-gray-50" onClick={() => setQuickProductCondition('USED')}>
                  <RadioGroupItem value="USED" id="condition-used" />
                  <Label htmlFor="condition-used" className="flex-1 cursor-pointer">
                    <div className="font-medium">Used</div>
                    <div className="text-sm text-gray-500">Pre-owned item</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowQuickProductDialog(false);
              }}
              className="flex-1"
              disabled={isAddingQuickProduct}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickProduct}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={isAddingQuickProduct}
            >
              {isAddingQuickProduct ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Add to Cart'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
            <DialogDescription>Choose discount type and enter value</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Discount Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDiscountType('percentage')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  discountType === 'percentage'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <PercentIcon className={`h-6 w-6 mx-auto mb-2 ${
                  discountType === 'percentage' ? 'text-purple-600' : 'text-gray-400'
                }`} />
                <div className={`text-sm font-medium ${
                  discountType === 'percentage' ? 'text-purple-600' : 'text-gray-600'
                }`}>
                  Percentage
                </div>
              </button>

              <button
                onClick={() => setDiscountType('amount')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  discountType === 'amount'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DollarSign className={`h-6 w-6 mx-auto mb-2 ${
                  discountType === 'amount' ? 'text-purple-600' : 'text-gray-400'
                }`} />
                <div className={`text-sm font-medium ${
                  discountType === 'amount' ? 'text-purple-600' : 'text-gray-600'
                }`}>
                  Fixed Amount
                </div>
              </button>
            </div>

            {/* Discount Value Input */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {discountType === 'percentage' ? 'Percentage (%)' : 'Amount (£)'}
              </label>
              <Input
                type="number"
                step={discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
                placeholder={discountType === 'percentage' ? '0' : '0.00'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            </div>

            {/* Current Cart Total */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Cart Total:</span>
                <span className="font-semibold text-gray-900">
                  £{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowDiscountDialog(false);
                setDiscountValue('');
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplyDiscount}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              Apply Discount
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog — for beta layout shows post-sale only; for standard layout shows full payment form */}
      <Dialog open={showPaymentDialog || !!completedSale} onOpenChange={(open) => { if (!open) handleNewSale(); }}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">

          {/* ── POST-SALE SUCCESS SCREEN ── */}
          {completedSale ? (
            <div className="flex flex-col items-center gap-5 py-10 px-8 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Sale Complete</h2>
                <p className="text-sm text-gray-400 mt-1">Receipt #{completedSale.receiptNumber}</p>
              </div>
              {completedSale.paymentMethod === 'CASH' && changeGiven > 0 && (
                <div className="w-full bg-emerald-50 border border-emerald-200 rounded-2xl px-8 py-6">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Change Due</p>
                  <p className="text-6xl font-black text-emerald-700 tracking-tight">£{changeGiven.toFixed(2)}</p>
                </div>
              )}
              <div className="w-full bg-gray-50 rounded-xl px-5 py-4">
                <p className="text-3xl font-bold text-gray-900">£{completedSale.totalAmount.toFixed(2)}</p>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedPaymentMethod === 'SPLIT'
                    ? `Cash £${parseFloat(splitCashAmount || '0').toFixed(2)} + Card £${(completedSale.totalAmount - parseFloat(splitCashAmount || '0')).toFixed(2)}`
                    : completedSale.paymentMethod.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="flex gap-3 w-full">
                <Button onClick={() => handlePrintReceipt(completedSale)} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700">
                  <Printer className="w-4 h-4" />Print Receipt
                </Button>
                <Button variant="outline" onClick={handleNewSale} className="flex-1">New Sale</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* ── HEADER BAND ── */}
              <div className="px-6 py-5 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Checkout</p>
                  <p className="text-white text-3xl font-black mt-0.5">£{total.toFixed(2)}</p>
                  {selectedCustomer && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Users className="h-2.5 w-2.5 text-white" />
                      </div>
                      <span className="text-emerald-400 text-xs font-medium">{selectedCustomer.name}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  {discount > 0 && (
                    <p className="text-emerald-400 text-sm font-medium">-£{discount.toFixed(2)} saved</p>
                  )}
                  <p className="text-slate-400 text-xs mt-1">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_1.5fr]">

                {/* ── LEFT: Order summary ── */}
                <div className="p-5 border-r border-gray-100 space-y-3 bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {cart.map(item => (
                      <div key={item.id} className="flex justify-between text-sm gap-2">
                        <span className="text-gray-600 truncate leading-snug">
                          {item.name}
                          {item.quantity > 1 && <span className="text-gray-400 ml-1">×{item.quantity}</span>}
                        </span>
                        <span className="font-semibold text-gray-900 shrink-0">£{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-2 space-y-1">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Subtotal</span><span>£{subtotal.toFixed(2)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-600">
                        <span>Discount {discountPercentage}%</span><span>-£{discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold pt-1">
                      <span>Total</span><span className="text-slate-900">£{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* ── RIGHT: Payment ── */}
                <div className="p-5 space-y-4">
                  {/* Method pills */}
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Method</p>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { m: 'CASH', label: 'Cash', Icon: Banknote, accent: 'blue' },
                        { m: 'CARD', label: 'Card', Icon: CreditCard, accent: 'blue' },
                        { m: 'BANK_TRANSFER', label: 'Bank Transfer', Icon: Building2, accent: 'blue' },
                        { m: 'DIGITAL_WALLET', label: 'Digital Wallet', Icon: Smartphone, accent: 'blue' },
                      ] as const).map(({ m, label, Icon }) => (
                        <button
                          key={m}
                          onClick={() => setSelectedPaymentMethod(m as any)}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                            selectedPaymentMethod === m
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-200 text-gray-600 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${selectedPaymentMethod === m ? 'text-blue-600' : 'text-gray-500'}`} />
                          {label}
                        </button>
                      ))}
                      <button
                        onClick={() => { setSelectedPaymentMethod('SPLIT'); setSplitCashAmount(''); }}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          selectedPaymentMethod === 'SPLIT'
                            ? 'border-purple-600 bg-purple-50 text-purple-700'
                            : 'border-gray-200 text-gray-600 hover:border-purple-300'
                        }`}
                      >
                        <Shuffle className={`h-4 w-4 shrink-0 ${selectedPaymentMethod === 'SPLIT' ? 'text-purple-600' : 'text-gray-500'}`} />
                        Split Payment
                      </button>
                      <button
                        onClick={() => setSelectedPaymentMethod('INSTALLMENT')}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                          selectedPaymentMethod === 'INSTALLMENT'
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 text-gray-600 hover:border-orange-300'
                        }`}
                      >
                        <CalendarClock className={`h-4 w-4 shrink-0 ${selectedPaymentMethod === 'INSTALLMENT' ? 'text-orange-500' : 'text-gray-500'}`} />
                        Monthly Account
                      </button>
                    </div>
                  </div>

                  {/* ── CASH input ── */}
                  {selectedPaymentMethod === 'CASH' && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cash Received</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {[5, 10, 20, 50, 100].map((d) => (
                          <button key={d} onClick={() => setCashAmount(d.toFixed(2))}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${cashAmount === d.toFixed(2) ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                            £{d}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
                        <Input type="number" step="0.01" min={total} value={cashAmount} onChange={e => setCashAmount(e.target.value)}
                          placeholder={total.toFixed(2)} className="pl-7 text-xl font-bold h-12" autoFocus />
                      </div>
                      {parseFloat(cashAmount) >= total ? (
                        <div className={`rounded-xl p-3 flex justify-between items-center border-2 ${parseFloat(cashAmount) > total ? 'bg-emerald-50 border-emerald-300' : 'bg-gray-50 border-gray-200'}`}>
                          <span className={`text-sm font-semibold ${parseFloat(cashAmount) > total ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {parseFloat(cashAmount) > total ? 'Change Due' : 'Exact'}
                          </span>
                          <span className={`text-2xl font-black ${parseFloat(cashAmount) > total ? 'text-emerald-700' : 'text-gray-400'}`}>
                            £{(parseFloat(cashAmount) - total).toFixed(2)}
                          </span>
                        </div>
                      ) : parseFloat(cashAmount) > 0 ? (
                        <div className="rounded-xl p-3 flex justify-between items-center border-2 bg-red-50 border-red-300">
                          <span className="text-sm font-semibold text-red-600">Short</span>
                          <span className="text-2xl font-black text-red-600">£{(total - parseFloat(cashAmount)).toFixed(2)}</span>
                        </div>
                      ) : null}
                    </div>
                  )}

                  {/* ── SPLIT input ── */}
                  {selectedPaymentMethod === 'SPLIT' && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cash Portion</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {[5, 10, 20, 50].filter(d => d < total).map((d) => (
                          <button key={d} onClick={() => setSplitCashAmount(d.toFixed(2))}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-all ${splitCashAmount === d.toFixed(2) ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-purple-400'}`}>
                            £{d}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
                        <Input type="number" step="0.01" min={0.01} max={total - 0.01} value={splitCashAmount}
                          onChange={e => setSplitCashAmount(e.target.value)} placeholder="0.00"
                          className="pl-7 text-xl font-bold h-12" autoFocus />
                      </div>
                      {parseFloat(splitCashAmount) > 0 && parseFloat(splitCashAmount) < total && (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl p-2.5 text-center border-2 bg-emerald-50 border-emerald-300">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase">Cash</p>
                            <p className="text-xl font-bold text-emerald-700">£{parseFloat(splitCashAmount).toFixed(2)}</p>
                          </div>
                          <div className="rounded-xl p-2.5 text-center border-2 bg-blue-50 border-blue-300">
                            <p className="text-[10px] font-bold text-blue-600 uppercase">Card</p>
                            <p className="text-xl font-bold text-blue-700">£{(total - parseFloat(splitCashAmount)).toFixed(2)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── INSTALLMENT / monthly ── */}
                  {selectedPaymentMethod === 'INSTALLMENT' && (
                    <div className="space-y-2">
                      {!selectedCustomer ? (
                        <div className="rounded-xl p-3 bg-red-50 border border-red-200 text-sm text-red-700 font-medium">
                          ⚠ Select a customer to use Monthly Account
                        </div>
                      ) : (
                        <>
                          <div className="rounded-xl p-3 bg-orange-50 border border-orange-200 text-sm text-orange-800 flex justify-between items-center">
                            <span className="font-semibold">Monthly account</span>
                            <span className="font-bold">{selectedCustomer.name}</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Deposit today (optional)</p>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
                              <Input type="number" step="0.01" min={0} max={total} value={monthlyDepositAmount}
                                onChange={e => setMonthlyDepositAmount(e.target.value)} placeholder="0.00"
                                className="pl-7 text-xl font-bold h-12" />
                            </div>
                          </div>
                          <div className="rounded-xl p-3 bg-orange-50 border border-orange-200 flex justify-between items-center">
                            <span className="text-sm text-orange-700 font-medium">Account balance</span>
                            <span className="font-bold text-orange-800">£{Math.max(0, total - (parseFloat(monthlyDepositAmount) || 0)).toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ── FOOTER ── */}
              <div className="px-5 py-4 border-t bg-white flex gap-3">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)} disabled={processingPayment} className="px-6">
                  Cancel
                </Button>
                <Button onClick={handleProcessPayment} disabled={processingPayment}
                  className="flex-1 h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-xl">
                  {processingPayment ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                  ) : (
                    `Confirm Payment · £${total.toFixed(2)}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== CALCULATOR DIALOG - Apple-like Design ===== */}
      <Dialog open={showCalculatorDialog} onOpenChange={setShowCalculatorDialog}>
        <DialogContent className="sm:max-w-[340px] p-0 bg-black rounded-3xl overflow-hidden border-0 shadow-2xl">
          {/* Calculator Display */}
          <div className="bg-black px-6 pt-8 pb-4">
            <div className="text-right">
              <p className="text-gray-500 text-sm h-6">
                {calcPreviousValue !== null && calcOperation && (
                  <span>{calcPreviousValue} {calcOperation}</span>
                )}
              </p>
              <p
                className="text-white font-light tracking-tight overflow-hidden"
                style={{
                  fontSize: calcDisplay.length > 9 ? '2.5rem' : calcDisplay.length > 6 ? '3rem' : '4rem',
                  lineHeight: '1.1'
                }}
              >
                {calcDisplay.length > 12 ? parseFloat(calcDisplay).toExponential(5) : calcDisplay}
              </p>
            </div>
          </div>

          {/* Calculator Buttons */}
          <div className="bg-black px-3 pb-6">
            <div className="grid grid-cols-4 gap-3">
              {/* Row 1: AC, +/-, %, ÷ */}
              <button
                onClick={calcClear}
                className="h-16 rounded-full bg-gray-400 hover:bg-gray-300 text-black text-2xl font-medium transition-all active:scale-95"
              >
                AC
              </button>
              <button
                onClick={calcToggleSign}
                className="h-16 rounded-full bg-gray-400 hover:bg-gray-300 text-black text-2xl font-medium transition-all active:scale-95"
              >
                +/-
              </button>
              <button
                onClick={calcPercent}
                className="h-16 rounded-full bg-gray-400 hover:bg-gray-300 text-black text-2xl font-medium transition-all active:scale-95"
              >
                %
              </button>
              <button
                onClick={() => calcPerformOperation('÷')}
                className={`h-16 rounded-full text-3xl font-medium transition-all active:scale-95 ${
                  calcOperation === '÷' ? 'bg-white text-orange-500' : 'bg-orange-500 hover:bg-orange-400 text-white'
                }`}
              >
                ÷
              </button>

              {/* Row 2: 7, 8, 9, × */}
              <button
                onClick={() => calcInputDigit('7')}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                7
              </button>
              <button
                onClick={() => calcInputDigit('8')}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                8
              </button>
              <button
                onClick={() => calcInputDigit('9')}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                9
              </button>
              <button
                onClick={() => calcPerformOperation('×')}
                className={`h-16 rounded-full text-3xl font-medium transition-all active:scale-95 ${
                  calcOperation === '×' ? 'bg-white text-orange-500' : 'bg-orange-500 hover:bg-orange-400 text-white'
                }`}
              >
                ×
              </button>

              {/* Row 3: 4, 5, 6, - */}
              <button
                onClick={() => calcInputDigit('4')}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                4
              </button>
              <button
                onClick={() => calcInputDigit('5')}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                5
              </button>
              <button
                onClick={() => calcInputDigit('6')}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                6
              </button>
              <button
                onClick={() => calcPerformOperation('-')}
                className={`h-16 rounded-full text-3xl font-medium transition-all active:scale-95 ${
                  calcOperation === '-' ? 'bg-white text-orange-500' : 'bg-orange-500 hover:bg-orange-400 text-white'
                }`}
              >
                −
              </button>

              {/* Row 4: 1, 2, 3, + */}
              <button
                onClick={() => calcInputDigit('1')}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                1
              </button>
              <button
                onClick={() => calcInputDigit('2')}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                2
              </button>
              <button
                onClick={() => calcInputDigit('3')}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                3
              </button>
              <button
                onClick={() => calcPerformOperation('+')}
                className={`h-16 rounded-full text-3xl font-medium transition-all active:scale-95 ${
                  calcOperation === '+' ? 'bg-white text-orange-500' : 'bg-orange-500 hover:bg-orange-400 text-white'
                }`}
              >
                +
              </button>

              {/* Row 5: 0 (wide), ., = */}
              <button
                onClick={() => calcInputDigit('0')}
                className="h-16 col-span-2 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium text-left pl-7 transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={calcInputDecimal}
                className="h-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-2xl font-medium transition-all active:scale-95"
              >
                .
              </button>
              <button
                onClick={calcEquals}
                className="h-16 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-3xl font-medium transition-all active:scale-95"
              >
                =
              </button>
            </div>

            {/* Copy to Cart Button */}
            <div className="mt-4 px-1">
              <button
                onClick={() => {
                  const value = parseFloat(calcDisplay);
                  if (!isNaN(value) && value > 0) {
                    // Add as custom item to cart
                    const customItem: CartItem = {
                      id: `calc-${Date.now()}`,
                      name: 'Custom Amount',
                      price: value,
                      quantity: 1,
                      sku: 'CUSTOM',
                    };
                    setCart(prev => [...prev, customItem]);
                    toast({
                      title: 'Added to Cart',
                      description: `Custom amount £${value.toFixed(2)} added`,
                    });
                    setShowCalculatorDialog(false);
                  }
                }}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <ShoppingCart className="h-5 w-5" />
                Add £{isNaN(parseFloat(calcDisplay)) ? '0.00' : parseFloat(calcDisplay).toFixed(2)} to Cart
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== TRADE-IN / SCRAP GOLD CALCULATOR DIALOG ===== */}
      <Dialog open={showTradeInDialog} onOpenChange={setShowTradeInDialog}>
        <DialogContent className="sm:max-w-[480px] p-0 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden border-0 shadow-2xl">
          {/* Header with gradient */}
          <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-amber-600 px-6 py-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Scale className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Scrap Gold Calculator</h2>
                <p className="text-amber-100 text-sm">Trade-in value estimator</p>
              </div>
            </div>
          </div>

          {/* Calculator Body */}
          <div className="px-6 py-6 space-y-6">
            {/* Weight Input - Large and Touch-Friendly */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Weight (Grams)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={tradeInWeight}
                  onChange={(e) => setTradeInWeight(e.target.value)}
                  className="w-full h-16 text-3xl font-bold text-center bg-gray-50 border-2 border-gray-200 rounded-2xl focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all outline-none"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-lg">g</span>
              </div>
            </div>

            {/* Metal Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Metal Type & Purity
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['10K', '14K', '18K', '22K'] as const).map((metal) => (
                  <button
                    key={metal}
                    onClick={() => setTradeInMetal(metal)}
                    className={`h-14 rounded-xl font-semibold text-base transition-all border-2 ${
                      tradeInMetal === metal
                        ? `${metalPurityMap[metal].bgColor} ${metalPurityMap[metal].color} scale-105 shadow-lg`
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {metal}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  onClick={() => setTradeInMetal('24K')}
                  className={`h-14 rounded-xl font-semibold text-base transition-all border-2 ${
                    tradeInMetal === '24K'
                      ? `${metalPurityMap['24K'].bgColor} ${metalPurityMap['24K'].color} scale-105 shadow-lg`
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  24K Pure
                </button>
                <button
                  onClick={() => setTradeInMetal('PLATINUM')}
                  className={`h-14 rounded-xl font-semibold text-base transition-all border-2 ${
                    tradeInMetal === 'PLATINUM'
                      ? `${metalPurityMap['PLATINUM'].bgColor} ${metalPurityMap['PLATINUM'].color} scale-105 shadow-lg`
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Platinum
                </button>
                <button
                  onClick={() => setTradeInMetal('SILVER')}
                  className={`h-14 rounded-xl font-semibold text-base transition-all border-2 ${
                    tradeInMetal === 'SILVER'
                      ? `${metalPurityMap['SILVER'].bgColor} ${metalPurityMap['SILVER'].color} scale-105 shadow-lg`
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  Silver
                </button>
              </div>
            </div>

            {/* Daily Gold Price Setting */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Daily Gold Price</p>
                  <p className="text-xs text-gray-500">Per gram (adjust as needed)</p>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">£</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={tradeInGoldPrice}
                    onChange={(e) => setTradeInGoldPrice(e.target.value)}
                    className="w-28 h-10 pl-7 pr-3 text-right font-semibold bg-white border border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-100 transition-all outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Purity: {(metalPurityMap[tradeInMetal]?.purity * 100).toFixed(1)}% • Payout: {tradeInPayoutPercent}%
                </p>
              </div>
            </div>

            {/* Total Offer Value - Big and Bold */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 text-center">
              <p className="text-sm font-medium text-green-700 mb-1">Estimated Offer Value</p>
              <p className="text-5xl font-bold text-green-600">
                £{tradeInOfferValue.toFixed(2)}
              </p>
              {parseFloat(tradeInWeight) > 0 && (
                <p className="text-xs text-green-600 mt-2">
                  {tradeInWeight}g × £{parseFloat(tradeInGoldPrice).toFixed(2)} × {(metalPurityMap[tradeInMetal]?.purity * 100).toFixed(1)}% × {tradeInPayoutPercent}%
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setShowTradeInDialog(false)}
                variant="outline"
                className="flex-1 h-14 rounded-xl text-base font-medium border-2"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (tradeInOfferValue > 0) {
                    // Add as store credit (negative price or special item)
                    const creditItem: CartItem = {
                      id: `tradein-${Date.now()}`,
                      name: `Trade-In Credit (${tradeInWeight}g ${tradeInMetal})`,
                      price: -tradeInOfferValue, // Negative to act as credit/discount
                      quantity: 1,
                      sku: 'TRADE-IN-CREDIT',
                    };
                    setCart(prev => [...prev, creditItem]);
                    toast({
                      title: 'Trade-In Added',
                      description: `Store credit of £${tradeInOfferValue.toFixed(2)} applied`,
                    });
                    setShowTradeInDialog(false);
                  } else {
                    toast({
                      title: 'Invalid Amount',
                      description: 'Please enter a valid weight',
                      variant: 'destructive',
                    });
                  }
                }}
                disabled={tradeInOfferValue <= 0}
                className="flex-1 h-14 rounded-xl text-base font-medium bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Coins className="h-5 w-5 mr-2" />
                Add Credit to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== MANUAL ENTRY DIALOG ===== */}
      <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
        <DialogContent className="sm:max-w-[400px] p-0 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden border-0 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-orange-500 to-red-500 px-6 py-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <PenLine className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Manual Entry</h2>
                <p className="text-orange-100 text-sm">Add item without barcode</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-5">
            {/* Item Description */}
            <div>
              <Label className="text-gray-700 text-sm font-medium">Item Description</Label>
              <Input
                placeholder="e.g., Gold Chain 18K"
                value={manualEntryName}
                onChange={(e) => setManualEntryName(e.target.value)}
                className="mt-2 h-12 text-lg rounded-xl"
                autoFocus
              />
            </div>

            {/* Price */}
            <div>
              <Label className="text-gray-700 text-sm font-medium">Price</Label>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl font-medium">£</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={manualEntryPrice}
                  onChange={(e) => setManualEntryPrice(e.target.value)}
                  className="h-16 pl-10 text-3xl font-bold text-center rounded-xl"
                />
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {[10, 25, 50, 100].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setManualEntryPrice(amount.toString())}
                  className="h-11 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-all"
                >
                  £{amount}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setShowManualEntryDialog(false)}
                variant="outline"
                className="flex-1 h-12 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  const price = parseFloat(manualEntryPrice);
                  if (price > 0) {
                    const manualItem: CartItem = {
                      id: `manual-${Date.now()}`,
                      name: manualEntryName.trim() || 'Manual Item',
                      price: price,
                      quantity: 1,
                      sku: 'MANUAL-ENTRY',
                    };
                    setCart(prev => [...prev, manualItem]);
                    toast({
                      title: 'Added to Cart',
                      description: `${manualItem.name} - £${price.toFixed(2)}`,
                    });
                    setShowManualEntryDialog(false);
                  } else {
                    toast({
                      title: 'Invalid Price',
                      description: 'Please enter a valid price',
                      variant: 'destructive',
                    });
                  }
                }}
                disabled={!manualEntryPrice || parseFloat(manualEntryPrice) <= 0}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add to Cart
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== GIFT CARD DIALOG ===== */}
      <Dialog open={showGiftCardDialog} onOpenChange={setShowGiftCardDialog}>
        <DialogContent className="sm:max-w-[420px] p-0 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden border-0 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 px-6 py-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <GiftCard className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Gift Card</h2>
                <p className="text-pink-100 text-sm">Sell or redeem gift cards</p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="px-6 pt-5">
            <div className="bg-gray-100 p-1 rounded-xl flex">
              <button
                onClick={() => { setGiftCardMode('sell'); setGiftCardCode(''); setGiftCardAmount(''); setGiftCardValidation(null); }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                  giftCardMode === 'sell'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sell New Card
              </button>
              <button
                onClick={() => { setGiftCardMode('redeem'); setGiftCardCode(''); setGiftCardAmount(''); setGiftCardValidation(null); }}
                className={`flex-1 py-3 px-4 rounded-lg text-sm font-semibold transition-all ${
                  giftCardMode === 'redeem'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Redeem Card
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {giftCardMode === 'sell' ? (
              <>
                {/* Sell Mode */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">Card Value</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl font-medium">£</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={giftCardAmount}
                      onChange={(e) => setGiftCardAmount(e.target.value)}
                      className="h-16 pl-10 text-3xl font-bold text-center rounded-xl"
                      autoFocus
                    />
                  </div>
                </div>

                {/* Preset Amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {[25, 50, 100, 200].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setGiftCardAmount(amount.toString())}
                      className={`h-12 rounded-xl font-semibold transition-all ${
                        giftCardAmount === amount.toString()
                          ? 'bg-pink-500 text-white shadow-lg'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      }`}
                    >
                      £{amount}
                    </button>
                  ))}
                </div>

                <Button
                  onClick={async () => {
                    const amount = parseFloat(giftCardAmount);
                    if (amount <= 0) return;
                    try {
                      const card = await giftCardService.create({ initialBalance: amount });
                      const giftItem: CartItem = {
                        id: `giftcard-${Date.now()}`,
                        name: `Gift Card ${card.code} - £${amount.toFixed(2)}`,
                        price: amount,
                        quantity: 1,
                        sku: 'GIFT-CARD-SALE',
                      };
                      setCart(prev => [...prev, giftItem]);
                      toast({
                        title: 'Gift Card Created',
                        description: `Code: ${card.code} — £${amount.toFixed(2)}`,
                      });
                      setShowGiftCardDialog(false);
                    } catch {
                      toast({ title: 'Error', description: 'Failed to create gift card', variant: 'destructive' });
                    }
                  }}
                  disabled={!giftCardAmount || parseFloat(giftCardAmount) <= 0}
                  className="w-full h-14 rounded-xl text-base font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white shadow-lg"
                >
                  <GiftCard className="h-5 w-5 mr-2" />
                  Sell Gift Card
                </Button>
              </>
            ) : (
              <>
                {/* Redeem Mode */}
                <div>
                  <Label className="text-gray-700 text-sm font-medium">Gift Card Code</Label>
                  <Input
                    placeholder="Enter card code or scan..."
                    value={giftCardCode}
                    onChange={(e) => {
                      setGiftCardCode(e.target.value.toUpperCase());
                      setGiftCardValidation(null);
                    }}
                    onBlur={async () => {
                      const code = giftCardCode.trim();
                      if (!code) return;
                      setGiftCardValidating(true);
                      try {
                        const result = await giftCardService.validate(code);
                        setGiftCardValidation(result);
                        if (result.valid && result.balance != null) {
                          const cap = Math.min(result.balance, total > 0 ? total : result.balance);
                          setGiftCardAmount(cap.toFixed(2));
                        }
                      } catch {
                        setGiftCardValidation({ valid: false, reason: 'Failed to validate card' });
                      } finally {
                        setGiftCardValidating(false);
                      }
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    className="mt-2 h-14 text-xl font-mono text-center tracking-widest rounded-xl uppercase"
                    autoFocus
                  />
                  {giftCardValidating && (
                    <p className="text-sm text-gray-500 mt-1 text-center">Checking card...</p>
                  )}
                  {!giftCardValidating && giftCardValidation && (
                    giftCardValidation.valid ? (
                      <p className="text-sm text-green-600 mt-1 text-center font-medium">
                        ✓ Valid — Available balance: £{(giftCardValidation.balance ?? 0).toFixed(2)}
                        {giftCardValidation.recipientName ? ` · ${giftCardValidation.recipientName}` : ''}
                      </p>
                    ) : (
                      <p className="text-sm text-red-500 mt-1 text-center">{giftCardValidation.reason}</p>
                    )
                  )}
                </div>

                <div>
                  <Label className="text-gray-700 text-sm font-medium">Amount to Redeem</Label>
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-xl font-medium">£</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={giftCardValidation?.balance ?? undefined}
                      placeholder="0.00"
                      value={giftCardAmount}
                      onChange={(e) => setGiftCardAmount(e.target.value)}
                      className="h-14 pl-10 text-2xl font-bold text-center rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  onClick={async () => {
                    const amount = parseFloat(giftCardAmount);
                    if (!amount || amount <= 0 || !giftCardCode.trim()) return;

                    try {
                      const validation = giftCardValidation?.valid
                        ? giftCardValidation
                        : await giftCardService.validate(giftCardCode.trim());

                      if (!validation.valid) {
                        toast({ title: 'Invalid Gift Card', description: validation.reason, variant: 'destructive' });
                        return;
                      }
                      if ((validation.balance ?? 0) < amount) {
                        toast({
                          title: 'Insufficient Balance',
                          description: `Available: £${(validation.balance ?? 0).toFixed(2)}`,
                          variant: 'destructive',
                        });
                        return;
                      }

                      const result = await giftCardService.redeem(giftCardCode.trim(), amount);
                      const redeemItem: CartItem = {
                        id: `giftcard-redeem-${Date.now()}`,
                        name: `Gift Card (${giftCardCode.trim()})`,
                        price: -amount,
                        quantity: 1,
                        sku: 'GIFT-CARD-REDEEM',
                      };
                      setCart(prev => [...prev, redeemItem]);
                      toast({
                        title: 'Gift Card Applied',
                        description: `£${amount.toFixed(2)} redeemed. Remaining: £${result.remainingBalance.toFixed(2)}`,
                      });
                      setShowGiftCardDialog(false);
                    } catch (e: any) {
                      toast({ title: 'Error', description: e.message || 'Failed to redeem gift card', variant: 'destructive' });
                    }
                  }}
                  disabled={!giftCardValidation?.valid || !giftCardAmount || parseFloat(giftCardAmount) <= 0 || giftCardValidating}
                  className="w-full h-14 rounded-xl text-base font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white shadow-lg"
                >
                  <Check className="h-5 w-5 mr-2" />
                  Apply Credit
                </Button>
              </>
            )}

            <Button
              onClick={() => setShowGiftCardDialog(false)}
              variant="ghost"
              className="w-full h-10 text-gray-500"
            >
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== LAYAWAY DIALOG ===== */}
      <Dialog open={showLayawayDialog} onOpenChange={setShowLayawayDialog}>
        <DialogContent className="sm:max-w-[480px] p-0 bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden border-0 shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-700 to-slate-900 px-6 py-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Calendar className="h-7 w-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Create Layaway Plan</h2>
                <p className="text-slate-300 text-sm">Secure items with a payment plan</p>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {/* ===== THE NUMBERS SECTION ===== */}
            <div className="space-y-5">
              {/* Total Value Display */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Total Value</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">
                      £{total.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-500 text-sm">{cart.length} item{cart.length !== 1 ? 's' : ''}</p>
                    <div className="flex items-center gap-1 mt-1 text-slate-400">
                      <Package className="h-4 w-4" />
                      <span className="text-xs">Reserved</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deposit Input - THE FOCUS */}
              <div>
                <Label className="text-slate-700 text-sm font-semibold flex items-center gap-2">
                  Down Payment
                  <span className="text-xs text-slate-400 font-normal">(Min 20% recommended)</span>
                </Label>
                <div className="relative mt-2">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-2xl font-semibold">£</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={total}
                    placeholder="0.00"
                    value={layawayDeposit}
                    onChange={(e) => setLayawayDeposit(e.target.value)}
                    className="h-20 pl-12 text-4xl font-bold text-center rounded-2xl border-2 border-slate-200 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  />
                </div>
                {/* Quick Percentage Buttons */}
                <div className="flex gap-2 mt-3">
                  {[20, 30, 50].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => setLayawayDeposit((total * pct / 100).toFixed(2))}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        parseFloat(layawayDeposit) === parseFloat((total * pct / 100).toFixed(2))
                          ? 'bg-slate-800 text-white shadow-lg'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Balance Calculation */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 border border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <span className="text-amber-800 font-medium">Balance Due</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-900">
                    £{Math.max(0, total - (parseFloat(layawayDeposit) || 0)).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Plan Duration - iOS Segmented Control */}
              <div>
                <Label className="text-slate-700 text-sm font-semibold">Plan Duration</Label>
                <div className="bg-slate-100 p-1.5 rounded-2xl mt-2 flex">
                  <button
                    onClick={() => setLayawayDuration(3)}
                    className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                      layawayDuration === 3
                        ? 'bg-white shadow-md text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    3 Months
                  </button>
                  <button
                    onClick={() => setLayawayDuration(6)}
                    className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-semibold transition-all ${
                      layawayDuration === 6
                        ? 'bg-white shadow-md text-slate-900'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    6 Months
                  </button>
                </div>
                {/* Monthly Payment Preview */}
                <p className="text-center text-sm text-slate-500 mt-2">
                  ≈ £{((total - (parseFloat(layawayDeposit) || 0)) / layawayDuration).toFixed(2)}/month remaining
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-200" />

            {/* ===== THE CUSTOMER SECTION ===== */}
            <div className="space-y-4">
              <Label className="text-slate-700 text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Customer Information
              </Label>

              {/* Show selected customer from cart OR layaway-selected customer */}
              {(selectedCustomer || layawaySelectedCustomer) ? (
                /* Customer Already Selected */
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-900">
                          {(selectedCustomer || layawaySelectedCustomer)?.firstName} {(selectedCustomer || layawaySelectedCustomer)?.lastName}
                        </p>
                        <p className="text-green-700 text-sm">{(selectedCustomer || layawaySelectedCustomer)?.phone || (selectedCustomer || layawaySelectedCustomer)?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setLayawaySelectedCustomer(null);
                        setLayawayCustomerSearch('');
                        setLayawayCustomerName('');
                        setLayawayCustomerPhone('');
                        setLayawayCustomerEmail('');
                      }}
                      className="text-xs font-semibold text-red-600 bg-red-100 px-3 py-1 rounded-full hover:bg-red-200 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                /* No Customer - Show Search & Input Fields */
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm text-amber-800">Search existing customer or add new</p>
                  </div>

                  {/* Customer Search with Autocomplete */}
                  <div className="relative">
                    <Label className="text-slate-600 text-xs">Search Customer</Label>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Type name or phone to search..."
                        value={layawayCustomerSearch}
                        onChange={(e) => {
                          setLayawayCustomerSearch(e.target.value);
                          // Also update the name field for new customer creation
                          setLayawayCustomerName(e.target.value);
                        }}
                        onFocus={() => {
                          if (layawayCustomerResults.length > 0) {
                            setShowCustomerDropdown(true);
                          }
                        }}
                        className="pl-10 h-12 rounded-xl"
                      />
                      {isSearchingCustomers && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />
                      )}
                    </div>

                    {/* Customer Search Results Dropdown */}
                    {showCustomerDropdown && layawayCustomerResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-xl max-h-48 overflow-y-auto">
                        {layawayCustomerResults.map((customer) => (
                          <button
                            key={customer.id}
                            onClick={() => {
                              setLayawaySelectedCustomer(customer);
                              setLayawayCustomerSearch('');
                              setShowCustomerDropdown(false);
                              setLayawayCustomerName(`${customer.firstName || ''} ${customer.lastName || ''}`.trim());
                              setLayawayCustomerPhone(customer.phone || '');
                              setLayawayCustomerEmail(customer.email || '');
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 border-b border-slate-100 last:border-0"
                          >
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-200 to-slate-300 rounded-lg flex items-center justify-center">
                              <Users className="h-5 w-5 text-slate-600" />
                            </div>
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">
                                {customer.firstName} {customer.lastName}
                              </p>
                              <p className="text-xs text-slate-500">{customer.phone || customer.email}</p>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-slate-300" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Divider with "OR" */}
                  <div className="flex items-center gap-3 py-1">
                    <div className="flex-1 border-t border-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">OR ADD NEW</span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>

                  {/* New Customer Fields */}
                  <div>
                    <Label className="text-slate-600 text-xs">Full Name *</Label>
                    <Input
                      placeholder="Customer name"
                      value={layawayCustomerName}
                      onChange={(e) => {
                        setLayawayCustomerName(e.target.value);
                        setLayawayCustomerSearch(e.target.value);
                      }}
                      className="mt-1 h-12 rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-slate-600 text-xs">Phone Number *</Label>
                      <Input
                        type="tel"
                        placeholder="07xxx xxx xxx"
                        value={layawayCustomerPhone}
                        onChange={(e) => setLayawayCustomerPhone(e.target.value)}
                        className="mt-1 h-11 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-600 text-xs">Email (Optional)</Label>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={layawayCustomerEmail}
                        onChange={(e) => setLayawayCustomerEmail(e.target.value)}
                        className="mt-1 h-11 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                onClick={async () => {
                  // Validate
                  const deposit = parseFloat(layawayDeposit) || 0;
                  if (deposit <= 0) {
                    toast({ title: 'Invalid Deposit', description: 'Please enter a deposit amount', variant: 'destructive' });
                    return;
                  }
                  if (deposit > total) {
                    toast({ title: 'Invalid Deposit', description: 'Deposit cannot exceed total value', variant: 'destructive' });
                    return;
                  }

                  // Check if we have a customer (either from cart, layaway selection, or new entry)
                  const hasExistingCustomer = selectedCustomer || layawaySelectedCustomer;
                  if (!hasExistingCustomer && (!layawayCustomerName.trim() || !layawayCustomerPhone.trim())) {
                    toast({ title: 'Customer Required', description: 'Please enter customer name and phone', variant: 'destructive' });
                    return;
                  }

                  setIsProcessingLayaway(true);

                  try {
                    let finalCustomer = selectedCustomer || layawaySelectedCustomer;

                    // If no existing customer selected, create a new one
                    if (!finalCustomer && layawayCustomerName.trim() && layawayCustomerPhone.trim()) {
                      try {
                        const newCustomer = await customerService.createCustomer({
                          name: layawayCustomerName.trim(),
                          phone: layawayCustomerPhone.trim(),
                          email: layawayCustomerEmail.trim() || undefined,
                          notes: `Created from Layaway - ${new Date().toLocaleDateString('en-GB')}`,
                        });
                        finalCustomer = newCustomer;
                        toast({
                          title: 'Customer Created',
                          description: `${layawayCustomerName} added to customer database`,
                        });
                      } catch (customerError) {
                        console.error('Failed to create customer:', customerError);
                        // Continue with layaway even if customer creation fails
                        toast({
                          title: 'Note',
                          description: 'Customer saved locally for this layaway',
                        });
                      }
                    }

                    // Generate layaway receipt
                    const balanceDue = total - deposit;
                    const monthlyPayment = balanceDue / layawayDuration;
                    const customerName = finalCustomer
                      ? `${finalCustomer.firstName} ${finalCustomer.lastName || ''}`.trim()
                      : layawayCustomerName;
                    const customerPhone = finalCustomer?.phone || layawayCustomerPhone;

                    // Create layaway receipt content
                    const receiptContent = `
═══════════════════════════════════════
           LAYAWAY AGREEMENT
═══════════════════════════════════════
Date: ${new Date().toLocaleDateString('en-GB')}
Time: ${new Date().toLocaleTimeString('en-GB')}
───────────────────────────────────────
CUSTOMER:
${customerName}
${customerPhone}
───────────────────────────────────────
ITEMS RESERVED:
${cart.map(item => `${item.name} x${item.quantity} - £${(item.price * item.quantity).toFixed(2)}`).join('\n')}
───────────────────────────────────────
PLAN DETAILS:
Total Value:        £${total.toFixed(2)}
Deposit Paid:       £${deposit.toFixed(2)}
───────────────────────────────────────
BALANCE DUE:        £${balanceDue.toFixed(2)}
───────────────────────────────────────
Plan Duration:      ${layawayDuration} Months
Monthly Payment:    £${monthlyPayment.toFixed(2)}
───────────────────────────────────────
Due Date: ${new Date(Date.now() + layawayDuration * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB')}

Items will be held until plan is complete.
Deposit is non-refundable.
═══════════════════════════════════════
           Thank you for your business!
═══════════════════════════════════════
                    `.trim();

                    // Print/download receipt
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      printWindow.document.write(`
                        <html>
                          <head>
                            <meta charset="UTF-8"/>
                            <title>Layaway Receipt</title>
                            <style>
                              body { font-family: 'Courier New', monospace; font-size: 12px; padding: 20px; max-width: 300px; margin: 0 auto; }
                              pre { white-space: pre-wrap; word-wrap: break-word; }
                            </style>
                          </head>
                          <body>
                            <pre>${receiptContent}</pre>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                      printWindow.print();
                    }

                    // Clear cart and close dialog
                    setCart([]);
                    setShowLayawayDialog(false);

                    toast({
                      title: 'Layaway Created!',
                      description: `Deposit of £${deposit.toFixed(2)} collected. Balance: £${balanceDue.toFixed(2)}`,
                    });
                  } catch (error) {
                    console.error('Failed to create layaway:', error);
                    toast({ title: 'Error', description: 'Failed to create layaway plan', variant: 'destructive' });
                  } finally {
                    setIsProcessingLayaway(false);
                  }
                }}
                disabled={isProcessingLayaway || (parseFloat(layawayDeposit) || 0) <= 0 || (!(selectedCustomer || layawaySelectedCustomer) && (!layawayCustomerName.trim() || !layawayCustomerPhone.trim()))}
                className="w-full h-14 rounded-xl text-base font-semibold bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white shadow-lg"
              >
                {isProcessingLayaway ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Printer className="h-5 w-5" />
                    <span>Collect Deposit & Start Plan</span>
                  </div>
                )}
              </Button>

              <Button
                onClick={() => setShowLayawayDialog(false)}
                variant="ghost"
                className="w-full h-10 text-slate-500"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Service Price Dialog */}
      {(() => {
        const SERVICE_META: Record<string, { label: string; icon: React.ReactNode; color: string; activeColor: string; sku: string; presets: string[] }> = {
          'battery':      { label: 'Watch Battery',    icon: <Battery className="h-6 w-6 text-white" />,  color: 'from-blue-500 to-blue-600',   activeColor: 'bg-blue-500',   sku: 'SERVICE-BATTERY',      presets: ['10','15','20','25'] },
          'cleaning':     { label: 'Cleaning Service', icon: <Sparkles className="h-6 w-6 text-white" />, color: 'from-amber-500 to-orange-500', activeColor: 'bg-amber-500',  sku: 'SERVICE-CLEANING',     presets: ['15','25','35','50'] },
          'watch-links':  { label: 'Watch Links',      icon: <Watch className="h-6 w-6 text-white" />,    color: 'from-blue-500 to-blue-600',   activeColor: 'bg-blue-500',   sku: 'SERVICE-WATCH-LINKS',  presets: ['5','10','15','20']  },
          'spring-bar':   { label: 'Spring Bar',       icon: <Ruler className="h-6 w-6 text-white" />,    color: 'from-blue-500 to-blue-600',   activeColor: 'bg-blue-500',   sku: 'SERVICE-SPRING-BAR',   presets: ['5','10','15','20']  },
          'watch-straps': { label: 'Watch Straps',     icon: <Scissors className="h-6 w-6 text-white" />, color: 'from-blue-500 to-blue-600',   activeColor: 'bg-blue-500',   sku: 'SERVICE-WATCH-STRAPS', presets: ['10','15','20','25'] },
        };
        const meta = SERVICE_META[serviceType] ?? SERVICE_META['cleaning'];
        return (
        <Dialog open={showServicePriceDialog} onOpenChange={setShowServicePriceDialog}>
          <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl border-0 shadow-2xl">
            {/* Header */}
            <div className={`px-6 py-4 bg-gradient-to-r ${meta.color}`}>
              <div className="flex items-center gap-3">
                {meta.icon}
                <div>
                  <h2 className="text-lg font-semibold text-white">{meta.label}</h2>
                  <p className="text-white/80 text-xs">Set price and add to cart</p>
                </div>
              </div>
            </div>

            {/* Price Input */}
            <div className="p-6">
              <Label className="text-slate-600 text-sm font-medium">Service Price</Label>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">£</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={servicePrice}
                  onChange={(e) => setServicePrice(e.target.value)}
                  className="pl-8 h-14 text-2xl font-bold text-center border-2 border-slate-200 focus:border-blue-500 rounded-xl"
                  placeholder="0.00"
                  autoFocus
                />
              </div>

              {/* Quick Price Buttons */}
              <div className="grid grid-cols-4 gap-2 mt-4">
                {meta.presets.map((price) => (
                  <button
                    key={price}
                    onClick={() => setServicePrice(price + '.00')}
                    className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                      servicePrice === price + '.00'
                        ? `${meta.activeColor} text-white`
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    £{price}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowServicePriceDialog(false)}
                  className="flex-1 h-12 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const price = parseFloat(servicePrice) || 0;
                    if (price <= 0) {
                      toast({ title: 'Invalid Price', description: 'Please enter a valid price', variant: 'destructive' });
                      return;
                    }
                    const serviceItem: CartItem = {
                      id: `${serviceType}-${Date.now()}`,
                      name: meta.label,
                      price,
                      quantity: 1,
                      sku: meta.sku,
                    };
                    setCart(prev => [...prev, serviceItem]);
                    toast({ title: 'Added to Cart', description: `${meta.label} — £${price.toFixed(2)}` });
                    setShowServicePriceDialog(false);
                  }}
                  className={`flex-1 h-12 rounded-xl text-white ${meta.activeColor} hover:opacity-90`}
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        );
      })()}

      {/* ===== CASH DRAWER PIN DIALOG ===== */}
      <Dialog open={showDrawerPinDialog} onOpenChange={(o) => { if (!o) { setShowDrawerPinDialog(false); setDrawerPinInput(''); setDrawerPinError(''); }}}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-600" />
              Open Cash Drawer
            </DialogTitle>
            <DialogDescription>Enter your 4-digit PIN to open the drawer.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <input
              ref={drawerPinRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              autoFocus
              value={drawerPinInput}
              onChange={(e) => { setDrawerPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setDrawerPinError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && drawerPinInput.length === 4) handleDrawerPinSubmit(); }}
              placeholder="• • • •"
              className="w-full text-center text-3xl tracking-[0.5em] border rounded-lg py-3 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            {drawerPinError && <p className="text-sm text-destructive text-center">{drawerPinError}</p>}

            {/* PIN pad */}
            <div className="grid grid-cols-3 gap-2">
              {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k) => (
                <button
                  key={k}
                  disabled={!k || openingDrawer}
                  onClick={() => {
                    if (k === '⌫') { setDrawerPinInput(p => p.slice(0, -1)); }
                    else if (drawerPinInput.length < 4) { setDrawerPinInput(p => p + k); setDrawerPinError(''); }
                  }}
                  className={`py-3 rounded-lg text-lg font-semibold border transition-colors ${k ? 'bg-white hover:bg-gray-50 active:bg-gray-100' : 'invisible'}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDrawerPinDialog(false)}>Cancel</Button>
            <Button
              disabled={drawerPinInput.length !== 4 || openingDrawer}
              onClick={handleDrawerPinSubmit}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {openingDrawer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
              Open Drawer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== HELD / SUSPENDED TRANSACTIONS DIALOG ===== */}
      <Dialog open={showHeldDialog} onOpenChange={setShowHeldDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-amber-500" />
              Parked Transactions
            </DialogTitle>
            <DialogDescription>Recall a held or suspended transaction</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {heldTransactions.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No parked transactions</p>
            ) : (
              heldTransactions.map(h => (
                <div key={h.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${h.type === 'hold' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                        {h.type}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 truncate">{h.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {h.items.length} item{h.items.length !== 1 ? 's' : ''} · {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <Button size="sm" onClick={() => recallTransaction(h.id)} className="h-8 text-xs">Recall</Button>
                    <button onClick={() => deleteHeld(h.id)} className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== MONTHLY ACCOUNTS PANEL (outstanding installment sales) ===== */}
      <Dialog open={showAccountsPanel} onOpenChange={(o) => { if (!o) { setShowAccountsPanel(false); setAccountStep('customers'); setAccountSelectedCustomerId(null); setAccountSelectedSale(null); } }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {accountStep !== 'customers' && (
                  <button onClick={() => {
                    if (accountStep === 'pay') setAccountStep('orders');
                    else { setAccountStep('customers'); setAccountSelectedCustomerId(null); }
                  }} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                    <ChevronRight className="h-4 w-4 text-white rotate-180" />
                  </button>
                )}
                <div>
                  <h2 className="text-white font-bold text-lg">Monthly Accounts</h2>
                  <p className="text-orange-100 text-xs mt-0.5">
                    {accountStep === 'customers' ? 'Select a customer' : accountStep === 'orders' ? 'Select an order' : 'Record payment'}
                  </p>
                </div>
              </div>
              {/* Step indicator */}
              <div className="flex gap-1.5">
                {(['customers', 'orders', 'pay'] as const).map((s, i) => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${accountStep === s ? 'w-6 bg-white' : i < (['customers','orders','pay'] as const).indexOf(accountStep) ? 'w-3 bg-white/60' : 'w-3 bg-white/30'}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {accountsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
              </div>
            ) : (
              <>
              {/* STEP 1: Customer list */}
              {accountStep === 'customers' && (() => {
                // Group sales by customer
                const customerMap: Record<string, { id: string; name: string; sales: Sale[] }> = {};
                for (const s of accountSales) {
                  const cid = s.customerId || '__walkin__';
                  const cname = s.customerName || 'Walk-in';
                  if (!customerMap[cid]) customerMap[cid] = { id: cid, name: cname, sales: [] };
                  customerMap[cid].sales.push(s);
                }
                const customers = Object.values(customerMap).filter(c =>
                  !accountSearch || c.name.toLowerCase().includes(accountSearch.toLowerCase())
                );
                return (
                  <div className="p-4 space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <Input
                        placeholder="Search customer..."
                        className="pl-9"
                        value={accountSearch}
                        onChange={e => setAccountSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {customers.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <CalendarClock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="font-medium">No outstanding monthly accounts</p>
                        <p className="text-xs mt-1">All installment sales are fully paid</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {customers.map(c => {
                          const totalBalance = c.sales.reduce((sum, s) => sum + (s.balanceDue || 0), 0);
                          const orderCount = c.sales.length;
                          return (
                            <button
                              key={c.id}
                              onClick={() => { setAccountSelectedCustomerId(c.id); setAccountStep('orders'); setAccountSearch(''); }}
                              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-transparent bg-gray-50 hover:bg-orange-50 hover:border-orange-200 transition-all text-left group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                  <span className="text-orange-700 font-bold text-sm">{c.name.charAt(0).toUpperCase()}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 group-hover:text-orange-900">{c.name}</p>
                                  <p className="text-xs text-gray-500">{orderCount} outstanding order{orderCount !== 1 ? 's' : ''}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-bold text-orange-600 text-lg">£{totalBalance.toFixed(2)}</p>
                                <p className="text-xs text-gray-400">total balance</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* STEP 2: Orders for selected customer */}
              {accountStep === 'orders' && (() => {
                const orders = accountSales.filter(s => (s.customerId || '__walkin__') === accountSelectedCustomerId);
                return (
                  <div className="p-4 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Outstanding Orders</p>
                    <div className="space-y-2">
                      {orders.map(s => {
                        const balance = s.balanceDue || 0;
                        const paid = s.paidAmount || 0;
                        const total = s.totalAmount;
                        const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
                        return (
                          <button
                            key={s.id}
                            onClick={() => { setAccountSelectedSale(s); setAccountPayAmount(balance.toFixed(2)); setAccountStep('pay'); }}
                            className="w-full p-4 rounded-xl border-2 border-transparent bg-gray-50 hover:bg-orange-50 hover:border-orange-200 transition-all text-left group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-semibold text-gray-900 group-hover:text-orange-900">{s.saleNumber || s.id.slice(-8)}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{new Date(s.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-orange-600">£{balance.toFixed(2)}</p>
                                <p className="text-xs text-gray-400">balance</p>
                              </div>
                            </div>
                            {/* Items */}
                            <p className="text-xs text-gray-500 mb-2 truncate">{(s.items || []).map(i => i.productName || 'Item').join(', ') || 'No items'}</p>
                            {/* Progress bar */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-400">
                                <span>Paid £{paid.toFixed(2)} of £{total.toFixed(2)}</span>
                                <span>{paidPct}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                                <div className="h-full rounded-full bg-orange-400 transition-all" style={{ width: `${paidPct}%` }} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* STEP 3: Record payment */}
              {accountStep === 'pay' && accountSelectedSale && (() => {
                const balance = accountSelectedSale.balanceDue || 0;
                const paid = accountSelectedSale.paidAmount || 0;
                const total = accountSelectedSale.totalAmount;
                const payAmt = parseFloat(accountPayAmount) || 0;
                const remaining = Math.max(0, balance - payAmt);
                return (
                  <div className="p-4 space-y-4">
                    {/* Order summary */}
                    <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Order</span>
                        <span className="font-medium">{accountSelectedSale.saleNumber || accountSelectedSale.id.slice(-8)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Customer</span>
                        <span className="font-medium">{accountSelectedSale.customerName}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Order total</span>
                        <span className="font-medium">£{total.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Already paid</span>
                        <span className="font-medium text-green-700">£{paid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-1">
                        <span className="text-gray-900">Outstanding balance</span>
                        <span className="text-orange-600">£{balance.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Payment amount */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Payment amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-lg">£</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0.01}
                          max={balance}
                          value={accountPayAmount}
                          onChange={e => setAccountPayAmount(e.target.value)}
                          className="pl-9 text-2xl font-bold h-14"
                          autoFocus
                        />
                      </div>
                      <div className="flex gap-2">
                        {[balance / 2, balance].map(amt => (
                          <button
                            key={amt}
                            onClick={() => setAccountPayAmount(amt.toFixed(2))}
                            className="flex-1 py-2 rounded-lg border border-orange-200 text-orange-700 text-sm font-medium hover:bg-orange-50 transition-colors"
                          >
                            £{amt.toFixed(2)} {amt === balance ? '(full)' : '(half)'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment method */}
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Payment method</label>
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { method: 'CASH' as const, label: 'Cash', icon: Banknote },
                          { method: 'CARD' as const, label: 'Card', icon: CreditCard },
                          { method: 'BANK_TRANSFER' as const, label: 'Bank', icon: Building2 },
                        ]).map(({ method, label, icon: Icon }) => (
                          <button
                            key={method}
                            onClick={() => setAccountPayMethod(method)}
                            className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                              accountPayMethod === method
                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                : 'border-gray-200 text-gray-600 hover:border-orange-300'
                            }`}
                          >
                            <Icon className={`h-5 w-5 ${accountPayMethod === method ? 'text-orange-600' : 'text-gray-500'}`} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* After payment summary */}
                    {payAmt > 0 && payAmt <= balance && (
                      <div className={`rounded-xl p-3 border-2 ${remaining === 0 ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}`}>
                        <div className="flex justify-between text-sm font-medium">
                          <span className={remaining === 0 ? 'text-green-700' : 'text-orange-700'}>Remaining after payment</span>
                          <span className={`font-bold ${remaining === 0 ? 'text-green-800' : 'text-orange-800'}`}>
                            {remaining === 0 ? '✓ Fully paid' : `£${remaining.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              </>
            )}
          </div>

          {/* Footer action */}
          {accountStep === 'pay' && (
            <div className="px-4 pb-4 pt-3 border-t bg-white">
              <Button
                onClick={handleAccountPayment}
                disabled={processingAccountPayment || !accountPayAmount || parseFloat(accountPayAmount) <= 0}
                className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base rounded-xl"
              >
                {processingAccountPayment ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                ) : (
                  `Confirm Payment — £${parseFloat(accountPayAmount || '0').toFixed(2)}`
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== MONTHLY ACCOUNT DIALOG ===== */}
      <Dialog open={showMonthlyDialog} onOpenChange={(o) => { if (!o) { setShowMonthlyDialog(false); setMonthlySearch(''); setMonthlyResults([]); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-purple-600" />
              Monthly Account
            </DialogTitle>
            <DialogDescription>Search customer by name or phone number to load their account.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Name or phone number..."
                value={monthlySearch}
                onChange={(e) => handleMonthlySearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>

            {monthlySearching && (
              <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}

            {!monthlySearching && monthlyResults.length > 0 && (
              <div className="divide-y rounded-lg border overflow-hidden max-h-72 overflow-y-auto">
                {monthlyResults.map((customer: any) => {
                  const name = customer.name || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                  return (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectMonthlyCustomer(customer)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">{name}</span>
                          {customer.isMonthlyPayer && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full shrink-0">Monthly</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">{customer.phone}</div>
                        {(customer.outstandingBalance > 0) && (
                          <div className="text-sm text-orange-600 font-medium">
                            Outstanding: £{Number(customer.outstandingBalance).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}

            {!monthlySearching && monthlySearch.trim() && monthlyResults.length === 0 && (
              <p className="text-center text-sm text-gray-500 py-4">No customers found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== QUICK ADD CUSTOMER DIALOG ===== */}
      <Dialog open={showQuickAddCustomer} onOpenChange={setShowQuickAddCustomer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg">Quick Add Customer</DialogTitle>
                <DialogDescription className="text-sm">Required: name and phone. Everything else is optional.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-700 text-xs font-semibold">First Name <span className="text-red-500">*</span></Label>
                <Input
                  autoFocus
                  placeholder="John"
                  value={quickAddFirstName}
                  onChange={(e) => setQuickAddFirstName(e.target.value)}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
              <div>
                <Label className="text-slate-700 text-xs font-semibold">Last Name</Label>
                <Input
                  placeholder="Smith"
                  value={quickAddLastName}
                  onChange={(e) => setQuickAddLastName(e.target.value)}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <Label className="text-slate-700 text-xs font-semibold">Phone Number <span className="text-red-500">*</span></Label>
              <Input
                type="tel"
                placeholder="07xxx xxx xxx"
                value={quickAddPhone}
                onChange={(e) => setQuickAddPhone(e.target.value)}
                className="mt-1 h-11 rounded-xl"
              />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-3">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Optional Details</p>

              {/* Email */}
              <div>
                <Label className="text-slate-600 text-xs">Email</Label>
                <Input
                  type="email"
                  placeholder="john@example.com"
                  value={quickAddEmail}
                  onChange={(e) => setQuickAddEmail(e.target.value)}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>

              {/* Address */}
              <div>
                <Label className="text-slate-600 text-xs">Address</Label>
                <Input
                  placeholder="123 High Street"
                  value={quickAddAddress}
                  onChange={(e) => setQuickAddAddress(e.target.value)}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>

              {/* City */}
              <div>
                <Label className="text-slate-600 text-xs">City</Label>
                <Input
                  placeholder="London"
                  value={quickAddCity}
                  onChange={(e) => setQuickAddCity(e.target.value)}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowQuickAddCustomer(false)}>Cancel</Button>
            <Button
              onClick={handleQuickAddCustomer}
              disabled={!quickAddFirstName.trim() || !quickAddPhone.trim() || isCreatingQuickCustomer}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isCreatingQuickCustomer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== METAL PRICE CALCULATOR DIALOG ===== */}
      <Dialog open={showMetalCalcDialog} onOpenChange={setShowMetalCalcDialog}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl">
          {/* Header */}
          <div className="px-6 py-5 bg-gradient-to-br from-violet-600 to-purple-700 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Beaker className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold">Metal Price Calculator</h2>
                <p className="text-violet-200 text-xs">Calculate value by weight</p>
              </div>
              <button
                onClick={() => {
                  const m = settings.metals ?? { goldMarginPercent: 0, silverMarginPercent: 0, platinumMarginPercent: 0 };
                  setMarginGold(String(m.goldMarginPercent));
                  setMarginSilver(String(m.silverMarginPercent));
                  setMarginPlatinum(String(m.platinumMarginPercent));
                  setShowMarginEditor(v => !v);
                }}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center transition-all"
                title="Set margins"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
              </button>
            </div>

            {/* Margin editor panel */}
            {showMarginEditor && (
              <div className="bg-white/15 rounded-2xl p-4 mb-4 space-y-3">
                <p className="text-xs font-semibold text-white/80 uppercase tracking-wide">Markup / Margin Settings</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: '🥇 Gold', value: marginGold, set: setMarginGold },
                    { label: '🥈 Silver', value: marginSilver, set: setMarginSilver },
                    { label: '💎 Platinum', value: marginPlatinum, set: setMarginPlatinum },
                  ].map(({ label, value, set }) => (
                    <div key={label}>
                      <p className="text-white/70 text-xs mb-1">{label}</p>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          max="200"
                          step="0.5"
                          value={value}
                          onChange={e => set(e.target.value)}
                          className="h-9 text-sm pr-7 bg-white/20 border-white/30 text-white placeholder-white/50 rounded-lg"
                          placeholder="0"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white/60 text-xs">%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  disabled={savingMargins}
                  onClick={async () => {
                    setSavingMargins(true);
                    await updateMetalSettings({
                      goldMarginPercent: parseFloat(marginGold) || 0,
                      silverMarginPercent: parseFloat(marginSilver) || 0,
                      platinumMarginPercent: parseFloat(marginPlatinum) || 0,
                    });
                    setSavingMargins(false);
                    setShowMarginEditor(false);
                  }}
                  className="w-full bg-white/20 hover:bg-white/30 text-white border-0 text-xs"
                >
                  {savingMargins ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save Margins
                </Button>
              </div>
            )}

            {/* Metal type tabs */}
            <div className="bg-white/10 p-1 rounded-xl flex gap-1">
              {(['GOLD', 'SILVER', 'PLATINUM'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMetalCalcType(m)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${metalCalcType === m ? 'bg-white text-violet-700 shadow' : 'text-white/80 hover:text-white'}`}
                >
                  {m === 'GOLD' ? '🥇 Gold' : m === 'SILVER' ? '🥈 Silver' : '💎 Platinum'}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Karat selector — Gold only */}
            {metalCalcType === 'GOLD' && (
              <div>
                <Label className="text-slate-700 text-xs font-semibold mb-2 block">Carat / Karat</Label>
                <div className="grid grid-cols-5 gap-2">
                  {(['10K', '14K', '18K', '22K', '24K'] as const).map((k) => (
                    <button
                      key={k}
                      onClick={() => setMetalCalcKarat(k)}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition-all ${metalCalcKarat === k ? 'border-violet-500 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                  <span className="flex items-center gap-1 text-green-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />Live</span>
                  · Purity: {((metalPurityMap[metalCalcKarat]?.purity || 0) * 100).toFixed(1)}% · £{parseFloat(tradeInGoldPrice).toFixed(2)}/g
                </p>

                {/* Gold colour selector */}
                <div className="mt-3">
                  <Label className="text-slate-700 text-xs font-semibold mb-2 block">Gold Colour</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setMetalCalcGoldColour('YELLOW')}
                      className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all flex flex-col items-center gap-1 ${metalCalcGoldColour === 'YELLOW' ? 'border-yellow-500 bg-yellow-50 text-yellow-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 border border-yellow-400" />
                      Yellow
                    </button>
                    <button
                      onClick={() => setMetalCalcGoldColour('WHITE')}
                      className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all flex flex-col items-center gap-1 ${metalCalcGoldColour === 'WHITE' ? 'border-slate-500 bg-slate-50 text-slate-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-200 to-slate-400 border border-slate-300" />
                      White
                    </button>
                    <button
                      onClick={() => setMetalCalcGoldColour('ROSE')}
                      className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all flex flex-col items-center gap-1 ${metalCalcGoldColour === 'ROSE' ? 'border-rose-400 bg-rose-50 text-rose-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-rose-300 to-rose-500 border border-rose-400" />
                      Rose
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">Yellow, White &amp; Rose Gold have the same spot price at the same karat — colour doesn't change metal value.</p>
                </div>
              </div>
            )}

            {/* Silver price per gram — live fetched, editable override */}
            {metalCalcType === 'SILVER' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-slate-700 text-xs font-semibold">Silver Spot Price (£/gram)</Label>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${metalCalcSilverLive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {metalCalcFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className={`w-1.5 h-1.5 rounded-full ${metalCalcSilverLive ? 'bg-green-500' : 'bg-amber-500'}`} />}
                    {metalCalcFetching ? 'Fetching…' : metalCalcSilverLive ? 'Live' : 'Manual'}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">£</span>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={metalCalcSilverPrice}
                    onChange={(e) => { setMetalCalcSilverPrice(e.target.value); setMetalCalcSilverLive(false); }}
                    className="pl-7 h-11 rounded-xl"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Sterling silver (92.5% purity) applied automatically</p>
              </div>
            )}

            {/* Platinum price per gram — live fetched, editable override */}
            {metalCalcType === 'PLATINUM' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-slate-700 text-xs font-semibold">Platinum Spot Price (£/gram)</Label>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${metalCalcPlatinumLive ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {metalCalcFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <span className={`w-1.5 h-1.5 rounded-full ${metalCalcPlatinumLive ? 'bg-green-500' : 'bg-amber-500'}`} />}
                    {metalCalcFetching ? 'Fetching…' : metalCalcPlatinumLive ? 'Live' : 'Manual'}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">£</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={metalCalcPlatinumPrice}
                    onChange={(e) => { setMetalCalcPlatinumPrice(e.target.value); setMetalCalcPlatinumLive(false); }}
                    className="pl-7 h-11 rounded-xl"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Platinum (95.0% purity) applied automatically</p>
              </div>
            )}

            {/* Grams input */}
            <div>
              <Label className="text-slate-700 text-xs font-semibold">Weight (grams)</Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 5.50"
                  value={metalCalcGrams}
                  onChange={(e) => setMetalCalcGrams(e.target.value)}
                  className="h-14 text-xl font-semibold rounded-xl pr-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">g</span>
              </div>
            </div>

            {/* Result */}
            {(() => {
              const metals = settings.metals ?? { goldMarginPercent: 0, silverMarginPercent: 0, platinumMarginPercent: 0 };
              const marginPct = metalCalcType === 'GOLD' ? metals.goldMarginPercent : metalCalcType === 'SILVER' ? metals.silverMarginPercent : metals.platinumMarginPercent;
              const grams = parseFloat(metalCalcGrams) || 0;
              let spotValue = 0;
              if (metalCalcType === 'GOLD') spotValue = grams * (parseFloat(tradeInGoldPrice) || 0) * (metalPurityMap[metalCalcKarat]?.purity || 0);
              else if (metalCalcType === 'SILVER') spotValue = grams * (parseFloat(metalCalcSilverPrice) || 0) * 0.925;
              else spotValue = grams * (parseFloat(metalCalcPlatinumPrice) || 0) * 0.950;
              const hasMargin = marginPct > 0;
              return (
                <div className={`rounded-2xl p-5 text-center ${metalCalcResult > 0 ? 'bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200' : 'bg-slate-50 border border-slate-200'}`}>
                  <p className="text-xs text-slate-500 mb-1">{hasMargin ? `Estimated Value (incl. ${marginPct}% margin)` : 'Estimated Value (spot)'}</p>
                  <p className={`text-4xl font-black ${metalCalcResult > 0 ? 'text-violet-700' : 'text-slate-300'}`}>
                    £{metalCalcResult.toFixed(2)}
                  </p>
                  {hasMargin && spotValue > 0 && (
                    <p className="text-xs text-slate-400 mt-1">Spot: £{spotValue.toFixed(2)} + {marginPct}% = £{metalCalcResult.toFixed(2)}</p>
                  )}
                  {metalCalcResult > 0 && metalCalcGrams && (
                    <p className="text-xs text-slate-400 mt-1">
                      {parseFloat(metalCalcGrams).toFixed(2)}g ×{' '}
                      {metalCalcType === 'GOLD'
                        ? `${metalCalcKarat} ${metalCalcGoldColour.charAt(0) + metalCalcGoldColour.slice(1).toLowerCase()} Gold · £${parseFloat(tradeInGoldPrice).toFixed(2)}/g × ${((metalPurityMap[metalCalcKarat]?.purity || 0) * 100).toFixed(1)}%`
                        : metalCalcType === 'SILVER'
                        ? `£${parseFloat(metalCalcSilverPrice).toFixed(2)}/g × 92.5%`
                        : `£${parseFloat(metalCalcPlatinumPrice).toFixed(2)}/g × 95.0%`}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>

          <div className="px-6 pb-5">
            <Button variant="outline" className="w-full" onClick={() => setShowMetalCalcDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default TileBasedPOS;
