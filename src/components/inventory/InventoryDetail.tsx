
import React, { useState, useEffect, useRef } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { X, Upload, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface InventoryItemDetails {
  id: string;
  name: string;
  category: string;
  sku: string;
  description: string;
  price: number;
  cost: number;
  quantity: number;
  threshold: number;
  supplier: string;
  location: string;
  dateAdded: string;
  lastRestocked: string;
  imageUrl?: string;
  additionalImages?: string[];
}

export interface InventoryDetailProps {
  item: InventoryItemDetails | null;
  isOpen: boolean;
  isNew?: boolean; // Add the isNew prop
  onClose: () => void;
  onSave: (item: InventoryItemDetails) => void;
}

const InventoryDetail: React.FC<InventoryDetailProps> = ({ 
  item, 
  isOpen, 
  isNew = false, // Default to false
  onClose, 
  onSave 
}) => {
  // Create a default empty item for initialization
  const defaultItem: InventoryItemDetails = {
    id: '',
    name: '',
    category: '',
    sku: '',
    description: '',
    price: 0,
    cost: 0,
    quantity: 0,
    threshold: 0,
    supplier: '',
    location: '',
    dateAdded: new Date().toISOString().split('T')[0],
    lastRestocked: new Date().toISOString().split('T')[0],
    imageUrl: '',
    additionalImages: [],
  };

  // Initialize with item or defaultItem if item is null
  const [editedItem, setEditedItem] = useState<InventoryItemDetails>(item || defaultItem);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setEditedItem(item);
      // Reset preview URLs when item changes
      const urls: string[] = [];
      if (item.imageUrl) urls.push(item.imageUrl);
      if (item.additionalImages) urls.push(...item.additionalImages);
      setPreviewUrls(urls);
    } else if (isNew) {
      setEditedItem(defaultItem);
      setPreviewUrls([]);
    }
  }, [item, isNew]);
  
  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditedItem(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedItem(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setEditedItem(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const totalImages = previewUrls.length + files.length;
      
      if (totalImages > 5) {
        alert('You can upload a maximum of 5 images');
        return;
      }
      
      // Create object URLs for previews
      const newUrls = files.map(file => URL.createObjectURL(file));
      
      setImageFiles(prev => [...prev, ...files]);
      setPreviewUrls(prev => [...prev, ...newUrls]);
      
      // Update the editedItem with the first image as main image if not already set
      if (!editedItem.imageUrl && newUrls.length > 0) {
        setEditedItem(prev => ({
          ...prev,
          imageUrl: newUrls[0],
          additionalImages: newUrls.slice(1)
        }));
      } else {
        setEditedItem(prev => ({
          ...prev,
          additionalImages: [...(prev.additionalImages || []), ...newUrls]
        }));
      }
    }
  };
  
  const handleRemoveImage = (index: number) => {
    const newPreviewUrls = [...previewUrls];
    const removedUrl = newPreviewUrls.splice(index, 1)[0];
    
    // Revoke the object URL to free memory
    if (removedUrl.startsWith('blob:')) {
      URL.revokeObjectURL(removedUrl);
    }
    
    setPreviewUrls(newPreviewUrls);
    
    // Update the editedItem
    if (index === 0 && newPreviewUrls.length > 0) {
      // If removing the main image, set the next image as main
      setEditedItem(prev => ({
        ...prev,
        imageUrl: newPreviewUrls[0],
        additionalImages: newPreviewUrls.slice(1)
      }));
    } else if (index === 0) {
      // If removing the main image and no other images
      setEditedItem(prev => ({
        ...prev,
        imageUrl: '',
        additionalImages: []
      }));
    } else {
      // If removing an additional image
      setEditedItem(prev => ({
        ...prev,
        additionalImages: newPreviewUrls.slice(1)
      }));
    }
    
    // Also remove from the files array
    const newImageFiles = [...imageFiles];
    newImageFiles.splice(index, 1);
    setImageFiles(newImageFiles);
  };
  
  const handleSave = () => {
    // Ensure at least one image is uploaded
    if (previewUrls.length === 0) {
      alert('Please upload at least one image');
      return;
    }
    
    // Generate a random ID if this is a new item and doesn't have an ID
    if (isNew && !editedItem.id) {
      const newItem = {
        ...editedItem,
        id: Math.random().toString(36).substring(2, 9),
        imageUrl: previewUrls[0],
        additionalImages: previewUrls.slice(1)
      };
      onSave(newItem);
    } else {
      onSave({
        ...editedItem,
        imageUrl: previewUrls[0],
        additionalImages: previewUrls.slice(1)
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add New Item" : "Edit Item"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                name="name"
                value={editedItem.name}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select 
                value={editedItem.category} 
                onValueChange={(value) => handleSelectChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rings">Rings</SelectItem>
                  <SelectItem value="necklaces">Necklaces</SelectItem>
                  <SelectItem value="earrings">Earrings</SelectItem>
                  <SelectItem value="bracelets">Bracelets</SelectItem>
                  <SelectItem value="watches">Watches</SelectItem>
                  <SelectItem value="gemstones">Gemstones</SelectItem>
                  <SelectItem value="tools">Tools</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <Input
                id="sku"
                name="sku"
                value={editedItem.sku}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                name="supplier"
                value={editedItem.supplier}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={editedItem.price}
                onChange={handleNumberChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                id="cost"
                name="cost"
                type="number"
                min="0"
                step="0.01"
                value={editedItem.cost}
                onChange={handleNumberChange}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                value={editedItem.quantity}
                onChange={handleNumberChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="threshold">Reorder Level</Label>
              <Input
                id="threshold"
                name="threshold"
                type="number"
                min="0"
                value={editedItem.threshold}
                onChange={handleNumberChange}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={editedItem.description}
              onChange={handleChange}
              className="resize-none"
              rows={4}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Product Images (1-5 images)</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {previewUrls.length > 0 ? (
                previewUrls.map((url, index) => (
                  <div key={index} className="relative">
                    <Avatar className={cn(
                      "h-20 w-20 rounded-md border",
                      index === 0 ? "ring-2 ring-primary" : ""
                    )}>
                      <AvatarImage src={url} alt={`Product image ${index + 1}`} className="object-cover" />
                      <AvatarFallback className="rounded-md">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="h-5 w-5 absolute -top-2 -right-2 rounded-full"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    {index === 0 && (
                      <span className="absolute -bottom-1 left-0 right-0 text-center text-xs font-medium bg-primary text-primary-foreground rounded-sm">
                        Main
                      </span>
                    )}
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
              
              {previewUrls.length < 5 && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-20 w-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="h-6 w-6" />
                </Button>
              )}
            </div>
            
            <div className="text-xs text-muted-foreground mt-1">
              {previewUrls.length === 0 ? (
                <span className="text-destructive font-medium">* At least 1 image required</span>
              ) : (
                <span>{previewUrls.length} of 5 images uploaded</span>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              multiple
            />
          </div>
        </div>
        <DialogFooter className="sticky bottom-0 bg-white pt-2 border-t mt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryDetail;
