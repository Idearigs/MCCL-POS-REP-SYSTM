import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the InventoryItem interface
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  supplier: string;
  price: number;
  cost: number;
  quantity: number;
  threshold: number;
  location: string;
  dateAdded: string;
  lastRestocked: string;
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

// Mock data for initial inventory
const initialInventory: InventoryItem[] = [
  {
    id: '1',
    name: 'Diamond Ring Setting',
    sku: 'DR-001',
    description: 'Classic solitaire setting for diamond rings',
    category: 'Settings',
    supplier: 'GemCraft Supplies',
    price: 299.99,
    cost: 150.00,
    quantity: 25,
    threshold: 5,
    location: 'Cabinet A2',
    dateAdded: '2023-01-15',
    lastRestocked: '2023-04-20',
    imageUrl: '/images/diamond-ring-setting.jpg'
  },
  {
    id: '2',
    name: 'Gold Chain 18K',
    sku: 'GC-182',
    description: '18K gold chain, 20 inches',
    category: 'Chains',
    supplier: 'Luxury Gold Inc.',
    price: 450.00,
    cost: 275.00,
    quantity: 8,
    threshold: 5,
    location: 'Safe B',
    dateAdded: '2023-02-10',
    lastRestocked: '2023-05-05',
    imageUrl: '/images/gold-chain.jpg'
  },
  {
    id: '3',
    name: 'Silver Polishing Cloth',
    sku: 'SP-001',
    description: 'Professional grade polishing cloth for silver jewelry',
    category: 'Supplies',
    supplier: 'JewelCare Products',
    price: 12.99,
    cost: 4.50,
    quantity: 45,
    threshold: 10,
    location: 'Drawer C4',
    dateAdded: '2023-01-05',
    lastRestocked: '2023-03-15',
    imageUrl: '/images/polishing-cloth.jpg'
  },
  {
    id: '4',
    name: 'Watch Battery CR2032',
    sku: 'WB-2032',
    description: 'Standard CR2032 battery for watches',
    category: 'Watch Parts',
    supplier: 'TimeParts Co.',
    price: 5.99,
    cost: 1.20,
    quantity: 100,
    threshold: 20,
    location: 'Drawer D1',
    dateAdded: '2023-01-20',
    lastRestocked: '2023-04-10',
    imageUrl: '/images/watch-battery.jpg'
  },
  {
    id: '5',
    name: 'Sapphire Gemstone 1ct',
    sku: 'SG-100',
    description: 'Round cut sapphire, 1 carat',
    category: 'Gemstones',
    supplier: 'Precious Gems Ltd.',
    price: 350.00,
    cost: 200.00,
    quantity: 3,
    threshold: 2,
    location: 'Safe A',
    dateAdded: '2023-03-01',
    lastRestocked: '2023-03-01',
    imageUrl: '/images/sapphire.jpg'
  },
  {
    id: '6',
    name: 'Sterling Silver Wire',
    sku: 'SSW-22',
    description: '22 gauge sterling silver wire, 10 feet',
    category: 'Materials',
    supplier: 'SilverCraft',
    price: 22.50,
    cost: 9.75,
    quantity: 15,
    threshold: 5,
    location: 'Cabinet B3',
    dateAdded: '2023-02-15',
    lastRestocked: '2023-05-10',
    imageUrl: '/images/silver-wire.jpg'
  },
  {
    id: '7',
    name: 'Gold Solder',
    sku: 'GS-18K',
    description: '18K gold solder for jewelry repairs',
    category: 'Materials',
    supplier: 'GemCraft Supplies',
    price: 35.00,
    cost: 18.00,
    quantity: 12,
    threshold: 4,
    location: 'Cabinet A1',
    dateAdded: '2023-01-25',
    lastRestocked: '2023-04-05',
    imageUrl: '/images/gold-solder.jpg'
  },
  {
    id: '8',
    name: 'Diamond Tester',
    sku: 'DT-PRO',
    description: 'Professional diamond authenticity tester',
    category: 'Tools',
    supplier: 'JewelTest Technologies',
    price: 189.99,
    cost: 95.00,
    quantity: 2,
    threshold: 1,
    location: 'Office Cabinet',
    dateAdded: '2022-12-10',
    lastRestocked: '2023-02-20',
    imageUrl: '/images/diamond-tester.jpg'
  },
  {
    id: '9',
    name: 'Ruby Gemstone 0.5ct',
    sku: 'RG-050',
    description: 'Oval cut ruby, 0.5 carat',
    category: 'Gemstones',
    supplier: 'Precious Gems Ltd.',
    price: 275.00,
    cost: 145.00,
    quantity: 0,
    threshold: 2,
    location: 'Safe A',
    dateAdded: '2023-02-05',
    lastRestocked: '2023-02-05'
  },
  {
    id: '10',
    name: 'Watch Spring Bars',
    sku: 'WSB-20',
    description: '20mm spring bars for watch straps, pack of 10',
    category: 'Watch Parts',
    supplier: 'TimeParts Co.',
    price: 8.99,
    cost: 2.50,
    quantity: 7,
    threshold: 10,
    location: 'Drawer D2',
    dateAdded: '2023-01-10',
    lastRestocked: '2023-03-20'
  }
];

