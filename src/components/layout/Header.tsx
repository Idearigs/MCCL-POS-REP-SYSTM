
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, User, LogOut, AlertTriangle, Info, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationType } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import NotificationsDialog from "@/components/notifications/NotificationsDialog";



interface HeaderProps {
  pageTitle: string;
  userName?: string;
  hasPaymentWarning?: boolean;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, userName = "Staff Member", hasPaymentWarning = false }) => {
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);
  const { auth, markNotificationAsRead } = useAuth();
  
  // Get notifications from auth context
  const { notifications } = auth;
  
  // Create a copy of all notifications to work with
  const allNotifications = [...notifications];
  
  // Add payment warning notification if hasPaymentWarning is true and not already present
  if (hasPaymentWarning && !notifications.some(n => n.title === 'Payment Warning')) {
    allNotifications.unshift({
      id: 'payment-warning',
      type: 'payment',
      title: 'Payment Warning',
      message: 'Your account has insufficient funds. System will be shut down if payment is not received.',
      time: 'Just now',
      isNew: true,
      link: '/subscription?highlight=warning'
    });
  }
  
  // Count new notifications
  const newNotificationsCount = allNotifications.filter(n => n.isNew).length;
  
  const handleSignOut = () => {
    // Navigate to login page
    navigate('/login');
  };
  
  const handleNotificationClick = (notification: { id: string, link?: string }) => {
    // Mark notification as read
    markNotificationAsRead(notification.id);
    
    // Close dropdown and navigate if link exists
    setIsNotificationOpen(false);
    if (notification.link) {
      navigate(notification.link);
    }
  };
  
  // Get icon based on notification type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'payment':
        return <AlertTriangle size={14} className="text-gold-dark" />;
      case 'system':
        return <Info size={14} className="text-navy" />;
      default:
        return <Info size={14} className="text-navy/70" />;
    }
  };
  
  // Get background color based on notification type
  const getNotificationBgColor = (type: NotificationType) => {
    switch (type) {
      case 'payment':
        return 'bg-gold/20';
      case 'system':
        return 'bg-navy/20';
      default:
        return 'bg-navy/10';
    }
  };
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-gray-100 py-3 px-4 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-colors" />
        <h1 className="text-xl font-heading font-semibold text-gray-800">{pageTitle}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative rounded-full bg-white/90 border-navy/10 hover:bg-navy/5 hover:text-navy shadow-sm">
              <Bell size={18} className={newNotificationsCount > 0 ? "text-red-500" : "text-navy/70"} />
              {newNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center shadow-sm animate-pulse">
                  <span className="text-[10px] font-bold text-white">{newNotificationsCount}</span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-white/95 backdrop-blur-lg border border-navy/10 shadow-md rounded-xl overflow-hidden">
            <div className="px-4 py-2 font-medium text-navy">Notifications</div>
            <div className="max-h-[400px] overflow-y-auto">
              {allNotifications.length > 0 ? (
                allNotifications.map((notification) => (
                  <div key={notification.id} className="px-4 py-3 border-b border-navy/10 hover:bg-navy/5 cursor-pointer transition-colors" onClick={() => handleNotificationClick(notification)}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-8 w-8 ${getNotificationBgColor(notification.type)} rounded-full flex items-center justify-center flex-shrink-0 shadow-sm`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2 text-navy">
                          {notification.title}
                          {notification.isNew && (
                            <span className="text-[10px] bg-gold/10 text-gold-dark px-2 py-0.5 rounded-full font-medium shadow-sm">New</span>
                          )}
                        </div>
                        <p className="text-xs text-navy/70 mt-0.5">{notification.message}</p>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[10px] text-navy/60">{notification.time}</span>
                          {notification.link && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs h-7 rounded-full bg-navy/10 text-navy border-navy/20 hover:bg-navy/20 hover:border-navy/30" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                            >
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-sm text-center text-navy/60">
                  No notifications at this time
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="justify-center text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-50/50 py-2"
              onClick={() => {
                setIsNotificationOpen(false);
                setIsNotificationsDialogOpen(true);
              }}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-full bg-white/90 border-gray-100 hover:bg-gray-50 hover:border-gray-200 shadow-sm">
              <Avatar className="w-6 h-6 border border-gray-100">
                <AvatarImage src="https://github.com/shadcn.png" alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-medium">{userName.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-gray-700">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-white/90 backdrop-blur-lg border border-gray-100 shadow-md rounded-xl overflow-hidden min-w-[180px]">
            <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-gray-50/70 py-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-2">
                <User className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-gray-700">Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-gray-50/70 py-2.5">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center mr-2">
                <Settings className="h-4 w-4 text-gray-500" />
              </div>
              <span className="text-gray-700">My Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-500 hover:text-red-600 hover:bg-red-50/50 py-2.5">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center mr-2">
                <LogOut className="h-4 w-4 text-red-500" />
              </div>
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Notifications Dialog */}
      <NotificationsDialog 
        open={isNotificationsDialogOpen} 
        onOpenChange={setIsNotificationsDialogOpen} 
      />
    </header>
  );
};

export default Header;
