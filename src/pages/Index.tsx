
import React, { useState, useEffect } from 'react';
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
import GoldTrackingWidget from '@/components/dashboard/GoldTrackingWidget';
import { dashboardService, DashboardStats, RecentSale, RepairStatusChartData } from '@/services/dashboardService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [repairStatusData, setRepairStatusData] = useState<RepairStatusChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [dashboardStats, salesData, repairChartData, appointments] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getRecentSales(5),
        dashboardService.getRepairStatusChartData(),
        dashboardService.getTodayAppointments(),
      ]);

      setStats(dashboardStats);
      setRecentSales(salesData);
      setRepairStatusData(repairChartData);
      setAppointmentsToday(appointments);
    } catch (error: any) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data. Please refresh the page.',
        variant: 'destructive',
      });

      // Set default empty states
      setStats({
        sales: { todayRevenue: 0, todayCount: 0, monthRevenue: 0, monthCount: 0, trend: 0 },
        repairs: { activeCount: 0, dueToday: 0, received: 0, inProgress: 0, completed: 0, collected: 0 },
        inventory: { totalProducts: 0, lowStockCount: 0, outOfStockCount: 0, totalValue: 0 },
        customers: { totalCount: 0, newThisMonth: 0, activeCount: 0 },
      });
      setRecentSales([]);
      setRepairStatusData([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getUserGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = user?.name?.split(' ')[0] || 'there';
  
  return (
    <MainLayout pageTitle="Dashboard">
      <div className="animate-fade-in space-y-8 max-w-7xl mx-auto px-4 py-6">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-3xl font-medium tracking-tight mb-2 text-gray-800">
            {getUserGreeting()}, {userName}
          </h1>
          <p className="text-gray-500">Here's what's happening with your jewelry business today.</p>
        </div>

        {/* Main stats */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Today's Sales"
            value={loading ? '...' : formatCurrency(stats?.sales.todayRevenue || 0)}
            description={loading ? 'Loading...' : `${stats?.sales.todayCount || 0} transactions`}
            icon={<div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><CreditCard size={16} className="text-blue-500" /></div>}
            trend={stats?.sales.trend ? { value: Math.abs(stats.sales.trend), isPositive: stats.sales.trend > 0 } : undefined}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
          />
          <StatsCard
            title="Active Repairs"
            value={loading ? '...' : (stats?.repairs.activeCount || 0)}
            description={loading ? 'Loading...' : `${stats?.repairs.dueToday || 0} due today`}
            icon={<div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center"><FileText size={16} className="text-orange-500" /></div>}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
          />
          <StatsCard
            title="Low Stock Items"
            value={loading ? '...' : (stats?.inventory.lowStockCount || 0)}
            description={loading ? 'Loading...' : 'Needs reordering'}
            icon={<div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center"><Package size={16} className="text-red-500" /></div>}
            trend={stats?.inventory.lowStockCount && stats.inventory.lowStockCount > 0 ? { value: stats.inventory.lowStockCount, isPositive: false } : undefined}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
          />
          <StatsCard
            title="Total Customers"
            value={loading ? '...' : (stats?.customers.totalCount || 0).toLocaleString()}
            description={loading ? 'Loading...' : `${stats?.customers.newThisMonth || 0} new this month`}
            icon={<div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center"><User size={16} className="text-green-500" /></div>}
            className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
          />
        </div>

        {/* Charts, Gold Tracking and recent activity */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-12">
          {/* Recent Sales - Takes 5 columns on large screens */}
          <div className="md:col-span-1 lg:col-span-5">
            <RecentSales
              sales={recentSales}
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm h-full"
            />
          </div>

          {/* Gold Tracking Widget - Takes 4 columns on large screens */}
          <div className="md:col-span-1 lg:col-span-4">
            <GoldTrackingWidget className="h-full" />
          </div>

          {/* Repair Status Chart - Takes 3 columns on large screens */}
          <div className="md:col-span-2 lg:col-span-3">
            <RepairStatusChart
              data={repairStatusData}
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm h-full"
            />
          </div>
        </div>
        
        {/* Secondary stats */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <div className="md:col-span-1 lg:col-span-1">
            <StatsCard
              title="Appointments Today"
              value={loading ? '...' : appointmentsToday}
              description={loading ? 'Loading...' : `${stats?.repairs.dueToday || 0} repair consultations`}
              icon={<div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center"><Calendar size={16} className="text-purple-500" /></div>}
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <StatsCard
              title="Monthly Revenue"
              value={loading ? '...' : formatCurrency(stats?.sales.monthRevenue || 0)}
              description={loading ? 'Loading...' : `${stats?.sales.monthCount || 0} transactions`}
              icon={<div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center"><CreditCard size={16} className="text-blue-500" /></div>}
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
            />
          </div>
          <div className="md:col-span-1 lg:col-span-1">
            <StatsCard
              title="Inventory Value"
              value={loading ? '...' : formatCurrency(stats?.inventory.totalValue || 0)}
              description={loading ? 'Loading...' : `${stats?.inventory.totalProducts || 0} products in stock`}
              icon={<div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center"><Package size={16} className="text-indigo-500" /></div>}
              className="bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl border border-gray-100 shadow-sm"
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Index;
