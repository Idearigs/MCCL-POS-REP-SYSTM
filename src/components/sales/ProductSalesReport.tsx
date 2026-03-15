import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  Wrench,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Gem,
  Watch,
  Sparkles,
  ShoppingBag,
  Filter,
  Download,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { salesService, Sale } from '@/services/salesService';
import { repairService } from '@/services/repairService';
import { productService } from '@/services/productService';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

interface ProductSale {
  productId: string;
  productName: string;
  productSku: string;
  category: string;
  quantitySold: number;
  totalRevenue: number;
  averagePrice: number;
  lastSoldDate: string;
  salesCount: number;
}

interface CategorySummary {
  name: string;
  totalRevenue: number;
  quantitySold: number;
  productCount: number;
  percentage: number;
}

interface RepairSummary {
  totalRepairs: number;
  completedRepairs: number;
  totalRevenue: number;
  averageRepairValue: number;
  repairsByStatus: Record<string, number>;
}

const ProductSalesReport: React.FC = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'products' | 'repairs'>('products');
  const [repairData, setRepairData] = useState<any[]>([]);
  const [productCategories, setProductCategories] = useState<Map<string, string>>(new Map());
  const [allCategories, setAllCategories] = useState<Array<{ id: string; name: string }>>([]);

  // Load data only once on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load all inventory categories first
      console.log('🏷️ Loading inventory categories...');
      try {
        const categoriesData = await productService.getCategories();
        console.log('🏷️ Categories loaded:', categoriesData);
        // Handle different response structures
        const cats = Array.isArray(categoriesData) ? categoriesData : (categoriesData as any)?.data || [];
        setAllCategories(cats);
        console.log('🏷️ Total categories:', cats.length);
      } catch (catError) {
        console.error('❌ Failed to load categories:', catError);
        setAllCategories([]);
      }

      // Load products to map productId -> categoryName
      console.log('📦 Loading products for categories...');
      let productsResponse: any;
      try {
        productsResponse = await productService.getProducts(1, 1000);
        console.log('📦 Products response:', productsResponse);
      } catch (prodError) {
        console.error('❌ Failed to load products:', prodError);
        productsResponse = { data: [] };
      }

      // Handle different response structures
      const products = Array.isArray(productsResponse)
        ? productsResponse
        : (productsResponse?.data || productsResponse?.items || []);
      console.log('📦 Products loaded:', products.length);

      // Create a map of productId -> categoryName
      const categoryMap = new Map<string, string>();
      products.forEach((product: any) => {
        const categoryName = product.categoryName || product.category?.name || product.category || 'Uncategorized';
        categoryMap.set(product.id, categoryName);
        console.log(`  Product ${product.id}: ${categoryName}`);
      });
      setProductCategories(categoryMap);
      console.log('📦 Category map created with', categoryMap.size, 'entries');

      // Load sales
      console.log('💰 Loading sales...');
      let salesResponse: any;
      try {
        salesResponse = await salesService.getSales(1, 1000);
        console.log('💰 Sales response:', salesResponse);
      } catch (salesError) {
        console.error('❌ Failed to load sales:', salesError);
        salesResponse = { data: [] };
      }

      // Handle different response structures
      const salesData = Array.isArray(salesResponse)
        ? salesResponse
        : (salesResponse?.data || salesResponse?.items || salesResponse?.sales || []);
      console.log('💰 Sales loaded:', salesData.length);
      if (salesData.length > 0) {
        console.log('💰 Sample sale:', salesData[0]);
        console.log('💰 Sale items:', salesData[0]?.items);
      }
      setSales(salesData);

      // Load repairs - try without the third param like other pages do
      console.log('🔧 Loading repairs...');
      let repairsResponse: any;
      try {
        repairsResponse = await repairService.getRepairs(1, 500);
        console.log('🔧 Repairs response:', repairsResponse);
      } catch (repairError) {
        console.error('❌ Failed to load repairs list:', repairError);
        repairsResponse = { data: [] };
      }

      // Handle different response structures
      let repairs = Array.isArray(repairsResponse)
        ? repairsResponse
        : (repairsResponse?.data || repairsResponse?.items || repairsResponse?.repairs || []);
      console.log('🔧 Repairs loaded:', repairs.length);
      if (repairs.length > 0) {
        console.log('🔧 Sample repair:', repairs[0]);
        console.log('🔧 Repair cost fields:', {
          totalCost: repairs[0].totalCost,
          actualCost: repairs[0].actualCost,
          estimatedCost: repairs[0].estimatedCost,
          depositAmount: repairs[0].depositAmount,
          finalCost: repairs[0].finalCost,
          cost: repairs[0].cost,
          price: repairs[0].price,
          amount: repairs[0].amount,
          allKeys: Object.keys(repairs[0])
        });
      }

      // If no repairs from list, try to get stats as fallback
      if (repairs.length === 0) {
        console.log('🔧 No repairs from list, trying stats...');
        try {
          const repairStats = await repairService.getRepairStats();
          console.log('🔧 Repair stats:', repairStats);
          // Create dummy repair entries from stats if available
          if (repairStats && repairStats.totalRepairs > 0) {
            // Store stats for later use
            (window as any).__repairStats = repairStats;
          }
        } catch (statsError) {
          console.error('❌ Failed to load repair stats:', statsError);
        }
      }

      setRepairData(repairs);
    } catch (error: any) {
      console.error('❌ Error loading data:', error);
      setError(error?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Filter sales by date range
  const filteredSales = useMemo(() => {
    console.log('🔍 Filtering sales, total:', sales.length, 'dateRange:', dateRange);

    // Check if sale is valid (completed or has no status)
    const isValidSale = (s: any) => {
      const status = (s.status || '').toUpperCase();
      // Include completed, success, or sales without status
      return !status || status === 'COMPLETED' || status === 'SUCCESS' || status === 'PAID';
    };

    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = startOfMonth(now);
        break;
      default:
        // All time - return all valid sales
        const allSales = sales.filter(isValidSale);
        console.log('🔍 All time sales:', allSales.length);
        return allSales;
    }

    const filtered = sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= startDate && isValidSale(sale);
    });
    console.log('🔍 Filtered sales:', filtered.length);
    return filtered;
  }, [sales, dateRange]);

  // Calculate product sales with categories from product map
  const productSales = useMemo(() => {
    const productMap = new Map<string, ProductSale>();

    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        // Get category from product map
        const category = productCategories.get(item.productId) || 'Uncategorized';
        const existing = productMap.get(item.productId);

        // Calculate subtotal from item
        const itemSubtotal = (item as any).subtotal || (item.unitPrice * item.quantity) - (item.discount || 0);

        if (existing) {
          existing.quantitySold += item.quantity;
          existing.totalRevenue += itemSubtotal;
          existing.salesCount += 1;
          if (new Date(sale.createdAt) > new Date(existing.lastSoldDate)) {
            existing.lastSoldDate = sale.createdAt;
          }
        } else {
          productMap.set(item.productId, {
            productId: item.productId,
            productName: item.productName,
            productSku: item.sku || (item as any).productSku || 'N/A',
            category: category,
            quantitySold: item.quantity,
            totalRevenue: itemSubtotal,
            averagePrice: item.unitPrice,
            lastSoldDate: sale.createdAt,
            salesCount: 1,
          });
        }
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSales, productCategories]);

  // Calculate category summaries
  const categorySummaries = useMemo(() => {
    const categoryMap = new Map<string, CategorySummary>();
    let totalRevenue = 0;

    productSales.forEach(product => {
      totalRevenue += product.totalRevenue;
      const existing = categoryMap.get(product.category);
      if (existing) {
        existing.totalRevenue += product.totalRevenue;
        existing.quantitySold += product.quantitySold;
        existing.productCount += 1;
      } else {
        categoryMap.set(product.category, {
          name: product.category,
          totalRevenue: product.totalRevenue,
          quantitySold: product.quantitySold,
          productCount: 1,
          percentage: 0,
        });
      }
    });

    // Calculate percentages
    const summaries = Array.from(categoryMap.values());
    summaries.forEach(cat => {
      cat.percentage = totalRevenue > 0 ? (cat.totalRevenue / totalRevenue) * 100 : 0;
    });

    return summaries.sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [productSales]);

  // Calculate repair sales from sales data (repairs go through checkout as sales)
  const repairSalesData = useMemo(() => {
    const repairSales: Array<{ saleId: string; itemName: string; amount: number; date: string }> = [];

    // Look for repair items in sales - they have "REPAIR SERVICE" in notes
    filteredSales.forEach(sale => {
      sale.items?.forEach(item => {
        const notes = (item as any).notes || '';
        if (notes.includes('REPAIR SERVICE') || notes.includes('Repair')) {
          repairSales.push({
            saleId: sale.id,
            itemName: item.productName || notes.replace('REPAIR SERVICE:', '').trim(),
            amount: (item.unitPrice * item.quantity) - (item.discount || 0),
            date: sale.createdAt,
          });
        }
      });

      // Also check sale notes for repair indication
      const saleNotes = sale.notes || '';
      if (saleNotes.includes('Repair payment') || saleNotes.includes('repair')) {
        // If the whole sale is a repair sale but items don't have REPAIR SERVICE marker
        const hasRepairItems = sale.items?.some(item => ((item as any).notes || '').includes('REPAIR'));
        if (!hasRepairItems && sale.items) {
          sale.items.forEach(item => {
            repairSales.push({
              saleId: sale.id,
              itemName: item.productName || 'Repair Service',
              amount: (item.unitPrice * item.quantity) - (item.discount || 0),
              date: sale.createdAt,
            });
          });
        }
      }
    });

    console.log('🔧 Repair sales found in sales data:', repairSales.length, repairSales);
    return repairSales;
  }, [filteredSales]);

  // Calculate repair summary - combining repair records + sales data
  const repairSummary = useMemo((): RepairSummary => {
    // Calculate revenue from actual sales (repairs that went through checkout)
    const salesRevenue = repairSalesData.reduce((sum, rs) => sum + rs.amount, 0);
    console.log('🔧 Repair revenue from sales:', salesRevenue);

    // Also calculate from repair records (for repairs not yet paid)
    const recordsRevenue = repairData.reduce((sum, r) => {
      const cost = Number(r.totalCost) || Number(r.actualCost) || Number(r.estimatedCost) ||
                   Number(r.finalCost) || Number(r.cost) || Number(r.price) ||
                   Number(r.amount) || Number(r.depositAmount) || 0;
      return sum + cost;
    }, 0);
    console.log('🔧 Repair revenue from records:', recordsRevenue);

    // Use the higher value or combine them
    // If we have sales revenue, that's the actual paid amount
    const totalRevenue = salesRevenue > 0 ? salesRevenue : recordsRevenue;

    const completed = repairData.filter(r =>
      r.status === 'DELIVERED' || r.status === 'COMPLETED' || r.status === 'COLLECTED' || r.status === 'READY_FOR_COLLECTION'
    );

    const statusCounts: Record<string, number> = {};
    repairData.forEach(r => {
      const status = r.status || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    // Use repair sales count if we have them, otherwise use repair records
    const paidRepairsCount = repairSalesData.length > 0 ? repairSalesData.length : completed.length;

    return {
      totalRepairs: repairData.length,
      completedRepairs: paidRepairsCount,
      totalRevenue,
      averageRepairValue: paidRepairsCount > 0 ? totalRevenue / paidRepairsCount : 0,
      repairsByStatus: statusCounts,
    };
  }, [repairData, repairSalesData]);

  // Filter products by search and category
  const displayedProducts = useMemo(() => {
    let filtered = productSales;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.productName.toLowerCase().includes(query) ||
          p.productSku.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    return filtered;
  }, [productSales, searchQuery, selectedCategory]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(productSales.map(p => p.category));
    return Array.from(cats).sort();
  }, [productSales]);

  // Calculate totals
  const totals = useMemo(() => {
    return {
      revenue: filteredSales.reduce((sum, s) => sum + s.totalAmount, 0),
      sales: filteredSales.length,
      items: filteredSales.reduce((sum, s) => sum + (s.items?.length || 0), 0),
      avgOrderValue: filteredSales.length > 0
        ? filteredSales.reduce((sum, s) => sum + s.totalAmount, 0) / filteredSales.length
        : 0,
    };
  }, [filteredSales]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getCategoryIcon = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('ring')) return <Gem className="h-4 w-4" />;
    if (lower.includes('watch')) return <Watch className="h-4 w-4" />;
    if (lower.includes('necklace') || lower.includes('chain')) return <Sparkles className="h-4 w-4" />;
    return <ShoppingBag className="h-4 w-4" />;
  };

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-blue-500',
      'bg-emerald-500',
      'bg-orange-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-amber-500',
      'bg-indigo-500',
    ];
    return colors[index % colors.length];
  };

  const chartColors = ['#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899', '#06B6D4', '#F59E0B', '#6366F1'];

  // SVG Pie Chart Component
  const PieChartSVG: React.FC<{ data: { name: string; value: number; percentage: number }[]; size?: number }> = ({ data, size = 200 }) => {
    if (data.length === 0) {
      return (
        <div className="flex items-center justify-center" style={{ width: size, height: size }}>
          <p className="text-gray-400 text-sm">No data</p>
        </div>
      );
    }

    let currentAngle = -90; // Start from top

    return (
      <svg width={size} height={size} viewBox="0 0 100 100">
        {data.map((item, index) => {
          const angle = (item.percentage / 100) * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;

          // Convert to radians
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;

          // Calculate arc points
          const x1 = 50 + 40 * Math.cos(startRad);
          const y1 = 50 + 40 * Math.sin(startRad);
          const x2 = 50 + 40 * Math.cos(endRad);
          const y2 = 50 + 40 * Math.sin(endRad);

          const largeArc = angle > 180 ? 1 : 0;

          const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`;

          currentAngle = endAngle;

          return (
            <path
              key={item.name}
              d={path}
              fill={chartColors[index % chartColors.length]}
              className="hover:opacity-80 transition-opacity cursor-pointer"
              stroke="white"
              strokeWidth="0.5"
            >
              <title>{item.name}: {item.percentage.toFixed(1)}%</title>
            </path>
          );
        })}
        {/* Center circle for donut effect */}
        <circle cx="50" cy="50" r="20" fill="white" />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading sales data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <strong>Error:</strong> {error}
          <Button variant="outline" size="sm" className="ml-4" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}
      {/* Debug info - remove after fixing */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
        <strong>Debug:</strong> Raw Sales: {sales.length} | Filtered Sales: {filteredSales.length} |
        Products in Map: {productCategories.size} | Repairs: {repairData.length} |
        Product Sales: {productSales.length} | All Categories: {allCategories.length}
      </div>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="inline-flex bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('products')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'products'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="h-4 w-4 inline mr-2" />
              Products
            </button>
            <button
              onClick={() => setViewMode('repairs')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'repairs'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Wrench className="h-4 w-4 inline mr-2" />
              Repairs
            </button>
          </div>
        </div>

        {/* Date Range */}
        <div className="inline-flex bg-gray-100 rounded-xl p-1">
          {(['today', 'week', 'month', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange === range
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {range === 'today' ? 'Today' : range === 'week' ? '7 Days' : range === 'month' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'products' ? (
        <div className="grid grid-cols-3 gap-6">
          {/* Left Side - Product List */}
          <div className="col-span-2 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.revenue)}</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-600">
                  <ArrowUpRight className="h-3 w-3" />
                  <span className="text-xs font-medium">{filteredSales.length} sales</span>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totals.sales}</p>
                <p className="text-xs text-gray-500 mt-2">{totals.items} items sold</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Order</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totals.avgOrderValue)}</p>
                <p className="text-xs text-gray-500 mt-2">Per transaction</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Products</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{productSales.length}</p>
                <p className="text-xs text-gray-500 mt-2">Unique items</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 bg-gray-50 border-0 rounded-xl"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-48 bg-gray-50 border-0 rounded-xl">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {allCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="rounded-xl border-gray-200">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Product List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Top Selling Products</h3>
                <p className="text-sm text-gray-500">{displayedProducts.length} products</p>
              </div>
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {displayedProducts.slice(0, 20).map((product, index) => (
                  <div
                    key={product.productId}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500">
                        {index + 1}
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                        {getCategoryIcon(product.category)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{product.productName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-500">{product.productSku}</span>
                          <span className="text-xs text-gray-300">•</span>
                          <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600 rounded-md">
                            {product.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{product.quantitySold} sold</p>
                        <p className="text-xs text-gray-500">{product.salesCount} orders</p>
                      </div>
                      <div className="text-right min-w-[100px]">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(product.totalRevenue)}</p>
                        <p className="text-xs text-gray-500">Avg {formatCurrency(product.averagePrice)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                    </div>
                  </div>
                ))}
                {displayedProducts.length === 0 && (
                  <div className="px-6 py-12 text-center">
                    <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No products found</p>
                    <p className="text-sm text-gray-400 mt-1">Try changing the date range or filters</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Charts */}
          <div className="space-y-4">
            {/* Category Breakdown Chart */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900">Sales by Category</h3>
                <PieChart className="h-5 w-5 text-gray-400" />
              </div>

              {/* Visual Pie Chart */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <PieChartSVG
                    data={categorySummaries.map(cat => ({
                      name: cat.name,
                      value: cat.totalRevenue,
                      percentage: cat.percentage
                    }))}
                    size={180}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{categorySummaries.length}</p>
                      <p className="text-xs text-gray-500">Categories</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="space-y-3">
                {categorySummaries.slice(0, 6).map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: chartColors[index % chartColors.length] }}
                      />
                      <span className="text-sm text-gray-700 truncate max-w-[120px]">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">{cat.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            {categorySummaries[0] && (
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-4">Top Category</h3>
                <p className="text-3xl font-bold">{categorySummaries[0].name}</p>
                <p className="text-blue-200 mt-2">{formatCurrency(categorySummaries[0].totalRevenue)}</p>
                <div className="mt-4 pt-4 border-t border-blue-500/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-200">Items Sold</span>
                    <span className="font-medium">{categorySummaries[0].quantitySold}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-blue-200">Products</span>
                    <span className="font-medium">{categorySummaries[0].productCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Repair Summary Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Repair Revenue</h3>
                <Wrench className="h-5 w-5 text-gray-400" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(repairSummary.totalRevenue)}</p>
              <p className="text-sm text-gray-500 mt-1">{repairSummary.completedRepairs} completed repairs</p>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Average Value</span>
                  <span className="font-medium text-gray-900">{formatCurrency(repairSummary.averageRepairValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Repairs View */
        <div className="grid grid-cols-3 gap-6">
          {/* Left Side - Repair Stats */}
          <div className="col-span-2 space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Repairs</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{repairSummary.totalRepairs}</p>
                <p className="text-xs text-gray-500 mt-2">All time</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Completed</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{repairSummary.completedRepairs}</p>
                <p className="text-xs text-gray-500 mt-2">Delivered to customers</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Revenue</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(repairSummary.totalRevenue)}</p>
                <p className="text-xs text-gray-500 mt-2">From repairs</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(repairSummary.averageRepairValue)}</p>
                <p className="text-xs text-gray-500 mt-2">Per repair</p>
              </div>
            </div>

            {/* Repair Status Breakdown */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Repairs by Status</h3>
              </div>
              <div className="p-6">
                {Object.keys(repairSummary.repairsByStatus).length > 0 ? (
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(repairSummary.repairsByStatus).map(([status, count]) => (
                      <div key={status} className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              status === 'DELIVERED' || status === 'COMPLETED' || status === 'COLLECTED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : status === 'IN_PROGRESS' || status === 'REPAIRING'
                                ? 'bg-blue-100 text-blue-700'
                                : status === 'PENDING' || status === 'RECEIVED'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {status.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-2xl font-bold text-gray-900">{count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No repairs found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Repairs List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Recent Repairs</h3>
              </div>
              <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {repairData.length > 0 ? (
                  repairData.slice(0, 10).map(repair => (
                    <div key={repair.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          repair.status === 'DELIVERED' || repair.status === 'COMPLETED' || repair.status === 'COLLECTED'
                            ? 'bg-emerald-100'
                            : repair.status === 'IN_PROGRESS' || repair.status === 'REPAIRING'
                            ? 'bg-blue-100'
                            : 'bg-amber-100'
                        }`}>
                          <Wrench className={`h-5 w-5 ${
                            repair.status === 'DELIVERED' || repair.status === 'COMPLETED' || repair.status === 'COLLECTED'
                              ? 'text-emerald-600'
                              : repair.status === 'IN_PROGRESS' || repair.status === 'REPAIRING'
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{repair.rmaNumber || `REP-${repair.id.slice(0, 8)}`}</p>
                          <p className="text-sm text-gray-500">{repair.itemDescription || repair.problemDescription || 'Repair Job'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            repair.status === 'DELIVERED' || repair.status === 'COMPLETED' || repair.status === 'COLLECTED'
                              ? 'bg-emerald-100 text-emerald-700'
                              : repair.status === 'IN_PROGRESS' || repair.status === 'REPAIRING'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {(repair.status || 'UNKNOWN').replace(/_/g, ' ')}
                        </Badge>
                        <div className="text-right">
                          <p className="font-bold text-gray-900">
                            {formatCurrency(Number(repair.totalCost) || Number(repair.actualCost) || Number(repair.estimatedCost) || 0)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(repair.createdAt), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No repairs found</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Side - Charts */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl p-6 text-white">
              <Wrench className="h-8 w-8 mb-4 opacity-80" />
              <h3 className="font-semibold mb-2">Repair Services</h3>
              <p className="text-4xl font-bold">{formatCurrency(repairSummary.totalRevenue)}</p>
              <p className="text-emerald-200 mt-2">Total repair revenue</p>
              <div className="mt-6 pt-4 border-t border-emerald-500/30">
                <div className="flex justify-between text-sm">
                  <span className="text-emerald-200">Completion Rate</span>
                  <span className="font-medium">
                    {repairSummary.totalRepairs > 0
                      ? ((repairSummary.completedRepairs / repairSummary.totalRepairs) * 100).toFixed(0)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Repair Status Pie Chart */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Status Distribution</h3>
                <PieChart className="h-5 w-5 text-gray-400" />
              </div>

              {/* Visual Pie Chart for Repairs */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <PieChartSVG
                    data={Object.entries(repairSummary.repairsByStatus).map(([status, count]) => ({
                      name: status.replace(/_/g, ' '),
                      value: count,
                      percentage: repairSummary.totalRepairs > 0 ? (count / repairSummary.totalRepairs) * 100 : 0
                    }))}
                    size={160}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{repairSummary.totalRepairs}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Legend with Progress Bars */}
              <div className="space-y-3">
                {Object.entries(repairSummary.repairsByStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count], index) => {
                    const percentage = repairSummary.totalRepairs > 0
                      ? (count / repairSummary.totalRepairs) * 100
                      : 0;
                    return (
                      <div key={status}>
                        <div className="flex justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: chartColors[index % chartColors.length] }}
                            />
                            <span className="text-gray-600">{status.replace(/_/g, ' ')}</span>
                          </div>
                          <span className="font-medium text-gray-900">{count}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: chartColors[index % chartColors.length]
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSalesReport;
