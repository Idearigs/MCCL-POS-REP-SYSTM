
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
  ShoppingCart, Wrench, Briefcase, Cog, Clock, Brain, Server, CheckSquare,
  UserSquare2, LayoutDashboard, Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { useOutlet } from '@/contexts/OutletContext';
import { OutletSelectorDialog } from '@/components/outlets/OutletSelectorDialog';
import { useToast } from '@/components/ui/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { UserPermissions } from '@/types/user';
import { useFeatures } from '@/contexts/FeatureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Real build version, injected from package.json by Vite (see vite.config.ts).
// Bump the "version" field in package.json to change what's shown.
const APP_VERSION = `v${__APP_VERSION__}`;

interface NavigationItem {
  title: string;
  path: string;
  icon: React.ElementType;
  permissionKey: keyof UserPermissions;
  featureKey?: string; // optional — if set, item is hidden when feature is disabled
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
      { title: 'Point of Sale',        path: '/pos',                    icon: Tag,          permissionKey: 'pos',                   featureKey: 'pos'                    },
      { title: 'Sales',               path: '/sales',                  icon: TrendingUp,   permissionKey: 'sales',                 featureKey: 'sales'                  },
      { title: 'Financials',          path: '/financial-intelligence', icon: Brain,        permissionKey: 'financial_intelligence', featureKey: 'financial_intelligence' },
      { title: 'Shifts',              path: '/shifts',                 icon: Clock,        permissionKey: 'sales',                 featureKey: 'shifts'                 },
      { title: 'End of Day Cash-Up',  path: '/cash-up',                icon: Calculator,   permissionKey: 'sales',                 featureKey: 'sales'                  },
      { title: 'Float Management',    path: '/float',                  icon: DollarSign,   permissionKey: 'floatManagement',       featureKey: 'float_management'       },
      { title: 'Petty Cash',          path: '/petty-cash',             icon: Wallet,       permissionKey: 'pettyCash',             featureKey: 'petty_cash'             },
      { title: 'Gift Cards',          path: '/gift-cards',             icon: Gift,         permissionKey: 'sales',                 featureKey: 'sales'                  },
    ]
  },
  {
    title: 'Operations',
    icon: Wrench,
    items: [
      { title: 'Cashiers',    path: '/cashiers',     icon: Users,          permissionKey: 'cashiers',    featureKey: 'cashiers'    },
      { title: 'Repair Jobs', path: '/repairs',      icon: FileText,       permissionKey: 'repairs',     featureKey: 'repairs'     },
      { title: 'Stock Taking',path: '/stock-taking', icon: ClipboardCheck, permissionKey: 'stockTaking', featureKey: 'stock_taking'},
    ]
  },
  {
    title: 'Management',
    icon: Briefcase,
    items: [
      { title: 'Customers', path: '/customers', icon: User,          permissionKey: 'customers', featureKey: 'customers' },
      { title: 'Inventory', path: '/inventory', icon: Package,       permissionKey: 'inventory', featureKey: 'inventory' },
      { title: 'HR Management', path: '/hrms', icon: UserSquare2,   permissionKey: 'hrms' },
      { title: 'Tasks',     path: '/tasks',     icon: CheckSquare,   permissionKey: 'pos',       featureKey: 'tasks'     },
      { title: 'Calendar',  path: '/calendar',  icon: Calendar,      permissionKey: 'calendar',  featureKey: 'calendar'  },
      { title: 'History',   path: '/history',   icon: History,       permissionKey: 'history',   featureKey: 'history'   },
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
  const [switchOutletOpen, setSwitchOutletOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  // Smart default: open only the group that holds the current route, so the
  // rail is short to scan on load. Every other group is one click away.
  const [expandedCategories, setExpandedCategories] = useState<string[]>(() => {
    const path = window.location.pathname;
    const active = navigationCategories.find((c) =>
      c.items.some(
        (i) => i.path !== '/' && (path === i.path || path.startsWith(i.path)),
      ),
    );
    return [active ? active.title : navigationCategories[0].title];
  });

  const isMobile = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, auth } = useAuth();
  const { currentOutlet, clearOutlet } = useOutlet();
  const { settings } = useSettings();
  // Prefer the real store name from Settings; fall back to the tenant name.
  const businessName =
    settings?.general?.storeName?.trim() ||
    auth.tenantInfo?.tenantName ||
    'My Business';
  const outletName = currentOutlet?.name ?? 'No outlet selected';
  const { toast } = useToast();
  const { hasPermission } = usePermissions();
  const { hasFeature } = useFeatures();

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

  const q = navQuery.trim().toLowerCase();
  const matchesQuery = (title: string) => !q || title.toLowerCase().includes(q);

  const filterCategoryItems = (items: NavigationItem[]) => {
    // Feature gate first — applies to all roles
    const featureFiltered = items.filter(item =>
      (!item.featureKey || hasFeature(item.featureKey)) && matchesQuery(item.title)
    );
    // Permission gate (OWNER bypasses, others need explicit permission)
    if (auth.user?.role === 'OWNER') return featureFiltered;
    return featureFiltered.filter(item => hasPermission(item.permissionKey));
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

        /* Nav items — clearer, easier-to-see hover & active highlight */
        .modern-scrollbar [data-sidebar="menu-button"] {
          position: relative;
          border: 1px solid transparent;
          transition: background-color .14s, color .14s, border-color .14s;
        }
        .modern-scrollbar [data-sidebar="menu-button"]:hover {
          background-color: #1c2842 !important;
          color: #ffffff !important;
          border-color: #2c3a5a;
        }
        .modern-scrollbar [data-sidebar="menu-button"][data-active="true"] {
          background-color: rgba(246, 121, 43, 0.14) !important;
          color: #ffffff !important;
          border-color: rgba(246, 121, 43, 0.42);
          font-weight: 600;
        }
        /* Accent bar on the active item */
        .modern-scrollbar [data-sidebar="menu-button"][data-active="true"]::before {
          content: "";
          position: absolute;
          left: 3px; top: 7px; bottom: 7px;
          width: 3px; border-radius: 3px;
          background: #f6792b;
          box-shadow: 0 0 12px 1px rgba(246, 121, 43, 0.5);
        }
        .modern-scrollbar [data-sidebar="menu-button"][data-active="true"] svg {
          color: #f6792b !important;
        }
        /* In collapsed icon-rail mode the bar would clip — hide it */
        [data-collapsible="icon"] .modern-scrollbar [data-sidebar="menu-button"][data-active="true"]::before {
          display: none;
        }
      `}</style>

      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex flex-col space-y-3">
          {/* Company Logo & Branding */}
          <div className="flex items-center space-x-3 px-2">
            <div className="w-10 h-10 shrink-0 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-xl font-bold">
                {businessName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-left overflow-hidden min-w-0">
              <h2 className="text-sm font-bold leading-tight text-sidebar-foreground line-clamp-2">
                {businessName}
              </h2>
            </div>
          </div>

          {/* Outlet Selector — card */}
          <div className="w-full px-2">
            <button
              type="button"
              onClick={() => setSwitchOutletOpen(true)}
              className="w-full flex items-center gap-2.5 rounded-lg border border-sidebar-border bg-sidebar-accent/50 px-2.5 py-2 text-left transition-colors hover:border-orange-500/50"
            >
              <span className="w-7 h-7 shrink-0 grid place-items-center rounded-md bg-orange-500/15 text-orange-400 text-[11px] font-bold">
                {currentOutlet ? currentOutlet.name.slice(0, 2).toUpperCase() : '—'}
              </span>
              <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <span className="block text-xs font-semibold text-sidebar-foreground truncate">
                  {outletName}
                </span>
                <span className="block text-[10px] text-muted-foreground truncate">
                  {currentOutlet ? 'Unlocked · tap to switch' : 'Tap to select an outlet'}
                </span>
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
            </button>
          </div>

          {/* Nav filter — jump to any screen */}
          <div className="w-full px-2 group-data-[collapsible=icon]:hidden">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder="Jump to…"
                aria-label="Filter navigation"
                className="w-full rounded-lg border border-sidebar-border bg-sidebar-accent/40 py-2 pl-8 pr-3 text-sm text-sidebar-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-orange-500/50"
              />
            </div>
          </div>

          <OutletSelectorDialog
            open={switchOutletOpen}
            onSelected={() => setSwitchOutletOpen(false)}
            onClose={() => setSwitchOutletOpen(false)}
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="flex-grow px-2 overflow-y-auto py-2">
        {/* Dashboard - Always at top */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {hasPermission('dashboard') && matchesQuery('Dashboard') && (
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

        {/* My Portal — always visible to any logged-in user */}
        {matchesQuery('My Portal') && (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location.pathname === '/my-portal'}
                  tooltip="My Portal"
                >
                  <Link to="/my-portal" className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                    <LayoutDashboard size={20} />
                    <span className="text-sm">My Portal</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        )}

        {/* Categorized Navigation */}
        {navigationCategories.map((category) => {
          const filteredItems = filterCategoryItems(category.items);

          if (filteredItems.length === 0) return null;

          // While searching, keep every matching group open.
          const isExpanded = q ? true : isCategoryExpanded(category.title);
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
        {/* Build/version — replaces the old "Powered by TrueDesk" line */}
        <div className="flex items-center justify-end gap-1.5 px-3 pt-2 group-data-[collapsible=icon]:hidden">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">
            TruedeskPOS · {APP_VERSION}
          </span>
          <span className="rounded-full border border-orange-500/40 px-1.5 py-px text-[8px] font-bold uppercase tracking-wider text-orange-400">
            beta
          </span>
        </div>
      </SidebarFooter>
    </SidebarComponent>
  );
};

export default Sidebar;
