// Dashboard Service - Aggregates data from multiple sources
import { salesService, SalesStats } from './salesService';
import { productService, ProductStats } from './productService';
import { customerService, CustomerStats } from './customerService';
import { repairService, RepairStats } from './repairService';
import { Sale } from './salesService';
import { Repair } from './repairService';

export interface DashboardStats {
  sales: {
    todayRevenue: number;
    todayCount: number;
    monthRevenue: number;
    monthCount: number;
    trend: number; // Percentage change from yesterday/last month
  };
  repairs: {
    activeCount: number;
    dueToday: number;
    received: number;
    inProgress: number;
    completed: number;
    collected: number;
  };
  inventory: {
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  };
  customers: {
    totalCount: number;
    newThisMonth: number;
    activeCount: number;
  };
}

export interface RecentSale {
  id: string;
  customer: string;
  initials: string;
  items: string;
  amount: string;
  date: string;
}

export interface RepairStatusChartData {
  name: string;
  value: number;
  color: string;
}

class DashboardService {
  /**
   * Get all dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [salesStats, productStats, customerStats, repairStats] = await Promise.all([
        salesService.getSalesStats().catch(() => this.getDefaultSalesStats()),
        productService.getProductStats().catch(() => this.getDefaultProductStats()),
        customerService.getCustomerStats().catch(() => this.getDefaultCustomerStats()),
        repairService.getRepairStats().catch(() => this.getDefaultRepairStats()),
      ]);

      // Map statusBreakdown to the format we need
      const statusBreakdown = repairStats.statusBreakdown || {};

      return {
        sales: {
          todayRevenue: salesStats.revenueToday || 0,
          todayCount: salesStats.salesToday || 0,
          monthRevenue: salesStats.revenueThisMonth || 0,
          monthCount: salesStats.salesThisMonth || 0,
          trend: this.calculateTrend(salesStats.revenueToday, salesStats.revenueThisMonth),
        },
        repairs: {
          activeCount: repairStats.activeRepairs || 0,
          dueToday: repairStats.dueToday || repairStats.overdueRepairs || 0,
          received: statusBreakdown.RECEIVED || 0,
          inProgress: statusBreakdown.IN_PROGRESS || 0,
          completed: statusBreakdown.COMPLETED || 0,
          collected: statusBreakdown.COLLECTED || statusBreakdown.READY_FOR_COLLECTION || 0,
        },
        inventory: {
          totalProducts: productStats.totalProducts || 0,
          lowStockCount: productStats.lowStockCount || 0,
          outOfStockCount: productStats.outOfStockCount || 0,
          totalValue: productStats.totalInventoryValue || 0,
        },
        customers: {
          totalCount: customerStats.totalCustomers || 0,
          newThisMonth: customerStats.newThisMonth || 0,
          activeCount: customerStats.activeCustomers || 0,
        },
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get recent sales for dashboard
   */
  async getRecentSales(limit: number = 5): Promise<RecentSale[]> {
    try {
      const response = await salesService.getSales(1, limit, {
        // Sort by most recent
      });

      return response.data.map((sale) => this.formatSaleForDashboard(sale));
    } catch (error) {
      console.error('Error fetching recent sales:', error);
      return [];
    }
  }

  /**
   * Get repair status data for chart
   */
  async getRepairStatusChartData(): Promise<RepairStatusChartData[]> {
    try {
      const repairStats = await repairService.getRepairStats();
      const statusBreakdown = repairStats.statusBreakdown || {};

      console.log('Repair stats received:', repairStats);
      console.log('Status breakdown:', statusBreakdown);

      // Combine related statuses for cleaner chart display
      const received = (statusBreakdown.RECEIVED || 0);
      const quoted = (statusBreakdown.QUOTED || 0);
      const approved = (statusBreakdown.APPROVED || 0);
      const inProgress = (statusBreakdown.IN_PROGRESS || 0);
      const completed = (statusBreakdown.COMPLETED || 0);
      const readyForCollection = (statusBreakdown.READY_FOR_COLLECTION || 0);
      const collected = (statusBreakdown.COLLECTED || 0);

      // Group statuses logically
      const chartData = [
        {
          name: 'Pending',
          value: received + quoted + approved,  // All pending statuses
          color: '#0A84FF',
        },
        {
          name: 'In Progress',
          value: inProgress,
          color: '#FF9F0A',
        },
        {
          name: 'Completed',
          value: completed,
          color: '#30D158',
        },
        {
          name: 'Ready/Collected',
          value: readyForCollection + collected,
          color: '#8E8E93',
        },
      ];

      console.log('Chart data prepared:', chartData);
      return chartData;
    } catch (error) {
      console.error('Error fetching repair status data:', error);
      return [
        { name: 'Pending', value: 0, color: '#0A84FF' },
        { name: 'In Progress', value: 0, color: '#FF9F0A' },
        { name: 'Completed', value: 0, color: '#30D158' },
        { name: 'Ready/Collected', value: 0, color: '#8E8E93' },
      ];
    }
  }

