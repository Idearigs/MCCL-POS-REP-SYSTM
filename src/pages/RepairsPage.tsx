import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, Calendar, Trash2 } from 'lucide-react';
import RepairJobCard from '@/components/repair/RepairJobCard';
import RepairStatusBadge from '@/components/repair/RepairStatusBadge';
import NewRepairJobForm from '@/components/repair/NewRepairJobForm';
import RepairDetailModal from '@/components/repair/RepairDetailModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { repairService, Repair } from '@/services/repairService';
import { customerService } from '@/services/customerService';
import { googleDriveService } from '@/services/googleDriveService';

// Type mappings between UI and backend
type UIRepairStatus = 'received' | 'in-progress' | 'completed' | 'collected';
type BackendRepairStatus = 'RECEIVED' | 'QUOTED' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'READY_FOR_COLLECTION' | 'COLLECTED' | 'CANCELLED';

const statusMapping: Record<BackendRepairStatus, UIRepairStatus> = {
  'RECEIVED': 'received',
  'QUOTED': 'received',
  'APPROVED': 'received', 
  'IN_PROGRESS': 'in-progress',
  'COMPLETED': 'completed',
  'READY_FOR_COLLECTION': 'completed',
  'COLLECTED': 'collected',
  'CANCELLED': 'received'
};

const reverseStatusMapping: Record<UIRepairStatus, BackendRepairStatus> = {
  'received': 'RECEIVED',
  'in-progress': 'IN_PROGRESS', 
  'completed': 'COMPLETED',
  'collected': 'COLLECTED'
};

interface UIRepairJob {
  id: string;
  customerId: string;  // Added missing customerId field
  customerName: string;
  itemDescription: string;
  status: UIRepairStatus;
  dueDate: string;
  estimatedPrice?: string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  images?: string[];
}

// Convert backend repair to UI format
const convertRepairToUI = (repair: Repair): UIRepairJob => ({
  id: repair.id,
  customerId: repair.customerId,  // Added missing customerId field
  customerName: repair.customerName,
  itemDescription: repair.itemDescription || (repair.items && repair.items[0]?.itemDescription) || 'No description',
  status: statusMapping[repair.status] || 'received',
  dueDate: repair.estimatedCompletion || repair.expectedCompletionDate || repair.createdAt,
  estimatedPrice: (repair.estimatedCost || repair.totalCost || 0).toString(),
  phoneNumber: '',
  email: '',
  notes: repair.notes || repair.internalNotes || repair.customerInstructions || '',
  createdAt: repair.createdAt,
  images: repair.images || []
});

