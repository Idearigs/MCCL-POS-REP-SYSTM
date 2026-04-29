
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
import { X, Upload, Image as ImageIcon, Plus, Trash2, Shuffle } from "lucide-react";
import { cn, normalizeImageUrl } from "@/lib/utils";
import { productService } from "@/services/productService";
import { useAuth } from "@/contexts/AuthContext";

const WATCH_BRANDS = ['Rosefeild', 'Roamer', 'Briston', 'Festina', 'Secondhand watches'];

const MATERIALS = [
  'YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD',
  'SILVER', 'PLATINUM', 'DIAMOND',
  'PEARL', 'GEMSTONE', 'STAINLESS_STEEL', 'OTHER',
];
const GOLD_TYPES = new Set(['YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD']);
const GOLD_CARATS = ['9CT', '14CT', '18CT', '22CT', '24CT'];
const MATERIAL_LABELS: Record<string, string> = {
  YELLOW_GOLD: 'Yellow Gold', WHITE_GOLD: 'White Gold', ROSE_GOLD: 'Rose Gold',
  GOLD: 'Gold', SILVER: 'Silver', PLATINUM: 'Platinum', DIAMOND: 'Diamond',
  PEARL: 'Pearl', GEMSTONE: 'Gemstone', STAINLESS_STEEL: 'Stainless Steel', OTHER: 'Other',
};
const CARAT_LABELS: Record<string, string> = {
  '9CT': '9ct', '14CT': '14ct', '18CT': '18ct', '22CT': '22ct', '24CT': '24ct',
};

function parseMaterial(raw: string): { base: string; carat: string } {
  for (const base of ['YELLOW_GOLD', 'WHITE_GOLD', 'ROSE_GOLD']) {
    for (const ct of GOLD_CARATS) {
      if (raw === `${base}_${ct}`) return { base, carat: ct };
    }
    if (raw === base) return { base, carat: '' };
  }
  if (raw === 'GOLD') return { base: 'YELLOW_GOLD', carat: '' };
  return { base: raw || 'YELLOW_GOLD', carat: '' };
}

function combineMaterial(base: string, carat: string): string {
  if (GOLD_TYPES.has(base) && carat) return `${base}_${carat}`;
  return base;
}

