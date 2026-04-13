import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { productService, Product, CreateProductData, UpdateProductData } from '../services/productService';
import { useAuth } from './AuthContext';
import { normalizeImageUrl } from '@/lib/utils';

// Extended InventoryItem interface that includes backend fields plus legacy UI fields
export interface InventoryItem extends Omit<Product, 'stock' | 'minStockLevel'> {
  quantity: number;  // Maps to Product.stock
  threshold: number;  // Maps to Product.minStockLevel
  supplier?: string;
  location?: string;
  dateAdded?: string;
  lastRestocked?: string;
  imageUrl?: string;
  additionalImages?: string[];
  isDamaged?: boolean;
  damageDetails?: {
    condition: 'damaged' | 'defective';
    reason: string;
    quantity: number;
    images?: string[];
    date: string;
  };
}

// Convert backend Product to UI InventoryItem
const convertProductToInventoryItem = (product: Product): InventoryItem => {
  console.log('🔄 Converting backend product to InventoryItem:', product);
  console.log('📸 Backend images array:', product.images);
  console.log('👤 Backend supplier:', product.supplier);

  // Extract image URLs from backend image objects
  // Derive the uploads origin from the configured API base URL
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3007/api/v1') as string;
  const uploadsOrigin = apiBase.replace(/\/api\/v1\/?$/, '');

  const imageUrls: string[] = [];
  if (product.images && Array.isArray(product.images)) {
    product.images.forEach((img: any) => {
      const imagePath: string | undefined = img.filePath || img.driveViewLink;
      if (!imagePath) return;

      let url = imagePath;

      // Relative path (rare) — prefix with the API origin
      if (url.startsWith('/uploads')) {
        url = `${uploadsOrigin}${url}`;
      }
      // Stored with a localhost origin (uploaded before APP_URL was configured) — rewrite to real API
      else if (/^https?:\/\/localhost(:\d+)?\/uploads/.test(url)) {
        url = url.replace(/^https?:\/\/localhost(:\d+)?/, uploadsOrigin);
      }
      // Google Drive webViewLink (/view) — convert to embeddable direct URL
      else {
        url = normalizeImageUrl(url) || url;
      }

      imageUrls.push(url);
    });
  }

  console.log('🖼️  Extracted image URLs:', imageUrls);

  const inventoryItem = {
    ...product,
    quantity: product.stock,
    threshold: product.minStockLevel,
    // Use supplierName directly (it's already a string from productService)
    supplier: product.supplier || '',
    location: product.location || '',
    dateAdded: product.createdAt,
    lastRestocked: product.updatedAt,
    imageUrl: imageUrls[0],
    additionalImages: imageUrls.slice(1),
    isDamaged: false
  };

  console.log('✅ Converted InventoryItem:', inventoryItem);
  console.log('🖼️  imageUrl:', inventoryItem.imageUrl, 'additionalImages:', inventoryItem.additionalImages);
  console.log('👤 Supplier name:', inventoryItem.supplier);

  return inventoryItem;
};

// Convert UI InventoryItem to backend CreateProductData
const convertToCreateProductData = (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'isActive'>): CreateProductData => ({
  name: item.name,
  description: item.description,
  sku: item.sku,
  barcode: item.barcode,
  category: item.category,
  supplier: item.supplier,
  material: item.material,
  weight: item.weight,
  dimensions: item.dimensions,
  price: item.price,
  cost: item.cost,
  stock: item.quantity,
  minStockLevel: item.threshold,
  images: [item.imageUrl, ...(item.additionalImages || [])].filter(Boolean) as string[],
  tags: item.tags,
  // Pass these through so transformFrontendToBackend can send them to the backend
  rfidTag: (item as any).rfidTag,
  condition: (item as any).condition,
  location: (item as any).location,
} as any);


