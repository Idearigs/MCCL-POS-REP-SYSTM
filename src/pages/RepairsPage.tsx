
import React, { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus, Calendar } from 'lucide-react';
import RepairJobCard from '@/components/repair/RepairJobCard';
import RepairStatusBadge from '@/components/repair/RepairStatusBadge';
import NewRepairJobForm from '@/components/repair/NewRepairJobForm';
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
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Types for our repair job data
type RepairStatus = 'received' | 'in-progress' | 'completed' | 'collected';

interface RepairJob {
  id: string;
  customerName: string;
  itemDescription: string;
  status: RepairStatus;
  dueDate: string;
  estimatedPrice?: string;
  phoneNumber?: string;
  email?: string;
  notes?: string;
  createdAt: string;
  images?: string[];
}

// Sample data
const mockRepairJobs: RepairJob[] = [
  {
    id: 'REP001',
    customerName: 'John Smith',
    itemDescription: 'Gold Ring - Resize and polish',
    status: 'received',
    dueDate: '2025-05-29',
    estimatedPrice: '45.00',
    phoneNumber: '555-123-4567',
    email: 'john.smith@example.com',
    notes: 'Customer wants ring resized from size 7 to size 9. Also requested polishing.',
    createdAt: '2025-05-22'
  },
  {
    id: 'REP002',
    customerName: 'Emily Johnson',
    itemDescription: 'Diamond Earrings - Replace missing stone and clean',
    status: 'in-progress',
    dueDate: '2025-05-28',
    estimatedPrice: '120.00',
    phoneNumber: '555-234-5678',
    email: 'emily.j@example.com',
    notes: 'Left earring missing small diamond. Customer provided replacement stone.',
    createdAt: '2025-05-20'
  },
  {
    id: 'REP003',
    customerName: 'Michael Chen',
    itemDescription: 'Silver Watch - Battery replacement and band adjustment',
    status: 'completed',
    dueDate: '2025-05-24',
    estimatedPrice: '35.00',
    phoneNumber: '555-345-6789',
    email: 'mchen@example.com',
    notes: 'Watch band is too large. Customer requested removal of 2 links.',
    createdAt: '2025-05-18'
  },
  {
    id: 'REP004',
    customerName: 'Sarah Williams',
    itemDescription: 'Pearl Necklace - Restring and clasp repair',
    status: 'collected',
    dueDate: '2025-05-20',
    estimatedPrice: '65.00',
    phoneNumber: '555-456-7890',
    email: 'sarah.w@example.com',
    notes: 'Customer mentioned that the necklace has sentimental value - belonged to grandmother.',
    createdAt: '2025-05-15'
  },
  {
    id: 'REP005',
    customerName: 'David Rodriguez',
    itemDescription: 'Gold Bracelet - Repair broken link and clasp',
    status: 'received',
    dueDate: '2025-05-30',
    estimatedPrice: '80.00',
    phoneNumber: '555-567-8901',
    email: 'david.r@example.com',
    notes: 'Customer wants express service if possible.',
    createdAt: '2025-05-21'
  }
];

