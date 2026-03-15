import React from 'react';
import { Badge } from '@/components/ui/badge';

interface RepairTagBadgeProps {
  tagName: string;
  tagColor: string;
  size?: 'sm' | 'md' | 'lg';
}

const RepairTagBadge: React.FC<RepairTagBadgeProps> = ({ tagName, tagColor, size = 'md' }) => {
  const getColorStyles = () => {
    switch (tagColor.toLowerCase()) {
      case 'blue':
        return 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700';
      case 'yellow':
        return 'bg-yellow-400 hover:bg-yellow-500 text-gray-900 border-yellow-500';
      case 'orange':
        return 'bg-orange-500 hover:bg-orange-600 text-white border-orange-600';
      case 'red':
        return 'bg-red-600 hover:bg-red-700 text-white border-red-700';
      case 'green':
        return 'bg-green-500 hover:bg-green-600 text-white border-green-600';
      case 'cyan':
      case 'light-blue':
        return 'bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-600';
      case 'purple':
        return 'bg-purple-600 hover:bg-purple-700 text-white border-purple-700';
      case 'gray':
      case 'grey':
        return 'bg-gray-500 hover:bg-gray-600 text-white border-gray-600';
      default:
        return 'bg-gray-400 hover:bg-gray-500 text-white border-gray-500';
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
    <Badge className={`${getColorStyles()} ${getSizeClass()} font-medium transition-colors duration-200`}>
      {tagName}
    </Badge>
  );
};

export default RepairTagBadge;