// Define the context interface
interface InventoryContextType {
  inventory: InventoryItem[];
  loading: boolean;
  error: string | null;
  getItemById: (id: string) => InventoryItem | undefined;
  getItemBySku: (sku: string) => InventoryItem | undefined;
  addItem: (item: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'isActive'>) => Promise<InventoryItem>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, change: number) => Promise<boolean>;
  updateQuantityBySku: (sku: string, change: number) => Promise<boolean>;
  restockItem: (id: string, quantity: number) => Promise<void>;
  markItemAsDamaged: (sku: string, quantity: number, condition: 'damaged' | 'defective', reason: string, images?: string[]) => Promise<boolean>;
  getDamagedItems: () => InventoryItem[];
  refreshInventory: () => Promise<void>;
}

// Create the context
const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Create a provider component
export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { auth } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load inventory from backend on initial render
  const loadInventory = async () => {
    // Only load if user is authenticated
    if (!auth.isAuthenticated) {
      console.log('⚠️ User not authenticated, skipping inventory load');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('📦 Loading inventory for authenticated user...');
      // Backend limits to max 100 per page, so fetch all pages
      let allProducts: any[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        // Only fetch active products (not soft-deleted)
        console.log(`📄 Fetching page ${page} with filter: isActive=true`);
        const result = await productService.getProducts(page, 100, { isActive: true });
        console.log(`📊 Page ${page} returned ${result.data.length} products (total: ${result.meta.total})`);
        console.log(`🔍 Sample product isActive values:`, result.data.slice(0, 3).map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));
        allProducts = [...allProducts, ...result.data];
        hasMore = result.meta.hasNextPage;
        page++;
      }

      const uiInventory = allProducts.map(convertProductToInventoryItem);
      setInventory(uiInventory);
      console.log(`✅ Loaded ${uiInventory.length} products from database`);
    } catch (err: any) {
      console.error('Failed to load inventory:', err);
      setError(err.message || 'Failed to load inventory');
      // Fall back to empty array instead of localStorage
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  // Load inventory when user logs in
  useEffect(() => {
    if (auth.isAuthenticated && !auth.loading) {
      loadInventory();
    } else if (!auth.isAuthenticated) {
      // Clear inventory when user logs out
      setInventory([]);
    }
  }, [auth.isAuthenticated, auth.loading]);

  // Get an item by ID
  const getItemById = (id: string) => {
    return inventory.find(item => item.id === id);
  };

  // Get an item by SKU
  const getItemBySku = (sku: string) => {
    return inventory.find(item => item.sku === sku);
  };

  // Add a new item
  const addItem = async (itemData: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt' | 'tenantId' | 'isActive'>): Promise<InventoryItem> => {
    setLoading(true);
    setError(null);
    try {
      const productData = convertToCreateProductData(itemData);
      const newProduct = await productService.createProduct(productData);
      const newItem = convertProductToInventoryItem(newProduct);
      
      setInventory(prevInventory => [...prevInventory, newItem]);
      return newItem;
    } catch (err: any) {
      console.error('Failed to create item:', err);
      setError(err.message || 'Failed to create item');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update an existing item
  const updateItem = async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // Convert UI updates to backend format
      const productUpdates: UpdateProductData = {};
      if (updates.name) productUpdates.name = updates.name;
      if (updates.description !== undefined) productUpdates.description = updates.description;
      if (updates.sku) productUpdates.sku = updates.sku;
      if (updates.barcode !== undefined) productUpdates.barcode = updates.barcode;
      if (updates.category) productUpdates.category = updates.category;
      if (updates.material) productUpdates.material = updates.material;
      if (updates.weight !== undefined) productUpdates.weight = updates.weight;
      if (updates.dimensions !== undefined) productUpdates.dimensions = updates.dimensions;
      if (updates.price !== undefined) productUpdates.price = updates.price;
      if (updates.cost !== undefined) productUpdates.cost = updates.cost;
      if (updates.quantity !== undefined) productUpdates.stock = updates.quantity;
      if (updates.threshold !== undefined) productUpdates.minStockLevel = updates.threshold;
      if (updates.isActive !== undefined) productUpdates.isActive = updates.isActive;
      // Fields not in the Product interface but present on InventoryItemDetails at runtime
      if ((updates as any).supplier !== undefined) (productUpdates as any).supplier = (updates as any).supplier;
      if ((updates as any).rfidTag !== undefined) (productUpdates as any).rfidTag = (updates as any).rfidTag;
      if ((updates as any).condition !== undefined) (productUpdates as any).condition = (updates as any).condition;
      if ((updates as any).location !== undefined) (productUpdates as any).location = (updates as any).location;
      
      const updatedProduct = await productService.updateProduct(id, productUpdates);
      const updatedItem = convertProductToInventoryItem(updatedProduct);
      
      setInventory(prevInventory => 
        prevInventory.map(item => 
          item.id === id ? { ...updatedItem, ...updates } : item
        )
      );
    } catch (err: any) {
      console.error('Failed to update item:', err);
      setError(err.message || 'Failed to update item');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete an item
  const deleteItem = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      console.log(`🗑️  Deleting product with ID: ${id}`);
      await productService.deleteProduct(id);
      console.log(`✅ Product ${id} deleted successfully from database`);

      setInventory(prevInventory => {
        const filtered = prevInventory.filter(item => item.id !== id);
        console.log(`📦 Inventory updated: ${prevInventory.length} -> ${filtered.length} items`);
        return filtered;
      });
    } catch (err: any) {
      console.error('❌ Failed to delete item:', err);
      setError(err.message || 'Failed to delete item');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update quantity of an item by ID
  // Returns true if successful, false if not enough stock
  const updateQuantity = async (id: string, change: number): Promise<boolean> => {
    const item = getItemById(id);
    if (!item) return false;
    
    // If reducing quantity, check if we have enough stock
    if (change < 0 && item.quantity + change < 0) {
      return false;
    }
    
    setLoading(true);
    setError(null);
    try {
      await productService.adjustStock(id, {
        type: 'ADJUSTMENT',
        quantity: change,
        reason: `Manual adjustment: ${change > 0 ? '+' : ''}${change}`
      });
      
      // Update local state
      await updateItem(id, { 
        quantity: item.quantity + change,
        lastRestocked: change > 0 ? new Date().toISOString() : item.lastRestocked
      });
      
      return true;
    } catch (err: any) {
      console.error('Failed to update quantity:', err);
      setError(err.message || 'Failed to update quantity');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Update an item's quantity by SKU
  const updateQuantityBySku = async (sku: string, change: number): Promise<boolean> => {
    const item = inventory.find(item => item.sku === sku);
    
    if (!item) return false;
    
    // Prevent negative quantities
    if (item.quantity + change < 0) return false;
    
    return await updateQuantity(item.id, change);
  };

  // Restock an item
  const restockItem = async (id: string, quantity: number): Promise<void> => {
    if (quantity <= 0) return;
    
    const item = getItemById(id);
    if (!item) return;
    
    await updateQuantity(id, quantity);
  };

  // Get all damaged items
  const getDamagedItems = () => {
    return inventory.filter(item => item.isDamaged && item.damageDetails && item.damageDetails.quantity > 0);
  };

  // Mark an item as damaged
  const markItemAsDamaged = async (sku: string, quantity: number, condition: 'damaged' | 'defective', reason: string, images: string[] = []): Promise<boolean> => {
    const item = inventory.find(item => item.sku === sku);
    
    if (!item) return false;
    
    // Ensure we don't mark more items as damaged than we have in inventory
    if (quantity <= 0 || quantity > item.quantity) return false;
    
    try {
      // Update local state only (this would need a backend endpoint for damage tracking)
      const updatedItem = { 
        ...item, 
        isDamaged: true,
        damageDetails: {
          condition,
          reason,
          quantity,
          images,
          date: new Date().toISOString().split('T')[0]
        }
      };
      
      setInventory(prev => 
        prev.map(invItem => 
          invItem.sku === sku ? updatedItem : invItem
        )
      );
      
      return true;
    } catch (err: any) {
      console.error('Failed to mark item as damaged:', err);
      return false;
    }
  };

  // Refresh inventory from backend
  const refreshInventory = async () => {
    await loadInventory();
  };

  // Context value
  const value = {
    inventory,
    loading,
    error,
    getItemById,
    getItemBySku,
    addItem,
    updateItem,
    deleteItem,
    updateQuantity,
    updateQuantityBySku,
    restockItem,
    markItemAsDamaged,
    getDamagedItems,
    refreshInventory
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};

// Custom hook to use the inventory context
export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
