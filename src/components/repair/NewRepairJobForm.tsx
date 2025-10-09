import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarIcon, X, Upload, Image as ImageIcon, AlertCircle, Search, UserPlus, Check, ChevronsUpDown } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { customerService } from '@/services/customerService';
import type { Customer } from '@/types/customer';

interface NewRepairJobFormProps {
  onSubmit: (repairJob: {
    customerName: string;
    phoneNumber: string;
    email: string;
    itemDescription: string;
    estimatedPrice: string;
    dueDate: string;
    notes: string;
    images: File[];
    customerId?: string;
    selectedCustomer?: Customer;
  }) => void;
  onCancel: () => void;
  onCreateCustomer?: () => void;
}

const NewRepairJobForm: React.FC<NewRepairJobFormProps> = ({ onSubmit, onCancel, onCreateCustomer }) => {
  // Customer selection state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [estimatedPrice, setEstimatedPrice] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Load customers from backend
  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const result = await customerService.getCustomers();
      const customerList = Array.isArray(result) ? result : result.data || [];
      setCustomers(customerList);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Handle customer selection
  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(`${customer.firstName} ${customer.lastName}`);
    setPhoneNumber(customer.phone || '');
    setEmail(customer.email || '');
    setIsNewCustomer(false);
    setCustomerSearchOpen(false);
    // Clear customer-related errors
    const newErrors = { ...errors };
    delete newErrors.customerName;
    delete newErrors.contact;
    setErrors(newErrors);
  };

  // Handle new customer creation
  const handleNewCustomer = () => {
    setSelectedCustomer(null);
    setIsNewCustomer(true);
    setCustomerName('');
    setPhoneNumber('');
    setEmail('');
    setCustomerSearchOpen(false);
    if (onCreateCustomer) {
      onCreateCustomer();
    } else {
      toast.info('Please fill in the customer details below');
    }
  };

  // Clear customer selection
  const clearCustomerSelection = () => {
    setSelectedCustomer(null);
    setIsNewCustomer(false);
    setCustomerName('');
    setPhoneNumber('');
    setEmail('');
  };

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      
      // Check if adding these files would exceed the maximum
      if (images.length + selectedFiles.length > 10) {
        toast.error("You can upload a maximum of 10 images");
        return;
      }
      
      // Add the new files to the existing files
      const newImages = [...images, ...selectedFiles];
      setImages(newImages);
      
      // Create URLs for preview
      const newImageUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setImageUrls([...imageUrls, ...newImageUrls]);
    }
  };

  // Remove an image
  const removeImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
    
    // Also remove the URL and revoke it to free memory
    const urlToRemove = imageUrls[index];
    const newImageUrls = [...imageUrls];
    newImageUrls.splice(index, 1);
    setImageUrls(newImageUrls);
    URL.revokeObjectURL(urlToRemove);
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Customer validation
    if (!selectedCustomer && !customerName.trim()) {
      newErrors.customerName = 'Customer selection or name is required';
    }
    
    if (!selectedCustomer && phoneNumber.trim() === '' && email.trim() === '') {
      newErrors.contact = 'At least one contact method (phone or email) is required for new customers';
    }
    
    if (!itemDescription.trim()) {
      newErrors.itemDescription = 'Item description is required';
    }
    
    if (!dueDate) {
      newErrors.dueDate = 'Due date is required';
    }
    
    if (!estimatedPrice.trim()) {
      newErrors.estimatedPrice = 'Estimated price is required';
    } else if (isNaN(parseFloat(estimatedPrice))) {
      newErrors.estimatedPrice = 'Price must be a valid number';
    }
    
    if (images.length === 0) {
      newErrors.images = 'At least one image is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({
        customerName,
        phoneNumber,
        email,
        itemDescription,
        estimatedPrice,
        dueDate: dueDate ? format(dueDate, 'yyyy-MM-dd') : '',
        notes,
        images,
        customerId: selectedCustomer?.id,
        selectedCustomer: selectedCustomer || undefined
      });
    }
  };

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New Repair Job</DialogTitle>
        <DialogDescription>
          Enter the details for the new repair job. Fields marked with * are required.
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        <div className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-3">
            <Label>Customer *</Label>
            
            {!selectedCustomer && !isNewCustomer ? (
              // Customer search/selection interface
              <div className="space-y-3">
                <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={customerSearchOpen}
                      className={cn(
                        "w-full justify-between",
                        errors.customerName && "border-red-500"
                      )}
                    >
                      <div className="flex items-center">
                        <Search className="mr-2 h-4 w-4" />
                        Search existing customer...
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search customers by name, phone, or email..." />
                      <CommandEmpty>
                        <div className="p-4 text-center">
                          <p className="text-sm text-muted-foreground mb-2">No customers found.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNewCustomer}
                            className="text-xs"
                          >
                            <UserPlus className="mr-1 h-3 w-3" />
                            Create New Customer
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup>
                        {loadingCustomers ? (
                          <div className="p-4 text-center">
                            <p className="text-sm text-muted-foreground">Loading customers...</p>
                          </div>
                        ) : (
                          customers.map((customer) => (
                            <CommandItem
                              key={customer.id}
                              value={`${customer.firstName} ${customer.lastName} ${customer.phone} ${customer.email}`}
                              onSelect={() => handleCustomerSelect(customer)}
                            >
                              <div className="flex items-center justify-between w-full">
                                <div>
                                  <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {customer.phone && `📞 ${customer.phone}`}
                                    {customer.phone && customer.email && ' • '}
                                    {customer.email && `✉️ ${customer.email}`}
                                  </p>
                                </div>
                                <Check className="ml-2 h-4 w-4 opacity-0" />
                              </div>
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleNewCustomer}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <UserPlus className="mr-1 h-3 w-3" />
                    Or create a new customer
                  </Button>
                </div>
              </div>
            ) : (
              // Selected customer display or new customer form
              <div className="space-y-3">
                {selectedCustomer ? (
                  // Display selected customer with edit option
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{selectedCustomer.firstName} {selectedCustomer.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedCustomer.phone && `📞 ${selectedCustomer.phone}`}
                          {selectedCustomer.phone && selectedCustomer.email && ' • '}
                          {selectedCustomer.email && `✉️ ${selectedCustomer.email}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearCustomerSelection}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  // New customer form
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name *</Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className={errors.customerName ? 'border-red-500' : ''}
                        placeholder="Enter full name"
                      />
                      {errors.customerName && (
                        <p className="text-xs text-red-500">{errors.customerName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className={errors.contact ? 'border-red-500' : ''}
                        placeholder="Enter phone number"
                      />
                    </div>
                    
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={errors.contact ? 'border-red-500' : ''}
                        placeholder="Enter email address"
                      />
                      {errors.contact && (
                        <p className="text-xs text-red-500">{errors.contact}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={clearCustomerSelection}
                      >
                        <Search className="mr-1 h-3 w-3" />
                        Search existing customers instead
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {errors.customerName && !selectedCustomer && !isNewCustomer && (
              <p className="text-xs text-red-500">{errors.customerName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground",
                      errors.dueDate && "border-red-500"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
              {errors.dueDate && (
                <p className="text-xs text-red-500">{errors.dueDate}</p>
              )}
            </div>
          </div>
          
          {/* Item Details */}
          <div className="space-y-2">
            <Label htmlFor="itemDescription">Item Description *</Label>
            <Textarea
              id="itemDescription"
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              className={cn("resize-none", errors.itemDescription ? 'border-red-500' : '')}
              rows={3}
            />
            {errors.itemDescription && (
              <p className="text-xs text-red-500">{errors.itemDescription}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="estimatedPrice">Estimated Price (£) *</Label>
            <Input
              id="estimatedPrice"
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.value)}
              className={errors.estimatedPrice ? 'border-red-500' : ''}
            />
            {errors.estimatedPrice && (
              <p className="text-xs text-red-500">{errors.estimatedPrice}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>
              Item Images * ({images.length}/10)
              <span className="text-xs text-muted-foreground ml-2">
                (Min: 1, Max: 10)
              </span>
            </Label>
            
            <div className={cn(
              "border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors",
              errors.images ? 'border-red-500' : 'border-muted'
            )}>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                multiple
                accept="image/*"
                className="hidden"
              />
              
              {images.length === 0 ? (
                <div 
                  className="flex flex-col items-center justify-center py-4"
                  onClick={triggerFileInput}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Click to upload images</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload clear photos of the item from multiple angles
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {imageUrls.map((url, index) => (
                      <div key={index} className="relative group aspect-square">
                        <img
                          src={url}
                          alt={`Item image ${index + 1}`}
                          className="w-full h-full object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(index);
                          }}
                          className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    
                    {images.length < 10 && (
                      <div
                        onClick={triggerFileInput}
                        className="border-2 border-dashed border-muted rounded-md flex items-center justify-center aspect-square cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground mb-1" />
                          <span className="text-xs text-muted-foreground">Add More</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {images.length < 10 && (
                    <p className="text-xs text-muted-foreground">
                      Click on the "Add More" box to upload additional images
                    </p>
                  )}
                </div>
              )}
            </div>
            
            {errors.images && (
              <p className="text-xs text-red-500 flex items-center">
                <AlertCircle size={12} className="mr-1" />
                {errors.images}
              </p>
            )}
          </div>
        </div>
        
        <DialogFooter className="pt-4 sm:justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Create Repair Job</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
};

export default NewRepairJobForm;