function generateSKU(name: string, material: string): string {
  const prefix = material.startsWith('YELLOW_GOLD') ? 'YGD'
    : material.startsWith('WHITE_GOLD') ? 'WGD'
    : material.startsWith('ROSE_GOLD') ? 'RGD'
    : material === 'OTHER' ? 'JWL'
    : material.slice(0, 3);
  const nameCode = name.replace(/\s+/g, '-').toUpperCase().slice(0, 8);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${nameCode}-${rand}`;
}

export interface InventoryItemDetails {
  id: string;
  name: string;
  category: string;
  condition?: string;
  material?: string;
  sku: string;
  rfidTag?: string;
  description: string;
  price: number;
  cost: number;
  weight?: number;
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
  onSave: (item: InventoryItemDetails, imageFiles?: File[]) => void;
}

const InventoryDetail: React.FC<InventoryDetailProps> = ({ 
  item, 
  isOpen, 
  isNew = false, // Default to false
  onClose, 
  onSave 
}) => {
  const { auth } = useAuth();
  const isBuyme = auth.tenantInfo?.tenantSlug === 'buymejewellery';

  // Create a default empty item for initialization
  const defaultItem: InventoryItemDetails = {
    id: '',
    name: '',
    category: '',
    condition: 'BRAND_NEW',
    sku: '',
    rfidTag: '',
    description: '',
    price: 0,
    cost: 0,
    weight: undefined,
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
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Material state — parsed from stored value like "WHITE_GOLD_18CT"
  const [baseMaterial, setBaseMaterial] = useState('YELLOW_GOLD');
  const [carat, setCarat] = useState('');

  // Show watch brand picker whenever the selected category name contains "watch"
  const selectedCategoryName = categories.find(c => c.id === editedItem.category)?.name || '';
  const isWatchCategory = selectedCategoryName.toLowerCase().includes('watch');

  // Fetch categories from backend when dialog opens
  useEffect(() => {
    if (isOpen) {
      productService.getCategories().then(setCategories).catch(console.error);
    }
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      setEditedItem(item);
      const { base, carat: ct } = parseMaterial((item as any).material ?? '');
      setBaseMaterial(base);
      setCarat(ct);

      const urls: string[] = [];
      if (item.imageUrl) urls.push(normalizeImageUrl(item.imageUrl) || item.imageUrl);
      if (item.additionalImages) urls.push(...item.additionalImages.map(u => normalizeImageUrl(u) || u));
      setPreviewUrls(urls);
      setImageFiles([]);
    } else if (isNew) {
      setEditedItem(defaultItem);
      setBaseMaterial('YELLOW_GOLD');
      setCarat('');
      setPreviewUrls([]);
      setImageFiles([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  
  const handleSave = async () => {
    if (previewUrls.length === 0 && isNew) {
      alert('Please upload at least one image');
      return;
    }
    onSave({ ...editedItem, material: combineMaterial(baseMaterial, carat) } as any, imageFiles);
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
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={editedItem.condition || 'BRAND_NEW'}
                onValueChange={(value) => handleSelectChange('condition', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRAND_NEW">Brand New</SelectItem>
                  <SelectItem value="USED">Used</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sku">SKU</Label>
              <div className="flex gap-1">
                <Input
                  id="sku"
                  name="sku"
                  value={editedItem.sku}
                  onChange={handleChange}
                  placeholder="e.g., JWL-RING-001"
                  className="font-mono"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Auto-generate SKU"
                  onClick={() => {
                    if (!editedItem.name) return;
                    setEditedItem(prev => ({ ...prev, sku: generateSKU(prev.name, combineMaterial(baseMaterial, carat)) }));
                  }}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Material */}
          <div className="space-y-2">
            <Label>Material</Label>
            <div className="flex flex-wrap gap-2">
              {MATERIALS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setBaseMaterial(m);
                    if (!GOLD_TYPES.has(m)) setCarat('');
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    baseMaterial === m
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400 hover:text-indigo-600'
                  }`}
                >
                  {MATERIAL_LABELS[m]}
                </button>
              ))}
            </div>
            {GOLD_TYPES.has(baseMaterial) && (
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-gray-500 self-center font-medium">Carat:</span>
                {GOLD_CARATS.map(ct => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setCarat(prev => prev === ct ? '' : ct)}
                    className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                      carat === ct
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                    }`}
                  >
                    {CARAT_LABELS[ct]}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rfidTag">RFID Tag</Label>
            <Input
              id="rfidTag"
              name="rfidTag"
              value={editedItem.rfidTag || ''}
              onChange={handleChange}
              placeholder="e.g., E2801170000002010DC90E8F"
            />
            <p className="text-xs text-gray-500">Optional: For fast inventory scanning</p>
          </div>

          {/* Watch Brand — visible when Watch category is selected */}
          {isWatchCategory && (
            <div className="space-y-2">
              <Label>Watch Brand</Label>
              <div className="flex flex-wrap gap-2">
                {WATCH_BRANDS.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() =>
                      setEditedItem(prev => ({ ...prev, supplier: prev.supplier === b ? '' : b }))
                    }
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      editedItem.supplier === b
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-amber-400 hover:text-amber-600'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400">Tap to select brand · also saved as Supplier</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                name="supplier"
                value={editedItem.supplier}
                onChange={handleChange}
                placeholder="e.g., ABC Gems Ltd"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={editedItem.location}
                onChange={handleChange}
                placeholder="e.g., Shelf A1"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (£)</Label>
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
              <Label htmlFor="cost">Cost (£)</Label>
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
          
          <div className="space-y-2">
            <Label htmlFor="weight">Weight (g)</Label>
            <Input
              id="weight"
              name="weight"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 3.75"
              value={editedItem.weight ?? ''}
              onChange={handleNumberChange}
            />
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
              value={editedItem.description || ''}
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