// Define the context interface
interface InventoryContextType {
  inventory: InventoryItem[];
  getItemById: (id: string) => InventoryItem | undefined;
  getItemBySku: (sku: string) => InventoryItem | undefined;
  addItem: (item: Omit<InventoryItem, 'id'>) => InventoryItem;
  updateItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteItem: (id: string) => void;
  updateQuantity: (id: string, change: number) => boolean;
  updateQuantityBySku: (sku: string, change: number) => boolean;
  restockItem: (id: string, quantity: number) => void;
  markItemAsDamaged: (sku: string, quantity: number, condition: 'damaged' | 'defective', reason: string, images?: string[]) => boolean;
  getDamagedItems: () => InventoryItem[];
}

// Create the context
const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

// Create a provider component
export const InventoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);

  // Load inventory from localStorage on initial render
  useEffect(() => {
    const savedInventory = localStorage.getItem('inventory');
    if (savedInventory) {
      setInventory(JSON.parse(savedInventory));
    }
  }, []);

  // Save inventory to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('inventory', JSON.stringify(inventory));
  }, [inventory]);

  // Get an item by ID
  const getItemById = (id: string) => {
    return inventory.find(item => item.id === id);
  };

  // Get an item by SKU
  const getItemBySku = (sku: string) => {
    return inventory.find(item => item.sku === sku);
  };

  // Add a new item
  const addItem = (itemData: Omit<InventoryItem, 'id'>) => {
    // Generate a new item ID
    const newItemId = `INV${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    
    // Create the new item object
    const newItem: InventoryItem = {
      id: newItemId,
      ...itemData
    };
    
    // Add the new item to the state
    setInventory(prevInventory => [...prevInventory, newItem]);
    
    return newItem;
  };

  // Update an existing item
  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setInventory(prevInventory => 
      prevInventory.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  // Delete an item
  const deleteItem = (id: string) => {
    setInventory(prevInventory => 
      prevInventory.filter(item => item.id !== id)
    );
  };

  // Update quantity of an item by ID
  // Returns true if successful, false if not enough stock
  const updateQuantity = (id: string, change: number): boolean => {
    const item = getItemById(id);
    if (!item) return false;
    
    // If reducing quantity, check if we have enough stock
    if (change < 0 && item.quantity + change < 0) {
      return false;
    }
    
    // Update the quantity
    const newQuantity = item.quantity + change;
    const lastRestocked = change > 0 ? new Date().toISOString().split('T')[0] : item.lastRestocked;
    
    updateItem(id, { 
      quantity: newQuantity,
      lastRestocked: change > 0 ? lastRestocked : item.lastRestocked
    });
    
    return true;
  };

  // Update an item's quantity by SKU
  const updateQuantityBySku = (sku: string, change: number): boolean => {
    const itemIndex = inventory.findIndex(item => item.sku === sku);
    
    if (itemIndex === -1) return false;
    
    const item = inventory[itemIndex];
    const newQuantity = item.quantity + change;
    
    // Prevent negative quantities
    if (newQuantity < 0) return false;
    
    const updatedItem = { ...item, quantity: newQuantity };
    
    setInventory(prev => {
      const newInventory = [...prev];
      newInventory[itemIndex] = updatedItem;
      return newInventory;
    });
    
    return true;
  };

  // Restock an item
  const restockItem = (id: string, quantity: number) => {
    if (quantity <= 0) return;
    
    const item = getItemById(id);
    if (!item) return;
    
    updateItem(id, {
      quantity: item.quantity + quantity,
      lastRestocked: new Date().toISOString().split('T')[0]
    });
  };

  // Get all damaged items
  const getDamagedItems = () => {
    return inventory.filter(item => item.isDamaged && item.damageDetails && item.damageDetails.quantity > 0);
  };

  // Mark an item as damaged
  const markItemAsDamaged = (sku: string, quantity: number, condition: 'damaged' | 'defective', reason: string, images: string[] = []): boolean => {
    const itemIndex = inventory.findIndex(item => item.sku === sku);
    
    if (itemIndex === -1) return false;
    
    const item = inventory[itemIndex];
    
    // Ensure we don't mark more items as damaged than we have in inventory
    if (quantity <= 0 || quantity > item.quantity) return false;
    
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
    
    setInventory(prev => {
      const newInventory = [...prev];
      newInventory[itemIndex] = updatedItem;
      return newInventory;
    });
    
    return true;
  };

  // Context value
  const value = {
    inventory,
    getItemById,
    getItemBySku,
    addItem,
    updateItem,
    deleteItem,
    updateQuantity,
    updateQuantityBySku,
    restockItem,
    markItemAsDamaged,
    getDamagedItems
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
