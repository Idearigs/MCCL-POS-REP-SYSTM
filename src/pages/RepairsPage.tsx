import React, { useState, useEffect, useRef } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, Calendar, Trash2, LayoutGrid, List, Eye, Edit, Settings, ChevronLeft, ChevronRight, QrCode, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import RepairJobCard from '@/components/repair/RepairJobCard';
import RepairStatusBadge from '@/components/repair/RepairStatusBadge';
import NewRepairJobForm from '@/components/repair/NewRepairJobForm';
import RepairDetailModal from '@/components/repair/RepairDetailModal';
import RepairMessagesSettings from '@/components/repair/RepairMessagesSettings';
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
  tagId?: string | null;
  dueDate: string;
  estimatedPrice?: string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  images?: string[];
  beforeImages?: string[];
  afterImages?: string[];
  progressImages?: string[];
}

// Convert backend repair to UI format
const convertRepairToUI = (repair: Repair): UIRepairJob => ({
  id: repair.id,
  customerId: repair.customerId,  // Added missing customerId field
  customerName: repair.customerName,
  itemDescription: repair.itemDescription || (repair.items && repair.items[0]?.itemDescription) || 'No description',
  status: statusMapping[repair.status] || 'received',
  tagId: repair.tagId || null,
  dueDate: repair.estimatedCompletion || repair.expectedCompletionDate || repair.createdAt,
  estimatedPrice: (repair.estimatedCost || repair.totalCost || 0).toString(),
  phoneNumber: '',
  email: '',
  notes: repair.notes || repair.internalNotes || repair.customerInstructions || '',
  createdAt: repair.createdAt,
  images: [
    ...(repair.beforeImages || []),
    ...(repair.afterImages || []),
    ...(repair.progressImages || []),
    ...(repair.images || [])
  ],
  beforeImages: repair.beforeImages || [],
  afterImages: repair.afterImages || [],
  progressImages: repair.progressImages || []
});

const PAGE_SIZE = 50;

// Map UI status filter to backend status values
const statusToBackend: Partial<Record<UIRepairStatus | 'all', BackendRepairStatus | undefined>> = {
  'in-progress': 'IN_PROGRESS',
  'completed': 'COMPLETED',
  'collected': 'COLLECTED',
};

