import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from '@/hooks/use-toast';
import { useTransactions, SaleTransaction } from '@/contexts/TransactionContext';
import { useInventory } from '@/contexts/InventoryContext';
import { X, Upload, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ReturnItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  returnQuantity: number;
  reason: string;
  condition: 'good' | 'damaged' | 'defective';
  images: string[];
}

interface ReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ReturnForm: React.FC<ReturnFormProps> = ({ isOpen, onClose, onSuccess }) => {
  const [transactionId, setTransactionId] = useState('');
  const [transaction, setTransaction] = useState<SaleTransaction | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { salesTransactions } = useTransactions();
  const { updateQuantityBySku, markItemAsDamaged } = useInventory();
  
  // Find transaction by ID
  const findTransaction = () => {
    if (!transactionId.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a transaction ID.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Find the transaction in the sales history
    const found = salesTransactions.find(t => t.id === transactionId);
    
    if (!found) {
      toast({
        title: "Transaction not found",
        description: "No transaction with this ID was found in the sales history.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    toast({
      title: "Transaction found",
      description: `Transaction from ${found.date} loaded successfully.`,
      duration: 3000,
    });
    
    setTransaction(found);
    
    // Initialize return items
    const items = found.items.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku || '',
      quantity: item.quantity,
      returnQuantity: 0,
      reason: '',
      condition: 'good' as const,
      images: []
    }));
    
