
import React from 'react';
import { 
  Package, 
  FileText, 
  User, 
  CreditCard,
  Calendar,
  Clock
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import StatsCard from '@/components/dashboard/StatsCard';
import RepairStatusChart from '@/components/dashboard/RepairStatusChart';
import RecentSales from '@/components/dashboard/RecentSales';

const Index = () => {
  // Demo data for repair status chart
  const repairStatusData = [
    { name: 'Received', value: 12, color: '#0A84FF' },
    { name: 'In Progress', value: 18, color: '#FF9F0A' },
    { name: 'Completed', value: 8, color: '#30D158' },
    { name: 'Collected', value: 5, color: '#8E8E93' },
  ];
  
  // Demo data for recent sales
  const recentSales = [
    {
      id: '1',
      customer: 'Emma Wilson',
      initials: 'EW',
      items: '18k Gold Necklace',
      amount: '£1,248.00',
      date: 'Today at 12:14 PM'
    },
    {
      id: '2',
      customer: 'James Miller',
      initials: 'JM',
      items: 'Watch Repair + Diamond Ring',
      amount: '£895.00',
      date: 'Today at 10:30 AM'
    },
    {
      id: '3',
      customer: 'Olivia Brown',
      initials: 'OB',
      items: 'Silver Bracelet + Cleaning',
      amount: '£126.50',
      date: 'Yesterday at 3:45 PM'
    },
    {
      id: '4',
      customer: 'Robert Johnson',
      initials: 'RJ',
      items: 'Watch Battery Replacement',
      amount: '£45.00',
      date: 'Yesterday at 1:22 PM'
    },
  ];
  
  return (
    <MainLayout pageTitle="Dashboard">
      <div className="animate-fade-in space-y-8 max-w-7xl mx-auto px-4 py-6">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2 text-gray-800">Good day, Admin</h1>
          <p className="text-gray-500">Here's what's happening with your jewelry business today.</p>
        </div>
        
        {/* Main stats */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard 
            title="Today's Sales" 
            value="£3,248"
            description="18 transactions" 
            icon={<div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><CreditCard size={16} className="text-blue-500" /></div>} 
            trend={{ value: 12, isPositive: true }}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
          />
          <StatsCard 
            title="Active Repairs" 
            value="38"
            description="6 due today" 
            icon={<div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center"><FileText size={16} className="text-orange-500" /></div>} 
            trend={{ value: 5, isPositive: true }}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
          />
          <StatsCard 
            title="Low Stock Items" 
            value="7"
            description="Needs reordering" 
            icon={<div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center"><Package size={16} className="text-red-500" /></div>} 
            trend={{ value: 2, isPositive: false }}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
          />
          <StatsCard 
            title="Total Customers" 
            value="1,284"
            description="24 new this month" 
            icon={<div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center"><User size={16} className="text-green-500" /></div>} 
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
          />
        </div>

        {/* Charts and recent activity */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-7">
          <div className="md:col-span-1 lg:col-span-4">
            <RecentSales 
              sales={recentSales} 
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-3">
            <RepairStatusChart 
              data={repairStatusData} 
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
            />
          </div>
        </div>
        
        {/* Secondary stats */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="md:col-span-1 lg:col-span-1">
            <StatsCard 
              title="Appointments Today" 
              value="6"
              description="2 repair consultations" 
              icon={<div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center"><Calendar size={16} className="text-purple-500" /></div>} 
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <StatsCard 
              title="London Outlet" 
              value="£1,845"
              description="12 transactions" 
              icon={<div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><CreditCard size={16} className="text-blue-500" /></div>} 
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <StatsCard 
              title="Birmingham Outlet" 
              value="£1,403"
              description="6 transactions" 
              icon={<div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center"><CreditCard size={16} className="text-indigo-500" /></div>} 
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
