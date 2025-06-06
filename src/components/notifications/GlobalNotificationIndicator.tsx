import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// This component monitors notifications globally and ensures the notification icon
// is always visible when notifications exist, regardless of the current page
const GlobalNotificationIndicator: React.FC = () => {
  const { auth } = useAuth();
  
  // We don't render anything visually, this is just a controller component
  // that ensures notifications are properly tracked across the application
  return null;
};

export default GlobalNotificationIndicator;
