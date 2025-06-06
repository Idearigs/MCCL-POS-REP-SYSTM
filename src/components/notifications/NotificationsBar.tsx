import React from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';

interface NotificationsBarProps {
  className?: string;
}

const NotificationsBar = ({ className = '' }: NotificationsBarProps) => {
  return (
    <div className={`w-full bg-muted py-2 px-4 text-center border-b ${className}`}>
      <Link 
        to="/notifications" 
        className="inline-flex items-center gap-2 text-sm text-primary hover:underline transition-all"
      >
        <Bell size={14} />
        <span>View all notifications</span>
      </Link>
    </div>
  );
};

export default NotificationsBar;
