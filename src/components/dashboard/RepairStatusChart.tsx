
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';

interface RepairStatusChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  className?: string;
}

const RepairStatusChart: React.FC<RepairStatusChartProps> = ({ data, className }) => {
  // Calculate total for percentage display
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Custom legend component with Apple-style design
  const renderCustomLegend = () => {
    return (
      <div className="grid grid-cols-2 gap-3 mt-4">
        {data.map((entry, index) => (
          <div key={`legend-${index}`} className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs font-medium text-gray-700">
              {entry.name} ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card className={`overflow-hidden border border-white/60 shadow-[0_2px_4px_rgba(0,0,0,0.05),inset_0_1px_1px_rgba(255,255,255,0.8)] hover:shadow-[0_4px_8px_rgba(0,0,0,0.1),inset_0_1px_2px_rgba(255,255,255,0.9)] transition-shadow duration-200 h-[400px] ${className || 'bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-lg rounded-xl'}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold tracking-tight text-gray-800">Repair Status</h2>
        </div>

        <div className="h-[240px]">
          {total === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-400 text-sm">No repair data available</p>
                <p className="text-gray-300 text-xs mt-1">Start adding repairs to see the breakdown</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="value"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      className="drop-shadow-sm"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    border: 'none',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                    padding: '8px 12px'
                  }}
                  formatter={(value) => [`${value} jobs`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {renderCustomLegend()}
      </CardContent>
    </Card>
  );
};

export default RepairStatusChart;
