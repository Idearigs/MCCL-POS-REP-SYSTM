
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
import {
  Package, FileText, User, Settings, Calendar, Tag, Search, Database,
  LogOut, CreditCard, History, TrendingUp, Users, ClipboardCheck,
  UserCog, Calculator, DollarSign, Wallet, ChevronDown, ChevronRight,
  ShoppingCart, Wrench, Briefcase, Cog, Clock, Brain, Server, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { UserPermissions } from '@/types/user';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ElementType;
  permissionKey: keyof UserPermissions;
}

interface NavigationCategory {
  title: string;
  icon: React.ElementType;
  items: NavigationItem[];
}

// Categorized navigation structure
const navigationCategories: NavigationCategory[] = [
  {
    title: 'Sales & Transactions',
    icon: ShoppingCart,
    items: [
      { title: 'Point of Sale', path: '/pos', icon: Tag, permissionKey: 'pos' },
      { title: 'Sales', path: '/sales', icon: TrendingUp, permissionKey: 'sales' },
      { title: 'Financials', path: '/financial-intelligence', icon: Brain, permissionKey: 'financial_intelligence' },
      { title: 'Shifts', path: '/shifts', icon: Clock, permissionKey: 'sales' },
      { title: 'End of Day Cash-Up', path: '/cash-up', icon: Calculator, permissionKey: 'sales' },
      { title: 'Float Management', path: '/float', icon: DollarSign, permissionKey: 'floatManagement' },
      { title: 'Petty Cash', path: '/petty-cash', icon: Wallet, permissionKey: 'pettyCash' },
    ]
  },
  {
    title: 'Operations',
    icon: Wrench,
    items: [
      { title: 'Cashiers', path: '/cashiers', icon: Users, permissionKey: 'cashiers' },
      { title: 'Repair Jobs', path: '/repairs', icon: FileText, permissionKey: 'repairs' },
      { title: 'Stock Taking', path: '/stock-taking', icon: ClipboardCheck, permissionKey: 'stockTaking' },
    ]
  },
  {
    title: 'Management',
    icon: Briefcase,
    items: [
      { title: 'Customers', path: '/customers', icon: User, permissionKey: 'customers' },
      { title: 'Inventory', path: '/inventory', icon: Package, permissionKey: 'inventory' },
      { title: 'Tasks', path: '/tasks', icon: CheckSquare, permissionKey: 'pos' },
      { title: 'Calendar', path: '/calendar', icon: Calendar, permissionKey: 'calendar' },
      { title: 'History', path: '/history', icon: History, permissionKey: 'history' },
    ]
  },
  {
    title: 'System',
    icon: Cog,
    items: [
      { title: 'Search', path: '/search', icon: Search, permissionKey: 'search' },
      { title: 'Settings', path: '/settings', icon: Settings, permissionKey: 'settings' },
      { title: 'User Management', path: '/users', icon: UserCog, permissionKey: 'userManagement' },
      { title: 'Subscription', path: '/subscription', icon: CreditCard, permissionKey: 'subscription' },
    ]
  }
];

const Sidebar = () => {
  const [selectedOutlet, setSelectedOutlet] = useState('London');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'Sales & Transactions', // Default expanded
    'Operations',
    'Management',
    'System'
  ]);

  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, auth } = useAuth();
  const { toast } = useToast();
  const { hasPermission } = usePermissions();

  const toggleCategory = (categoryTitle: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryTitle)
        ? prev.filter(c => c !== categoryTitle)
        : [...prev, categoryTitle]
    );
  };

  const isCategoryExpanded = (categoryTitle: string) => {
    return expandedCategories.includes(categoryTitle);
  };

  const filterCategoryItems = (items: NavigationItem[]) => {
    if (auth.user?.role === 'OWNER') {
      return items;
    }
    return items.filter(item => hasPermission(item.permissionKey));
  };

  const isCategoryActive = (items: NavigationItem[]) => {
    const filteredItems = filterCategoryItems(items);
    return filteredItems.some(item => {
      const isDashboard = item.path === '/' && (location.pathname === '/' || location.pathname === '/dashboard');
      return isDashboard || location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
    });
  };

  return (
    <SidebarComponent className="modern-scrollbar">
      <style>{`
        /* Clean minimal scrollbar */
        .modern-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .modern-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .modern-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }

        .modern-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.2);
        }

        /* Firefox scrollbar */
        .modern-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
        }

        /* Smooth animations */
        .category-content {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex flex-col space-y-3">
          {/* Company Logo & Branding */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white text-xl font-bold">{selectedOutlet.charAt(0)}</span>
            </div>
            <div className="text-left">
              <h2 className="text-base font-bold text-sidebar-foreground">
                {selectedOutlet}
              </h2>
              <p className="text-[10px] text-muted-foreground">Powered by TrueDesk</p>
            </div>
          </div>

          {/* Outlet Selector */}
          <div className="w-full px-2">
            <Button
              variant="outline"
              className="w-full bg-sidebar text-sidebar-foreground text-sm border border-sidebar-border hover:bg-sidebar-accent transition-all justify-start"
              size="sm"
            >
              {selectedOutlet} Outlet
            </Button>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-grow px-2 overflow-y-auto py-2">
        {/* Dashboard - Always at top */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {hasPermission('dashboard') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/' || location.pathname === '/dashboard'}
                    tooltip="Dashboard"
                  >
                    <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                      <Database size={20} />
                      <span className="text-sm">Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Categorized Navigation */}
        {navigationCategories.map((category) => {
          const filteredItems = filterCategoryItems(category.items);

          if (filteredItems.length === 0) return null;

          const isExpanded = isCategoryExpanded(category.title);
          const isActive = isCategoryActive(category.items);

          return (
            <Collapsible
              key={category.title}
              open={isExpanded}
              onOpenChange={() => toggleCategory(category.title)}
            >
              <SidebarGroup className="mb-1">
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-sidebar-foreground cursor-pointer">
                    <div className="flex items-center gap-2">
                      <category.icon size={14} />
                      <span>{category.title}</span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown size={14} className="transition-transform duration-200" />
                    ) : (
                      <ChevronRight size={14} className="transition-transform duration-200" />
                    )}
                  </SidebarGroupLabel>
                </CollapsibleTrigger>

                <CollapsibleContent className="category-content">
                  <SidebarGroupContent>
                    <SidebarMenu className="space-y-0.5">
                      {filteredItems.map((item) => {
                        const isDashboard = item.path === '/' &&
                          (location.pathname === '/' || location.pathname === '/dashboard');
                        const isItemActive = isDashboard || location.pathname === item.path ||
                          (item.path !== '/' && location.pathname.startsWith(item.path));

                        return (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                              asChild
                              isActive={isItemActive}
                              tooltip={item.title}
                            >
                              <Link to={item.path} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                                <item.icon size={20} />
                                <span className="text-sm">{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors rounded-lg px-3 py-2.5"
          onClick={() => {
            logout();
            toast({
              title: "Signed out",
              description: "You have been successfully signed out"
            });
            navigate("/login");
          }}
        >
          <LogOut size={20} />
          <span className="text-sm">Logout</span>
        </Button>
      </SidebarFooter>
    </SidebarComponent>
  );
};

export default Sidebar;
