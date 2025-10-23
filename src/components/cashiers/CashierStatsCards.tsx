import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, DollarSign, Award } from 'lucide-react';

interface CashierStatsCardsProps {
  totalCashiers: number;
  activeCashiers: number;
  topPerformer?: {
    name: string;
    revenue: number;
  };
  totalRevenue: number;
  loading?: boolean;
}

const CashierStatsCards: React.FC<CashierStatsCardsProps> = ({
  totalCashiers,
  activeCashiers,
  topPerformer,
  totalRevenue,
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
      title: 'Total Cashiers',
      value: totalCashiers,
      icon: Users,
      description: `${activeCashiers} active`,
      color: 'text-blue-600'
    },
    {
      title: 'Active Today',
      value: activeCashiers,
      icon: TrendingUp,
      description: 'Currently working',
      color: 'text-green-600'
    },
    {
      title: 'Top Performer',
      value: topPerformer?.name || 'N/A',
      subValue: topPerformer ? formatCurrency(topPerformer.revenue) : '',
      icon: Award,
      description: 'This month',
      color: 'text-yellow-600'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(totalRevenue),
      icon: DollarSign,
      description: 'All cashiers combined',
      color: 'text-purple-600'
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 w-full bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stat.value}
            </div>
            {stat.subValue && (
              <div className="text-lg font-semibold text-muted-foreground mt-1">
                {stat.subValue}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default CashierStatsCards;