const RepairsPage: React.FC = () => {
  const [repairJobs, setRepairJobs] = useState<UIRepairJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<UIRepairJob[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<UIRepairStatus | 'all'>('all');
  const [selectedJob, setSelectedJob] = useState<UIRepairJob | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [repairToDelete, setRepairToDelete] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    localStorage.removeItem('repairJobs');
    localStorage.removeItem('repair_jobs');
    localStorage.removeItem('repairs');
    console.log('Cleared repair jobs localStorage');
  }, []);

  const loadRepairs = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await repairService.getRepairs(1, 50);
      const uiRepairs = result.data.map(convertRepairToUI);
      setRepairJobs(uiRepairs);
      setFilteredJobs(uiRepairs);
    } catch (err: any) {
      console.error('Failed to load repairs:', err);
      setError(err.message || 'Failed to load repairs');
      setRepairJobs([]);
      setFilteredJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepairs();
  }, []);

  useEffect(() => {
    let result = repairJobs;
    
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(job => 
        job.customerName.toLowerCase().includes(lowerSearchTerm) || 
        job.itemDescription.toLowerCase().includes(lowerSearchTerm) ||
        job.id.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    if (selectedStatus !== 'all') {
      result = result.filter(job => job.status === selectedStatus);
    }
    
    setFilteredJobs(result);
  }, [searchTerm, selectedStatus, repairJobs]);

  const handleJobClick = (id: string) => {
    const job = repairJobs.find(job => job.id === id);
    if (job) {
      setSelectedJob(job);
      setIsDetailOpen(true);
    }
  };

  const handleStatusChange = async (status: UIRepairStatus) => {
    if (selectedJob) {
      try {
        const backendStatus = reverseStatusMapping[status];
        await repairService.updateRepair(selectedJob.id, { status: backendStatus });
        
        const updatedJob = { ...selectedJob, status };
        const updatedJobs = repairJobs.map(job => 
          job.id === selectedJob.id ? updatedJob : job
        );
        setRepairJobs(updatedJobs);
        setSelectedJob(updatedJob);
        toast.success('Status updated to ' + status);
      } catch (error: any) {
        console.error('Failed to update status:', error);
        toast.error('Failed to update status. Please try again.');
      }
    }
  };

  const handleDeleteRepair = async () => {
    if (!repairToDelete) return;
    
    try {
      setLoading(true);
      console.log(`🗑️ Deleting repair: ${repairToDelete}`);
      
      // Find the repair to get its details for logging
      const repairJob = repairJobs.find(job => job.id === repairToDelete);
      if (repairJob) {
        console.log(`Deleting repair for ${repairJob.customerName}: ${repairJob.itemDescription}`);
      }
      
      await repairService.cancelRepair(repairToDelete, 'Deleted by user');
      
      // Remove from local state
      const updatedJobs = repairJobs.filter(job => job.id !== repairToDelete);
      setRepairJobs(updatedJobs);
      setFilteredJobs(updatedJobs);
      
      toast.success('Repair job deleted successfully');
    } catch (error: any) {
      console.error('Failed to delete repair:', error);
      toast.error(`Failed to delete repair: ${error.message}`);
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
      setRepairToDelete(null);
    }
  };

  const handleDeleteClick = (repairId: string) => {
    console.log(`🗑️ Delete requested for repair: ${repairId}`);
    setRepairToDelete(repairId);
    setDeleteDialogOpen(true);
  };

  const handleFormSubmit = async (formData: any) => {
    try {
      setLoading(true);
      
      let customerId = '';
      let customer;
      
      try {
        if (formData.selectedCustomer) {
          customer = formData.selectedCustomer;
          customerId = customer.id;
          console.log('Using existing customer:', customer);
        } else if (formData.customerName && (formData.phoneNumber || formData.email)) {
          const nameParts = formData.customerName.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || 'Customer';
          
          const customerData: any = {
            firstName,
            lastName,
            phone: formData.phoneNumber || '',
            email: formData.email || undefined,
            notes: 'Created for repair job',
            dataProcessingConsent: true,
            marketingEmail: false,
            marketingSms: false,
            marketingPhone: false
          };
          
          console.log('Creating new customer:', customerData);
          customer = await customerService.createCustomer(customerData);
          customerId = customer.id;
          console.log('New customer created:', customer);
          toast.success('Customer ' + formData.customerName + ' created');
        } else {
          throw new Error('Customer information is required for repair job');
        }
      } catch (customerError: any) {
        console.error('Customer creation/lookup failed:', customerError);
        toast.error('Failed to handle customer: ' + customerError.message);
        return;
      }

      const repairData = {
        customerId: customerId,
        problemDescription: formData.notes || 'Repair required',
        priority: 'NORMAL' as const,
        expectedCompletionDate: formData.dueDate,
        customerInstructions: formData.notes || '',
        items: [
          {
            itemDescription: formData.itemDescription,
            repairType: 'OTHER' as const,
            repairDescription: formData.notes || 'General repair work required',
            estimatedCost: parseFloat(formData.estimatedPrice) || 0
          }
        ]
      };

      const newRepair = await repairService.createRepair(repairData);
      
      let imageUrls: string[] = [];
      if (formData.images.length > 0) {
        try {
          const uploadResult = await googleDriveService.uploadRepairImages(
            formData.images, 
            { 
              repairId: newRepair.id, 
              description: 'Images for repair ' + newRepair.id + ' - ' + formData.itemDescription
            }
          );
          imageUrls = uploadResult.imageUrls;
          toast.success(formData.images.length + ' image(s) uploaded to Google Drive');
        } catch (uploadError) {
          console.error('Failed to upload images:', uploadError);
          // Create placeholder URLs for now so repair creation still works
          imageUrls = formData.images.map((_, index) => `pending-upload-${newRepair.id}-${index + 1}`);
          toast.warning('Repair created successfully. Image upload temporarily disabled - will be fixed shortly');
        }
      }

      if (imageUrls.length > 0) {
        try {
          await repairService.updateRepair(newRepair.id, { 
            internalNotes: (newRepair.internalNotes || '') + '\n\nImages: ' + imageUrls.join(', ')
          });
        } catch (updateError) {
          console.warn('Failed to update repair with image URLs:', updateError);
        }
      }

      await loadRepairs();
      setIsNewJobDialogOpen(false);
      toast.success('Repair job created successfully');
      
    } catch (error: any) {
      console.error('Failed to create repair job:', error);
      toast.error(error.message || 'Failed to create repair job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout pageTitle="Repair Jobs">
      <div className="flex flex-col h-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Search by customer name, item or ID..." 
              className="pl-10 bg-white/80 border border-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-gray-200 focus:border-transparent" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
            <Button 
              variant="outline" 
              className="rounded-full px-4 border border-gray-200 shadow-sm bg-navy text-white"
              onClick={() => setSelectedStatus('all')}
            >
              All <Badge className="ml-1 rounded-full bg-white text-navy">{repairJobs.length}</Badge>
            </Button>
            
            <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="rounded-full px-4 border border-gray-200 shadow-sm hover:bg-gray-50"
                >
                  <Filter size={16} className="mr-1" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setSelectedStatus('all')}>
                  <div className="flex items-center justify-between w-full">
                    All Repairs
                    <Badge variant="secondary" className="ml-2">{repairJobs.length}</Badge>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedStatus('received')}>
                  <div className="flex items-center justify-between w-full">
                    Received
                    <Badge variant="secondary" className="ml-2">
                      {repairJobs.filter(job => job.status === 'received').length}
                    </Badge>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStatus('in-progress')}>
                  <div className="flex items-center justify-between w-full">
                    In Progress
                    <Badge variant="secondary" className="ml-2">
                      {repairJobs.filter(job => job.status === 'in-progress').length}
                    </Badge>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStatus('completed')}>
                  <div className="flex items-center justify-between w-full">
                    Completed
                    <Badge variant="secondary" className="ml-2">
                      {repairJobs.filter(job => job.status === 'completed').length}
                    </Badge>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedStatus('collected')}>
                  <div className="flex items-center justify-between w-full">
                    Collected
                    <Badge variant="secondary" className="ml-2">
                      {repairJobs.filter(job => job.status === 'collected').length}
                    </Badge>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button 
              onClick={() => setIsNewJobDialogOpen(true)}
              className="rounded-full bg-navy hover:bg-navy-dark text-white shadow-sm ml-2"
            >
              <Plus size={16} className="mr-1" />
              New Repair Job
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            <div className="col-span-full flex items-center justify-center h-40 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading repair jobs...</p>
              </div>
            </div>
          ) : error ? (
            <div className="col-span-full flex items-center justify-center h-40 border border-red-100 rounded-xl bg-red-50/50 backdrop-blur-sm">
              <div className="text-center">
                <p className="text-red-600 mb-2">Error loading repair jobs</p>
                <Button 
                  onClick={loadRepairs}
                  variant="outline" 
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : filteredJobs.length > 0 ? (
            filteredJobs.map(job => (
              <RepairJobCard 
                key={job.id}
                id={job.id}
                customerName={job.customerName}
                itemDescription={job.itemDescription}
                status={job.status}
                dueDate={job.dueDate}
                estimatedPrice={job.estimatedPrice}
                onClick={handleJobClick}
                onDelete={handleDeleteClick}
              />
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center h-40 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
              <p className="text-gray-400 flex flex-col items-center">
                <Search size={24} className="mb-2 text-gray-300" />
                No repair jobs found
              </p>
            </div>
          )}
        </div>

        <RepairDetailModal
          repair={selectedJob}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onUpdate={async (repairId: string, updates: any) => {
            try {
              // Only call updateRepair if updates is provided (not null)
              if (updates) {
                await repairService.updateRepair(repairId, updates);
                toast.success('Repair updated successfully');
              }
              // Always refresh the repair list
              await loadRepairs();
            } catch (error: any) {
              toast.error('Failed to update repair: ' + error.message);
            }
          }}
        />

        <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
          <NewRepairJobForm 
            onSubmit={handleFormSubmit}
            onCancel={() => setIsNewJobDialogOpen(false)}
            onCreateCustomer={() => {
              toast.info('Customer creation form activated - fill in the details below');
            }}
          />
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                <Trash2 size={18} />
                Delete Repair Job
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this repair job? This action cannot be undone and will permanently remove the repair from the system.
                {repairToDelete && (
                  <>
                    <br /><br />
                    <strong>Repair ID:</strong> {repairToDelete}
                    <br />
                    {repairJobs.find(job => job.id === repairToDelete) && (
                      <>
                        <strong>Customer:</strong> {repairJobs.find(job => job.id === repairToDelete)?.customerName}
                        <br />
                        <strong>Item:</strong> {repairJobs.find(job => job.id === repairToDelete)?.itemDescription}
                      </>
                    )}
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteRepair}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
};

export default RepairsPage;