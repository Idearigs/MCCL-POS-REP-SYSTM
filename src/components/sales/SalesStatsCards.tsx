import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, ShoppingCart, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface SalesStatsCardsProps {
  todayRevenue: number;
  todaySales: number;
  weekRevenue: number;
  weekSales: number;
  monthRevenue: number;
  monthSales: number;
  totalRevenue: number;
  totalSales: number;
  /** Revenue at the same point in the previous period. */
  previous?: { day?: number; week?: number; month?: number };
  loading?: boolean;
}

/** Percentage change, or null when there is nothing to compare with. */
const change = (current: number, previous?: number) =>
  previous && previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;

const SalesStatsCards: React.FC<SalesStatsCardsProps> = ({
  todayRevenue,
  todaySales,
  weekRevenue,
  weekSales,
  monthRevenue,
  monthSales,
  totalRevenue,
  totalSales,
  previous = {},
  loading = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const stats = [
    {
      title: "Today's Sales",
      revenue: todayRevenue,
      count: todaySales,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      trend: change(todayRevenue, previous.day),
      versus: 'yesterday'
    },
    {
      title: "This Week",
      revenue: weekRevenue,
      count: weekSales,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      trend: change(weekRevenue, previous.week),
      versus: 'last week'
    },
    {
      title: "This Month",
      revenue: monthRevenue,
      count: monthSales,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      trend: change(monthRevenue, previous.month),
      versus: 'last month'
    },
    {
      title: "Total Sales",
      revenue: totalRevenue,
      count: totalSales,
      icon: CreditCard,
      color: 'text-navy',
      bgColor: 'bg-navy/5',
      iconBg: 'bg-navy/10',
      trend: null,
      versus: ''
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className={`${stat.bgColor} border-none shadow-sm hover:shadow-md transition-shadow duration-200`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`${stat.iconBg} p-2 rounded-lg`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col">
              <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                {formatCurrency(stat.revenue)}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-600">
                  {stat.count} {stat.count === 1 ? 'transaction' : 'transactions'}
                </p>
                {stat.trend !== null && (
                  <div
                    title={`Compared with the same point ${stat.versus}`}
                    className={`flex items-center text-xs ${stat.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {stat.trend >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 mr-1" />
                    )}
                    {stat.trend > 0 ? '+' : ''}{stat.trend}% vs {stat.versus}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SalesStatsCards;