  /**
   * Get appointments count for today
   */
  async getTodayAppointments(): Promise<number> {
    try {
      // This would require a calendar service endpoint
      // For now, return estimated value from repairs due today
      const repairStats = await repairService.getRepairStats();
      return repairStats.dueToday || 0;
    } catch (error) {
      console.error('Error fetching today appointments:', error);
      return 0;
    }
  }

  // Helper methods

  private formatSaleForDashboard(sale: Sale): RecentSale {
    // Defensive null checks
    if (!sale) {
      return {
        id: '',
        customer: 'Unknown',
        initials: 'UK',
        items: 'No items',
        amount: '£0.00',
        date: 'Unknown',
      };
    }

    const customerName = sale.customerName || 'Walk-in Customer';
    const initials = this.getInitials(customerName);
    const itemsText = this.formatSaleItems(sale.items || []);
    const amount = this.formatCurrency(sale.totalAmount || 0);
    const date = this.formatRelativeDate(sale.createdAt || new Date().toISOString());

    return {
      id: sale.id || '',
      customer: customerName,
      initials,
      items: itemsText,
      amount,
      date,
    };
  }

  private getInitials(name: string): string {
    const parts = name.trim().split(' ');
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  private formatSaleItems(items: any[]): string {
    // Defensive null check
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 'No items';
    }

    // Filter out null/undefined items
    const validItems = items.filter(item => item && item.productName);

    if (validItems.length === 0) {
      return 'No items';
    }

    if (validItems.length === 1) {
      return validItems[0].productName || 'Product';
    } else if (validItems.length === 2) {
      return `${validItems[0].productName} + ${validItems[1].productName}`;
    } else {
      return `${validItems[0].productName} + ${validItems.length - 1} more`;
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  }

  private formatRelativeDate(dateString: string): string {
    try {
      // Defensive null check and validation
      if (!dateString) {
        return 'Unknown date';
      }

      const date = new Date(dateString);

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) {
        const time = date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
        return `Today at ${time}`;
      }
      if (diffDays === 1) {
        const time = date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        });
        return `Yesterday at ${time}`;
      }
      return date.toLocaleDateString('en-GB', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting relative date:', error);
      return 'Unknown date';
    }
  }

  private calculateTrend(current: number, previous: number): number {
    // Defensive null checks
    const curr = current || 0;
    const prev = previous || 0;

    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  // Default stats for error handling
  private getDefaultSalesStats(): SalesStats {
    return {
      totalSales: 0,
      completedSales: 0,
      pendingSales: 0,
      cancelledSales: 0,
      totalSalesAmount: 0,
      totalRevenue: 0, // Backwards compatibility
      averageSaleAmount: 0,
      averageOrderValue: 0, // Backwards compatibility
      totalRefundedAmount: 0,
      salesToday: 0,
      salesThisMonth: 0,
      salesThisYear: 0,
      revenueToday: 0,
      revenueThisMonth: 0,
      revenueThisYear: 0,
      paymentMethodBreakdown: {},
      topSellingProducts: [],
      topProducts: [], // Backwards compatibility
      salesByHour: {},
      salesByPaymentMethod: [], // Backwards compatibility
    };
  }

  private getDefaultProductStats(): ProductStats {
    return {
      totalProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0,
      damagedProducts: 0,
      lowStockProducts: 0,
      totalStockValue: 0,
      averageProductValue: 0,
      outOfStockProducts: 0,
      productsByMaterial: {},
      productsByCategory: {},
      // Compatibility fields
      lowStockCount: 0,
      totalInventoryValue: 0,
      outOfStockCount: 0,
      topCategories: [],
      topMaterials: [],
    };
  }

  private getDefaultCustomerStats(): CustomerStats {
    return {
      totalCustomers: 0,
      activeCustomers: 0,
      inactiveCustomers: 0,
      redFlaggedCustomers: 0,
      newCustomersThisMonth: 0,
      totalSpentAllTime: 0,
      averageSpentPerCustomer: 0,
      customersWithEmailConsent: 0,
      customersWithSmsConsent: 0,
      // Compatibility fields
      newThisMonth: 0,
      topCities: [],
      customersByCountry: [],
      topCustomers: [],
      customerGrowth: [],
    };
  }

  private getDefaultRepairStats(): RepairStats {
    return {
      totalRepairs: 0,
      activeRepairs: 0,
      completedRepairs: 0,
      overdueRepairs: 0,
      dueToday: 0,
      waitingForParts: 0,
      averageRepairTime: 0,
      totalRevenue: 0,
      averageRepairCost: 0,
      repairsThisMonth: 0,
      revenueThisMonth: 0,
      statusBreakdown: {
        RECEIVED: 0,
        IN_PROGRESS: 0,
        COMPLETED: 0,
        COLLECTED: 0,
        CANCELLED: 0,
      },
      priorityBreakdown: {
        LOW: 0,
        NORMAL: 0,
        HIGH: 0,
        URGENT: 0,
      },
      repairTypeBreakdown: {},
    };
  }
}

export const dashboardService = new DashboardService();
export default dashboardService;
