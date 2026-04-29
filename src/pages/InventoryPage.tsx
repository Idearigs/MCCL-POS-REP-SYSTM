
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  Plus,
  Package,
  ArrowDownUp,
  AlertTriangle,
  Printer,
  Upload,
  Download,
  LayoutGrid,
  List,
  Eye,
  Edit,
  Trash2,
  Nfc,
  QrCode,
  X
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useToast } from '@/hooks/use-toast';
import { useInventory, InventoryItem } from '@/contexts/InventoryContext';
import { productService } from '@/services/productService';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAs } from 'file-saver';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  downloadInventoryReport,
  InventoryReportData,
  InventoryReportItem
} from '@/utils/inventoryReportGenerator';
import {
  parseCSV,
  ParsedCSVData,
  ValidatedInventoryItem,
  generateCSVTemplate
} from '@/utils/intelligentCSVParser';
import CSVImportDialog from '@/components/inventory/CSVImportDialog';
import BulkRFIDAssignment from '@/components/inventory/BulkRFIDAssignment';

import InventoryItemComponent, { InventoryItemProps} from '@/components/inventory/InventoryItem';
import InventoryDetail from '@/components/inventory/InventoryDetail';
import InventoryFilter from '@/components/inventory/InventoryFilter';

const InventoryPage = () => {
  const { inventory, updateItem, addItem, deleteItem, refreshInventory } = useInventory();
  const availableCategories = Array.from(new Set(inventory.map(item => (item as any).categoryName || item.category).filter(Boolean)));

  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>(inventory);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewItem, setIsNewItem] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null);
  const [parsedCSVData, setParsedCSVData] = useState<ParsedCSVData | null>(null);
  const [isCSVImportDialogOpen, setIsCSVImportDialogOpen] = useState(false);
  const [isBulkRFIDDialogOpen, setIsBulkRFIDDialogOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrStep, setQrStep] = useState(0);
  useEffect(() => {
    if (!isQRModalOpen) { setQrStep(0); return; }
    const t = setInterval(() => setQrStep(s => (s + 1) % 3), 2200);
    return () => clearInterval(t);
  }, [isQRModalOpen]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [quickFilter, setQuickFilter] = useState<'lowStock' | 'outOfStock' | 'duplicates' | null>(null);

  // Compute duplicate IDs — same SKU means the same product was added more than once.
  // Different SKU = different product even if the name is the same (e.g. same ring in 9ct vs 18ct).
  const duplicateIds = React.useMemo(() => {
    const skuMap = new Map<string, string[]>();
    for (const item of inventory) {
      const key = item.sku?.trim().toLowerCase();
      if (!key) continue;
      const group = skuMap.get(key) ?? [];
      group.push(item.id);
      skuMap.set(key, group);
    }
    const ids = new Set<string>();
    for (const group of skuMap.values()) {
      if (group.length > 1) group.forEach(id => ids.add(id));
    }
    return ids;
  }, [inventory]);
  const { toast } = useToast();
  
  // Set isLoaded to true after component mounts to prevent initial render issues
  useEffect(() => {
    setIsLoaded(true);
    applyFilters('');
  }, []);

  // Apply search and filters to inventory
  const applyFilters = (searchTerm: string, filters?: any, activeQuickFilter?: 'lowStock' | 'outOfStock' | 'duplicates' | null) => {
    let result = [...inventory];

    // Apply search
    if (searchTerm) {
      const lowercaseQuery = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.name.toLowerCase().includes(lowercaseQuery) ||
        item.sku.toLowerCase().includes(lowercaseQuery) ||
        ((item as any).categoryName || item.category).toLowerCase().includes(lowercaseQuery) ||
        (item.description && item.description.toLowerCase().includes(lowercaseQuery))
      );
    }

    // Apply quick filter (Low Stock, Out of Stock, or Duplicates button clicks)
    const currentQuickFilter = activeQuickFilter !== undefined ? activeQuickFilter : quickFilter;
    if (currentQuickFilter === 'lowStock') {
      result = result.filter(item => item.quantity > 0 && item.quantity <= item.threshold);
    } else if (currentQuickFilter === 'outOfStock') {
      result = result.filter(item => item.quantity <= 0);
    } else if (currentQuickFilter === 'duplicates') {
      result = result.filter(item => duplicateIds.has(item.id));
    }

    // Apply filters if provided
    if (filters) {
      // Filter by categories
      if (filters.categories.length > 0) {
        result = result.filter(item => filters.categories.includes((item as any).categoryName || item.category));
      }

      // Filter by price range
      if (filters.minPrice !== null) {
        result = result.filter(item => item.price >= filters.minPrice);
      }
      if (filters.maxPrice !== null) {
        result = result.filter(item => item.price <= filters.maxPrice);
      }

      // Filter by stock status (only if quick filter is not active)
      if (!currentQuickFilter) {
        result = result.filter(item => {
          if (item.quantity <= 0 && !filters.stockStatus.outOfStock) return false;
          if (item.quantity <= item.threshold && item.quantity > 0 && !filters.stockStatus.lowStock) return false;
          if (item.quantity > item.threshold && !filters.stockStatus.inStock) return false;
          return true;
        });
      }
    }

    // Apply sorting
    result.sort((a, b) => {
      let valueA: any = a[sortBy as keyof InventoryItem];
      let valueB: any = b[sortBy as keyof InventoryItem];

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }

      if (valueA < valueB) return sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredInventory(result);
  };
  
  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFilters(query, undefined, quickFilter);
  };

  // Handle quick filter toggle (Low Stock / Out of Stock buttons)
  const handleQuickFilter = (filterType: 'lowStock' | 'outOfStock') => {
    const newFilter = quickFilter === filterType ? null : filterType;
    setQuickFilter(newFilter);
    applyFilters(searchQuery, undefined, newFilter);
  };
  
  // Handle sorting changes
  const handleSortChange = (value: string) => {
    setSortBy(value);
    applyFilters(searchQuery, undefined, quickFilter);
  };

  // Toggle sort order
  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    applyFilters(searchQuery, undefined, quickFilter);
  };

  // Handle filter changes
  const handleFilterChange = (filters: any) => {
    applyFilters(searchQuery, filters, quickFilter);
  };
  
  // Open the detail dialog for editing an item
  const handleEditItem = (id: string) => {
    const item = inventory.find(i => i.id === id);
    if (item) {
      setSelectedItem(item);
      setIsNewItem(false);
      setIsDetailOpen(true);
    }
  };
  
  // Open dialog for deleting an item
  const handleDeleteItem = (id: string) => {
    setItemToDelete(id);
  };
  
  // Confirm deletion of an item
  const confirmDelete = () => {
    if (itemToDelete) {
      deleteItem(itemToDelete);
      
      toast({
        title: "Item Deleted",
        description: "The inventory item has been removed."
      });
      
      setItemToDelete(null);
    }
  };
  
  // Open dialog for adding a new item
  const handleAddItem = () => {
    setIsNewItem(true);
    setSelectedItem(null);
    setIsDetailOpen(true);
  };
  
  // Print inventory list as professional PDF
  const handlePrint = () => {
    try {
      // Convert inventory items to report format
      const reportItems: InventoryReportItem[] = filteredInventory.map(item => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        category: item.category,
        categoryName: (item as any).categoryName || item.category,
        supplier: item.supplier || '',
        supplierName: (item as any).supplierName || item.supplier || '',
        material: (item as any).material || '',
        purity: (item as any).purity || '',
        weight: (item as any).weight,
        price: item.price,
        cost: item.cost,
        quantity: item.quantity,
        threshold: item.threshold,
        description: item.description || '',
        location: item.location || '',
        dateAdded: item.dateAdded,
        lastRestocked: item.lastRestocked
      }));

      // Calculate statistics
      const totalValue = filteredInventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const lowStockItems = filteredInventory.filter(item =>
        item.quantity > 0 && item.quantity <= item.threshold
      ).length;
      const outOfStockItems = filteredInventory.filter(item => item.quantity <= 0).length;

      // Prepare report data
      const reportData: InventoryReportData = {
        items: reportItems,
        generatedDate: new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        totalItems: filteredInventory.length,
        totalValue: totalValue,
        lowStockItems: lowStockItems,
        outOfStockItems: outOfStockItems
      };

      // Generate and download professional PDF
      downloadInventoryReport(reportData);

      toast({
        title: "Report Generated",
        description: "Professional inventory report has been downloaded as PDF.",
      });
    } catch (error) {
      console.error('Error generating inventory report:', error);
      toast({
        title: "Error",
        description: "Failed to generate inventory report. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Download inventory as comprehensive CSV
  const handleDownload = () => {
    try {
      // Create comprehensive CSV with all fields
      const headers = [
        'name',
        'sku',
        'category',
        'supplier',
        'material',
        'purity',
        'weight',
        'price',
        'cost',
        'quantity',
        'threshold',
        'description',
        'location',
        'barcode'
      ];

      const csvRows = [
        headers.join(','),
        ...filteredInventory.map(item => [
          `"${(item.name || '').replace(/"/g, '""')}"`, // Escape quotes
          item.sku || '',
          (item as any).categoryName || item.category || '',
          (item as any).supplierName || item.supplier || '',
          (item as any).material || '',
          (item as any).purity || '',
          (item as any).weight || '',
          item.price?.toFixed(2) || '0.00',
          item.cost?.toFixed(2) || '0.00',
          item.quantity || 0,
          item.threshold || 5,
          `"${(item.description || '').replace(/"/g, '""')}"`,
          item.location || '',
          (item as any).barcode || ''
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
      saveAs(blob, `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);

      toast({
        title: "Export complete",
        description: `${filteredInventory.length} items exported to CSV with all fields.`,
      });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export inventory data.",
        variant: "destructive",
      });
    }
  };
  
  // Handle intelligent CSV upload
  const handleUpload = () => {
    // Create file input for CSV upload
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.style.display = 'none';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvContent = event.target?.result as string;

          // Parse CSV intelligently
          const parsed = parseCSV(csvContent);

          // Set parsed data and open preview dialog
          setParsedCSVData(parsed);
          setIsCSVImportDialogOpen(true);

        } catch (error) {
          console.error('CSV parsing error:', error);
          toast({
            title: "Failed to read CSV",
            description: error instanceof Error ? error.message : "Invalid CSV file format.",
            variant: "destructive",
          });
        }
      };

      reader.onerror = () => {
        toast({
          title: "File read error",
          description: "Failed to read the CSV file. Please try again.",
          variant: "destructive",
        });
      };

      reader.readAsText(file);
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  // Handle confirmed CSV import
  const handleConfirmCSVImport = async (items: ValidatedInventoryItem[]) => {
    try {
      let successCount = 0;
      let failureCount = 0;

      // Import items one by one
      for (const item of items) {
        try {
          await addItem({
            name: item.name,
            sku: item.sku,
            category: item.category || '', // Leave empty if no category provided
            supplier: item.supplier || '',
            price: item.price,
            cost: item.cost || 0,
            quantity: item.quantity,
            threshold: item.threshold || 5,
            description: item.description || '',
            location: item.location || '',
            dateAdded: new Date().toISOString(),
            lastRestocked: new Date().toISOString(),
            imageUrl: '',
            additionalImages: []
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to import item ${item.sku}:`, error);
          failureCount++;
        }
      }

      // Show results
      if (successCount > 0) {
        toast({
          title: "Import successful",
          description: `Successfully imported ${successCount} of ${items.length} items.${failureCount > 0 ? ` ${failureCount} items failed.` : ''}`,
        });
      } else {
        toast({
          title: "Import failed",
          description: "No items were imported. Please check the CSV format.",
          variant: "destructive",
        });
      }

      // Refresh inventory
      await refreshInventory();

      // Close dialog
      setIsCSVImportDialogOpen(false);
      setParsedCSVData(null);

    } catch (error) {
      console.error('CSV import error:', error);
      toast({
        title: "Import error",
        description: "An error occurred while importing items.",
        variant: "destructive",
      });
    }
  };

  // Handle bulk RFID assignment
  const handleBulkRFIDAssign = async (assignments: Array<{ sku: string; rfidTag: string }>) => {
    try {
      const result = await productService.bulkAssignRFID(assignments);

      // Show success toast
      if (result.success > 0) {
        toast({
          title: "RFID Assignment Complete",
          description: `Successfully assigned RFID tags to ${result.success} product${result.success !== 1 ? 's' : ''}.${result.failed > 0 ? ` ${result.failed} failed.` : ''}`,
        });
      }

      // Show errors if any
      if (result.failed > 0 && result.errors.length > 0) {
        console.error('RFID assignment errors:', result.errors);
      }

      // Refresh inventory to show updated RFID tags
      await refreshInventory();

      return result;
    } catch (error) {
      console.error('Bulk RFID assignment error:', error);
      toast({
        title: "Assignment Failed",
        description: "An error occurred while assigning RFID tags.",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Save new or updated item
  const handleSaveItem = async (item: InventoryItem, imageFiles?: File[]) => {
    console.log('📥 handleSaveItem called with imageFiles:', imageFiles);

    // Ensure the item has the additionalImages property
    const updatedItem = {
      ...item,
      additionalImages: item.additionalImages || []
    };

    try {
      let productId: string;

      if (isNewItem) {
        // Add new item to inventory
        const newItem = await addItem(updatedItem);
        productId = newItem.id;

        console.log('✅ Product created with ID:', productId);
      } else {
        // Update existing item
        await updateItem(updatedItem.id, updatedItem);
        productId = updatedItem.id;

        console.log('✅ Product updated with ID:', productId);
      }

      // Upload images if provided
      if (imageFiles && imageFiles.length > 0) {
        console.log(`📤 Uploading ${imageFiles.length} images for product ${productId}`);

        const uploadPromises = imageFiles.map((file, index) => {
          console.log(`  - Uploading image ${index + 1}/${imageFiles.length}: ${file.name}`);
          return productService.uploadProductImage(productId, file);
        });

        const uploadResults = await Promise.all(uploadPromises);
        console.log('✅ All images uploaded successfully:', uploadResults);
      }

      // Refresh inventory to get updated product data with images from database
      console.log('🔄 Refreshing inventory from database...');
      await refreshInventory();
      console.log('✅ Inventory refreshed with latest data including images');

      // Show success message
      if (isNewItem) {
        toast({
          title: "Item Added",
          description: `${updatedItem.name} has been added to inventory${imageFiles && imageFiles.length > 0 ? ` with ${imageFiles.length} image(s)` : ''}.`,
        });
      } else {
        toast({
          title: "Item Updated",
          description: `${updatedItem.name} has been updated${imageFiles && imageFiles.length > 0 ? ` with ${imageFiles.length} new image(s)` : ''}.`,
        });
      }

      setIsDetailOpen(false);
      setSelectedItem(null);
      setIsNewItem(false);
    } catch (error) {
      console.error('❌ Failed to save item:', error);
      toast({
        title: "Error",
        description: `Failed to ${isNewItem ? 'add' : 'update'} item: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Calculate inventory stats
  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(item => item.quantity > 0 && item.quantity <= item.threshold).length;
  const outOfStockItems = inventory.filter(item => item.quantity <= 0).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Update filtered inventory when inventory changes
  useEffect(() => {
    applyFilters(searchQuery, undefined, quickFilter);
  }, [inventory, quickFilter]);

  // Don't render until component is fully loaded to prevent initialization errors
  if (!isLoaded) {
    return (
      <MainLayout pageTitle="Inventory">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p>Loading inventory...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Inventory">
      <div className="animate-fade-in space-y-6 max-w-7xl mx-auto px-4 py-6">
        {/* Stats section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <h3 className="text-2xl font-bold">{totalItems}</h3>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/70" />
            </div>
          </div>
          
          <button
            onClick={() => handleQuickFilter('lowStock')}
            className={`bg-card p-4 rounded-lg shadow-sm border transition-all hover:shadow-md cursor-pointer ${
              quickFilter === 'lowStock'
                ? 'ring-2 ring-amber-500 bg-amber-50 border-amber-500'
                : 'hover:border-amber-300'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm ${quickFilter === 'lowStock' ? 'text-amber-700 font-medium' : 'text-muted-foreground'}`}>
                  Low Stock {quickFilter === 'lowStock' && '(Filtered)'}
                </p>
                <h3 className="text-2xl font-bold">{lowStockItems}</h3>
              </div>
              <AlertTriangle className={`h-8 w-8 ${
                quickFilter === 'lowStock'
                  ? 'text-amber-600'
                  : lowStockItems > 0
                    ? 'text-amber-500'
                    : 'text-muted-foreground/70'
              }`} />
            </div>
          </button>

          <button
            onClick={() => handleQuickFilter('outOfStock')}
            className={`bg-card p-4 rounded-lg shadow-sm border transition-all hover:shadow-md cursor-pointer ${
              quickFilter === 'outOfStock'
                ? 'ring-2 ring-red-500 bg-red-50 border-red-500'
                : 'hover:border-red-300'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <p className={`text-sm ${quickFilter === 'outOfStock' ? 'text-red-700 font-medium' : 'text-muted-foreground'}`}>
                  Out of Stock {quickFilter === 'outOfStock' && '(Filtered)'}
                </p>
                <h3 className="text-2xl font-bold">{outOfStockItems}</h3>
              </div>
              <AlertTriangle className={`h-8 w-8 ${
                quickFilter === 'outOfStock'
                  ? 'text-red-600'
                  : outOfStockItems > 0
                    ? 'text-destructive'
                    : 'text-muted-foreground/70'
              }`} />
            </div>
          </button>
          
          <div className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <h3 className="text-2xl font-bold">£{totalValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
              <Package className="h-8 w-8 text-muted-foreground/70" />
            </div>
          </div>
        </div>

        {/* Duplicate products banner */}
        {duplicateIds.size > 0 && (
          <button
            type="button"
            onClick={() => handleQuickFilter(quickFilter === 'duplicates' ? null : 'duplicates')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              quickFilter === 'duplicates'
                ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-400'
                : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-500" />
            <span>
              <strong>{duplicateIds.size}</strong> duplicate product{duplicateIds.size !== 1 ? 's' : ''} detected — products with the same name exist more than once.
              {quickFilter === 'duplicates' ? ' Click to clear filter.' : ' Click to review.'}
            </span>
          </button>
        )}

        {/* Search and filters section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-2.5 top-2.5 text-navy/70" />
            <Input
              type="search"
              placeholder="Search inventory..."
              className="pl-9 h-10 bg-white/90 backdrop-blur-sm border border-navy/10 rounded-xl shadow-sm focus:ring-2 focus:ring-navy/10 focus:border-navy/20 text-navy"
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-white/90 rounded-full border border-navy/10 shadow-sm">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={`rounded-l-full ${viewMode === 'grid' ? 'bg-navy text-white hover:bg-navy-dark' : 'text-navy hover:bg-navy/5'}`}
              >
                <LayoutGrid size={16} className="mr-2" />
                Grid
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className={`rounded-r-full ${viewMode === 'table' ? 'bg-navy text-white hover:bg-navy-dark' : 'text-navy hover:bg-navy/5'}`}
              >
                <List size={16} className="mr-2" />
                Table
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger className="w-[130px] h-8 bg-white/90 backdrop-blur-sm border border-navy/10 rounded-xl shadow-sm hover:border-navy/20 text-navy">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-white/95 backdrop-blur-md border border-navy/10 rounded-lg shadow-md">
                  <SelectItem value="name" className="focus:bg-navy/5 focus:text-navy">Name</SelectItem>
                  <SelectItem value="sku" className="focus:bg-navy/5 focus:text-navy">SKU</SelectItem>
                  <SelectItem value="price" className="focus:bg-navy/5 focus:text-navy">Price</SelectItem>
                  <SelectItem value="quantity" className="focus:bg-navy/5 focus:text-navy">Quantity</SelectItem>
                  <SelectItem value="category" className="focus:bg-navy/5 focus:text-navy">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="hidden md:flex items-center gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy hover:text-navy"
                onClick={handlePrint}
                title="Print inventory report"
              >
                <Printer size={16} />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy hover:text-navy"
                onClick={toggleSortOrder}
                title="Toggle sort order"
              >
                <ArrowDownUp size={16} className={sortOrder === 'desc' ? 'rotate-180' : ''} />
              </Button>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8 rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy hover:text-navy"
                onClick={handleDownload}
                title="Download as CSV"
              >
                <Download size={16} />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy hover:text-navy"
                onClick={handleUpload}
                title="Upload CSV file"
              >
                <Upload size={16} />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 text-navy hover:text-navy"
                onClick={() => setIsBulkRFIDDialogOpen(true)}
                title="Bulk assign RFID tags"
              >
                <Nfc size={16} />
              </Button>
            </div>
            
            <InventoryFilter 
              availableCategories={availableCategories} 
              onFilterChange={handleFilterChange} 
            />
            
            <Button
              onClick={() => setIsQRModalOpen(true)}
              className="rounded-full px-4 shadow-sm bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
              title="Mobile Quick-Add (QR Code)"
            >
              <QrCode size={15} />
              Mobile Add
            </Button>
            <Button onClick={handleAddItem} className="bg-navy hover:bg-navy-dark text-white rounded-full px-4 shadow-sm">
              <Plus size={16} className="mr-1" />
              Add Item
            </Button>
          </div>
        </div>

        {/* QR Code Modal — portal-rendered, fully independent */}
        {isQRModalOpen && createPortal(
          <>
            <style>{`
              @keyframes qr-modal-in {
                from { opacity: 0; transform: scale(0.88) translateY(20px); }
                to   { opacity: 1; transform: scale(1)    translateY(0); }
              }
              @keyframes qr-float {
                0%,100% { transform: perspective(700px) rotateX(3deg) rotateY(-4deg) translateY(0px); }
                50%     { transform: perspective(700px) rotateX(-2deg) rotateY(4deg) translateY(-5px); }
              }
              @keyframes qr-scan {
                0%   { top: 2px;          opacity: 0; }
                5%   { opacity: 1; }
                92%  { top: calc(100% - 4px); opacity: 1; }
                100% { top: calc(100% - 4px); opacity: 0; }
              }
              @keyframes corner-pulse {
                0%,100% { opacity: 1; }
                50%     { opacity: 0.4; }
              }
              @keyframes step-in {
                from { opacity: 0; transform: translateY(8px); }
                to   { opacity: 1; transform: translateY(0); }
              }
              .qr-modal-card  { animation: qr-modal-in 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards; }
              .qr-float-card  { animation: qr-float 5s ease-in-out infinite; }
              .qr-scan-line   {
                animation: qr-scan 2.4s ease-in-out infinite;
                position: absolute; left: 6px; right: 6px; height: 2px;
                background: linear-gradient(90deg, transparent, #a78bfa, #7c3aed, #a78bfa, transparent);
                box-shadow: 0 0 10px 3px rgba(124,58,237,0.55);
                border-radius: 99px;
              }
              .qr-corner       { animation: corner-pulse 2.4s ease-in-out infinite; }
              .qr-step-label   { animation: step-in 0.3s ease forwards; }
            `}</style>

            <div
              style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '16px',
                background: 'rgba(15,10,40,0.7)',
                backdropFilter: 'blur(10px)',
              }}
              onClick={() => setIsQRModalOpen(false)}
            >
              <div
                className="qr-modal-card"
                style={{ width: '100%', maxWidth: '360px', background: '#fff', borderRadius: '28px', boxShadow: '0 32px 80px rgba(0,0,0,0.35)' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Gradient header */}
                <div style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #4f23a8 100%)',
                  borderRadius: '28px 28px 0 0',
                  padding: '20px 24px 24px',
                  textAlign: 'center',
                  position: 'relative',
                  color: '#fff',
                }}>
                  <button
                    onClick={() => setIsQRModalOpen(false)}
                    style={{
                      position: 'absolute', top: 14, right: 14,
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.18)',
                      border: 'none', cursor: 'pointer', color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <X size={15} />
                  </button>

                  {/* Animated phone + camera icon */}
                  <div style={{ fontSize: 36, marginBottom: 8, display: 'block' }}>📱</div>
                  <h2 style={{ fontWeight: 700, fontSize: 18, margin: 0 }}>Mobile Quick-Add</h2>
                  <p style={{ color: '#c4b5fd', fontSize: 13, marginTop: 4 }}>
                    Use your phone camera — no app needed
                  </p>
                </div>

                {/* QR code with 3D float + scanner overlay */}
                <div style={{ padding: '20px 24px 8px', display: 'flex', justifyContent: 'center' }}>
                  <div className="qr-float-card" style={{
                    position: 'relative',
                    background: '#fff',
                    borderRadius: 20,
                    padding: 14,
                    boxShadow: '0 8px 32px rgba(124,58,237,0.15), 0 2px 8px rgba(0,0,0,0.08)',
                    border: '1.5px solid #ede9fe',
                  }}>
                    <QRCode
                      value={`${window.location.origin}/mobile/add-product`}
                      size={210}
                      bgColor="#ffffff"
                      fgColor="#1e1b4b"
                    />

                    {/* Scanning laser line */}
                    <div className="qr-scan-line" />

                    {/* Viewfinder corners */}
                    {[
                      { top: 6, left: 6, borderTop: '3px solid #7c3aed', borderLeft: '3px solid #7c3aed' },
                      { top: 6, right: 6, borderTop: '3px solid #7c3aed', borderRight: '3px solid #7c3aed' },
                      { bottom: 6, left: 6, borderBottom: '3px solid #7c3aed', borderLeft: '3px solid #7c3aed' },
                      { bottom: 6, right: 6, borderBottom: '3px solid #7c3aed', borderRight: '3px solid #7c3aed' },
                    ].map((s, i) => (
                      <div key={i} className="qr-corner" style={{
                        position: 'absolute', width: 18, height: 18, borderRadius: 2, ...s,
                      }} />
                    ))}
                  </div>
                </div>

                {/* Animated step guide */}
                <div style={{ padding: '12px 24px 0', textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: qrStep === i ? 20 : 6,
                        height: 6, borderRadius: 99,
                        background: qrStep === i ? '#7c3aed' : '#e5e7eb',
                        transition: 'all 0.3s ease',
                      }} />
                    ))}
                  </div>
                  <div key={qrStep} className="qr-step-label" style={{ minHeight: 44 }}>
                    {qrStep === 0 && (
                      <p style={{ fontSize: 13, color: '#374151', fontWeight: 500, margin: 0 }}>
                        📷 <strong>Open your camera app</strong><br />
                        <span style={{ color: '#9ca3af', fontWeight: 400 }}>No QR scanner needed — just your camera</span>
                      </p>
                    )}
                    {qrStep === 1 && (
                      <p style={{ fontSize: 13, color: '#374151', fontWeight: 500, margin: 0 }}>
                        🎯 <strong>Point it at the code above</strong><br />
                        <span style={{ color: '#9ca3af', fontWeight: 400 }}>Hold steady until a link appears</span>
                      </p>
                    )}
                    {qrStep === 2 && (
                      <p style={{ fontSize: 13, color: '#374151', fontWeight: 500, margin: 0 }}>
                        ✅ <strong>Tap the link that pops up</strong><br />
                        <span style={{ color: '#9ca3af', fontWeight: 400 }}>Opens the add-product form instantly</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Copy link */}
                <div style={{ padding: '12px 24px 20px' }}>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/mobile/add-product`)}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 14,
                      border: '1.5px solid #ede9fe', background: '#faf5ff',
                      color: '#7c3aed', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

        {/* Inventory grid/table */}
        {filteredInventory.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredInventory.map((item) => (
                <InventoryItemComponent
                  key={item.id}
                  id={item.id}
                  name={item.name}
                  sku={item.sku}
                  category={(item as any).categoryName || item.category}
                  price={item.price}
                  cost={item.cost}
                  quantity={item.quantity}
                  threshold={item.threshold}
                  imageUrl={item.imageUrl}
                  isDuplicate={duplicateIds.has(item.id)}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                  className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-navy/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy/5">
                    <TableHead className="font-semibold text-navy">Name</TableHead>
                    <TableHead className="font-semibold text-navy">SKU</TableHead>
                    <TableHead className="font-semibold text-navy">Category</TableHead>
                    <TableHead className="font-semibold text-navy">Price</TableHead>
                    <TableHead className="font-semibold text-navy">Cost</TableHead>
                    <TableHead className="font-semibold text-navy">Quantity</TableHead>
                    <TableHead className="font-semibold text-navy">Status</TableHead>
                    <TableHead className="font-semibold text-navy text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => {
                    const stockStatus = item.quantity <= 0
                      ? 'Out of Stock'
                      : item.quantity <= item.threshold
                      ? 'Low Stock'
                      : 'In Stock';
                    const statusColor = item.quantity <= 0
                      ? 'text-red-600'
                      : item.quantity <= item.threshold
                      ? 'text-amber-600'
                      : 'text-green-600';

                    return (
                      <TableRow
                        key={item.id}
                        className={`cursor-pointer transition-colors ${duplicateIds.has(item.id) ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-navy/5'}`}
                        onClick={() => handleEditItem(item.id)}
                      >
                        <TableCell className="font-medium text-navy">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {duplicateIds.has(item.id) && (
                              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Duplicate</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{item.sku}</TableCell>
                        <TableCell className="text-sm text-gray-600">{(item as any).categoryName || item.category}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          £{item.price.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          £{item.cost?.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{item.quantity}</TableCell>
                        <TableCell className={`text-sm font-medium ${statusColor}`}>
                          {stockStatus}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditItem(item.id);
                              }}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditItem(item.id);
                              }}
                              className="text-navy hover:text-navy-dark hover:bg-navy/10"
                              title="Edit Product"
                            >
                              <Edit size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteItem(item.id);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Delete Product"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <div className="text-center py-10 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg border border-navy/10 rounded-xl shadow-sm p-8">
            <Package size={32} className="mx-auto text-navy/30 mb-2" />
            <p className="text-lg text-navy/70">No inventory items found matching your search.</p>
          </div>
        )}

        {/* Detail dialog for editing items */}
        <InventoryDetail
          item={selectedItem}
          isOpen={isDetailOpen}
          isNew={isNewItem}
          onClose={() => setIsDetailOpen(false)}
          onSave={handleSaveItem}
        />

        {/* Confirmation dialog for deletion */}
        <AlertDialog open={itemToDelete !== null} onOpenChange={() => setItemToDelete(null)}>
          <AlertDialogContent className="bg-white/95 backdrop-blur-lg border border-navy/10 rounded-xl shadow-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-navy font-medium">Delete Inventory Item</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600">
                Are you sure you want to delete this item? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-full border border-navy/10 hover:bg-navy/5 text-navy">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white rounded-full">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* CSV Import Preview Dialog */}
        <CSVImportDialog
          isOpen={isCSVImportDialogOpen}
          onClose={() => {
            setIsCSVImportDialogOpen(false);
            setParsedCSVData(null);
          }}
          parsedData={parsedCSVData}
          onConfirmImport={handleConfirmCSVImport}
        />

        <BulkRFIDAssignment
          isOpen={isBulkRFIDDialogOpen}
          onClose={() => setIsBulkRFIDDialogOpen(false)}
          onAssign={handleBulkRFIDAssign}
        />
      </div>
    </MainLayout>
  );
};

export default InventoryPage;
