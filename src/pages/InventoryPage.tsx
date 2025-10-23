
import React, { useState, useEffect } from 'react';
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
  Download
} from 'lucide-react';
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

import InventoryItemComponent, { InventoryItemProps} from '@/components/inventory/InventoryItem';
import InventoryDetail from '@/components/inventory/InventoryDetail';
import InventoryFilter from '@/components/inventory/InventoryFilter';

const InventoryPage = () => {
  const { inventory, updateItem, addItem, deleteItem, refreshInventory } = useInventory();
  const availableCategories = Array.from(new Set(inventory.map(item => item.category)));

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
  const { toast } = useToast();
  
  // Set isLoaded to true after component mounts to prevent initial render issues
  useEffect(() => {
    setIsLoaded(true);
    applyFilters('');
  }, []);

  // Apply search and filters to inventory
  const applyFilters = (searchTerm: string, filters?: any) => {
    let result = [...inventory];
    
    // Apply search
    if (searchTerm) {
      const lowercaseQuery = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.name.toLowerCase().includes(lowercaseQuery) || 
        item.sku.toLowerCase().includes(lowercaseQuery) || 
        item.category.toLowerCase().includes(lowercaseQuery) ||
        (item.description && item.description.toLowerCase().includes(lowercaseQuery))
      );
    }
    
    // Apply filters if provided
    if (filters) {
      // Filter by categories
      if (filters.categories.length > 0) {
        result = result.filter(item => filters.categories.includes(item.category));
      }
      
      // Filter by price range
      if (filters.minPrice !== null) {
        result = result.filter(item => item.price >= filters.minPrice);
      }
      if (filters.maxPrice !== null) {
        result = result.filter(item => item.price <= filters.maxPrice);
      }
      
      // Filter by stock status
      result = result.filter(item => {
        if (item.quantity <= 0 && !filters.stockStatus.outOfStock) return false;
        if (item.quantity <= item.threshold && item.quantity > 0 && !filters.stockStatus.lowStock) return false;
        if (item.quantity > item.threshold && !filters.stockStatus.inStock) return false;
        return true;
      });
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
    applyFilters(query);
  };
  
  // Handle sorting changes
  const handleSortChange = (value: string) => {
    setSortBy(value);
    applyFilters(searchQuery);
  };
  
  // Toggle sort order
  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    applyFilters(searchQuery);
  };
  
  // Handle filter changes
  const handleFilterChange = (filters: any) => {
    applyFilters(searchQuery, filters);
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
    applyFilters(searchQuery);
  }, [inventory]);

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
          
          <div className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <h3 className="text-2xl font-bold">{lowStockItems}</h3>
              </div>
              <AlertTriangle className={`h-8 w-8 ${lowStockItems > 0 ? 'text-amber-500' : 'text-muted-foreground/70'}`} />
            </div>
          </div>
          
          <div className="bg-card p-4 rounded-lg shadow-sm border">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <h3 className="text-2xl font-bold">{outOfStockItems}</h3>
              </div>
              <AlertTriangle className={`h-8 w-8 ${outOfStockItems > 0 ? 'text-destructive' : 'text-muted-foreground/70'}`} />
            </div>
          </div>
          
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
            </div>
            
            <InventoryFilter 
              availableCategories={availableCategories} 
              onFilterChange={handleFilterChange} 
            />
            
            <Button onClick={handleAddItem} className="bg-navy hover:bg-navy-dark text-white rounded-full px-4 shadow-sm">
              <Plus size={16} className="mr-1" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Inventory grid */}
        {filteredInventory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredInventory.map((item) => (
              <InventoryItemComponent
                key={item.id}
                id={item.id}
                name={item.name}
                sku={item.sku}
                category={item.category}
                price={item.price}
                cost={item.cost}
                quantity={item.quantity}
                threshold={item.threshold}
                imageUrl={item.imageUrl}
                onEdit={handleEditItem}
                onDelete={handleDeleteItem}
                className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
              />
            ))}
          </div>
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
      </div>
    </MainLayout>
  );
};

export default InventoryPage;
