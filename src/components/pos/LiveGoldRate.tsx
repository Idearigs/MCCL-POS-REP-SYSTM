import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Edit3, X, Check, Wifi, WifiOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Constants
const GOLD_API_URL = 'https://www.goldapi.io/api/XAU/USD';
const GOLD_API_KEY = 'goldapi-1inbzfsmice24ik-io';
const TROY_OUNCE_TO_GRAMS = 31.1035;
const CACHE_DURATION_MS = 60 * 60 * 1000; // 60 minutes
const STORAGE_KEY = 'liveGoldRateCache';

// Purity multipliers
const PURITY_MAP = {
  '10K': { multiplier: 0.417, label: '10 Karat', color: 'from-amber-600 to-amber-700' },
  '14K': { multiplier: 0.585, label: '14 Karat', color: 'from-amber-500 to-yellow-600' },
  '18K': { multiplier: 0.750, label: '18 Karat', color: 'from-yellow-500 to-yellow-600' },
  '22K': { multiplier: 0.916, label: '22 Karat', color: 'from-yellow-400 to-amber-500' },
  '24K': { multiplier: 1.000, label: '24 Karat Pure', color: 'from-yellow-300 to-yellow-500' },
};

interface CachedData {
  pricePerOunce: number;
  pricePerGram: number;
  previousPrice: number;
  timestamp: number;
  currency: string;
}

interface LiveGoldRateProps {
  onPriceUpdate?: (pricePerGram: number) => void;
  compact?: boolean;
}

