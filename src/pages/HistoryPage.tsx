import React, { useState, useEffect } from 'react';
import { useTransactions, SaleTransaction, RepairTransaction } from '@/contexts/TransactionContext';
import MainLayout from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Calendar, Tag, FileText } from 'lucide-react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

// Define a combined type for both transaction types
type HistoryTransaction = SaleTransaction | RepairTransaction;

const HistoryPage: React.FC = () => {
  // Get transactions from context
  const { salesTransactions, repairTransactions } = useTransactions();
  
  // Combine all transactions for the "All" tab
  const allTransactions: HistoryTransaction[] = [
    ...salesTransactions,
    ...repairTransactions
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const [activeTab, setActiveTab] = useState<'all' | 'sales' | 'repairs'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [filteredTransactions, setFilteredTransactions] = useState<HistoryTransaction[]>(allTransactions);

  // Apply filters when search term, date filter, or active tab changes
  useEffect(() => {
    let result: HistoryTransaction[] = [];
    
    // First filter by tab
    switch (activeTab) {
      case 'all':
        result = allTransactions;
        break;
      case 'sales':
        result = salesTransactions;
        break;
      case 'repairs':
        result = repairTransactions;
        break;
    }
    
    // Then apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(transaction => {
        const matchesCustomer = transaction.customerName.toLowerCase().includes(lowerSearchTerm);
        const matchesId = transaction.id.toLowerCase().includes(lowerSearchTerm);
        
        if (transaction.type === 'sale') {
          // Search in items for sales
          const matchesItems = transaction.items.some(item => 
            item.name.toLowerCase().includes(lowerSearchTerm)
          );
          return matchesCustomer || matchesId || matchesItems;
        } else {
          // Search in item description for repairs
          const matchesDescription = transaction.itemDescription.toLowerCase().includes(lowerSearchTerm);
          return matchesCustomer || matchesId || matchesDescription;
        }
      });
    }
    
    // Finally apply date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      
      const monthAgo = new Date(today);
      monthAgo.setMonth(today.getMonth() - 1);
      
      result = result.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        transactionDate.setHours(0, 0, 0, 0);
        
        switch (dateFilter) {
          case 'today':
            return transactionDate.getTime() === today.getTime();
          case 'week':
            return transactionDate >= weekAgo;
          case 'month':
            return transactionDate >= monthAgo;
          default:
            return true;
        }
      });
    }
    
    setFilteredTransactions(result);
  }, [searchTerm, dateFilter, activeTab]);

  // Render transaction status badge
  const renderStatusBadge = (status: 'received' | 'in-progress' | 'completed' | 'collected') => {
    switch (status) {
      case 'received':
        return (
          <Badge className="bg-navy/10 text-navy hover:bg-navy/20 rounded-full px-2 py-1 border-0">
            Received
          </Badge>
        );
      case 'in-progress':
        return (
          <Badge className="bg-gold/10 text-gold-dark hover:bg-gold/20 rounded-full px-2 py-1 border-0">
            In Progress
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-50 text-green-600 hover:bg-green-100 rounded-full px-2 py-1 border-0">
            Completed
          </Badge>
        );
      case 'collected':
        return (
          <Badge className="bg-navy/5 text-navy/70 hover:bg-navy/10 rounded-full px-2 py-1 border-0">
            Collected
          </Badge>
        );
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  return (
    <MainLayout pageTitle="Sales & Repair History">
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Search and filter bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Search by customer, item, or ID..." 
              className="pl-10 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-200" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as any)}>
              <SelectTrigger className="w-[130px] bg-white/90 backdrop-blur-sm border border-gray-100 rounded-xl shadow-sm hover:border-gray-200">
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center mr-1">
                  <Calendar className="text-blue-500" size={14} />
                </div>
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent className="bg-white/90 backdrop-blur-lg border border-gray-100 rounded-xl shadow-md">
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-full bg-white/90 border-gray-100 hover:bg-gray-50 hover:border-gray-200 shadow-sm"
              onClick={() => {
                setSearchTerm('');
                setDateFilter('all');
                toast('Filters reset');
              }}
            >
              <Filter size={16} className="text-gray-600" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              className="h-9 w-9 rounded-full bg-white/90 border-gray-100 hover:bg-gray-50 hover:border-gray-200 shadow-sm"
            >
              <FileText size={16} className="text-gray-600" />
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All History</TabsTrigger>
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="repairs">Repairs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-4">
            <Card className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-gray-800">All Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-100">
                      <TableHead className="text-gray-500 font-medium">Date</TableHead>
                      <TableHead className="text-gray-500 font-medium">ID</TableHead>
                      <TableHead className="text-gray-500 font-medium">Type</TableHead>
                      <TableHead className="text-gray-500 font-medium">Customer</TableHead>
                      <TableHead className="text-gray-500 font-medium">Details</TableHead>
                      <TableHead className="text-gray-500 font-medium">Amount/Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                          <TableCell className="font-medium text-gray-800">{transaction.date}</TableCell>
                          <TableCell className="text-gray-600">{transaction.id}</TableCell>
                          <TableCell>
                            {transaction.type === 'sale' ? (
                              <Badge className="bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full px-2 py-1 border-0">
                                <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center mr-1">
                                  <Tag size={10} className="text-blue-600" />
                                </div>
                                Sale
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-50 text-purple-600 hover:bg-purple-100 rounded-full px-2 py-1 border-0">
                                <div className="w-4 h-4 rounded-full bg-purple-100 flex items-center justify-center mr-1">
                                  <FileText size={10} className="text-purple-600" />
                                </div>
                                Repair
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-800">{transaction.customerName}</TableCell>
                          <TableCell className="text-gray-600">
                            {transaction.type === 'sale'
                              ? transaction.items.join(', ')
                              : transaction.itemDescription}
                          </TableCell>
                          <TableCell className="font-medium">
                            {transaction.type === 'sale'
                              ? <span className="text-gray-800">{formatCurrency(transaction.totalAmount)}</span>
                              : renderStatusBadge(transaction.status)}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                          <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                          No transactions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sales" className="mt-4">
            <Card className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-gray-800">Sales History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-100">
                      <TableHead className="text-gray-500 font-medium">Date</TableHead>
                      <TableHead className="text-gray-500 font-medium">Sale ID</TableHead>
                      <TableHead className="text-gray-500 font-medium">Customer</TableHead>
                      <TableHead className="text-gray-500 font-medium">Items</TableHead>
                      <TableHead className="text-gray-500 font-medium">Payment Method</TableHead>
                      <TableHead className="text-gray-500 font-medium">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => {
                        if (transaction.type !== 'sale') return null;
                        return (
                          <TableRow key={transaction.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                            <TableCell className="font-medium text-gray-800">{transaction.date}</TableCell>
                            <TableCell className="text-gray-600">{transaction.id}</TableCell>
                            <TableCell className="text-gray-800">{transaction.customerName}</TableCell>
                            <TableCell className="text-gray-600">{transaction.items.join(', ')}</TableCell>
                            <TableCell>
                              <Badge className="bg-gray-50 text-gray-600 rounded-full px-2 py-1 border-0">
                                {transaction.paymentMethod}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium text-gray-800">{formatCurrency(transaction.totalAmount)}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                          <Tag size={32} className="mx-auto mb-2 text-gray-300" />
                          No sales found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="repairs" className="mt-4">
            <Card className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg border border-gray-100 rounded-xl shadow-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-gray-800">Repair History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-100">
                      <TableHead className="text-gray-500 font-medium">Date</TableHead>
                      <TableHead className="text-gray-500 font-medium">Repair ID</TableHead>
                      <TableHead className="text-gray-500 font-medium">Customer</TableHead>
                      <TableHead className="text-gray-500 font-medium">Item Description</TableHead>
                      <TableHead className="text-gray-500 font-medium">Status</TableHead>
                      <TableHead className="text-gray-500 font-medium">Est. Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length > 0 ? (
                      filteredTransactions.map((transaction) => {
                        if (transaction.type !== 'repair') return null;
                        return (
                          <TableRow key={transaction.id} className="hover:bg-gray-50/50 transition-colors border-b border-gray-100">
                            <TableCell className="font-medium text-gray-800">{transaction.date}</TableCell>
                            <TableCell className="text-gray-600">{transaction.id}</TableCell>
                            <TableCell className="text-gray-800">{transaction.customerName}</TableCell>
                            <TableCell className="text-gray-600">{transaction.itemDescription}</TableCell>
                            <TableCell>{renderStatusBadge(transaction.status)}</TableCell>
                            <TableCell className="font-medium text-gray-800">{formatCurrency(transaction.estimatedPrice)}</TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                          <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                          No repairs found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default HistoryPage;