    setReturnItems(items);
  };
  
  // Handle return quantity change
  const handleReturnQuantityChange = (id: string, quantity: number) => {
    setReturnItems(prevItems => 
      prevItems.map(item => 
        item.id === id 
          ? { ...item, returnQuantity: Math.min(quantity, item.quantity) } 
          : item
      )
    );
  };
  
  // Handle return reason change
  const handleReasonChange = (id: string, reason: string) => {
    setReturnItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, reason } : item
      )
    );
  };
  
  // Handle condition change
  const handleConditionChange = (id: string, condition: 'good' | 'damaged' | 'defective') => {
    setReturnItems(prevItems => 
      prevItems.map(item => 
        item.id === id ? { ...item, condition } : item
      )
    );
  };
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, itemId: string) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const item = returnItems.find(i => i.id === itemId);
      
      if (!item) return;
      
      const totalImages = item.images.length + files.length;
      
      if (totalImages > 5) {
        toast({
          title: "Too many images",
          description: "You can upload a maximum of 5 images per item.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      
      // Create object URLs for previews
      const newUrls = files.map(file => URL.createObjectURL(file));
      
      setImageFiles(prev => [...prev, ...files]);
      
      // Update the specific item's images
      setReturnItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, images: [...item.images, ...newUrls] } 
            : item
        )
      );
    }
  };
  
  // Handle removing an image
  const handleRemoveImage = (itemId: string, imageIndex: number) => {
    setReturnItems(prevItems => 
      prevItems.map(item => {
        if (item.id === itemId) {
          const newImages = [...item.images];
          const removedUrl = newImages.splice(imageIndex, 1)[0];
          
          // Revoke the object URL to free memory
          if (removedUrl.startsWith('blob:')) {
            URL.revokeObjectURL(removedUrl);
          }
          
          return { ...item, images: newImages };
        }
        return item;
      })
    );
  };
  
  // Process the return
  const handleProcessReturn = () => {
    // Validate return items
    const itemsToReturn = returnItems.filter(item => item.returnQuantity > 0);
    
    if (itemsToReturn.length === 0) {
      toast({
        title: "No items to return",
        description: "Please specify at least one item to return.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Validate reasons
    const missingReasons = itemsToReturn.filter(item => !item.reason.trim());
    if (missingReasons.length > 0) {
      toast({
        title: "Missing information",
        description: "Please provide a reason for each returned item.",
        variant: "destructive",
        duration: 3000,
      });
      return;
    }
    
    // Update inventory
    itemsToReturn.forEach(item => {
      if (item.sku) {
        // Add the returned quantity back to inventory
        updateQuantityBySku(item.sku, item.returnQuantity);
        
        // If item is damaged or defective, mark it in inventory
        if (item.condition !== 'good') {
          markItemAsDamaged(item.sku, item.returnQuantity, item.condition, item.reason);
        }
      }
    });
    
    // Create return record (in a real app, this would save to a database)
    const returnRecord = {
      originalTransactionId: transaction?.id,
      returnDate: new Date().toISOString(),
      items: itemsToReturn,
      reason: returnReason,
      totalItems: itemsToReturn.reduce((sum, item) => sum + item.returnQuantity, 0)
    };
    
    // Log the return for demonstration
    console.log('Return processed:', returnRecord);
    
    toast({
      title: "Return processed successfully",
      description: `${returnRecord.totalItems} items have been returned and inventory updated.`,
      duration: 3000,
    });
    
    // Reset form
    resetForm();
    
    // Notify parent component
    onSuccess();
  };
  
  // Reset the form
  const resetForm = () => {
    setTransactionId('');
    setTransaction(null);
    setReturnItems([]);
    setReturnReason('');
    setImageFiles([]);
    setPreviewUrls([]);
    
    // Revoke all object URLs
    returnItems.forEach(item => {
      item.images.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    });
  };
  
  // Clean up URLs when component unmounts
  React.useEffect(() => {
    return () => {
      returnItems.forEach(item => {
        item.images.forEach(url => {
          if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <Dialog open={isOpen} onOpenChange={() => {
      resetForm();
      onClose();
    }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Process Return/Exchange</DialogTitle>
          <DialogDescription>
            Enter transaction details and items to be returned.
          </DialogDescription>
        </DialogHeader>
        
        <div className="overflow-y-auto flex-1 pr-1">
          {!transaction ? (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="transaction-id">Transaction ID</Label>
                <div className="flex gap-2">
                  <Input 
                    id="transaction-id" 
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID"
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        findTransaction();
                      }
                    }}
                  />
                  <Button 
                    onClick={findTransaction}
                    className="bg-navy hover:bg-navy/90"
                  >
                    Find
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Enter a valid transaction ID from your sales history and click Find.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 py-4">
              <div className="bg-muted/30 p-4 rounded-md">
                <h3 className="font-medium mb-2">Transaction Details</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Transaction ID:</span>
                    <span className="ml-2 font-medium">{transaction.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <span className="ml-2 font-medium">{transaction.date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Customer:</span>
                    <span className="ml-2 font-medium">{transaction.customerName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="ml-2 font-medium">
                      {new Intl.NumberFormat('en-GB', {
                        style: 'currency',
                        currency: 'GBP'
                      }).format(transaction.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="return-reason">Overall Return Reason</Label>
                <Textarea 
                  id="return-reason" 
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="General reason for the return"
                  rows={2}
                />
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Items to Return</h3>
                
                {returnItems.map((item, index) => (
                  <div key={item.id} className="border rounded-md p-4 space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{item.name}</h4>
                      <div className="text-sm text-muted-foreground">
                        Purchased: {item.quantity} {item.quantity > 1 ? 'units' : 'unit'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`return-qty-${item.id}`}>Return Quantity</Label>
                        <Input 
                          id={`return-qty-${item.id}`} 
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={item.returnQuantity}
                          onChange={(e) => handleReturnQuantityChange(item.id, parseInt(e.target.value) || 0)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`condition-${item.id}`}>Condition</Label>
                        <Select 
                          value={item.condition} 
                          onValueChange={(value: 'good' | 'damaged' | 'defective') => handleConditionChange(item.id, value)}
                          disabled={item.returnQuantity === 0}
                        >
                          <SelectTrigger id={`condition-${item.id}`}>
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Good (Resellable)</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                            <SelectItem value="defective">Defective</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`reason-${item.id}`}>Reason for Return</Label>
                      <Textarea 
                        id={`reason-${item.id}`} 
                        value={item.reason}
                        onChange={(e) => handleReasonChange(item.id, e.target.value)}
                        placeholder="Specific reason for returning this item"
                        rows={2}
                        disabled={item.returnQuantity === 0}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Images (0-5)</Label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {item.images.length > 0 ? (
                          item.images.map((url, imgIndex) => (
                            <div key={imgIndex} className="relative">
                              <Avatar className="h-20 w-20 rounded-md border">
                                <AvatarImage src={url} alt={`Return image ${imgIndex + 1}`} className="object-cover" />
                                <AvatarFallback className="rounded-md">
                                  <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                </AvatarFallback>
                              </Avatar>
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="h-5 w-5 absolute -top-2 -right-2 rounded-full"
                                onClick={() => handleRemoveImage(item.id, imgIndex)}
                                disabled={item.returnQuantity === 0}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <div className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-md border-muted-foreground/25">
                            <div className="text-center">
                              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
                              <p className="mt-1 text-sm text-muted-foreground">No images uploaded</p>
                            </div>
                          </div>
                        )}
                        
                        {item.images.length < 5 && item.returnQuantity > 0 && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-20 w-20 border-dashed"
                            onClick={() => {
                              const input = document.createElement('input');
                              input.type = 'file';
                              input.multiple = true;
                              input.accept = 'image/*';
                              input.onchange = (e) => {
                                if (e.target instanceof HTMLInputElement && e.target.files) {
                                  const event = { target: { files: e.target.files } } as React.ChangeEvent<HTMLInputElement>;
                                  handleFileChange(event, item.id);
                                }
                              };
                              input.click();
                            }}
                          >
                            <Plus className="h-6 w-6" />
                          </Button>
                        )}
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        {item.returnQuantity === 0 ? (
                          <span>Set return quantity to upload images</span>
                        ) : (
                          <span>{item.images.length} of 5 images uploaded</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="sticky bottom-0 bg-white pt-2 border-t mt-2">
          <Button variant="outline" onClick={() => {
            resetForm();
            onClose();
          }}>
            Cancel
          </Button>
          {transaction && (
            <Button 
              onClick={handleProcessReturn}
              className="bg-navy hover:bg-navy/90"
            >
              Process Return
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReturnForm;
