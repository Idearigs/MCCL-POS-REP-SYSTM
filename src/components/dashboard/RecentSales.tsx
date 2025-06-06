
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Sale {
  id: string;
  customer: string;
  initials: string;
  items: string;
  amount: string;
  date: string;
}

interface RecentSalesProps {
  sales: Sale[];
  className?: string;
}

const RecentSales: React.FC<RecentSalesProps> = ({ sales, className }) => {
  return (
    <Card className={`overflow-hidden border border-white/60 shadow-[0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-shadow duration-200 h-[400px] ${className || 'bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl'}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-gray-800">Recent Sales</h2>
          <button className="text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors rounded-full px-3 py-1 bg-blue-50 hover:bg-blue-100">
            View all
          </button>
        </div>
        
        <div className="space-y-5">
          {sales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between p-3 -mx-3 rounded-xl hover:bg-gray-50/80 transition-colors">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10 rounded-full border border-gray-100 shadow-sm">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-medium">
                    {sale.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium leading-none text-gray-800">{sale.customer}</p>
                  <p className="text-xs text-gray-500 mt-1">{sale.items}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-800">{sale.amount}</p>
                <p className="text-xs text-gray-500 mt-1">{sale.date}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentSales;
