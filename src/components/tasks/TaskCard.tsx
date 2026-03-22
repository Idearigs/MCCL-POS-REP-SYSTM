import React from 'react';
import { Task } from '../../services/taskService';
import PriorityBadge from './PriorityBadge';
import { Calendar, MessageSquare, User, Clock } from 'lucide-react';
import { format, isPast, isToday, isTomorrow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'COMPLETED';
  const isDueToday = task.dueDate && isToday(new Date(task.dueDate));
  const isDueTomorrow = task.dueDate && isTomorrow(new Date(task.dueDate));

  const getDueDateColor = () => {
    if (isOverdue) return 'text-red-600 font-semibold';
    if (isDueToday) return 'text-orange-600 font-semibold';
    if (isDueTomorrow) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Priority Badge */}
      <div className="flex items-start justify-between mb-2">
        <PriorityBadge priority={task.priority} />
        {isOverdue && (
          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
            Overdue
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="font-semibold text-gray-900 mb-2 line-clamp-2">{task.title}</h4>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
      )}

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {/* Due Date */}
          {task.dueDate && (
            <div className={`flex items-center gap-1 ${getDueDateColor()}`}>
              <Calendar className="w-3 h-3" />
              <span>{format(new Date(task.dueDate), 'MMM d')}</span>
            </div>
          )}

          {/* Comments Count */}
          {task._count && task._count.comments > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{task._count.comments}</span>
            </div>
          )}
        </div>

        {/* Assigned Users Count */}
        {task.assignedTo && task.assignedTo.length > 0 && (
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>{task.assignedTo.length}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
