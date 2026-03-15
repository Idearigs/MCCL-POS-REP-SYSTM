import React from 'react';
import { TaskStatus } from '../../services/taskService';
import { Circle, Clock, PlayCircle, CheckCircle, XCircle, Eye } from 'lucide-react';

interface StatusBadgeProps {
  status: TaskStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const configs = {
    TODO: {
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: Circle,
      label: 'To Do',
    },
    IN_PROGRESS: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: PlayCircle,
      label: 'In Progress',
    },
    IN_REVIEW: {
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: Eye,
      label: 'In Review',
    },
    COMPLETED: {
      color: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle,
      label: 'Completed',
    },
    CANCELLED: {
      color: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle,
      label: 'Cancelled',
    },
  };

  const config = configs[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border ${config.color}`}
    >
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
};

export default StatusBadge;
