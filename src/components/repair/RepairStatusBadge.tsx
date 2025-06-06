
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface RepairStatusBadgeProps {
  status: 'received' | 'in-progress' | 'completed' | 'collected';
  size?: 'sm' | 'md' | 'lg';
}

const RepairStatusBadge: React.FC<RepairStatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusStyles = () => {
    switch (status) {
      case 'received':
        return 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-200';
      case 'in-progress':
        return 'bg-orange-100 hover:bg-orange-200 text-orange-800 border-orange-200';
      case 'completed':
        return 'bg-green-100 hover:bg-green-200 text-green-800 border-green-200';
      case 'collected':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'received':
        return 'Received';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'collected':
        return 'Collected';
      default:
        return 'Unknown';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'lg':
        return 'text-sm px-3 py-1';
      default:
        return 'text-xs px-2.5 py-0.5';
    }
  };

  return (
    <Badge className={`${getStatusStyles()} ${getSizeClass()} font-medium transition-colors duration-200`}>
      {getStatusLabel()}
    </Badge>
  );
};

export default RepairStatusBadge;
