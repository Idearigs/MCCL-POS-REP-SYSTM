import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar,
  Phone,
  Mail,
  User,
  Camera,
  Upload,
  X,
  Eye,
  Download,
  Clock,
  DollarSign,
  Wrench,
  AlertCircle,
  MessageSquare,
  CheckCircle,
  PlayCircle,
  PauseCircle,
  Package,
  FileText,
  Search,
  UserCheck,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { repairService } from '@/services/repairService';
import { customerService, Customer } from '@/services/customerService';
import { useRepairTags } from '@/contexts/RepairTagsContext';
import RepairTagBadge from './RepairTagBadge';

interface RepairDetailModalProps {
  repair: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (repairId: string, updates: any) => void;
}

const RepairDetailModal: React.FC<RepairDetailModalProps> = ({
  repair,
  isOpen,
  onClose,
  onUpdate
}) => {
  const { tags } = useRepairTags();
  const [activeTab, setActiveTab] = useState('overview');
  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [beforeImageUrls, setBeforeImageUrls] = useState<string[]>([]);
  const [afterImageUrls, setAfterImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [currentRepair, setCurrentRepair] = useState(repair);
  const [selectedTagId, setSelectedTagId] = useState(repair?.tagId || '');
  const [statusNotes, setStatusNotes] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);

  // Message notification states
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Status update states
  const [selectedStatus, setSelectedStatus] = useState(repair?.status || '');
  const [statusUpdateNotes, setStatusUpdateNotes] = useState('');
  const [updatingRepairStatus, setUpdatingRepairStatus] = useState(false);

  const beforeFileInputRef = useRef<HTMLInputElement>(null);
  const afterFileInputRef = useRef<HTMLInputElement>(null);

  // Sync currentRepair state when repair prop changes
  useEffect(() => {
    if (repair && isOpen) {
      setCurrentRepair(repair);
      console.log('🔍 RepairDetailModal - Repair prop updated:', {
        repairId: repair.id,
        status: repair.status,
        beforeImagesCount: repair.beforeImages?.length || 0,
        afterImagesCount: repair.afterImages?.length || 0,
        beforeImages: repair.beforeImages,
        afterImages: repair.afterImages
      });
    }
  }, [repair, isOpen]);

  // Auto-select message template when tag changes (removed - not needed for tags)
  // Tags don't require SMS notifications like statuses did

  // Fetch customer details when repair data is available
  useEffect(() => {
    const fetchCustomerData = async () => {
      console.log('🔧 RepairDetailModal useEffect triggered', {
        repair: repair ? {
          id: repair.id,
          customerId: repair.customerId,
          customerName: repair.customerName,
          hasCustomerId: !!repair.customerId
        } : null,
        isOpen
      });

      if (repair && repair.customerId && isOpen) {
        try {
          setLoadingCustomer(true);
          console.log(`🔍 Fetching customer details for ID: ${repair.customerId}`);
          const customer = await customerService.getCustomerById(repair.customerId);
          console.log(`✅ Customer data loaded:`, {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
            fullResponse: customer
          });
          setCustomerData(customer);
        } catch (error: any) {
          console.error('❌ Failed to fetch customer data:', error);
          console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          toast.error('Failed to load customer details');
        } finally {
          setLoadingCustomer(false);
        }
      } else {
        console.log('⚠️ Not fetching customer:', {
          hasRepair: !!repair,
          hasCustomerId: repair?.customerId,
          isOpen: isOpen,
          reason: !repair ? 'No repair' : !repair.customerId ? 'No customerId' : !isOpen ? 'Modal not open' : 'Unknown'
        });
      }
    };

    fetchCustomerData();
  }, [repair?.customerId, isOpen]);

  // Debug: Log tags and current repair tagId
  // IMPORTANT: This must be called BEFORE any early returns to comply with Rules of Hooks
  useEffect(() => {
    if (currentRepair) {
      console.log('🏷️ Available tags:', tags);
      console.log('🏷️ Current repair tagId:', currentRepair.tagId);
      const currentTag = tags.find(tag => tag.id === currentRepair.tagId);
      console.log('🏷️ Current tag found:', currentTag);
    }
  }, [tags, currentRepair?.tagId, tags]);

  // Early return AFTER all hooks have been called
  if (!currentRepair) return null;

  // Find the current tag for display
  const currentTag = tags.find(tag => tag.id === currentRepair.tagId);

  // Update repair tag
  const updateRepairTag = async () => {
    if (!selectedTagId || selectedTagId === currentRepair.tagId) {
      toast.error('Please select a different tag');
      return;
    }

    try {
      setUpdatingStatus(true);

      const selectedTag = tags.find(tag => tag.id === selectedTagId);
      if (!selectedTag) {
        toast.error('Invalid tag selected');
        return;
      }

      console.log('🏷️ Updating repair tag:', {
        repairId: currentRepair.id,
        oldTagId: currentRepair.tagId,
        newTagId: selectedTagId,
        tagName: selectedTag.name,
        notes: statusNotes || `Tag changed to ${selectedTag.name}`
      });

      // Update repair with new tag
      const updatedRepair = await repairService.updateRepair(currentRepair.id, {
        tagId: selectedTagId,
        notes: statusNotes || `Tag changed to ${selectedTag.name}`,
      });

      console.log('✅ Backend response:', updatedRepair);
      console.log('✅ Tag saved - tagId in response:', updatedRepair.tagId);

      // Update local repair state with the new tag
      setCurrentRepair({
        ...currentRepair,
        tagId: selectedTagId,
        updatedAt: new Date().toISOString()
      });

      // Show success message
      toast.success(`Tag updated to ${selectedTag.name}`);

      // Call onUpdate callback to refresh the repair list
      if (onUpdate) {
        console.log('🔄 Calling onUpdate to refresh repair list');
        await onUpdate(currentRepair.id, null);
      }

      // Reset form
      setStatusNotes('');
      setSelectedTagId('');

    } catch (error: any) {
      console.error('❌ Failed to update repair tag:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(`Failed to update tag: ${error.message}`);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Message templates - now editable
  const getMessageTemplate = (template: string) => {
    const templates = {
      received: `Hello, we have received your ${currentRepair.itemDescription} for repair. We will contact you shortly with an estimate. Reference: ${currentRepair.repairNumber || 'N/A'}`,
      quoted: `We have prepared a quote for your ${currentRepair.itemDescription} repair. Please contact us to discuss the details. Reference: ${currentRepair.repairNumber || 'N/A'}`,
      approved: `Thank you for approving the repair. We will begin work on your ${currentRepair.itemDescription} shortly. Reference: ${currentRepair.repairNumber || 'N/A'}`,
      inProgress: `Your ${currentRepair.itemDescription} repair is now in progress. We will notify you when it's ready for collection. Reference: ${currentRepair.repairNumber || 'N/A'}`,
      completed: `Good news! Your ${currentRepair.itemDescription} repair is complete and ready for collection. Please contact us to arrange pickup. Reference: ${currentRepair.repairNumber || 'N/A'}`,
      readyForCollection: `Your ${currentRepair.itemDescription} is ready for collection! Please visit us at your earliest convenience. Reference: ${currentRepair.repairNumber || 'N/A'}`,
      custom: ''
    };
    return templates[template as keyof typeof templates] || '';
  };

  // Update repair status
  const updateRepairStatus = async () => {
    if (!selectedStatus || selectedStatus === currentRepair.status) {
      toast.error('Please select a different status');
      return;
    }

    try {
      setUpdatingRepairStatus(true);

      console.log('🔄 Updating repair status:', {
        repairId: currentRepair.id,
        oldStatus: currentRepair.status,
        newStatus: selectedStatus,
        notes: statusUpdateNotes
      });

      // Update repair with new status
      const updatedRepair = await repairService.updateRepair(currentRepair.id, {
        status: selectedStatus,
        notes: statusUpdateNotes || `Status changed to ${selectedStatus}`,
      });

      console.log('✅ Status update response:', updatedRepair);

      // Update local repair state
      setCurrentRepair({
        ...currentRepair,
        status: selectedStatus,
        updatedAt: new Date().toISOString()
      });

      toast.success(`Status updated to ${getStatusText(selectedStatus)}`);

      // Call onUpdate callback to refresh the repair list
      if (onUpdate) {
        await onUpdate(currentRepair.id, null);
      }

      // Reset form
      setStatusUpdateNotes('');
      setSelectedStatus('');

    } catch (error: any) {
      console.error('❌ Failed to update repair status:', error);
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setUpdatingRepairStatus(false);
    }
  };

  // Send message to customer
  const sendMessageToCustomer = async () => {
    if (!customerData) {
      toast.error('Customer information not available');
      return;
    }

    if (!customerData.phone && !customerData.email) {
      toast.error('Customer has no contact information');
      return;
    }

    const messageToSend = customMessage?.trim() || getMessageTemplate(messageTemplate);

    if (!messageToSend?.trim()) {
      toast.error('Please enter a message or select a template');
      return;
    }

    try {
      setSendingMessage(true);

      // TODO: Implement actual SMS/Email sending via backend
      // For now, just show a success message
      console.log('📱 Sending message to customer:', {
        customerId: customerData.id,
        phone: customerData.phone,
        email: customerData.email,
        message: messageToSend
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success(`Message sent to ${customerData.firstName} ${customerData.lastName}`);

      // Reset message fields
      setMessageTemplate('');
      setCustomMessage('');

    } catch (error: any) {
      console.error('Failed to send message:', error);
      toast.error(`Failed to send message: ${error.message}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle before images upload
  const handleBeforeImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setBeforeImages([...beforeImages, ...selectedFiles]);
      
      // Create preview URLs
      const newUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setBeforeImageUrls([...beforeImageUrls, ...newUrls]);
    }
  };

  // Handle after images upload
  const handleAfterImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setAfterImages([...afterImages, ...selectedFiles]);
      
      // Create preview URLs
      const newUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setAfterImageUrls([...afterImageUrls, ...newUrls]);
    }
  };

  // Remove before image
  const removeBeforeImage = (index: number) => {
    const newImages = [...beforeImages];
    newImages.splice(index, 1);
    setBeforeImages(newImages);

    const urlToRemove = beforeImageUrls[index];
    const newUrls = [...beforeImageUrls];
    newUrls.splice(index, 1);
    setBeforeImageUrls(newUrls);
    URL.revokeObjectURL(urlToRemove);
  };

  // Remove after image
  const removeAfterImage = (index: number) => {
    const newImages = [...afterImages];
    newImages.splice(index, 1);
    setAfterImages(newImages);

    const urlToRemove = afterImageUrls[index];
    const newUrls = [...afterImageUrls];
    newUrls.splice(index, 1);
    setAfterImageUrls(newUrls);
    URL.revokeObjectURL(urlToRemove);
  };

  // Upload images to database
  const uploadImages = async () => {
    if (beforeImages.length === 0 && afterImages.length === 0) {
      toast.error('No images to upload');
      return;
    }

    try {
      setUploadingImages(true);
      let totalUploaded = 0;

      console.log('📤 Uploading images:', {
        beforeCount: beforeImages.length,
        afterCount: afterImages.length,
        repairId: repair.id
      });

      // Upload before images with 'before' metadata
      if (beforeImages.length > 0) {
        const result = await repairService.uploadRepairImages(repair.id, beforeImages, 'before');
        console.log('✅ Before images uploaded:', result);
        totalUploaded += beforeImages.length;
      }

      // Upload after images with 'after' metadata
      if (afterImages.length > 0) {
        const result = await repairService.uploadRepairImages(repair.id, afterImages, 'after');
        console.log('✅ After images uploaded:', result);
        totalUploaded += afterImages.length;
      }

      toast.success(`Uploaded ${totalUploaded} image(s) successfully`);

      // Clear local images
      setBeforeImages([]);
      setAfterImages([]);
      setBeforeImageUrls([]);
      setAfterImageUrls([]);

      console.log('🔄 Triggering repair refresh via onUpdate callback');
      // Refresh repair data if onUpdate callback exists
      if (onUpdate) {
        onUpdate(repair.id, null);
      }
    } catch (error: any) {
      console.error('Failed to upload images:', error);
      toast.error(`Failed to upload images: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  // Add progress note
  const addNote = async () => {
    if (!newNote.trim()) return;

    try {
      setAddingNote(true);
      // TODO: Implement note addition via repair service
      toast.success('Note added successfully');
      setNewNote('');
    } catch (error: any) {
      toast.error(`Failed to add note: ${error.message}`);
    } finally {
      setAddingNote(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-500 text-white';
      case 'READY_FOR_COLLECTION':
        return 'bg-green-400 text-white';
      case 'COLLECTED':
        return 'bg-green-600 text-white';
      case 'IN_PROGRESS':
        return 'bg-blue-500 text-white';
      case 'APPROVED':
        return 'bg-blue-400 text-white';
      case 'QUOTED':
        return 'bg-purple-500 text-white';
      case 'RECEIVED':
        return 'bg-amber-500 text-white';
      case 'CANCELLED':
        return 'bg-red-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusText = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'READY_FOR_COLLECTION':
        return 'Ready for Collection';
      case 'IN_PROGRESS':
        return 'In Progress';
      default:
        return status?.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center">
              <Wrench size={20} className="text-purple-500" />
            </div>
            Repair {repair.repairNumber}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex items-center gap-4">
              <span>Created {formatDate(currentRepair.createdAt)}</span>
              <Badge className={`${getStatusColor(currentRepair.status)} rounded-full px-3 py-1`}>
                {getStatusText(currentRepair.status)}
              </Badge>
            </div>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="images">Images</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User size={16} />
                    Customer Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">
                    {loadingCustomer ? 'Loading...' : 
                     customerData ? `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() || customerData.name || repair.customerName :
                     repair.customerName}
                  </p>
                  {customerData?.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone size={14} />
                      {customerData.phone}
                    </div>
                  )}
                  {customerData?.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail size={14} />
                      {customerData.email}
                    </div>
                  )}
                  {!loadingCustomer && !customerData?.phone && (
                    <div className="text-xs text-amber-600">
                      No phone number available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Repair Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench size={16} />
                    Repair Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-gray-500">Item Description</Label>
                    <p className="font-medium">{repair.itemDescription}</p>
                  </div>
                  {repair.problemDescription && (
                    <div>
                      <Label className="text-xs text-gray-500">Problem Description</Label>
                      <p className="text-sm text-gray-700">{repair.problemDescription}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Estimated Cost</Label>
                      <p className="font-medium flex items-center gap-1">
                        <DollarSign size={14} />
                        £{repair.estimatedCost?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    {repair.totalCost > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500">Final Cost</Label>
                        <p className="font-medium flex items-center gap-1 text-green-600">
                          <DollarSign size={14} />
                          £{repair.totalCost.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                  {repair.expectedCompletionDate && (
                    <div>
                      <Label className="text-xs text-gray-500">Expected Completion</Label>
                      <p className="text-sm flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(repair.expectedCompletionDate)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="images" className="space-y-6">
            {/* Before Images Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera size={16} />
                  Before Images
                  <span className="text-sm font-normal text-gray-500">
                    (Initial condition)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Before Images */}
                {repair.beforeImages && repair.beforeImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {repair.beforeImages.map((imageUrl: string, index: number) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border cursor-pointer hover:shadow-md transition-shadow">
                        <img
                          src={imageUrl}
                          alt={`Before image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* No existing images message */}
                {(!repair.beforeImages || repair.beforeImages.length === 0) && beforeImageUrls.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No before images yet. Upload images of the item's initial condition.</p>
                )}

                {/* Upload New Before Images */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={beforeFileInputRef}
                      onChange={handleBeforeImagesChange}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => beforeFileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Add Before Images
                    </Button>
                  </div>

                  {beforeImageUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {beforeImageUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                          <img
                            src={url}
                            alt={`New before image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeBeforeImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* After Images Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera size={16} />
                  After Images
                  <span className="text-sm font-normal text-gray-500">
                    (Completed work)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing After Images */}
                {repair.afterImages && repair.afterImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {repair.afterImages.map((imageUrl: string, index: number) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden border cursor-pointer hover:shadow-md transition-shadow">
                        <img
                          src={imageUrl}
                          alt={`After image ${index + 1}`}
                          className="w-full h-full object-cover"
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* No existing images message */}
                {(!repair.afterImages || repair.afterImages.length === 0) && afterImageUrls.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No after images yet. Upload images of the completed work.</p>
                )}

                {/* Upload New After Images */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={afterFileInputRef}
                      onChange={handleAfterImagesChange}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => afterFileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Add After Images
                    </Button>
                  </div>

                  {afterImageUrls.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {afterImageUrls.map((url, index) => (
                        <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                          <img
                            src={url}
                            alt={`New after image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeAfterImage(index)}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upload Button */}
            {(beforeImages.length > 0 || afterImages.length > 0) && (
              <div className="flex justify-center">
                <Button
                  onClick={uploadImages}
                  disabled={uploadingImages}
                  className="flex items-center gap-2"
                >
                  {uploadingImages ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      Upload All Images
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            {/* Repair Status Update Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle size={16} />
                  Update Repair Status
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Change the current status of this repair job
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Status Display */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-gray-500">Current Status</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${getStatusColor(currentRepair.status)} rounded-full px-3 py-1`}>
                          {getStatusText(currentRepair.status)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="status-select">Select New Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a status..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RECEIVED">Received</SelectItem>
                        <SelectItem value="QUOTED">Quoted</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="READY_FOR_COLLECTION">Ready for Collection</SelectItem>
                        <SelectItem value="COLLECTED">Collected</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Update Notes */}
                  <div>
                    <Label htmlFor="status-update-notes">Notes (Optional)</Label>
                    <Textarea
                      id="status-update-notes"
                      value={statusUpdateNotes}
                      onChange={(e) => setStatusUpdateNotes(e.target.value)}
                      placeholder="Add any additional notes about this status change..."
                      rows={3}
                    />
                  </div>

                  {/* Update Status Button */}
                  <Button
                    onClick={updateRepairStatus}
                    disabled={!selectedStatus || selectedStatus === currentRepair.status || updatingRepairStatus}
                    className="w-full flex items-center gap-2"
                    size="lg"
                  >
                    {updatingRepairStatus ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating Status...
                      </>
                    ) : (
                      <>
                        <PlayCircle size={16} />
                        Update Status
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tag Update Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench size={16} />
                  Update Repair Tag
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Categorize this repair job with a custom tag
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Tag Display */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs text-gray-500">Current Tag</Label>
                      <div className="flex items-center gap-2 mt-1">
                        {currentTag ? (
                          <RepairTagBadge tagName={currentTag.name} tagColor={currentTag.color} />
                        ) : (
                          <Badge className="bg-gray-400 text-white">No Tag</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tag Selection */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="tag-select">Select Tag</Label>
                      <span className="text-xs text-gray-500">{tags.length} tags available</span>
                    </div>
                    <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a tag..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tags.length === 0 && (
                          <div className="p-4 text-center text-gray-500">
                            <p>No tags available</p>
                            <p className="text-xs mt-1">Go to Settings → Repair Tags to add tags</p>
                          </div>
                        )}
                        {tags.map((tag) => {
                          const isCurrentTag = tag.id === currentRepair.tagId;
                          return (
                            <SelectItem
                              key={tag.id}
                              value={tag.id}
                              disabled={isCurrentTag}
                              className={isCurrentTag ? 'opacity-50' : ''}
                            >
                              <div className="flex items-center gap-2">
                                <RepairTagBadge tagName={tag.name} tagColor={tag.color} size="sm" />
                                <div>
                                  {isCurrentTag && <span className="text-xs text-gray-500 ml-1">(current)</span>}
                                  {tag.description && <p className="text-xs text-gray-500">{tag.description}</p>}
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tag Notes */}
                  <div>
                    <Label htmlFor="tag-notes">Notes (Optional)</Label>
                    <Textarea
                      id="tag-notes"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Add any additional notes about this tag change..."
                      rows={3}
                    />
                  </div>

                  {/* Update Button */}
                  <Button
                    onClick={updateRepairTag}
                    disabled={!selectedTagId || selectedTagId === currentRepair.tagId || updatingStatus}
                    className="w-full flex items-center gap-2"
                    size="lg"
                  >
                    {updatingStatus ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating Tag...
                      </>
                    ) : (
                      <>
                        <Wrench size={16} />
                        Update Tag
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Customer Notification Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare size={16} />
                  Send Message to Customer
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Notify customer about repair progress via SMS or Email
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Customer Contact Info Display */}
                {customerData && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-start gap-3">
                      <User size={16} className="text-blue-600 mt-1" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">
                          {customerData.firstName} {customerData.lastName}
                        </p>
                        {customerData.phone && (
                          <p className="text-sm text-blue-700 flex items-center gap-1 mt-1">
                            <Phone size={12} />
                            {customerData.phone}
                          </p>
                        )}
                        {customerData.email && (
                          <p className="text-sm text-blue-700 flex items-center gap-1 mt-1">
                            <Mail size={12} />
                            {customerData.email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {!customerData && loadingCustomer && (
                  <div className="p-3 bg-gray-50 rounded-lg text-center text-gray-500">
                    Loading customer information...
                  </div>
                )}

                {!customerData && !loadingCustomer && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800">Customer information not available</p>
                  </div>
                )}

                {/* Message Template Selection */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="message-template">Message Template</Label>
                    <Select value={messageTemplate} onValueChange={(value) => {
                      setMessageTemplate(value);
                      // Pre-fill custom message with template text for editing
                      if (value !== 'custom' && value !== '') {
                        setCustomMessage(getMessageTemplate(value));
                      } else if (value === 'custom') {
                        setCustomMessage('');
                      }
                    }}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a message template..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="received">Repair Received</SelectItem>
                        <SelectItem value="quoted">Quote Prepared</SelectItem>
                        <SelectItem value="approved">Repair Approved</SelectItem>
                        <SelectItem value="inProgress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="readyForCollection">Ready for Collection</SelectItem>
                        <SelectItem value="custom">Start from Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Editable Message Area */}
                  {messageTemplate && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label htmlFor="message-content">Message Content</Label>
                        <span className="text-xs text-gray-500">
                          {messageTemplate !== 'custom' && 'Template selected - edit below'}
                        </span>
                      </div>
                      <Textarea
                        id="message-content"
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        placeholder="Edit the message template or write your own message..."
                        rows={5}
                        className="font-mono text-sm"
                      />
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-500">
                          {customMessage.length} characters
                        </p>
                        {messageTemplate !== 'custom' && customMessage !== getMessageTemplate(messageTemplate) && (
                          <p className="text-xs text-blue-600">Modified from template</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Send Button */}
                  <Button
                    onClick={sendMessageToCustomer}
                    disabled={!messageTemplate || !customerData || sendingMessage || !customMessage?.trim()}
                    className="w-full flex items-center gap-2"
                    size="lg"
                  >
                    {sendingMessage ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <MessageSquare size={16} />
                        Send Message to Customer
                      </>
                    )}
                  </Button>

                  {!customerData?.phone && !customerData?.email && customerData && (
                    <p className="text-xs text-yellow-600 text-center">
                      ⚠️ Customer has no phone or email on file
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Repair Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock size={16} />
                  Repair Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Clock size={14} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Repair Created</p>
                      <p className="text-sm text-gray-600">{formatDate(repair.createdAt)}</p>
                    </div>
                  </div>

                  {repair.actualCompletionDate && (
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Wrench size={14} className="text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Repair Completed</p>
                        <p className="text-sm text-gray-600">{formatDate(repair.actualCompletionDate)}</p>
                      </div>
                    </div>
                  )}

                  {/* Display status history if available */}
                  {repair.notes && repair.notes.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-3">Status History</h4>
                      <div className="space-y-3">
                        {repair.notes.map((note: any, index: number) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <MessageSquare size={12} className="text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{note.note}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatDate(note.createdAt)} - {note.createdByName}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Add Progress Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about the repair progress..."
                  rows={3}
                />
                <Button
                  onClick={addNote}
                  disabled={!newNote.trim() || addingNote}
                  className="flex items-center gap-2"
                >
                  {addingNote ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    'Add Note'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Existing Notes */}
            {repair.notes && repair.notes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Progress History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {repair.notes.map((note: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm">{note.note}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(note.createdAt)} - {note.createdByName}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default RepairDetailModal;