import React from 'react';
import { TaskPriority } from '../../services/taskService';
import { AlertCircle, ArrowUp, ArrowDown, Flame } from 'lucide-react';

interface PriorityBadgeProps {
  priority: TaskPriority;
  showLabel?: boolean;
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showLabel = true }) => {
  const configs = {
    LOW: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: ArrowDown,
      label: 'Low',
    },
    MEDIUM: {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      icon: AlertCircle,
      label: 'Medium',
    },
    HIGH: {
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: ArrowUp,
      label: 'High',
    },
    URGENT: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: Flame,
      label: 'Urgent',
    },
  };

  const config = configs[priority];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {showLabel && config.label}
    </span>
  );
};

export default PriorityBadge;
