
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Sidebar as SidebarComponent, 
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter
} from "@/components/ui/sidebar";
import { Package, FileText, User, Settings, Calendar, Tag, Search, Database, LogOut, CreditCard, History, TrendingUp, Users, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ElementType;
}

const mainNavigation: NavigationItem[] = [
  { title: 'Dashboard', path: '/', icon: Database },
  { title: 'Point of Sale', path: '/pos', icon: Tag },
  { title: 'Sales', path: '/sales', icon: TrendingUp },
  { title: 'Cashiers', path: '/cashiers', icon: Users },
  { title: 'Repair Jobs', path: '/repairs', icon: FileText },
  { title: 'Customers', path: '/customers', icon: User },
  { title: 'Inventory', path: '/inventory', icon: Package },
  { title: 'Stock Taking', path: '/stock-taking', icon: ClipboardCheck },
  { title: 'Calendar', path: '/calendar', icon: Calendar },
  { title: 'History', path: '/history', icon: History },
];

const Sidebar = () => {
  const [selectedOutlet, setSelectedOutlet] = useState('London');
  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, auth } = useAuth();
  const { toast } = useToast();

  // Filter navigation based on user role
  const getFilteredNavigation = () => {
    if (auth.user?.role === 'STAFF') {
      // STAFF users only see POS and Sales
      return mainNavigation.filter(item =>
        item.path === '/pos' || item.path === '/sales'
      );
    }
    // OWNER, MANAGER, READONLY see all navigation items
    return mainNavigation;
  };

  const filteredNavigation = getFilteredNavigation();
  const isStaff = auth.user?.role === 'STAFF';
  
  return (
    <SidebarComponent className="bg-navy border-r border-navy-dark shadow-sm">
      <SidebarHeader className="p-4">
        <div className="flex flex-col items-center space-y-3">
          <h2 className="text-xl font-heading font-bold text-white">
            <span className="text-gold">MCCL</span> POS System
          </h2>
          <div className="w-full">
            <Button 
              variant="outline" 
              className="w-full bg-navy-light text-white text-sm border border-navy-dark hover:bg-navy-dark" 
              size="sm"
            >
              {selectedOutlet} Outlet
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-grow px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-400 px-3 py-2">Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {filteredNavigation.map((item) => {
                // Special case for Dashboard since it could be / or /dashboard
                const isDashboard = item.path === '/' && (location.pathname === '/' || location.pathname === '/dashboard');
                const isActive = isDashboard || location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                  
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`rounded-xl transition-all duration-200 ${isActive ? 'bg-navy-dark text-gold font-medium' : 'text-white hover:bg-navy-light'}`}
                    >
                      <Link to={item.path} className="flex items-center px-3 py-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${isActive ? 'bg-navy-dark' : 'bg-navy-light'}`}>
                          <item.icon size={16} className={isActive ? 'text-gold' : 'text-gray-300'} />
                        </div>
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isStaff && (
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-gray-400 px-3 py-2">System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={location.pathname === '/search'}
                  tooltip="Search"
                  className={`rounded-xl transition-all duration-200 ${location.pathname === '/search' ? 'bg-navy-dark text-gold font-medium' : 'text-white hover:bg-navy-light'}`}
                >
                  <Link to="/search" className="flex items-center px-3 py-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${location.pathname === '/search' ? 'bg-navy-dark' : 'bg-navy-light'}`}>
                      <Search size={16} className={location.pathname === '/search' ? 'text-gold' : 'text-gray-300'} />
                    </div>
                    <span>Search</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={location.pathname === '/settings'}
                  tooltip="Settings"
                  className={`rounded-xl transition-all duration-200 ${location.pathname === '/settings' ? 'bg-navy-dark text-gold font-medium' : 'text-white hover:bg-navy-light'}`}
                >
                  <Link to="/settings" className="flex items-center px-3 py-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${location.pathname === '/settings' ? 'bg-navy-dark' : 'bg-navy-light'}`}>
                      <Settings size={16} className={location.pathname === '/settings' ? 'text-gold' : 'text-gray-300'} />
                    </div>
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild
                  isActive={location.pathname === '/subscription'}
                  tooltip="Subscription"
                  className={`rounded-xl transition-all duration-200 ${location.pathname === '/subscription' ? 'bg-navy-dark text-gold font-medium' : 'text-white hover:bg-navy-light'}`}
                >
                  <Link to="/subscription" className="flex items-center px-3 py-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${location.pathname === '/subscription' ? 'bg-navy-dark' : 'bg-navy-light'}`}>
                      <CreditCard size={16} className={location.pathname === '/subscription' ? 'text-gold' : 'text-gray-300'} />
                    </div>
                    <span>Subscription</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}
      </SidebarContent>
      
      <SidebarFooter className="p-4 border-t border-navy-dark">
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-start gap-3 text-red-500 hover:bg-red-500/20 hover:text-red-600 transition-colors duration-200 rounded-xl px-3 py-2"
          onClick={() => {
            logout();
            toast({
              title: "Signed out",
              description: "You have been successfully signed out"
            });
            navigate("/login");
          }}
        >
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <LogOut size={16} className="text-red-500" />
          </div>
          <span>Sign Out</span>
        </Button>
      </SidebarFooter>
    </SidebarComponent>
  );
};

export default Sidebar;
