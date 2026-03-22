
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell, User, LogOut, AlertTriangle, Info, Settings, Bug } from 'lucide-react';
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
import FeedbackDialog from "@/components/support/FeedbackDialog";



interface HeaderProps {
  pageTitle: string;
  hasPaymentWarning?: boolean;
}

const Header: React.FC<HeaderProps> = ({ pageTitle, hasPaymentWarning = false }) => {
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isNotificationsDialogOpen, setIsNotificationsDialogOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const { auth, logout, markNotificationAsRead } = useAuth();

  // Get user information from auth context
  const user = auth.user;
  const userName = user && user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : "Guest";
  const userRole = user?.role || "GUEST";
  const userInitials = user && user.firstName && user.lastName
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`
    : "G";

  // Format role for display (capitalize first letter, lowercase rest)
  const formatRole = (role: string) => {
    if (!role) return "Guest";
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

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
  
  const handleSignOut = async () => {
    try {
      // Call logout to clear authentication state
      await logout();
      // Navigate to login page
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      // Still navigate to login even if logout fails
      navigate('/login');
    }
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
    <header className="bg-card/90 backdrop-blur-md border-b border-border py-3 px-4 flex justify-between items-center shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-foreground/70 hover:bg-accent rounded-full p-1 transition-colors" />
        <h1 className="text-xl font-heading font-semibold text-foreground">{pageTitle}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative rounded-full bg-card/90 border-border hover:bg-accent shadow-sm">
              <Bell size={18} className={newNotificationsCount > 0 ? "text-red-500" : "text-foreground/70"} />
              {newNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center shadow-sm animate-pulse">
                  <span className="text-[10px] font-bold text-white">{newNotificationsCount}</span>
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-popover/95 backdrop-blur-lg border border-border shadow-md rounded-xl overflow-hidden">
            <div className="px-4 py-2 font-medium text-foreground">Notifications</div>
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
            <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-full bg-card/90 border-border hover:bg-accent shadow-sm">
              <Avatar className="w-6 h-6 border border-border">
                <AvatarImage src="https://github.com/shadcn.png" alt={userName} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-medium">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">{userName}</span>
                <span className="text-xs text-muted-foreground">{formatRole(userRole)}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-popover/95 backdrop-blur-lg border border-border shadow-md rounded-xl overflow-hidden min-w-[220px]">
            {/* User Info Header */}
            <div className="px-3 py-3 border-b border-border bg-accent/50">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border-2 border-background shadow-sm">
                  <AvatarImage src="https://github.com/shadcn.png" alt={userName} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-bold">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                  <p className="text-xs text-muted-foreground">{formatRole(userRole)}</p>
                  {user?.email && (
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenuItem onClick={() => navigate('/profile')} className="hover:bg-accent py-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center mr-2">
                <User className="h-4 w-4 text-blue-500" />
              </div>
              <span className="text-foreground">Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')} className="hover:bg-accent py-2.5">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-2">
                <Settings className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-foreground">My Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsFeedbackOpen(true)} className="hover:bg-accent py-2.5">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center mr-2">
                <Bug className="h-4 w-4 text-orange-500" />
              </div>
              <span className="text-foreground">Report Issue / Feedback</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-500 hover:text-red-600 hover:bg-red-500/10 py-2.5">
              <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center mr-2">
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

      {/* Feedback / Bug Report Dialog */}
      <FeedbackDialog
        open={isFeedbackOpen}
        onOpenChange={setIsFeedbackOpen}
      />
    </header>
  );
};

export default Header;
