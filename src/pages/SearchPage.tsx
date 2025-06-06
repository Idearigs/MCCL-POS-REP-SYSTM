
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search as SearchIcon } from 'lucide-react';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Mock data for demonstration
const mockInventory = [
  { id: '1', name: 'Diamond Ring', sku: 'DR001', category: 'Rings', quantity: 5 },
  { id: '2', name: 'Gold Necklace', sku: 'GN001', category: 'Necklaces', quantity: 3 },
  { id: '3', name: 'Silver Bracelet', sku: 'SB001', category: 'Bracelets', quantity: 8 },
];

const mockRepairs = [
  { id: '1', customer: 'John Smith', item: 'Watch Repair', status: 'In Progress', dueDate: '2025-06-01' },
  { id: '2', customer: 'Jane Doe', item: 'Ring Resizing', status: 'Completed', dueDate: '2025-05-20' },
  { id: '3', customer: 'Robert Johnson', item: 'Necklace Clasp', status: 'Pending', dueDate: '2025-06-05' },
];

const mockCustomers = [
  { id: '1', name: 'John Smith', email: 'john.smith@example.com', phone: '555-123-4567' },
  { id: '2', name: 'Jane Doe', email: 'jane.doe@example.com', phone: '555-234-5678' },
  { id: '3', name: 'Robert Johnson', email: 'robert.j@example.com', phone: '555-345-6789' },
];

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const navigate = useNavigate();

  // Filter items based on search term
  const filteredInventory = mockInventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRepairs = mockRepairs.filter(repair => 
    repair.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.item.toLowerCase().includes(searchTerm.toLowerCase()) ||
    repair.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = mockCustomers.filter(customer => 
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone.includes(searchTerm)
  );

  // Navigation handlers
  const handleInventoryClick = (id: string) => {
    navigate(`/inventory?itemId=${id}`);
  };

  const handleRepairClick = (id: string) => {
    navigate(`/repairs?jobId=${id}`);
  };

  const handleCustomerClick = (id: string) => {
    navigate(`/customers?customerId=${id}`);
  };

  const getStatusColor = (status: string) => {
    switch(status.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <MainLayout pageTitle="Search">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center mb-8 gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search inventory, repairs, customers..."
                className="pl-10 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button>Search</Button>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="repairs">Repairs</TabsTrigger>
              <TabsTrigger value="customers">Customers</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6">
              {(searchTerm && !filteredInventory.length && !filteredRepairs.length && !filteredCustomers.length) ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No results found for "{searchTerm}"</p>
                </div>
              ) : (
                <>
                  {filteredInventory.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <h2 className="text-lg font-medium mb-4">Inventory Items</h2>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>SKU</TableHead>
                              <TableHead>Category</TableHead>
                              <TableHead>Quantity</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredInventory.map((item) => (
                              <TableRow 
                                key={item.id} 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleInventoryClick(item.id)}
                              >
                                <TableCell>{item.name}</TableCell>
                                <TableCell>{item.sku}</TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {filteredRepairs.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <h2 className="text-lg font-medium mb-4">Repair Jobs</h2>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Customer</TableHead>
                              <TableHead>Item</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Due Date</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRepairs.map((repair) => (
                              <TableRow 
                                key={repair.id} 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleRepairClick(repair.id)}
                              >
                                <TableCell>{repair.customer}</TableCell>
                                <TableCell>{repair.item}</TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(repair.status)}>
                                    {repair.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{repair.dueDate}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}

                  {filteredCustomers.length > 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <h2 className="text-lg font-medium mb-4">Customers</h2>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Phone</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredCustomers.map((customer) => (
                              <TableRow 
                                key={customer.id} 
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => handleCustomerClick(customer.id)}
                              >
                                <TableCell>{customer.name}</TableCell>
                                <TableCell>{customer.email}</TableCell>
                                <TableCell>{customer.phone}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="inventory">
              {filteredInventory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleInventoryClick(item.id)}
                      >
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No inventory items found for "{searchTerm}"</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="repairs">
              {filteredRepairs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRepairs.map((repair) => (
                      <TableRow 
                        key={repair.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleRepairClick(repair.id)}
                      >
                        <TableCell>{repair.customer}</TableCell>
                        <TableCell>{repair.item}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(repair.status)}>
                            {repair.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{repair.dueDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No repair jobs found for "{searchTerm}"</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="customers">
              {filteredCustomers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow 
                        key={customer.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleCustomerClick(customer.id)}
                      >
                        <TableCell>{customer.name}</TableCell>
                        <TableCell>{customer.email}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No customers found for "{searchTerm}"</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </MainLayout>
  );
};

export default SearchPage;
