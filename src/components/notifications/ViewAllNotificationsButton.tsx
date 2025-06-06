import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

interface ViewAllNotificationsButtonProps {
  className?: string;
}

const ViewAllNotificationsButton = ({ className = '' }: ViewAllNotificationsButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/notifications');
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      className={`flex items-center gap-2 ${className}`}
      onClick={handleClick}
    >
      <Bell size={16} />
      <span>View all notifications</span>
    </Button>
  );
};

export default ViewAllNotificationsButton;
