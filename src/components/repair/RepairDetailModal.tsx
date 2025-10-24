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
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { repairService } from '@/services/repairService';
import { customerService, Customer } from '@/services/customerService';
import { useRepairMessages } from '@/contexts/RepairMessagesContext';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [beforeImages, setBeforeImages] = useState<File[]>([]);
  const [afterImages, setAfterImages] = useState<File[]>([]);
  const [beforeImageUrls, setBeforeImageUrls] = useState<string[]>([]);
  const [afterImageUrls, setAfterImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [currentRepair, setCurrentRepair] = useState(repair);
  const [selectedStatus, setSelectedStatus] = useState(repair?.status || '');
  const [statusNotes, setStatusNotes] = useState('');
  const [sendSMS, setSendSMS] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [customerData, setCustomerData] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [selectedMessageTemplate, setSelectedMessageTemplate] = useState<string>('none');
  const { templates, getTemplateByStatus } = useRepairMessages();

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

  // Auto-select message template when status changes
  useEffect(() => {
    if (selectedStatus) {
      const template = getTemplateByStatus(selectedStatus);
      if (template) {
        setSelectedMessageTemplate(template.id);
        setSendSMS(true); // Enable SMS if template found
      } else {
        setSelectedMessageTemplate('none');
      }
    }
  }, [selectedStatus, getTemplateByStatus]);

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

  if (!currentRepair) return null;

  // Available repair statuses with their display information (matching backend RepairStatus enum)
  // Main status options only (simplified)
  const repairStatuses = [
    { value: 'RECEIVED', label: 'Received', icon: Package, color: 'bg-amber-500', description: 'Repair received and being assessed' },
    { value: 'IN_PROGRESS', label: 'In Progress', icon: PlayCircle, color: 'bg-blue-500', description: 'Currently being worked on' },
    { value: 'READY_FOR_COLLECTION', label: 'Ready for Collection', icon: Package, color: 'bg-green-400', description: 'Ready for customer pickup' },
    { value: 'COLLECTED', label: 'Collected', icon: CheckCircle, color: 'bg-green-600', description: 'Customer has collected item' }
  ];

  // Update repair status
  const updateRepairStatus = async () => {
    if (!selectedStatus || selectedStatus === currentRepair.status) {
      toast.error('Please select a different status');
      return;
    }

    try {
      setUpdatingStatus(true);

      // Get the selected message template
      const selectedTemplate = (selectedMessageTemplate && selectedMessageTemplate !== 'none')
        ? templates.find(t => t.id === selectedMessageTemplate)
        : null;

      // Generate message content if template is selected
      let smsMessageContent = '';
      if (selectedTemplate && customerData?.phone) {
        smsMessageContent = getMessagePreview(selectedTemplate.content);
      }

      // Use repairService to update repair status with SMS notification
      const updatedRepair = await repairService.updateRepairStatus(
        currentRepair.id,
        selectedStatus,
        statusNotes || `Status changed to ${getStatusText(selectedStatus)}`,
        sendSMS && !!selectedTemplate
      );

      // Update local repair state with the new status
      setCurrentRepair({
        ...currentRepair,
        status: selectedStatus,
        updatedAt: new Date().toISOString()
      });

      // Log SMS details for debugging/future integration
      if (selectedTemplate && customerData?.phone) {
        console.log('📱 SMS Message Details:', {
          template: selectedTemplate.name,
          recipient: customerData?.phone,
          recipientName: customerData?.firstName || customerData?.name || currentRepair.customerName,
          message: smsMessageContent,
          repairId: currentRepair.id,
          newStatus: selectedStatus
        });

        // Show success with SMS info
        toast.success(
          <div className="space-y-1">
            <p className="font-semibold">Status updated to {getStatusText(selectedStatus)}</p>
            <p className="text-xs">SMS sent: {selectedTemplate.name}</p>
            <p className="text-xs text-gray-600">To: {customerData.phone}</p>
          </div>,
          { duration: 5000 }
        );
      } else {
        // Standard success message without SMS
        toast.success(`Status updated to ${getStatusText(selectedStatus)}`);
      }

      // Call onUpdate callback to refresh the repair list (pass null to avoid PATCH call)
      if (onUpdate) {
        onUpdate(currentRepair.id, null);
      }

      // Reset form
      setStatusNotes('');
      setSelectedStatus('');
      setSelectedMessageTemplate('none');

    } catch (error: any) {
      console.error('Failed to update repair status:', error);
      toast.error(`Failed to update status: ${error.message}`);
    } finally {
      setUpdatingStatus(false);
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

  const getMessagePreview = (templateContent: string): string => {
    if (!templateContent) return '';

    return templateContent
      .replace(/{CUSTOMER}/g, customerData?.firstName || customerData?.name || repair.customerName || 'Customer')
      .replace(/{RMA}/g, repair.id?.substring(0, 8) || 'REP-001')
      .replace(/{ITEM}/g, repair.itemDescription || 'Item')
      .replace(/{PRICE}/g, `£${repair.estimatedPrice || '0.00'}`)
      .replace(/{DATE}/g, repair.dueDate ? new Date(repair.dueDate).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'));
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
            {/* Status Update Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench size={16} />
                  Update Repair Status
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Change the repair status and optionally notify the customer via SMS
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
                        {customerData?.phone && (
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Phone size={12} />
                            SMS enabled
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Selection */}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="status-select">New Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select new status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {repairStatuses.map((status) => {
                          const IconComponent = status.icon;
                          const isCurrentStatus = status.value === currentRepair.status;
                          return (
                            <SelectItem
                              key={status.value}
                              value={status.value}
                              disabled={isCurrentStatus}
                              className={isCurrentStatus ? 'opacity-50' : ''}
                            >
                              <div className="flex items-center gap-2">
                                <IconComponent size={14} />
                                <div>
                                  <span className="font-medium">{status.label}</span>
                                  {isCurrentStatus && <span className="text-xs text-gray-500 ml-1">(current)</span>}
                                  <p className="text-xs text-gray-500">{status.description}</p>
                                </div>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Notes */}
                  <div>
                    <Label htmlFor="status-notes">Status Notes (Optional)</Label>
                    <Textarea
                      id="status-notes"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      placeholder="Add any additional notes about this status change..."
                      rows={3}
                    />
                  </div>

                  {/* Message Template Cards */}
                  {customerData?.phone && selectedStatus && (
                    <div className="space-y-3">
                      <Label>SMS Message Template</Label>
                      <div className="space-y-2">
                        {/* None Option Card */}
                        <div
                          onClick={() => setSelectedMessageTemplate('none')}
                          className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                            selectedMessageTemplate === 'none'
                              ? 'border-navy bg-navy/5 shadow-sm'
                              : 'border-gray-200 hover:border-navy/30 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              selectedMessageTemplate === 'none' ? 'border-navy bg-navy' : 'border-gray-300'
                            }`}>
                              {selectedMessageTemplate === 'none' && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <span className="font-medium text-sm">None - Don't send SMS</span>
                          </div>
                        </div>

                        {/* Template Cards */}
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            onClick={() => setSelectedMessageTemplate(template.id)}
                            className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                              selectedMessageTemplate === template.id
                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                            }`}
                          >
                            <div className="space-y-2">
                              {/* Card Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                    selectedMessageTemplate === template.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                  }`}>
                                    {selectedMessageTemplate === template.id && (
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm text-navy">{template.name}</p>
                                    {template.status === selectedStatus && (
                                      <span className="text-xs text-blue-600">(Recommended for this status)</span>
                                    )}
                                  </div>
                                </div>
                                <MessageSquare size={16} className="text-blue-600 flex-shrink-0" />
                              </div>

                              {/* Message Preview */}
                              <div className="bg-white border border-blue-100 rounded p-2 mt-2">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Preview:</p>
                                <p className="text-xs text-gray-800 whitespace-pre-wrap">
                                  {getMessagePreview(template.content)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Recipient Info */}
                      {selectedMessageTemplate && selectedMessageTemplate !== 'none' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                          <p className="text-xs text-blue-800">
                            Will be sent to: <span className="font-semibold">{customerData.firstName || repair.customerName}</span> ({customerData.phone})
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {loadingCustomer && (
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 text-gray-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <p className="text-xs">
                          Loading customer details...
                        </p>
                      </div>
                    </div>
                  )}

                  {!loadingCustomer && !customerData?.phone && (
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertCircle size={14} />
                        <p className="text-xs">
                          No phone number on file - SMS notifications not available for this customer
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Update Button */}
                  <Button
                    onClick={updateRepairStatus}
                    disabled={!selectedStatus || selectedStatus === currentRepair.status || updatingStatus}
                    className="w-full flex items-center gap-2"
                    size="lg"
                  >
                    {updatingStatus ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating Status...
                      </>
                    ) : (
                      <>
                        <MessageSquare size={16} />
                        Update Status
                        {selectedMessageTemplate && selectedMessageTemplate !== 'none' && customerData?.phone && (
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                            + Send SMS
                          </span>
                        )}
                      </>
                    )}
                  </Button>
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