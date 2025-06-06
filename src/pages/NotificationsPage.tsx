import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, AlertCircle, Info, Calendar, Tag, FileText, User, Package, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { NotificationType, Notification } from '@/contexts/AuthContext';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const { auth, markNotificationAsRead } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationSettings, setNotificationSettings] = useState({
    email: true,
    push: true,
    sales: true,
    inventory: true,
    repairs: true,
    customers: true,
    system: true
  });
  
  // Load notifications from auth context
  useEffect(() => {
    if (auth?.notifications) {
      setNotifications(auth.notifications);
    }
  }, [auth?.notifications]);
  
  // Count unread notifications
  const unreadCount = notifications.filter(n => n.isNew).length;

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)} 
            className="h-9 w-9"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">
              View and manage all your system notifications
            </p>
          </div>
        </div>
        <div className="flex space-x-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <Check className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button variant="outline" onClick={clearAllNotifications}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">
            All
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2">{notifications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
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
              <ScrollArea className="h-[600px]">
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
        </TabsContent>
        
        <TabsContent value="unread" className="mt-4">
          {unreadCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <Check className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No unread notifications</p>
                <p className="text-sm text-muted-foreground">
                  You've read all your notifications. Great job staying up to date!
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <ScrollArea className="h-[600px]">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {notifications.filter(n => !n.read).map((notification) => (
                      <div 
                        key={notification.id} 
                        className="p-4 flex items-start gap-4 bg-muted/50"
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
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => markAsRead(notification.id)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Mark as read
                            </Button>
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
        </TabsContent>
        
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Delivery Methods</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-notifications">Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch 
                      id="email-notifications" 
                      checked={notificationSettings.email}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, email: checked})
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="push-notifications">Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications in the app
                      </p>
                    </div>
                    <Switch 
                      id="push-notifications" 
                      checked={notificationSettings.push}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, push: checked})
                      }
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Notification Categories</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sales-notifications">Sales Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        New jewelry sales, transactions, and revenue updates
                      </p>
                    </div>
                    <Switch 
                      id="sales-notifications" 
                      checked={notificationSettings.sales}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, sales: checked})
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="inventory-notifications">Inventory Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Jewelry stock levels, restock alerts, and inventory changes
                      </p>
                    </div>
                    <Switch 
                      id="inventory-notifications" 
                      checked={notificationSettings.inventory}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, inventory: checked})
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="repairs-notifications">Jewelry Repair Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Jewelry repair status updates, resizing, and custom work completions
                      </p>
                    </div>
                    <Switch 
                      id="repairs-notifications" 
                      checked={notificationSettings.repairs}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, repairs: checked})
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="customers-notifications">Customer Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        New jewelry customer registrations and loyalty program updates
                      </p>
                    </div>
                    <Switch 
                      id="customers-notifications" 
                      checked={notificationSettings.customers}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, customers: checked})
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="gold-price-alerts">Gold Price Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications when gold prices change significantly
                      </p>
                    </div>
                    <Switch 
                      id="gold-price-alerts" 
                      checked={notificationSettings.goldPriceAlerts}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, goldPriceAlerts: checked})
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="special-orders">Special Orders Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Updates on custom jewelry orders and special requests
                      </p>
                    </div>
                    <Switch 
                      id="special-orders" 
                      checked={notificationSettings.specialOrders}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, specialOrders: checked})
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="system-notifications">System Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        System updates, maintenance, and important alerts
                      </p>
                    </div>
                    <Switch 
                      id="system-notifications" 
                      checked={notificationSettings.system}
                      onCheckedChange={(checked) => 
                        setNotificationSettings({...notificationSettings, system: checked})
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button>Save Settings</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default NotificationsPage;
