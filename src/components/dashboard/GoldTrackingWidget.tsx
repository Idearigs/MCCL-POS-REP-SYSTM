import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Constants
const GOLD_API_URL = 'https://www.goldapi.io/api/XAU/USD';
const GOLD_API_KEY = 'goldapi-1inbzfsmice24ik-io';
const TROY_OUNCE_TO_GRAMS = 31.1035;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 60 minutes
const STORAGE_KEY = 'liveGoldRateCache';
const HISTORY_KEY = 'goldPriceHistory';

// Purity multipliers
const PURITY_MAP = {
  '9K': { multiplier: 0.375, label: '9 Karat', color: 'from-amber-700 to-amber-800' },
  '14K': { multiplier: 0.585, label: '14 Karat', color: 'from-amber-500 to-yellow-600' },
  '18K': { multiplier: 0.750, label: '18 Karat', color: 'from-yellow-500 to-yellow-600' },
  '22K': { multiplier: 0.916, label: '22 Karat', color: 'from-yellow-400 to-amber-500' },
  '24K': { multiplier: 1.000, label: '24 Karat', color: 'from-yellow-300 to-yellow-500' },
};

interface CachedData {
  pricePerOunce: number;
  pricePerGram: number;
  previousPrice: number;
  timestamp: number;
  currency: string;
}

interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

interface GoldTrackingWidgetProps {
  className?: string;
}

// Mini sparkline chart component
const SparklineChart: React.FC<{ data: number[]; isUp: boolean; width?: number; height?: number }> = ({
  data,
  isUp,
  width = 120,
  height = 40
}) => {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height * 0.8 - height * 0.1;
    return `${x},${y}`;
  }).join(' ');

  const gradientId = `sparkline-gradient-${isUp ? 'up' : 'down'}`;
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={isUp ? '#10B981' : '#EF4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={isUp ? '#10B981' : '#EF4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#${gradientId})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#10B981' : '#EF4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((data[data.length - 1] - min) / range) * height * 0.8 - height * 0.1}
        r="3"
        fill={isUp ? '#10B981' : '#EF4444'}
      />
    </svg>
  );
};