// Animated number component for flip effect
const AnimatedPrice: React.FC<{ value: number; prefix?: string; decimals?: number }> = ({
  value,
  prefix = '£',
  decimals = 2
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
  const [whole, decimal] = formattedValue.split('.');

  return (
    <span className="inline-flex items-baseline font-mono">
      <span className="text-inherit">{prefix}</span>
      <span className={`transition-all duration-300 ${isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}`}>
        {whole}
      </span>
      <span className="text-inherit">.</span>
      <span className={`transition-all duration-300 delay-75 ${isAnimating ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'}`}>
        {decimal}
      </span>
    </span>
  );
};

const LiveGoldRate: React.FC<LiveGoldRateProps> = ({ onPriceUpdate, compact = false }) => {
  const [pricePerOunce, setPricePerOunce] = useState<number>(0);
  const [pricePerGram, setPricePerGram] = useState<number>(0);
  const [previousPrice, setPreviousPrice] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'gram' | 'ounce'>('gram');
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualPrice, setManualPrice] = useState<string>('');
  const [currency] = useState<string>('GBP');

  // USD to GBP conversion (approximate - in production use real forex API)
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
        setError(null);
        onPriceUpdate?.(cached.pricePerGram);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

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
      setIsManualMode(false);

      // Cache the data
      const cacheData: CachedData = {
        pricePerOunce: priceGbpPerOunce,
        pricePerGram: priceGbpPerGram,
        previousPrice: prevPriceGbpPerGram,
        timestamp: Date.now(),
        currency: 'GBP',
      };
      saveCachedData(cacheData);
      onPriceUpdate?.(priceGbpPerGram);

    } catch (err: any) {
      console.error('Failed to fetch gold price:', err);
      setError(err.message || 'Failed to fetch price');
      setIsLive(false);

      // Try to use cached data even if expired
      const cached = loadCachedData();
      if (cached) {
        setPricePerOunce(cached.pricePerOunce);
        setPricePerGram(cached.pricePerGram);
        setPreviousPrice(cached.previousPrice);
        setLastUpdated(new Date(cached.timestamp));
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedData, isCacheValid, saveCachedData, onPriceUpdate, pricePerGram, usdToGbp]);

  // Apply manual price override
  const applyManualPrice = useCallback(() => {
    const price = parseFloat(manualPrice);
    if (!isNaN(price) && price > 0) {
      setPreviousPrice(pricePerGram);

      if (viewMode === 'gram') {
        setPricePerGram(price);
        setPricePerOunce(price * TROY_OUNCE_TO_GRAMS);
      } else {
        setPricePerOunce(price);
        setPricePerGram(price / TROY_OUNCE_TO_GRAMS);
      }

      setIsManualMode(true);
      setIsLive(false);
      setLastUpdated(new Date());

      // Save manual override to cache
      const cacheData: CachedData = {
        pricePerOunce: viewMode === 'gram' ? price * TROY_OUNCE_TO_GRAMS : price,
        pricePerGram: viewMode === 'gram' ? price : price / TROY_OUNCE_TO_GRAMS,
        previousPrice: pricePerGram,
        timestamp: Date.now(),
        currency: 'GBP',
      };
      saveCachedData(cacheData);
      onPriceUpdate?.(cacheData.pricePerGram);

      setManualPrice('');
    }
  }, [manualPrice, viewMode, pricePerGram, saveCachedData, onPriceUpdate]);

  // Initial load
  useEffect(() => {
    fetchGoldPrice();
  }, []);

  // Price change indicator
  const priceChange = useMemo(() => {
    if (!previousPrice || !pricePerGram) return 0;
    return ((pricePerGram - previousPrice) / previousPrice) * 100;
  }, [pricePerGram, previousPrice]);

  const isUp = priceChange > 0;
  const isDown = priceChange < 0;

  // Calculate purity prices
  const purityPrices = useMemo(() => {
    const basePrice = viewMode === 'gram' ? pricePerGram : pricePerOunce;
    return Object.entries(PURITY_MAP).map(([karat, data]) => ({
      karat,
      ...data,
      price: basePrice * data.multiplier,
    }));
  }, [pricePerGram, pricePerOunce, viewMode]);

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

  // Compact widget (pill-shaped button)
  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="group relative flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-xl border border-gray-200/50 rounded-full shadow-lg shadow-black/5 hover:shadow-xl hover:scale-105 transition-all duration-300"
        >
          {/* Live indicator */}
          <div className="relative">
            <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500' : 'bg-gray-400'}`} />
            {isLive && (
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75" />
            )}
          </div>

          {/* Price display */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">GOLD</span>
            <span className="font-bold text-gray-900">
              <AnimatedPrice value={pricePerGram} decimals={2} />
            </span>
            <span className="text-xs text-gray-500">/g</span>
          </div>

          {/* Change indicator */}
          {priceChange !== 0 && (
            <div className={`flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}>
              {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{Math.abs(priceChange).toFixed(2)}%</span>
            </div>
          )}

          {/* Loading spinner */}
          {isLoading && (
            <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" />
          )}
        </button>

        {/* Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[440px] p-0 bg-white/95 backdrop-blur-2xl rounded-3xl overflow-hidden border-0 shadow-2xl">
            {renderModalContent()}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full modal content
  function renderModalContent() {
    return (
      <>
        {/* Header */}
        <div className="relative bg-gradient-to-br from-yellow-400 via-amber-500 to-yellow-600 px-6 py-8 text-white overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <span className="text-2xl">🥇</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">Live Gold Rate</h2>
                  <div className="flex items-center gap-2 text-yellow-100 text-sm">
                    {isLive ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        <span>Live • Updated {timeAgo}</span>
                      </>
                    ) : isManualMode ? (
                      <>
                        <Edit3 className="w-3 h-3" />
                        <span>Manual Override</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        <span>Offline • {timeAgo}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => fetchGoldPrice(true)}
                disabled={isLoading}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Main price display */}
            <div className="text-center py-4">
              <p className="text-yellow-100 text-sm mb-1">
                {viewMode === 'gram' ? 'Price Per Gram' : 'Price Per Troy Ounce'}
              </p>
              <p className="text-5xl font-bold tracking-tight">
                <AnimatedPrice
                  value={viewMode === 'gram' ? pricePerGram : pricePerOunce}
                  decimals={2}
                />
              </p>
              {priceChange !== 0 && (
                <div className={`inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-full ${
                  isUp ? 'bg-green-500/30' : 'bg-red-500/30'
                }`}>
                  {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span className="text-sm font-medium">{isUp ? '+' : ''}{priceChange.toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* View Mode Toggle - iOS Style */}
          <div className="bg-gray-100 p-1 rounded-xl flex">
            <button
              onClick={() => setViewMode('gram')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'gram'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Per Gram
            </button>
            <button
              onClick={() => setViewMode('ounce')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'ounce'
                  ? 'bg-white shadow-sm text-gray-900'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Per Ounce
            </button>
          </div>

          {/* Purity Price Breakdown */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Price by Karat</h3>
            <div className="space-y-2">
              {purityPrices.map(({ karat, label, price, color, multiplier }) => (
                <div
                  key={karat}
                  className="group flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                      {karat}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500">{(multiplier * 100).toFixed(1)}% pure</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      <AnimatedPrice value={price} decimals={2} />
                    </p>
                    <p className="text-xs text-gray-500">/{viewMode === 'gram' ? 'g' : 'oz'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Override Section */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Manual Override</h3>
              {isManualMode && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium">
                  Active
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={viewMode === 'gram' ? 'Price per gram' : 'Price per ounce'}
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                  className="pl-7 h-11 rounded-xl"
                />
              </div>
              <Button
                onClick={applyManualPrice}
                disabled={!manualPrice || parseFloat(manualPrice) <= 0}
                className="h-11 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-white"
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
            {error && (
              <p className="text-xs text-red-500 mt-2">{error}</p>
            )}
          </div>

          {/* Info Footer */}
          <div className="text-center text-xs text-gray-400 pt-2">
            <p>1 Troy Ounce = 31.1035 Grams</p>
            <p className="mt-1">Data refreshes every 60 minutes to save API credits</p>
          </div>
        </div>
      </>
    );
  }

  // Full widget (non-compact)
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="group relative flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50 rounded-2xl shadow-lg shadow-amber-100/50 hover:shadow-xl hover:shadow-amber-200/50 hover:scale-[1.02] transition-all duration-300"
      >
        {/* Gold icon */}
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">
          <span className="text-lg">🥇</span>
        </div>

        {/* Content */}
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-700 font-medium uppercase tracking-wide">Live Gold</span>
            {/* Live indicator */}
            <div className="relative">
              <div className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-green-500' : 'bg-gray-400'}`} />
              {isLive && (
                <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-green-500 animate-ping opacity-75" />
              )}
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">
              <AnimatedPrice value={pricePerGram} decimals={2} />
            </span>
            <span className="text-sm text-gray-500">/gram</span>
          </div>
        </div>

        {/* Change indicator */}
        {priceChange !== 0 && (
          <div className={`ml-auto flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-bold ${
            isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{Math.abs(priceChange).toFixed(2)}%</span>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <RefreshCw className="w-4 h-4 text-amber-500 animate-spin ml-auto" />
        )}
      </button>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[440px] p-0 bg-white/95 backdrop-blur-2xl rounded-3xl overflow-hidden border-0 shadow-2xl">
          {renderModalContent()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LiveGoldRate;