const RepairsPage: React.FC = () => {
  const [repairJobs, setRepairJobs] = useState<RepairJob[]>(mockRepairJobs);
  const [filteredJobs, setFilteredJobs] = useState<RepairJob[]>(mockRepairJobs);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<RepairStatus | 'all'>('all');
  const [selectedJob, setSelectedJob] = useState<RepairJob | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNewJobDialogOpen, setIsNewJobDialogOpen] = useState(false);

  // Filter jobs based on search term and selected status
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

  const handleStatusChange = (status: RepairStatus) => {
    if (selectedJob) {
      const updatedJobs = repairJobs.map(job => 
        job.id === selectedJob.id ? { ...job, status } : job
      );
      setRepairJobs(updatedJobs);
      setSelectedJob({ ...selectedJob, status });
      toast.success(`Status updated to ${status}`);
    }
  };

  const statusFilters: { label: string; value: RepairStatus | 'all'; count: number }[] = [
    { label: 'All', value: 'all', count: repairJobs.length },
    { label: 'Received', value: 'received', count: repairJobs.filter(job => job.status === 'received').length },
    { label: 'In Progress', value: 'in-progress', count: repairJobs.filter(job => job.status === 'in-progress').length },
    { label: 'Completed', value: 'completed', count: repairJobs.filter(job => job.status === 'completed').length },
    { label: 'Collected', value: 'collected', count: repairJobs.filter(job => job.status === 'collected').length }
  ];

  return (
    <MainLayout pageTitle="Repair Jobs">
      <div className="flex flex-col h-full">
        {/* Header with search and filters */}
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
              className={`rounded-full px-4 border border-gray-200 shadow-sm ${selectedStatus === 'all' ? 'bg-navy text-white' : 'bg-white/80 text-gray-800'}`}
              onClick={() => setSelectedStatus('all')}
            >
              All <Badge className={`ml-1 rounded-full ${selectedStatus === 'all' ? 'bg-white text-navy' : 'bg-gray-100 text-gray-800'}`}>{repairJobs.length}</Badge>
            </Button>
            <Button 
              variant="outline" 
              className={`rounded-full px-4 border border-gray-200 shadow-sm ${selectedStatus === 'received' ? 'bg-blue-500 text-white' : 'bg-white/80 text-gray-800'}`}
              onClick={() => setSelectedStatus('received')}
            >
              Received <Badge className={`ml-1 rounded-full ${selectedStatus === 'received' ? 'bg-white text-blue-500' : 'bg-gray-100 text-gray-800'}`}>{repairJobs.filter(job => job.status === 'received').length}</Badge>
            </Button>
            <Button 
              variant="outline" 
              className={`rounded-full px-4 border border-gray-200 shadow-sm ${selectedStatus === 'in-progress' ? 'bg-orange-500 text-white' : 'bg-white/80 text-gray-800'}`}
              onClick={() => setSelectedStatus('in-progress')}
            >
              In Progress <Badge className={`ml-1 rounded-full ${selectedStatus === 'in-progress' ? 'bg-white text-orange-500' : 'bg-gray-100 text-gray-800'}`}>{repairJobs.filter(job => job.status === 'in-progress').length}</Badge>
            </Button>
            <Button 
              variant="outline" 
              className={`rounded-full px-4 border border-gray-200 shadow-sm ${selectedStatus === 'completed' ? 'bg-green-500 text-white' : 'bg-white/80 text-gray-800'}`}
              onClick={() => setSelectedStatus('completed')}
            >
              Completed <Badge className={`ml-1 rounded-full ${selectedStatus === 'completed' ? 'bg-white text-green-500' : 'bg-gray-100 text-gray-800'}`}>{repairJobs.filter(job => job.status === 'completed').length}</Badge>
            </Button>
            <Button 
              variant="outline" 
              className={`rounded-full px-4 border border-gray-200 shadow-sm ${selectedStatus === 'collected' ? 'bg-gray-500 text-white' : 'bg-white/80 text-gray-800'}`}
              onClick={() => setSelectedStatus('collected')}
            >
              Collected <Badge className={`ml-1 rounded-full ${selectedStatus === 'collected' ? 'bg-white text-gray-500' : 'bg-gray-100 text-gray-800'}`}>{repairJobs.filter(job => job.status === 'collected').length}</Badge>
            </Button>
            
            <Button 
              onClick={() => setIsNewJobDialogOpen(true)}
              className="rounded-full bg-navy hover:bg-navy-dark text-white shadow-sm ml-2"
            >
              <Plus size={16} className="mr-1" />
              New Repair Job
            </Button>
          </div>
        </div>

        {/* Main content - grid of repair job cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.length > 0 ? (
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

        {/* Job Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl bg-white/90 backdrop-blur-lg border border-gray-100 shadow-md rounded-xl">
            <DialogHeader>
              <DialogTitle className="text-xl text-gray-800">
                Repair Job: {selectedJob?.id}
              </DialogTitle>
              <DialogDescription className="text-gray-500">
                Created on {selectedJob?.createdAt}
              </DialogDescription>
            </DialogHeader>
            
            {selectedJob && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Card className="border-gray-100 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl shadow-sm overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md text-gray-800">Customer Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium text-lg text-gray-800">{selectedJob.customerName}</p>
                    {selectedJob.phoneNumber && (
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        {selectedJob.phoneNumber}
                      </p>
                    )}
                    {selectedJob.email && (
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        {selectedJob.email}
                      </p>
                    )}
                  </CardContent>
                </Card>
                
                <Card className="border-gray-100 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl shadow-sm overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md text-gray-800">Repair Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3 text-gray-700">{selectedJob.itemDescription}</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs">Status:</span>
                        <div className="mt-1">
                          <RepairStatusBadge status={selectedJob.status} />
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs">Due Date:</span>
                        <p className="text-gray-700 flex items-center mt-1">
                          <Calendar size={14} className="mr-1 text-gray-500" />
                          {selectedJob.dueDate}
                        </p>
                      </div>
                      {selectedJob.estimatedPrice && (
                        <div className="col-span-2">
                          <span className="text-gray-500 text-xs">Estimated Price:</span>
                          <p className="font-medium text-gray-800 mt-1 bg-gray-50 inline-block px-3 py-1 rounded-full border border-gray-100">£{selectedJob.estimatedPrice}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                {selectedJob.images && selectedJob.images.length > 0 && (
                  <Card className="col-span-2 border-gray-100 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md text-gray-800">Images</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {selectedJob.images.map((image, index) => (
                          <div key={index} className="aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-100 shadow-sm">
                            {/* In a real app, this would be an actual image */}
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                              Image {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {selectedJob.notes && (
                  <Card className="col-span-2 border-gray-100 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl shadow-sm overflow-hidden">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md text-gray-800">Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-gray-700">
                      <p>{selectedJob.notes}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="pt-3 col-span-2">
                  <h4 className="text-sm font-medium mb-3 text-gray-800">Update Status</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange('received')}
                      className={`justify-center rounded-full border border-gray-200 shadow-sm ${selectedJob.status === 'received' ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-white/80 text-gray-800 hover:bg-gray-100'}`}
                    >
                      Received
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange('in-progress')}
                      className={`justify-center rounded-full border border-gray-200 shadow-sm ${selectedJob.status === 'in-progress' ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-white/80 text-gray-800 hover:bg-gray-100'}`}
                    >
                      In Progress
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange('completed')}
                      className={`justify-center rounded-full border border-gray-200 shadow-sm ${selectedJob.status === 'completed' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-white/80 text-gray-800 hover:bg-gray-100'}`}
                    >
                      Completed
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleStatusChange('collected')}
                      className={`justify-center rounded-full border border-gray-200 shadow-sm ${selectedJob.status === 'collected' ? 'bg-gray-500 text-white hover:bg-gray-600' : 'bg-white/80 text-gray-800 hover:bg-gray-100'}`}
                    >
                      Collected
                    </Button>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter className="pt-4">
              <Button 
                variant="outline" 
                onClick={() => setIsDetailOpen(false)}
                className="rounded-full bg-white/80 border border-gray-200 text-gray-800 hover:bg-gray-100 shadow-sm"
              >
                Close
              </Button>
              <Button 
                className="rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
              >
                Edit Details
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New Repair Job Dialog */}
        <Dialog open={isNewJobDialogOpen} onOpenChange={setIsNewJobDialogOpen}>
          <NewRepairJobForm 
            onSubmit={(formData) => {
              // Generate a unique ID for the new repair job
              const newId = `REP${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
              
              // Create image URLs (in a real app, you would upload these to a server)
              // For this demo, we'll just create placeholder URLs
              const imageUrls = formData.images.map((_, index) => 
                `repair-image-${newId}-${index + 1}.jpg`
              );
              
              // Create the new repair job
              const newRepairJob: RepairJob = {
                id: newId,
                customerName: formData.customerName,
                itemDescription: formData.itemDescription,
                status: 'received',
                dueDate: formData.dueDate,
                estimatedPrice: formData.estimatedPrice,
                phoneNumber: formData.phoneNumber,
                email: formData.email,
                notes: formData.notes,
                createdAt: new Date().toISOString().split('T')[0],
                images: imageUrls
              };
              
              // Add the new job to the list
              setRepairJobs([newRepairJob, ...repairJobs]);
              
              // Close the dialog
              setIsNewJobDialogOpen(false);
              
              // Show success message
              toast.success(`Repair job ${newId} created successfully`);
            }}
            onCancel={() => setIsNewJobDialogOpen(false)}
          />
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default RepairsPage;