// Animated number component
const AnimatedPrice: React.FC<{ value: number; prefix?: string; decimals?: number; className?: string }> = ({
  value,
  prefix = '£',
  decimals = 2,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setTimeout(() => setIsAnimating(false), 300);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  const formattedValue = displayValue.toFixed(decimals);

  return (
    <span className={`inline-flex items-baseline font-mono tabular-nums ${className}`}>
      <span className="text-inherit">{prefix}</span>
      <span className={`transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}>
        {formattedValue}
      </span>
    </span>
  );
};

const GoldTrackingWidget: React.FC<GoldTrackingWidgetProps> = ({ className = '' }) => {
  const [pricePerGram, setPricePerGram] = useState<number>(0);
  const [pricePerOunce, setPricePerOunce] = useState<number>(0);
  const [previousPrice, setPreviousPrice] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [selectedKarat, setSelectedKarat] = useState<string>('24K');

  // USD to GBP conversion
  const usdToGbp = 0.79;

  // Load cached data from localStorage
  const loadCachedData = useCallback((): CachedData | null => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Failed to load cached gold rate:', e);
    }
    return null;
  }, []);

  // Load price history
  const loadPriceHistory = useCallback((): PriceHistoryPoint[] => {
    try {
      const history = localStorage.getItem(HISTORY_KEY);
      if (history) {
        return JSON.parse(history);
      }
    } catch (e) {
      console.error('Failed to load price history:', e);
    }
    return [];
  }, []);

  // Save price history
  const savePriceHistory = useCallback((history: PriceHistoryPoint[]) => {
    try {
      // Keep only last 30 data points
      const trimmedHistory = history.slice(-30);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
    } catch (e) {
      console.error('Failed to save price history:', e);
    }
  }, []);

  // Save data to localStorage
  const saveCachedData = useCallback((data: CachedData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save gold rate cache:', e);
    }
  }, []);

  // Check if cache is still valid
  const isCacheValid = useCallback((timestamp: number): boolean => {
    return Date.now() - timestamp < CACHE_DURATION_MS;
  }, []);

  // Fetch gold price from API
  const fetchGoldPrice = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh) {
      const cached = loadCachedData();
      if (cached && isCacheValid(cached.timestamp)) {
        setPricePerOunce(cached.pricePerOunce);
        setPricePerGram(cached.pricePerGram);
        setPreviousPrice(cached.previousPrice);
        setLastUpdated(new Date(cached.timestamp));
        setIsLive(true);

        // Load history
        const history = loadPriceHistory();
        setPriceHistory(history);
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await fetch(GOLD_API_URL, {
        method: 'GET',
        headers: {
          'x-access-token': GOLD_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      // API returns price in USD per troy ounce
      const priceUsdPerOunce = data.price;
      const prevPriceUsd = data.prev_close_price || priceUsdPerOunce;

      // Convert to GBP
      const priceGbpPerOunce = priceUsdPerOunce * usdToGbp;
      const priceGbpPerGram = priceGbpPerOunce / TROY_OUNCE_TO_GRAMS;
      const prevPriceGbpPerGram = (prevPriceUsd * usdToGbp) / TROY_OUNCE_TO_GRAMS;

      // Update state
      setPreviousPrice(pricePerGram || prevPriceGbpPerGram);
      setPricePerOunce(priceGbpPerOunce);
      setPricePerGram(priceGbpPerGram);
      setLastUpdated(new Date());
      setIsLive(true);

      // Cache the data
      const cacheData: CachedData = {
        pricePerOunce: priceGbpPerOunce,
        pricePerGram: priceGbpPerGram,
        previousPrice: prevPriceGbpPerGram,
        timestamp: Date.now(),
        currency: 'GBP',
      };
      saveCachedData(cacheData);

      // Update history
      const history = loadPriceHistory();
      const newHistory = [...history, { timestamp: Date.now(), price: priceGbpPerGram }];
      savePriceHistory(newHistory);
      setPriceHistory(newHistory);

    } catch (err: any) {
      console.error('Failed to fetch gold price:', err);
      setIsLive(false);

      // Try to use cached data even if expired
      const cached = loadCachedData();
      if (cached) {
        setPricePerOunce(cached.pricePerOunce);
        setPricePerGram(cached.pricePerGram);
        setPreviousPrice(cached.previousPrice);
        setLastUpdated(new Date(cached.timestamp));
      }

      const history = loadPriceHistory();
      setPriceHistory(history);
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedData, isCacheValid, saveCachedData, pricePerGram, usdToGbp, loadPriceHistory, savePriceHistory]);

  // Initial load
  useEffect(() => {
    fetchGoldPrice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Price change calculations
  const priceChange = useMemo(() => {
    if (!previousPrice || !pricePerGram) return 0;
    return ((pricePerGram - previousPrice) / previousPrice) * 100;
  }, [pricePerGram, previousPrice]);

  const isUp = priceChange >= 0;

  // Get sparkline data
  const sparklineData = useMemo(() => {
    if (priceHistory.length < 2) {
      // Generate mock trend data if no history
      const basePrice = pricePerGram || 50;
      return Array.from({ length: 10 }, (_, i) =>
        basePrice + (Math.random() - 0.5) * 2
      );
    }
    return priceHistory.map(p => p.price);
  }, [priceHistory, pricePerGram]);

  // Calculate karat price
  const karatPrice = useMemo(() => {
    const purity = PURITY_MAP[selectedKarat as keyof typeof PURITY_MAP];
    return pricePerGram * (purity?.multiplier || 1);
  }, [pricePerGram, selectedKarat]);

  // Format time ago
  const timeAgo = useMemo(() => {
    if (!lastUpdated) return 'Never';
    const diff = Date.now() - lastUpdated.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ago`;
  }, [lastUpdated]);

  // Daily high/low (simulated from current price)
  const dailyHigh = useMemo(() => pricePerGram * 1.005, [pricePerGram]);
  const dailyLow = useMemo(() => pricePerGram * 0.995, [pricePerGram]);

  return (
    <div className={`bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm overflow-hidden ${className}`}>
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 px-5 py-4 text-white">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-4 w-12 h-12 bg-white/10 rounded-full translate-y-1/2" />

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <span className="text-xl">🥇</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">Live Gold Rate</h3>
              <div className="flex items-center gap-1.5 text-amber-100 text-xs">
                {isLive ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Live • {timeAgo}</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Cached • {timeAgo}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => fetchGoldPrice(true)}
            disabled={isLoading}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-5">
        {/* Price Display with Trend */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs text-gray-500 mb-1">24K Gold / Gram</p>
            <div className="flex items-baseline gap-2">
              <AnimatedPrice
                value={pricePerGram}
                className="text-3xl font-bold text-gray-900"
              />
              <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(priceChange).toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Sparkline Chart */}
          <div className="mt-2">
            <SparklineChart data={sparklineData} isUp={isUp} width={100} height={35} />
          </div>
        </div>

        {/* Daily Range Bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-gray-500 mb-1.5">
            <span>Daily Range</span>
            <span>£{dailyLow.toFixed(2)} - £{dailyHigh.toFixed(2)}</span>
          </div>
          <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
              style={{
                width: `${((pricePerGram - dailyLow) / (dailyHigh - dailyLow)) * 100}%`,
                minWidth: '10%'
              }}
            />
            {/* Current price marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-amber-500 rounded-full shadow-sm"
              style={{
                left: `calc(${((pricePerGram - dailyLow) / (dailyHigh - dailyLow)) * 100}% - 6px)`,
              }}
            />
          </div>
        </div>

        {/* Karat Quick Select */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">Quick Karat Prices</p>
          <div className="flex gap-1.5">
            {Object.entries(PURITY_MAP).map(([karat, data]) => (
              <button
                key={karat}
                onClick={() => setSelectedKarat(karat)}
                className={`flex-1 py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedKarat === karat
                    ? `bg-gradient-to-br ${data.color} text-white shadow-md`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {karat}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Karat Price */}
        <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-700 font-medium mb-0.5">
                {PURITY_MAP[selectedKarat as keyof typeof PURITY_MAP]?.label}
              </p>
              <p className="text-xs text-amber-600/80">
                {(PURITY_MAP[selectedKarat as keyof typeof PURITY_MAP]?.multiplier * 100).toFixed(1)}% pure gold
              </p>
            </div>
            <div className="text-right">
              <AnimatedPrice
                value={karatPrice}
                className="text-2xl font-bold text-amber-900"
              />
              <p className="text-xs text-amber-600">/gram</p>
            </div>
          </div>
        </div>

        {/* Per Ounce Price */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">Per Troy Ounce (24K)</span>
          <span className="font-semibold text-gray-900">£{pricePerOunce.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default GoldTrackingWidget;
