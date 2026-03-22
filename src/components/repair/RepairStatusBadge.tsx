
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface RepairStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

const RepairStatusBadge: React.FC<RepairStatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusStyles = () => {
    const upperStatus = status?.toUpperCase() || '';

    switch (upperStatus) {
      case 'RECEIVED':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700';
      case 'QUOTED':
      case 'AWAITING_APPROVAL':
        return 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 border-yellow-500';
      case 'AWAITING_INSTRUCTIONS':
      case 'ASSESSED':
        return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600';
      case 'APPROVED':
        return 'bg-green-600 hover:bg-green-700 text-white border-green-700';
      case 'IN_PROGRESS':
      case 'BOOKED_OUT':
        return 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-600';
      case 'COMPLETED':
      case 'READY_FOR_PICKUP':
      case 'READY_FOR_COLLECTION':
        return 'bg-green-500 hover:bg-green-600 text-white border-green-600';
      case 'DELIVERED':
      case 'COLLECTED':
        return 'bg-gray-500 hover:bg-gray-600 text-white border-gray-600';
      case 'CANCELLED':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-700';
      default:
        return 'bg-gray-400 hover:bg-gray-500 text-white border-gray-500';
    }
  };

  const getStatusLabel = () => {
    const upperStatus = status?.toUpperCase() || '';

    switch (upperStatus) {
      case 'RECEIVED':
        return 'Received';
      case 'QUOTED':
        return 'Quoted';
      case 'AWAITING_APPROVAL':
        return 'Awaiting Approval';
      case 'AWAITING_INSTRUCTIONS':
        return 'Awaiting Instructions';
      case 'ASSESSED':
        return 'Assessed';
      case 'APPROVED':
        return 'Approved';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'BOOKED_OUT':
        return 'Booked Out';
      case 'COMPLETED':
        return 'Completed';
      case 'READY_FOR_PICKUP':
      case 'READY_FOR_COLLECTION':
        return 'Ready for Collection';
      case 'DELIVERED':
        return 'Delivered';
      case 'COLLECTED':
        return 'Collected';
      case 'CANCELLED':
        return 'Cancelled';
      default:
        return status || 'Unknown';
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