const RepairsPage: React.FC = () => {
  const [repairJobs, setRepairJobs] = useState<UIRepairJob[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<UIRepairStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedJob, setSelectedJob] = useState<UIRepairJob | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);
  const [isRepairQROpen, setIsRepairQROpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [repairToDelete, setRepairToDelete] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isMessagesSettingsOpen, setIsMessagesSettingsOpen] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    localStorage.removeItem('repairJobs');
    localStorage.removeItem('repair_jobs');
    localStorage.removeItem('repairs');
  }, []);

  const loadRepairs = async (page: number, search: string, status: UIRepairStatus | 'all') => {
    setLoading(true);
    setError(null);
    try {
      const backendStatus = statusToBackend[status];
      const filters: any = {};
      if (search) filters.search = search;
      if (backendStatus) filters.status = backendStatus;

      const result = await repairService.getRepairs(page, PAGE_SIZE, filters);
      const uiRepairs = result.data.map(convertRepairToUI);

      // Client-side status filter for UI statuses that map to multiple backend statuses
      // (e.g. 'received' = RECEIVED|QUOTED|APPROVED|CANCELLED)
      const filtered = status !== 'all' && !backendStatus
        ? uiRepairs.filter(job => job.status === status)
        : uiRepairs;

      setRepairJobs(filtered);
      setCurrentPage(result.meta?.page || page);
      setTotalPages(result.meta?.totalPages || 1);
      setTotalCount(result.meta?.total || 0);
    } catch (err: any) {
      console.error('Failed to load repairs:', err);
      setError(err.message || 'Failed to load repairs');
      setRepairJobs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepairs(1, searchTerm, selectedStatus);
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      setCurrentPage(1);
      loadRepairs(1, value, selectedStatus);
    }, 400);
  };

  const handleStatusFilter = (status: UIRepairStatus | 'all') => {
    setSelectedStatus(status);
    setCurrentPage(1);
    loadRepairs(1, searchTerm, status);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadRepairs(page, searchTerm, selectedStatus);
  };

  const handleJobClick = async (id: string) => {
    const job = repairJobs.find((job: UIRepairJob) => job.id === id);
    if (job) {
      // Set the job immediately to open the modal with basic data
      setSelectedJob(job);
      setIsDetailOpen(true);

      // Then fetch the full repair details including images in the background
      try {
        const fullRepair = await repairService.getRepairById(id);
        const fullUIJob = convertRepairToUI(fullRepair);
        setSelectedJob(fullUIJob);
      } catch (error: any) {
        console.error('Failed to fetch full repair details:', error);
        // Keep the modal open with basic data even if fetch fails
      }
    }
  };

  const handleStatusChange = async (status: UIRepairStatus) => {
    if (selectedJob) {
      try {
        const backendStatus = reverseStatusMapping[status];
        await repairService.updateRepair(selectedJob.id, { status: backendStatus });
        
        const updatedJob = { ...selectedJob, status };
        setRepairJobs(prev => prev.map((job: UIRepairJob) => job.id === selectedJob.id ? updatedJob : job));
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
      console.log(`🗑️ Permanently deleting repair: ${repairToDelete}`);

      // Find the repair to get its details for logging
      const repairJob = repairJobs.find(job => job.id === repairToDelete);
      if (repairJob) {
        console.log(`Deleting repair for ${repairJob.customerName}: ${repairJob.itemDescription}`);
      }

      // Call the DELETE endpoint to permanently remove the repair
      const result = await repairService.deleteRepair(repairToDelete);
      console.log('Delete result:', result);

      // Reload current page
      await loadRepairs(currentPage, searchTerm, selectedStatus);

      toast.success(result.message || 'Repair job deleted successfully');
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
        rmaId: (formData as any).repairId || undefined,
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

      // Upload images if provided (skip if no images to avoid errors)
      if (formData.images && formData.images.length > 0) {
        try {
          console.log(`Uploading ${formData.images.length} images for repair ${newRepair.id}`);
          // Upload images as 'before' images since they're taken during repair creation
          const uploadResult = await repairService.uploadRepairImages(
            newRepair.id,
            formData.images,
            'before'
          );
          console.log('Images uploaded successfully:', uploadResult);
          toast.success(`${formData.images.length} image(s) uploaded successfully`);
        } catch (uploadError: any) {
          console.error('Failed to upload images:', uploadError);
          console.error('Upload error details:', {
            message: uploadError.message,
            statusCode: uploadError.statusCode,
            error: uploadError.error
          });
          toast.warning('Repair created but image upload failed. You can add images later from the repair details.');
        }
      } else {
        console.log('No images to upload for this repair');
      }

      await loadRepairs(1, searchTerm, selectedStatus);
      setCurrentPage(1);
      setIsNewJobDialogOpen(false);
      toast.success('Repair job created successfully');
      
    } catch (error: any) {
      console.error('Failed to create repair job:', error);
      console.error('Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        error: error.error,
        stack: error.stack,
        fullError: JSON.stringify(error, null, 2)
      });
      toast.error(error.message || error.error || 'Failed to create repair job');
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
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
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

            <Button
              variant="outline"
              className={`rounded-full px-4 border border-gray-200 shadow-sm ${selectedStatus === 'all' ? 'bg-navy text-white' : 'hover:bg-gray-50'}`}
              onClick={() => handleStatusFilter('all')}
            >
              All <Badge className="ml-1 rounded-full bg-white/20 text-inherit">{totalCount}</Badge>
            </Button>

            <DropdownMenu open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className={`rounded-full px-4 border border-gray-200 shadow-sm ${selectedStatus !== 'all' ? 'bg-navy text-white' : 'hover:bg-gray-50'}`}
                >
                  <Filter size={16} className="mr-1" />
                  {selectedStatus !== 'all' ? selectedStatus.replace('-', ' ') : 'Filters'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleStatusFilter('all')}>All Repairs</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleStatusFilter('received')}>Received</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('in-progress')}>In Progress</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('completed')}>Completed</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusFilter('collected')}>Collected</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              onClick={() => setIsMessagesSettingsOpen(true)}
              className="rounded-full px-4 border border-gray-200 shadow-sm hover:bg-gray-50"
            >
              <Settings size={16} className="mr-1" />
              Messages
            </Button>

            <Button
              onClick={() => setIsRepairQROpen(true)}
              className="rounded-full px-4 shadow-sm bg-violet-600 hover:bg-violet-700 text-white gap-1.5"
              title="Mobile Quick-Add (QR Code)"
            >
              <QrCode size={15} />
              Mobile Add
            </Button>

            <Button
              onClick={() => setIsNewJobDialogOpen(true)}
              className="rounded-full bg-navy hover:bg-navy-dark text-white shadow-sm"
            >
              <Plus size={16} className="mr-1" />
              New Repair Job
            </Button>
          </div>
        </div>

        {/* Repair QR Code Modal */}
        {isRepairQROpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setIsRepairQROpen(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-8 w-80 flex flex-col items-center gap-5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between w-full">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Mobile Repair Add</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Scan to log repair jobs from your phone</p>
                </div>
                <button
                  onClick={() => setIsRepairQROpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <QRCode
                  value={`${window.location.origin}/mobile/add-repair`}
                  size={200}
                  bgColor="#f9fafb"
                  fgColor="#111827"
                />
              </div>
              <p className="text-xs text-center text-gray-400 leading-relaxed">
                Point your phone camera at this code.<br />
                Opens the mobile repair job form directly.
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-40 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-gray-600">Loading repair jobs...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-40 border border-red-100 rounded-xl bg-red-50/50 backdrop-blur-sm">
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
        ) : repairJobs.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {repairJobs.map(job => (
                <RepairJobCard
                  key={job.id}
                  id={job.id}
                  customerName={job.customerName}
                  itemDescription={job.itemDescription}
                  status={job.status}
                  tagId={job.tagId}
                  dueDate={job.dueDate}
                  estimatedPrice={job.estimatedPrice}
                  onClick={handleJobClick}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm border border-navy/10 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-navy/5">
                    <TableHead className="font-semibold text-navy">Date Created</TableHead>
                    <TableHead className="font-semibold text-navy">Repair ID</TableHead>
                    <TableHead className="font-semibold text-navy">Customer</TableHead>
                    <TableHead className="font-semibold text-navy">Item Description</TableHead>
                    <TableHead className="font-semibold text-navy">Status</TableHead>
                    <TableHead className="font-semibold text-navy">Due Date</TableHead>
                    <TableHead className="font-semibold text-navy">Est. Price</TableHead>
                    <TableHead className="font-semibold text-navy text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repairJobs.map((job) => (
                    <TableRow
                      key={job.id}
                      className="cursor-pointer hover:bg-navy/5 transition-colors"
                      onClick={() => handleJobClick(job.id)}
                    >
                      <TableCell className="text-sm text-gray-600">
                        {new Date(job.createdAt).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 font-mono">
                        {job.id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium text-navy">{job.customerName}</TableCell>
                      <TableCell className="text-sm text-gray-600">{job.itemDescription}</TableCell>
                      <TableCell>
                        <RepairStatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(job.dueDate).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600 font-medium">
                        £{parseFloat(job.estimatedPrice || '0').toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJobClick(job.id);
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
                              handleJobClick(job.id);
                            }}
                            className="text-navy hover:text-navy-dark hover:bg-navy/10"
                            title="Edit Repair"
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(job.id);
                            }}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Delete Repair"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-40 border border-gray-100 rounded-xl bg-white/50 backdrop-blur-sm">
            <p className="text-gray-400 flex flex-col items-center">
              <Search size={24} className="mb-2 text-gray-300" />
              No repair jobs found
            </p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {currentPage} of {totalPages} &mdash; {totalCount} total repairs
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="rounded-full"
              >
                <ChevronLeft size={16} />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="rounded-full"
              >
                Next
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}

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
              await loadRepairs(currentPage, searchTerm, selectedStatus);

              // Update the selected job with fresh data from database
              const refreshedRepair = await repairService.getRepairById(repairId);
              const refreshedUIJob = convertRepairToUI(refreshedRepair);
              setSelectedJob(refreshedUIJob);
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

        <RepairMessagesSettings
          isOpen={isMessagesSettingsOpen}
          onClose={() => setIsMessagesSettingsOpen(false)}
        />
      </div>
    </MainLayout>
  );
};

export default RepairsPage;