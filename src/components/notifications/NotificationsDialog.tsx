import React, { useState } from 'react';
import { Bell, Check, Trash2, AlertCircle, Info, Calendar, Tag, FileText, User, Package, X } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';

// Mock notification data - in a real app, this would come from an API or context
interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'alert' | 'info' | 'success' | 'calendar' | 'pos' | 'repair' | 'customer' | 'inventory';
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    title: 'Low Inventory Alert',
    message: '18K Gold Chains are running low in stock. Consider restocking soon.',
    timestamp: new Date(2025, 4, 23, 14, 30),
    read: false,
    type: 'alert'
  },
  {
    id: '2',
    title: 'Repair Completed',
    message: 'Ring resizing job #1234 has been completed and is ready for customer pickup.',
    timestamp: new Date(2025, 4, 23, 12, 15),
    read: false,
    type: 'repair'
  },
  {
    id: '3',
    title: 'New Customer Registration',
    message: 'Samantha Wilson has registered as a new customer in the loyalty program.',
    timestamp: new Date(2025, 4, 22, 16, 45),
    read: true,
    type: 'customer'
  },
  {
    id: '4',
    title: 'Sales Milestone Reached',
    message: 'Congratulations! Your jewelry store has reached Rs.500,000 in sales this month.',
    timestamp: new Date(2025, 4, 22, 9, 30),
    read: true,
    type: 'success'
  },
  {
    id: '5',
    title: 'Upcoming Appointment',
    message: 'Reminder: Custom engagement ring consultation with Priya Sharma tomorrow at 2:00 PM.',
    timestamp: new Date(2025, 4, 21, 15, 0),
    read: true,
    type: 'calendar'
  },
  {
    id: '6',
    title: 'System Update',
    message: 'The POS system will undergo maintenance tonight at 11:00 PM. Expected downtime: 30 minutes.',
    timestamp: new Date(2025, 4, 21, 10, 20),
    read: true,
    type: 'info'
  },
  {
    id: '7',
    title: 'New Sale Completed',
    message: 'Sale #5678 has been completed for Rs.45,999 (Diamond Pendant).',
    timestamp: new Date(2025, 4, 20, 17, 45),
    read: true,
    type: 'pos'
  },
  {
    id: '8',
    title: 'Inventory Restocked',
    message: 'New shipment of Silver Earrings collection has been added to inventory.',
    timestamp: new Date(2025, 4, 20, 11, 30),
    read: true,
    type: 'inventory'
  }
];

interface NotificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NotificationsDialog: React.FC<NotificationsDialogProps> = ({ open, onOpenChange }) => {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  // Removed notification settings as they're no longer needed

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({
      ...notification,
      read: true
    })));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'alert': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      case 'success': return <Check className="h-5 w-5 text-green-500" />;
      case 'calendar': return <Calendar className="h-5 w-5 text-purple-500" />;
      case 'pos': return <Tag className="h-5 w-5 text-yellow-500" />;
      case 'repair': return <FileText className="h-5 w-5 text-indigo-500" />;
      case 'customer': return <User className="h-5 w-5 text-pink-500" />;
      case 'inventory': return <Package className="h-5 w-5 text-orange-500" />;
      default: return <Bell className="h-5 w-5" />;
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays === 1) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-bold">Notifications</DialogTitle>
          <DialogDescription>
            View and manage all your system notifications
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 pt-2">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge variant="secondary">{unreadCount} unread</Badge>
              )}
            </div>
            <div className="flex space-x-2">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <Check className="mr-2 h-4 w-4" />
                  Mark all as read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllNotifications}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear all
                </Button>
              )}
            </div>
          </div>

          <div className="w-full">
              {notifications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No notifications</p>
                    <p className="text-sm text-muted-foreground">
                      You're all caught up! There are no notifications to display.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <ScrollArea className="h-[400px]">
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {notifications.map((notification) => (
                          <div 
                            key={notification.id} 
                            className={`p-4 flex items-start gap-4 ${!notification.read ? 'bg-muted/50' : ''}`}
                          >
                            <div className="mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="font-medium">{notification.title}</h3>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(notification.timestamp)}
                                </span>
                              </div>
                              <div className="flex justify-end mt-2 space-x-2">
                                {!notification.read && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Mark as read
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </ScrollArea>
                </Card>
              )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotificationsDialog;
