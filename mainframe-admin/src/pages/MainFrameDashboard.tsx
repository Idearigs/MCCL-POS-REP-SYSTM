import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Building2, Package, CreditCard, Settings,
  Plus, TrendingUp, Users, ChevronRight, Server, Zap,
  CheckCircle, AlertCircle, Search, Eye, ArrowUpRight, DollarSign,
  Bug, Lightbulb, RefreshCw, XCircle, Clock, LogOut, Trash2,
  Key, UserPlus, ToggleLeft, ToggleRight, FileText,
  Check, X, ChevronLeft, Copy, Shield, HardDrive,
  Download, Upload as CloudUpload, Database, FolderOpen,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  customerProfilesApi, customerUsersApi, subscriptionsApi, featuresApi,
  bugReportsApi, featureRequestsApi, subdomainApi, backupApi,
} from '../services/api';

// ─── Feature types ─────────────────────────────────────────────────────────────
interface TenantFeature {
  featureId: string; featureKey: string; featureName: string;
  category: string; description?: string;
  isIncludedInBase: boolean; additionalCost: any;
  status: string; isEnabled: boolean;
  customerFeatureId: string | null;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
// Apple-style spring
const spring = { type: 'spring', damping: 26, stiffness: 280 } as const;
const springFast = { type: 'spring', damping: 30, stiffness: 350 } as const;

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  ACTIVE:       { label: 'Active',      dot: '#34C759', bg: '#D1FAE5', text: '#065F46' },
  PENDING_SETUP:{ label: 'Pending',     dot: '#FF9F0A', bg: '#FEF3C7', text: '#92400E' },
  SUSPENDED:    { label: 'Suspended',   dot: '#FF3B30', bg: '#FEE2E2', text: '#991B1B' },
  CANCELLED:    { label: 'Cancelled',   dot: '#8E8E93', bg: '#F3F4F6', text: '#374151' },
  OPEN:         { label: 'Open',        dot: '#007AFF', bg: '#DBEAFE', text: '#1E40AF' },
  IN_PROGRESS:  { label: 'In Progress', dot: '#AF52DE', bg: '#EDE9FE', text: '#5B21B6' },
  RESOLVED:     { label: 'Resolved',    dot: '#34C759', bg: '#D1FAE5', text: '#065F46' },
  CLOSED:       { label: 'Closed',      dot: '#8E8E93', bg: '#F3F4F6', text: '#374151' },
  SUBMITTED:      { label: 'Submitted',    dot: '#5AC8FA', bg: '#E0F2FE', text: '#0C4A6E' },
  UNDER_REVIEW:   { label: 'In Review',    dot: '#AF52DE', bg: '#EDE9FE', text: '#5B21B6' },
  APPROVED:       { label: 'Approved',     dot: '#34C759', bg: '#D1FAE5', text: '#065F46' },
  IN_DEVELOPMENT: { label: 'In Dev',       dot: '#5856D6', bg: '#EEF2FF', text: '#3730A3' },
  TESTING:        { label: 'Testing',      dot: '#FF9F0A', bg: '#FEF3C7', text: '#92400E' },
  PLANNED:        { label: 'Planned',      dot: '#5856D6', bg: '#EEF2FF', text: '#3730A3' },
  RELEASED:       { label: 'Released',     dot: '#34C759', bg: '#D1FAE5', text: '#065F46' },
  REJECTED:       { label: 'Rejected',     dot: '#FF3B30', bg: '#FEE2E2', text: '#991B1B' },
  STABLE:       { label: 'Stable',      dot: '#34C759', bg: '#D1FAE5', text: '#065F46' },
  BETA:         { label: 'Beta',        dot: '#FF9F0A', bg: '#FEF3C7', text: '#92400E' },
  DEPRECATED:   { label: 'Deprecated',  dot: '#8E8E93', bg: '#F3F4F6', text: '#374151' },
};

const STATUS_GLOW: Record<string, { ring: string; glow: string }> = {
  ACTIVE:        { ring: 'rgba(52,199,89,0.55)',   glow: '#34C759' },
  PENDING_SETUP: { ring: 'rgba(255,159,10,0.55)',  glow: '#FF9F0A' },
  SUSPENDED:     { ring: 'rgba(255,59,48,0.55)',   glow: '#FF3B30' },
  CANCELLED:     { ring: 'rgba(142,142,147,0.35)', glow: '#8E8E93' },
};

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const m = STATUS_META[status] || { label: status, dot: '#8E8E93', bg: '#F3F4F6', text: '#374151' };
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: m.bg, color: m.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.dot }} />
      {m.label}
    </span>
  );
};

const PriorityPill: React.FC<{ priority: string }> = ({ priority }) => {
  const map: Record<string, { bg: string; text: string }> = {
    LOW:      { bg: '#F3F4F6', text: '#374151' },
    MEDIUM:   { bg: '#DBEAFE', text: '#1E40AF' },
    HIGH:     { bg: '#FFEDD5', text: '#9A3412' },
    CRITICAL: { bg: '#FEE2E2', text: '#991B1B' },
  };
  const c = map[priority] || map.MEDIUM;
  return (
    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text }}>{priority}</span>
  );
};

function av(name: string) { return name ? name[0].toUpperCase() : '?'; }

// ─── Side Panel ───────────────────────────────────────────────────────────────
// Replaces all Dialog/popup usage with an Apple-style slide-in sheet
const SidePanel: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, subtitle, width = 'w-[520px]', children, footer }) => (
  <AnimatePresence>
    {open && (
      <>
        {/* Backdrop */}
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-40"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }}
        />

        {/* Panel */}
        <motion.div
          key="panel"
          initial={{ x: '100%', opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={spring}
          className={`fixed right-0 top-0 h-full ${width} z-50 flex flex-col`}
          style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'saturate(180%) blur(40px)',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.15)',
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-300/60" />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between px-7 py-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight" style={{ color: '#1D1D1F' }}>{title}</h2>
              {subtitle && <p className="text-sm mt-0.5" style={{ color: '#6E6E73' }}>{subtitle}</p>}
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
              style={{ background: '#E5E5EA' }}
            >
              <X className="w-4 h-4" style={{ color: '#3C3C43' }} />
            </motion.button>
          </div>

          {/* Divider */}
          <div className="mx-7 h-px" style={{ background: 'rgba(60,60,67,0.1)' }} />

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-7 py-6">{children}</div>

          {/* Footer */}
          {footer && (
            <>
              <div className="mx-7 h-px" style={{ background: 'rgba(60,60,67,0.1)' }} />
              <div className="px-7 py-5">{footer}</div>
            </>
          )}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ─── Apple button ─────────────────────────────────────────────────────────────
const AppleBtn: React.FC<{
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ onClick, variant = 'secondary', size = 'md', disabled, className = '', children }) => {
  const styles = {
    primary: { bg: '#007AFF', text: '#FFFFFF', hover: '#0066CC' },
    secondary: { bg: 'rgba(120,120,128,0.12)', text: '#1D1D1F', hover: 'rgba(120,120,128,0.2)' },
    danger: { bg: '#FF3B30', text: '#FFFFFF', hover: '#D70015' },
    ghost: { bg: 'transparent', text: '#007AFF', hover: 'rgba(0,122,255,0.08)' },
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const s = styles[variant];
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`${sizes[size]} rounded-xl font-medium transition-colors inline-flex items-center gap-2 ${className}`}
      style={{ background: s.bg, color: s.text, opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </motion.button>
  );
};

// ─── Field ────────────────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; required?: boolean; hint?: string; children: React.ReactNode }> = ({ label, required, hint, children }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {hint && <p className="text-xs" style={{ color: '#8E8E93' }}>{hint}</p>}
    {children}
  </div>
);

const AppleInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { status?: 'ok' | 'error' }> = ({ status, className = '', ...props }) => (
  <input
    {...props}
    className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all outline-none ${className}`}
    style={{
      background: 'rgba(118,118,128,0.08)',
      color: '#1D1D1F',
      border: `1.5px solid ${status === 'error' ? '#FF3B30' : status === 'ok' ? '#34C759' : 'transparent'}`,
      // @ts-ignore
      '--tw-ring-color': '#007AFF',
    }}
  />
);

// ─── Skeleton primitives ──────────────────────────────────────────────────────
const Skel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton-shimmer rounded-lg ${className}`} />
);

const SkeletonStatCards: React.FC = () => (
  <div className="grid grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
        <Skel className="w-10 h-10 rounded-xl mb-4" />
        <Skel className="h-7 w-14 mb-2" />
        <Skel className="h-3.5 w-28 mb-1.5" />
        <Skel className="h-3 w-20" />
      </div>
    ))}
  </div>
);

const SkeletonTenantListRow: React.FC = () => (
  <div className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: 'rgba(0,0,0,0.02)' }}>
    <div className="flex items-center gap-3">
      <Skel className="w-7 h-7 rounded-lg flex-shrink-0" />
      <div className="space-y-1.5">
        <Skel className="h-3.5 w-28" />
        <Skel className="h-2.5 w-16" />
      </div>
    </div>
    <Skel className="h-5 w-14 rounded-full" />
  </div>
);

const SkeletonTableRow: React.FC<{ cols?: number }> = ({ cols = 5 }) => (
  <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
    <td className="px-5 py-3.5">
      <div className="flex items-center gap-3">
        <Skel className="w-8 h-8 rounded-xl flex-shrink-0" />
        <div className="space-y-1.5">
          <Skel className="h-3.5 w-28" />
          <Skel className="h-2.5 w-20" />
        </div>
      </div>
    </td>
    <td className="px-5 py-3.5"><Skel className="h-5 w-16 rounded-lg" /></td>
    {[...Array(cols - 2)].map((_, i) => (
      <td key={i} className="px-5 py-3.5"><Skel className="h-4 w-16" /></td>
    ))}
  </tr>
);

const SkeletonCard: React.FC = () => (
  <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
    <div className="flex items-start gap-4">
      <Skel className="w-9 h-9 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skel className="h-4 w-2/3" />
        <Skel className="h-3.5 w-full" />
        <Skel className="h-3.5 w-4/5" />
        <div className="flex gap-2 pt-1">
          <Skel className="h-5 w-16 rounded-full" />
          <Skel className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <Skel className="h-6 w-20 rounded-full flex-shrink-0" />
    </div>
  </div>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
  id: string; businessName: string; businessEmail: string; businessPhone?: string;
  subdomain: string; status: string; createdAt: string;
  contact?: { firstName: string; lastName: string; email: string; phone?: string };
  subscription?: { plan: string; basePrice: number; billingCycle?: string; currentUsers: number; nextBillingDate: string };
  users?: any[]; _count?: { customerUsers: number };
}
interface Feature {
  id: string; featureKey: string; featureName: string; description?: string;
  category: string; isIncludedInBase: boolean; additionalCost: number;
  status: string; currentVersion?: string; _count?: { customerFeatures: number };
}
interface BugReport {
  id: string; title: string; description: string; priority: string; status: string;
  createdAt: string; customerProfile?: { businessName: string };
}
interface FeatureRequest {
  id: string; title: string; description: string; status: string;
  votes: number; createdAt: string; customerProfile?: { businessName: string };
}
interface TenantUser {
  id: string; firstName: string; lastName: string; email: string;
  role: string; isActive: boolean; lastLoginAt?: string; createdAt: string;
  tempPassword?: string | null; mustChangePassword?: boolean;
}
interface PasswordHistoryEntry {
  id: string; password: string; setAt: string;
}
interface Invoice {
  id: string; invoiceNumber: string; amount: number; status: string;
  dueDate: string; paidAt?: string;
}

type View = 'overview' | 'tenants' | 'features' | 'bugs' | 'requests' | 'billing' | 'backups' | 'settings';

// ─── Main Component ───────────────────────────────────────────────────────────
const MainFrameDashboard: React.FC = () => {
  const { admin, logout } = useAuth();
  const [activeView, setActiveView] = useState<View>('overview');
  const [prevView, setPrevView] = useState<View>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Data
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
  const [stats, setStats] = useState({ totalTenants: 0, activeTenants: 0, weeklyGrowth: 0, mrr: 0 });
  const [bugStats, setBugStats] = useState<any>({});

  // Tenant detail (full slide-in state)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantTab, setTenantTab] = useState<'info' | 'users' | 'billing' | 'activity' | 'features'>('info');
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([]);
  const [passwordHistoryMap, setPasswordHistoryMap] = useState<Record<string, PasswordHistoryEntry[]>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [tenantInvoices, setTenantInvoices] = useState<Invoice[]>([]);
  const [tenantActivity, setTenantActivity] = useState<any[]>([]);
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeature[]>([]);
  const [savingFeatures, setSavingFeatures] = useState(false);

  // Subscription offer form
  const defaultOffer = {
    title: '',
    description: '',
    plan: 'PROFESSIONAL',
    pricePerMonth: '' as string | number,
    billingCycle: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    checkoutUrl: '',
    features: [] as { id: string; name: string; description: string; price: number; isCustom: boolean }[],
    confirmModal: { title: 'Thanks for your order!', message: 'Your payment was successful. A receipt is on its way to your inbox.', buttonText: 'Access Your POS', buttonLink: '' },
  };
  const [offer, setOffer] = useState(defaultOffer);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [showConfirmSend, setShowConfirmSend] = useState(false);

  // Custom feature build invoice form
  const defaultDevInvoice = {
    title: 'Custom Feature Development Invoice',
    description: '',
    checkoutUrl: '',
    items: [] as { id: string; name: string; description: string; cost: number }[],
  };
  const [devInvoice, setDevInvoice] = useState(defaultDevInvoice);
  const [sendingDevInvoice, setSendingDevInvoice] = useState(false);
  const [showConfirmDevSend, setShowConfirmDevSend] = useState(false);

  // Backup state
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [backupFiles, setBackupFiles] = useState<{ filename: string; size: number; createdAt: string }[]>([]);
  const [backupLoading, setBackupLoading] = useState<Record<string, boolean>>({});
  const [backupDriveLinks, setBackupDriveLinks] = useState<Record<string, string>>({});
  const dragFeatureId = React.useRef<string | null>(null);

  // Panel states
  const [panel, setPanel] = useState<'none' | 'createTenant' | 'createBug' | 'createRequest' | 'createFeature' | 'addUser' | 'provisionResult'>('none');

  // Provisioning result
  const [provisionResult, setProvisionResult] = useState<{ ownerEmail: string; ownerPassword: string; companyCode: string } | null>(null);

  // Forms
  const [newTenant, setNewTenant] = useState({ businessName: '', businessEmail: '', subdomain: '', contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '', plan: 'PROFESSIONAL', customPrice: '' as string | number, billingCycle: 'MONTHLY', isExistingClient: false });
  const [subdomainValid, setSubdomainValid] = useState<boolean | null>(null);
  const [subdomainChecking, setSubdomainChecking] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newBug, setNewBug] = useState({ title: '', description: '', priority: 'MEDIUM', customerProfileId: '' });
  const [newRequest, setNewRequest] = useState({ title: '', description: '', customerProfileId: '' });
  const [newFeature, setNewFeature] = useState({ featureKey: '', featureName: '', description: '', category: 'core', isIncludedInBase: true, additionalCost: 0 });
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', role: 'STAFF', password: '' });
  const [savingUser, setSavingUser] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, sr, fr, br, rr, bsr] = await Promise.all([
        customerProfilesApi.getAll().then(r => r.data.data || r.data || []).catch(() => []),
        subscriptionsApi.getStats().then(r => r.data).catch(() => ({})),
        featuresApi.getAll().then(r => Array.isArray(r.data) ? r.data : r.data.data || []).catch(() => []),
        bugReportsApi.getAll().then(r => r.data.data || r.data || []).catch(() => []),
        featureRequestsApi.getAll().then(r => Array.isArray(r.data) ? r.data : []).catch(() => []),
        bugReportsApi.getStats().then(r => r.data).catch(() => ({})),
      ]);
      setTenants(tr);
      setFeatures(fr);
      setBugReports(Array.isArray(br) ? br : []);
      setFeatureRequests(Array.isArray(rr) ? rr : []);
      setBugStats(bsr);
      const weekOld = new Date(); weekOld.setDate(weekOld.getDate() - 7);
      setStats({
        totalTenants: tr.length,
        activeTenants: tr.filter((t: Tenant) => t.status === 'ACTIVE').length,
        weeklyGrowth: tr.filter((t: Tenant) => new Date(t.createdAt) > weekOld).length,
        mrr: sr.totalRevenue || 0,
      });
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const navigate = (view: View) => {
    setPrevView(activeView);
    setActiveView(view);
    setSearchQuery('');
  };

  // ── Tenant detail ───────────────────────────────────────────────────────────
  const openTenant = async (t: Tenant) => {
    try {
      const r = await customerProfilesApi.getById(t.id);
      setSelectedTenant(r.data);
      setTenantTab('info');
      setTenantUsers([]); setTenantInvoices([]); setTenantActivity([]); setTenantFeatures([]);
      setPasswordHistoryMap({}); setExpandedHistory({});
    } catch { toast.error('Failed to load tenant'); }
  };

  const closeTenant = () => setSelectedTenant(null);

  const loadTenantTab = async (tab: typeof tenantTab) => {
    setTenantTab(tab);
    if (!selectedTenant) return;
    if (tab === 'users' && !tenantUsers.length) {
      customerUsersApi.getByProfile(selectedTenant.id).then(r => setTenantUsers(r.data || [])).catch(() => {});
    }
    if (tab === 'billing') {
      if (!tenantInvoices.length) {
        subscriptionsApi.getInvoices(selectedTenant.id).then(r => setTenantInvoices(r.data || [])).catch(() => {});
      }
      // Pre-fill offer price from tenant's saved subscription
      const subPrice = selectedTenant.subscription?.basePrice;
      const subCycle = selectedTenant.subscription?.billingCycle;
      const subPlan  = selectedTenant.subscription?.plan;
      if (subPrice) {
        setOffer(p => ({
          ...p,
          pricePerMonth: Number(subPrice),
          billingCycle: subCycle ? subCycle.toLowerCase() as any : p.billingCycle,
          plan: subPlan || p.plan,
        }));
      }

      // Load + auto-sync tenant features into the offer form
      const syncFeatures = (list: TenantFeature[]) => {
        const mapped = list
          .filter(f => f.isEnabled)
          .map(f => ({
            id: f.featureId,
            name: f.featureName,
            description: f.description || '',
            price: Number(f.additionalCost) || 0,
            isCustom: f.category?.toLowerCase() === 'custom' || Number(f.additionalCost) > 0,
          }));
        setOffer(p => ({ ...p, features: mapped }));
      };
      if (!tenantFeatures.length) {
        customerProfilesApi.getFeatures(selectedTenant.id)
          .then(r => { setTenantFeatures(r.data || []); syncFeatures(r.data || []); })
          .catch(() => {});
      } else {
        syncFeatures(tenantFeatures);
      }
    }
    if (tab === 'activity' && !tenantActivity.length) {
      customerProfilesApi.getActivity(selectedTenant.id).then(r => setTenantActivity(r.data || [])).catch(() => {});
    }
    if (tab === 'features' && !tenantFeatures.length) {
      customerProfilesApi.getFeatures(selectedTenant.id).then(r => setTenantFeatures(r.data || [])).catch(() => {});
    }
  };

  const changeStatus = async (id: string, status: string, name: string) => {
    try {
      await customerProfilesApi.updateStatus(id, status);
      toast.success(`${name} → ${STATUS_META[status]?.label || status}`);
      setSelectedTenant(prev => prev ? { ...prev, status } : null);
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch { toast.error('Failed to update'); }
  };

  const deleteTenant = async (id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      await customerProfilesApi.delete(id);
      toast.success(`${name} deleted`);
      setTenants(prev => prev.filter(t => t.id !== id));
      if (selectedTenant?.id === id) setSelectedTenant(null);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to delete'); }
  };

  const reprovision = async (id: string, name: string) => {
    if (!confirm(`Re-provision "${name}"? This will generate new login credentials.`)) return;
    try {
      const r = await customerProfilesApi.reprovision(id);
      const { ownerEmail, ownerPassword, companyCode } = r.data;
      setProvisionResult({ ownerEmail, ownerPassword, companyCode });
      setPanel('provisionResult');
      setSelectedTenant(prev => prev ? { ...prev, status: 'ACTIVE' } : null);
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: 'ACTIVE' } : t));
    } catch (e: any) {
      const msg = e.response?.data?.error || e.response?.data?.message || 'Re-provision failed';
      const hint = e.response?.data?.hint || '';
      toast.error(msg + (hint ? ` — ${hint}` : ''));
    }
  };

  // ── Users ───────────────────────────────────────────────────────────────────
  const addUser = async () => {
    if (!selectedTenant) return;
    if (!newUser.firstName || !newUser.email || !newUser.password) { toast.error('Fill required fields'); return; }
    setSavingUser(true);
    try {
      const r = await customerUsersApi.create({ ...newUser, customerProfileId: selectedTenant.id });
      setTenantUsers(p => [r.data, ...p]);
      setNewUser({ firstName: '', lastName: '', email: '', role: 'STAFF', password: '' });
      setPanel('none');
      toast.success('User added');
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setSavingUser(false); }
  };

  const loadPasswordHistory = async (userId: string) => {
    if (passwordHistoryMap[userId]) {
      setExpandedHistory(p => ({ ...p, [userId]: !p[userId] }));
      return;
    }
    try {
      const r = await customerUsersApi.getPasswordHistory(userId);
      setPasswordHistoryMap(p => ({ ...p, [userId]: r.data || [] }));
      setExpandedHistory(p => ({ ...p, [userId]: true }));
    } catch { toast.error('Failed to load password history'); }
  };

  const resetPw = async (u: TenantUser) => {
    try {
      const r = await customerUsersApi.resetPassword(u.id);
      const tmp = r.data.tempPassword;
      // Update the user in state so credentials card shows the new password immediately
      setTenantUsers(p => p.map(x => x.id === u.id ? { ...x, tempPassword: tmp, mustChangePassword: true } : x));
      toast.success(`New temp password: ${tmp}`, { duration: 15000 });
    } catch { toast.error('Failed'); }
  };

  const toggleUser = async (u: TenantUser) => {
    try {
      await customerUsersApi.update(u.id, { isActive: !u.isActive });
      setTenantUsers(p => p.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x));
      toast.success(`${u.firstName} ${u.isActive ? 'deactivated' : 'activated'}`);
    } catch { toast.error('Failed'); }
  };

  const deleteUser = async (u: TenantUser) => {
    if (!confirm(`Delete ${u.firstName} ${u.lastName}?`)) return;
    try {
      await customerUsersApi.delete(u.id);
      setTenantUsers(p => p.filter(x => x.id !== u.id));
      toast.success('User deleted');
    } catch { toast.error('Failed'); }
  };

  // ── Billing ─────────────────────────────────────────────────────────────────
  const generateInvoice = async () => {
    if (!selectedTenant) return;
    try {
      await subscriptionsApi.generateInvoice(selectedTenant.id);
      const r = await subscriptionsApi.getInvoices(selectedTenant.id);
      setTenantInvoices(r.data || []);
      toast.success('Invoice generated');
    } catch { toast.error('Failed'); }
  };

  const markPaid = async (id: string) => {
    try {
      await subscriptionsApi.markInvoicePaid(id);
      setTenantInvoices(p => p.map(i => i.id === id ? { ...i, status: 'PAID' } : i));
      toast.success('Marked as paid');
    } catch { toast.error('Failed'); }
  };

  const sendSubscriptionOffer = async () => {
    if (!selectedTenant) return;
    if (!offer.title.trim()) { toast.error('Title is required'); return; }
    if (!offer.checkoutUrl.trim()) { toast.error('Checkout URL is required'); return; }
    setSendingOffer(true);
    setShowConfirmSend(false);
    try {
      const r = await subscriptionsApi.sendOffer({
        profileId: selectedTenant.id,
        title: offer.title,
        description: offer.description,
        plan: offer.plan,
        pricePerMonth: Number(offer.pricePerMonth) || 0,
        billingCycle: offer.billingCycle,
        checkoutUrl: offer.checkoutUrl,
        features: offer.features.map(({ name, description, price, isCustom }) => ({ name, description, price, isCustom })),
        confirmModal: offer.confirmModal,
      });
      toast.success(`Offer sent to ${r.data?.to || selectedTenant.businessEmail}`);
      setOffer(defaultOffer);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to send');
    } finally {
      setSendingOffer(false);
    }
  };

  const removeOfferFeature = (id: string) => {
    setOffer(p => ({ ...p, features: p.features.filter(f => f.id !== id) }));
  };

  const syncOfferFeatures = () => {
    const mapped = tenantFeatures
      .filter(f => f.isEnabled)
      .map(f => ({
        id: f.featureId,
        name: f.featureName,
        description: f.description || '',
        price: Number(f.additionalCost) || 0,
        isCustom: f.category?.toLowerCase() === 'custom' || Number(f.additionalCost) > 0,
      }));
    setOffer(p => ({ ...p, features: mapped }));
    toast.success('Features synced from Features tab');
  };

  const sendDevInvoice = async () => {
    if (!selectedTenant) return;
    if (!devInvoice.title.trim()) { toast.error('Title is required'); return; }
    if (!devInvoice.checkoutUrl.trim()) { toast.error('Checkout URL is required'); return; }
    if (devInvoice.items.length === 0) { toast.error('Add at least one item'); return; }
    setSendingDevInvoice(true);
    setShowConfirmDevSend(false);
    try {
      const r = await subscriptionsApi.sendDevInvoice({
        profileId: selectedTenant.id,
        title: devInvoice.title,
        description: devInvoice.description,
        checkoutUrl: devInvoice.checkoutUrl,
        items: devInvoice.items.map(({ name, description, cost }) => ({ name, description, cost })),
      });
      toast.success(`Invoice sent to ${r.data?.to || selectedTenant.businessEmail}`);
      setDevInvoice(defaultDevInvoice);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to send');
    } finally {
      setSendingDevInvoice(false);
    }
  };

  const addDevItem = () => {
    // Pre-populate from custom features in tenantFeatures
    const customFeats = tenantFeatures.filter(f => f.isEnabled && (f.category?.toLowerCase() === 'custom' || Number(f.additionalCost) > 0));
    if (customFeats.length > 0 && devInvoice.items.length === 0) {
      setDevInvoice(p => ({
        ...p,
        items: customFeats.map(f => ({
          id: f.featureId,
          name: f.featureName,
          description: f.description || '',
          cost: Number(f.additionalCost) || 0,
        })),
      }));
    } else {
      setDevInvoice(p => ({
        ...p,
        items: [...p.items, { id: crypto.randomUUID(), name: '', description: '', cost: 0 }],
      }));
    }
  };

  const updateDevItem = (id: string, field: string, value: string | number) => {
    setDevInvoice(p => ({ ...p, items: p.items.map(i => i.id === id ? { ...i, [field]: value } : i) }));
  };

  const removeDevItem = (id: string) => {
    setDevInvoice(p => ({ ...p, items: p.items.filter(i => i.id !== id) }));
  };

  // ── Create tenant ───────────────────────────────────────────────────────────
  const validateSubdomain = async (v: string) => {
    if (!v || v.length < 3) { setSubdomainValid(null); return; }
    setSubdomainChecking(true);
    try { const r = await subdomainApi.validate(v); setSubdomainValid(r.data.available); }
    catch { setSubdomainValid(false); }
    finally { setSubdomainChecking(false); }
  };

  const onSubdomainChange = (v: string) => {
    const s = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setNewTenant(p => ({ ...p, subdomain: s }));
    validateSubdomain(s);
  };

  const createTenant = async () => {
    if (!newTenant.businessName || !newTenant.subdomain || !newTenant.businessEmail) { toast.error('Fill required fields'); return; }
    if (!newTenant.contactFirstName || !newTenant.contactLastName || !newTenant.contactEmail) { toast.error('Fill contact information'); return; }
    if (!subdomainValid) { toast.error('Choose a valid company code'); return; }
    setCreating(true);
    try {
      const r = await customerProfilesApi.create(newTenant);
      const { posProvisioning } = r.data;
      setPanel('none');
      setNewTenant({ businessName: '', businessEmail: '', subdomain: '', contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '', plan: 'PROFESSIONAL', customPrice: '', billingCycle: 'MONTHLY', isExistingClient: false });
      setSubdomainValid(null);
      if (posProvisioning?.status === 'success') {
        setProvisionResult({ ownerEmail: posProvisioning.ownerEmail, ownerPassword: posProvisioning.ownerPassword, companyCode: posProvisioning.companyCode });
        setPanel('provisionResult');
      } else if (posProvisioning?.status === 'existing') {
        toast.success(`Profile created for existing client — Company Code: ${posProvisioning.companyCode}`);
      } else {
        toast.success('Profile created. POS: ' + (posProvisioning?.error || 'check backend'));
      }
      loadAll();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed to create'); }
    finally { setCreating(false); }
  };

  // ── Bugs ────────────────────────────────────────────────────────────────────
  const createBug = async () => {
    if (!newBug.title || !newBug.description) { toast.error('Fill required fields'); return; }
    try {
      await bugReportsApi.create(newBug);
      toast.success('Bug reported');
      setPanel('none');
      setNewBug({ title: '', description: '', priority: 'MEDIUM', customerProfileId: '' });
      loadAll();
    } catch { toast.error('Failed'); }
  };

  const updateBugStatus = async (id: string, status: string) => {
    try {
      await bugReportsApi.updateStatus(id, status);
      setBugReports(p => p.map(b => b.id === id ? { ...b, status } : b));
      toast.success('Updated');
    } catch { toast.error('Failed'); }
  };

  // ── Requests ────────────────────────────────────────────────────────────────
  const createRequest = async () => {
    if (!newRequest.title || !newRequest.description) { toast.error('Fill required fields'); return; }
    try {
      await featureRequestsApi.create(newRequest);
      toast.success('Request submitted');
      setPanel('none');
      setNewRequest({ title: '', description: '', customerProfileId: '' });
      loadAll();
    } catch { toast.error('Failed'); }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    try {
      await featureRequestsApi.updateStatus(id, status);
      setFeatureRequests(p => p.map(r => r.id === id ? { ...r, status } : r));
    } catch { toast.error('Failed'); }
  };

  // ── Features ────────────────────────────────────────────────────────────────
  const createFeature = async () => {
    if (!newFeature.featureKey || !newFeature.featureName) { toast.error('Fill required fields'); return; }
    try {
      await featuresApi.create(newFeature);
      toast.success('Feature created');
      setPanel('none');
      setNewFeature({ featureKey: '', featureName: '', description: '', category: 'core', isIncludedInBase: true, additionalCost: 0 });
      loadAll();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  // ── Tenant feature toggle (drag-and-drop save) ───────────────────────────────
  const saveFeatures = async () => {
    if (!selectedTenant || !tenantFeatures.length) return;
    setSavingFeatures(true);
    const CORE_KEYS = new Set(['pos', 'inventory', 'customers', 'sales', 'repairs', 'cashiers']);
    try {
      // Only save non-core features — core features are always enabled by the system
      const nonCoreFeatures = tenantFeatures.filter(f => !CORE_KEYS.has(f.featureKey));
      await customerProfilesApi.batchUpdateFeatures(
        selectedTenant.id,
        nonCoreFeatures.map(f => ({ featureId: f.featureId, isEnabled: f.isEnabled })),
      );
      toast.success('Add-on features saved successfully');
    } catch { toast.error('Failed to save features'); }
    finally { setSavingFeatures(false); }
  };

  const seedFeatures = async () => {
    try {
      const r = await featuresApi.seedDefaults();
      toast.success(r.data.seeded > 0 ? `${r.data.seeded} features added` : 'Already up to date');
      loadAll();
    } catch { toast.error('Failed'); }
  };

  // ── Filtered ────────────────────────────────────────────────────────────────
  const q = searchQuery.toLowerCase();
  const filtTenants  = tenants.filter(t => t.businessName.toLowerCase().includes(q) || t.subdomain.toLowerCase().includes(q) || t.businessEmail.toLowerCase().includes(q));
  const filtBugs     = bugReports.filter(b => b.title.toLowerCase().includes(q));
  const filtRequests = featureRequests.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q) ||
    (r.customerProfile?.businessName || '').toLowerCase().includes(q)
  );
  const filtFeatures = features.filter(f => f.featureName.toLowerCase().includes(q) || f.featureKey.toLowerCase().includes(q));

  // ── Nav items ───────────────────────────────────────────────────────────────
  const navItems: { id: View; label: string; icon: React.FC<any>; badge?: number }[] = [
    { id: 'overview',  label: 'Overview',          icon: LayoutDashboard },
    { id: 'tenants',   label: 'Tenants',            icon: Building2,  badge: stats.totalTenants || undefined },
    { id: 'features',  label: 'Features',           icon: Package,    badge: features.length || undefined },
    { id: 'bugs',      label: 'Bug Reports',        icon: Bug,        badge: bugStats.open || undefined },
    { id: 'requests',  label: 'Feature Requests',   icon: Lightbulb,  badge: featureRequests.length || undefined },
    { id: 'billing',   label: 'Billing',            icon: CreditCard },
    { id: 'backups',   label: 'Backups',            icon: HardDrive },
    { id: 'settings',  label: 'Settings',           icon: Settings },
  ];

  // Determine slide direction based on nav order
  const viewOrder: View[] = ['overview', 'tenants', 'features', 'bugs', 'requests', 'billing', 'backups', 'settings'];
  const direction = viewOrder.indexOf(activeView) >= viewOrder.indexOf(prevView) ? 1 : -1;

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F2F2F7', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: 14, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.08)', fontFamily: 'inherit' },
      }} />

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-60 flex flex-col flex-shrink-0" style={{ background: '#0F1117', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Logo */}
        <div className="px-5 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}>
              <Server className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>TruedeskPOS</p>
              <p className="text-[9px] font-semibold tracking-[0.15em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>Mainframe</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 mb-3 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon, badge }) => {
            const active = activeView === id;
            return (
              <motion.button
                key={id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all"
                style={{
                  background: active ? 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' : 'transparent',
                  boxShadow: active ? '0 4px 14px rgba(0,122,255,0.35)' : 'none',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span className="flex items-center gap-2.5 text-sm font-medium" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.55)' }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </span>
                {badge !== undefined && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={{ background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)', color: active ? '#fff' : 'rgba(255,255,255,0.45)' }}>
                    {badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2.5 mb-3 px-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}>
              {admin?.firstName?.[0]}{admin?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{admin?.firstName} {admin?.lastName}</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{admin?.role}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ color: 'rgba(255,100,100,0.85)', background: 'rgba(255,59,48,0.1)' }}
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </motion.button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="px-8 pt-6 pb-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <AnimatePresence mode="wait">
            <motion.h1 key={activeView}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={springFast}
              className="text-2xl font-bold tracking-tight" style={{ color: '#1D1D1F' }}>
              {navItems.find(n => n.id === activeView)?.label}
            </motion.h1>
          </AnimatePresence>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#8E8E93' }} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-4 py-2 rounded-xl text-sm outline-none transition-all w-48 focus:w-64"
                style={{ background: 'rgba(118,118,128,0.12)', color: '#1D1D1F', border: 'none' }}
              />
            </div>

            {/* Context actions */}
            {activeView === 'tenants' && (
              <AppleBtn variant="primary" onClick={() => setPanel('createTenant')}><Plus className="w-3.5 h-3.5" />New Tenant</AppleBtn>
            )}
            {activeView === 'bugs' && (
              <AppleBtn variant="primary" onClick={() => setPanel('createBug')}><Plus className="w-3.5 h-3.5" />Report Bug</AppleBtn>
            )}
            {activeView === 'requests' && (
              <AppleBtn variant="primary" onClick={() => setPanel('createRequest')}><Plus className="w-3.5 h-3.5" />New Request</AppleBtn>
            )}
            {activeView === 'features' && (
              <div className="flex gap-2">
                <AppleBtn variant="secondary" onClick={seedFeatures}><Zap className="w-3.5 h-3.5" />Seed Defaults</AppleBtn>
                <AppleBtn variant="primary" onClick={() => setPanel('createFeature')}><Plus className="w-3.5 h-3.5" />New Feature</AppleBtn>
              </div>
            )}
            <AppleBtn variant="secondary" onClick={loadAll}><RefreshCw className="w-3.5 h-3.5" /></AppleBtn>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden relative">
          {/* Tenant detail overlay */}
          <AnimatePresence>
            {selectedTenant && (
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={spring}
                className="absolute inset-0 z-20 flex flex-col overflow-hidden"
                style={{
                  background: '#080C14',
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px)',
                  backgroundSize: '48px 48px',
                }}
              >
                {/* ── Hero ──────────────────────────────────────────────────── */}
                <div className="relative flex-shrink-0 px-8 pt-5" style={{
                  background: 'linear-gradient(180deg, rgba(88,86,214,0.1) 0%, rgba(0,122,255,0.05) 60%, transparent 100%)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {/* Top bar */}
                  <div className="flex items-center justify-between mb-7">
                    <motion.button
                      whileHover={{ x: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={closeTenant}
                      className="flex items-center gap-1.5 text-sm font-medium transition-colors"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                    >
                      <ChevronLeft className="w-4 h-4" /> All Tenants
                    </motion.button>
                    <div className="flex items-center gap-2">
                      {selectedTenant.status === 'PENDING_SETUP' && (
                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                          onClick={() => reprovision(selectedTenant.id, selectedTenant.businessName)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
                          style={{ background: 'rgba(0,122,255,0.15)', color: '#60A5FA', border: '1px solid rgba(0,122,255,0.25)' }}>
                          <RefreshCw className="w-3.5 h-3.5" /> Re-provision
                        </motion.button>
                      )}
                      {selectedTenant.status !== 'ACTIVE'
                        ? (
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => changeStatus(selectedTenant.id, 'ACTIVE', selectedTenant.businessName)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
                            style={{ background: 'rgba(52,199,89,0.15)', color: '#34C759', border: '1px solid rgba(52,199,89,0.25)' }}>
                            <CheckCircle className="w-3.5 h-3.5" /> Activate
                          </motion.button>
                        ) : (
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => changeStatus(selectedTenant.id, 'SUSPENDED', selectedTenant.businessName)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium"
                            style={{ background: 'rgba(255,59,48,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,59,48,0.25)' }}>
                            <XCircle className="w-3.5 h-3.5" /> Suspend
                          </motion.button>
                        )
                      }
                      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                        onClick={() => deleteTenant(selectedTenant.id, selectedTenant.businessName)}
                        title="Delete tenant"
                        className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                        style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.2)' }}>
                        <Trash2 className="w-3.5 h-3.5" style={{ color: '#FF6B6B' }} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Identity */}
                  <div className="flex items-center gap-6 mb-6">
                    {/* Avatar with glow ring */}
                    <div className="relative flex-shrink-0">
                      <div className="absolute -inset-3 rounded-2xl opacity-30 blur-xl pointer-events-none"
                        style={{ background: STATUS_GLOW[selectedTenant.status]?.glow ?? '#007AFF' }} />
                      <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-3xl"
                        style={{
                          background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                          boxShadow: `0 0 0 2px #080C14, 0 0 0 4px ${STATUS_GLOW[selectedTenant.status]?.ring ?? 'rgba(255,255,255,0.2)'}`,
                        }}>
                        {av(selectedTenant.businessName)}
                      </div>
                      {selectedTenant.status === 'ACTIVE' && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: '#080C14' }}>
                          <div className="w-3 h-3 rounded-full" style={{ background: '#34C759', boxShadow: '0 0 8px rgba(52,199,89,0.9)' }} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h1 className="text-3xl font-black tracking-tight leading-tight mb-2.5" style={{ color: 'rgba(255,255,255,0.95)' }}>
                        {selectedTenant.businessName}
                      </h1>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-sm px-2.5 py-1 rounded-lg tracking-wide"
                          style={{ background: 'rgba(88,86,214,0.15)', color: '#818CF8', border: '1px solid rgba(88,86,214,0.3)' }}>
                          {selectedTenant.subdomain}
                        </span>
                        <StatusPill status={selectedTenant.status} />
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                          Client since {new Date(selectedTenant.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div className="grid grid-cols-4 gap-px rounded-2xl overflow-hidden mb-5"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {[
                      { label: 'MRR',       value: selectedTenant.subscription ? `£${selectedTenant.subscription.basePrice}` : '—', sub: 'Monthly revenue' },
                      { label: 'Plan',      value: selectedTenant.subscription?.plan ?? '—', sub: 'Subscription tier' },
                      { label: 'Users',     value: String(selectedTenant.subscription?.currentUsers ?? selectedTenant._count?.customerUsers ?? 0), sub: 'Provisioned seats' },
                      { label: 'Next Bill', value: selectedTenant.subscription ? new Date(selectedTenant.subscription.nextBillingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—', sub: 'Renewal date' },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className="px-5 py-4" style={{ background: 'rgba(255,255,255,0.025)' }}>
                        <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>{label}</p>
                        <p className="text-xl font-black tracking-tight" style={{ color: 'rgba(255,255,255,0.92)' }}>{value}</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.22)' }}>{sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tab strip */}
                  <div className="flex items-center gap-0.5 -mx-1">
                    {([
                      { id: 'info',     label: 'Overview', icon: LayoutDashboard },
                      { id: 'users',    label: 'Users',    icon: Users },
                      { id: 'billing',  label: 'Subscription & Billing',  icon: CreditCard },
                      { id: 'activity', label: 'Activity', icon: Clock },
                      { id: 'features', label: 'Features', icon: Package },
                    ] as const).map(({ id, label, icon: Icon }) => {
                      const active = tenantTab === id;
                      return (
                        <motion.button
                          key={id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => loadTenantTab(id)}
                          className="relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors"
                          style={{ color: active ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.32)' }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                          {active && (
                            <motion.div
                              layoutId="tenant-tab-line"
                              className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                              style={{ background: 'linear-gradient(90deg, #007AFF, #5856D6)' }}
                              transition={springFast}
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* ── Tab content ───────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tenantTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={springFast}
                    >
                      {/* ── Overview tab ──────────────────────────────────── */}
                      {tenantTab === 'info' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            {/* Business */}
                            <div className="rounded-2xl p-5 space-y-4"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.28)' }}>Business</p>
                              {[
                                { l: 'Email', v: selectedTenant.businessEmail },
                                { l: 'Phone', v: selectedTenant.businessPhone || '—' },
                                { l: 'Company Code', v: selectedTenant.subdomain, mono: true },
                                { l: 'Member since', v: new Date(selectedTenant.createdAt).toLocaleDateString() },
                              ].map(({ l, v, mono }) => (
                                <div key={l} className="flex flex-col gap-0.5">
                                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>{l}</p>
                                  <p className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`} style={{ color: 'rgba(255,255,255,0.85)' }}>{v}</p>
                                </div>
                              ))}
                            </div>

                            {/* Contact */}
                            <div className="rounded-2xl p-5 space-y-4"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.28)' }}>Contact</p>
                              {selectedTenant.contact ? [
                                { l: 'Name', v: `${selectedTenant.contact.firstName} ${selectedTenant.contact.lastName}` },
                                { l: 'Email', v: selectedTenant.contact.email },
                                { l: 'Phone', v: selectedTenant.contact.phone || '—' },
                              ].map(({ l, v }) => (
                                <div key={l} className="flex flex-col gap-0.5">
                                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.28)' }}>{l}</p>
                                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{v}</p>
                                </div>
                              )) : <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No contact info</p>}
                            </div>

                            {/* Subscription */}
                            {selectedTenant.subscription ? (
                              <div className="rounded-2xl p-5 space-y-4"
                                style={{ background: 'linear-gradient(135deg, rgba(0,122,255,0.15) 0%, rgba(88,86,214,0.15) 100%)', border: '1px solid rgba(88,86,214,0.28)' }}>
                                <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>Subscription</p>
                                {[
                                  { l: 'Plan', v: selectedTenant.subscription.plan },
                                  { l: 'Monthly', v: `£${selectedTenant.subscription.basePrice}` },
                                  { l: 'Users', v: String(selectedTenant.subscription.currentUsers) },
                                  { l: 'Next Bill', v: new Date(selectedTenant.subscription.nextBillingDate).toLocaleDateString() },
                                ].map(({ l, v }) => (
                                  <div key={l} className="flex flex-col gap-0.5">
                                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{l}</p>
                                    <p className="text-sm font-semibold" style={{ color: '#fff' }}>{v}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="rounded-2xl p-5"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <p className="text-[10px] font-bold tracking-widest uppercase mb-4" style={{ color: 'rgba(255,255,255,0.28)' }}>Subscription</p>
                                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No subscription</p>
                              </div>
                            )}
                          </div>

                          {/* POS Credentials — terminal style */}
                          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(99,102,241,0.22)' }}>
                            <div className="flex items-center gap-2 px-5 py-3" style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                              <Shield className="w-3.5 h-3.5" style={{ color: '#818CF8' }} />
                              <p className="text-xs font-bold tracking-wider uppercase" style={{ color: '#818CF8' }}>POS Access Credentials</p>
                              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.18)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.25)' }}>
                                Share with client
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-px p-px" style={{ background: 'rgba(255,255,255,0.05)' }}>
                              {[
                                { l: 'Login URL', v: `https://${selectedTenant.subdomain}.truedesk.co.uk/login` },
                                { l: 'Company Code', v: selectedTenant.subdomain },
                                { l: 'Owner Email', v: selectedTenant.contact?.email || selectedTenant.businessEmail },
                              ].map(({ l, v }) => (
                                <div key={l} className="flex items-center justify-between px-4 py-3.5 gap-3"
                                  style={{ background: 'rgba(0,0,0,0.3)' }}>
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>{l}</p>
                                    <p className="text-sm font-mono font-semibold truncate" style={{ color: '#A5F3FC' }}>{v}</p>
                                  </div>
                                  <button onClick={() => { navigator.clipboard.writeText(v); toast.success(`${l} copied`); }}
                                    className="flex-shrink-0 p-1.5 rounded-lg transition-colors"
                                    style={{ color: 'rgba(255,255,255,0.25)' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                              <div className="flex items-center justify-between px-4 py-3.5 gap-3"
                                style={{ background: 'rgba(0,0,0,0.3)' }}>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.28)' }}>Password</p>
                                  <p className="text-sm font-mono italic" style={{ color: 'rgba(255,255,255,0.2)' }}>See Users tab</p>
                                </div>
                                <button onClick={() => loadTenantTab('users')}
                                  className="text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 transition-colors"
                                  style={{ background: 'rgba(99,102,241,0.18)', color: '#818CF8', border: '1px solid rgba(99,102,241,0.3)' }}>
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Users tab ─────────────────────────────────────── */}
                      {tenantTab === 'users' && (
                        <div className="space-y-4">
                          {/* Credentials */}
                          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,122,255,0.2)' }}>
                            <div className="flex items-center gap-2 px-5 py-3" style={{ background: 'rgba(0,122,255,0.1)', borderBottom: '1px solid rgba(0,122,255,0.15)' }}>
                              <Shield className="w-3.5 h-3.5" style={{ color: '#60A5FA' }} />
                              <p className="text-xs font-bold tracking-wider uppercase" style={{ color: '#60A5FA' }}>Login Credentials</p>
                              <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(0,122,255,0.18)', color: '#60A5FA', border: '1px solid rgba(0,122,255,0.25)' }}>
                                Code: {selectedTenant?.subdomain}
                              </span>
                            </div>
                            <div className="p-4 space-y-3">
                              {tenantUsers.length === 0 ? (
                                <p className="text-sm text-center py-4" style={{ color: 'rgba(255,255,255,0.22)' }}>No users added yet</p>
                              ) : tenantUsers.map(u => (
                                <div key={u.id} className="rounded-xl p-4 space-y-3"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
                                      style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
                                      {u.firstName[0]}{u.lastName[0]}
                                    </div>
                                    <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{u.firstName} {u.lastName}</p>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                      style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}>{u.role}</span>
                                    {u.mustChangePassword && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                        style={{ background: 'rgba(255,159,10,0.15)', color: '#FF9F0A' }}>Must change pw</span>
                                    )}
                                  </div>
                                  {[
                                    { l: 'Email / Username', v: u.email, mono: false },
                                    { l: 'Company Code', v: selectedTenant?.subdomain || '', mono: true },
                                  ].map(({ l, v, mono }) => (
                                    <div key={l} className="flex items-center justify-between gap-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wider w-32 flex-shrink-0"
                                        style={{ color: 'rgba(255,255,255,0.28)' }}>{l}</p>
                                      <p className={`text-sm flex-1 ${mono ? 'font-mono font-bold' : 'font-medium'}`}
                                        style={{ color: 'rgba(255,255,255,0.82)' }}>{v}</p>
                                      <button onClick={() => { navigator.clipboard.writeText(v); toast.success(`${l} copied`); }}
                                        className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                                        style={{ color: 'rgba(255,255,255,0.25)' }}
                                        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                                        <Copy className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider w-32 flex-shrink-0"
                                      style={{ color: 'rgba(255,255,255,0.28)' }}>Password</p>
                                    {u.tempPassword ? (
                                      <>
                                        <p className="text-sm flex-1 font-mono font-bold" style={{ color: '#60A5FA' }}>{u.tempPassword}</p>
                                        <button onClick={() => { navigator.clipboard.writeText(u.tempPassword!); toast.success('Password copied'); }}
                                          className="p-1.5 rounded-lg flex-shrink-0 transition-colors"
                                          style={{ color: 'rgba(255,255,255,0.25)' }}
                                          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
                                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}>
                                          <Copy className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        <p className="text-sm flex-1 italic" style={{ color: 'rgba(255,255,255,0.2)' }}>Set by user (unknown)</p>
                                        <button onClick={() => resetPw(u)}
                                          className="px-2 py-1 rounded-lg text-[11px] font-semibold flex-shrink-0"
                                          style={{ background: 'rgba(255,159,10,0.12)', color: '#FF9F0A', border: '1px solid rgba(255,159,10,0.2)' }}>
                                          Reset
                                        </button>
                                      </>
                                    )}
                                  </div>
                                  <div>
                                    <button onClick={() => loadPasswordHistory(u.id)}
                                      className="flex items-center gap-1 text-[11px] font-semibold mt-1"
                                      style={{ color: '#818CF8' }}>
                                      <Key className="w-3 h-3" />
                                      {expandedHistory[u.id] ? 'Hide history' : 'View password history'}
                                    </button>
                                    {expandedHistory[u.id] && (
                                      <div className="mt-2 rounded-xl overflow-hidden"
                                        style={{ border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)' }}>
                                        {(passwordHistoryMap[u.id] || []).length === 0 ? (
                                          <p className="text-[11px] text-center py-3" style={{ color: 'rgba(255,255,255,0.2)' }}>No history yet</p>
                                        ) : (passwordHistoryMap[u.id] || []).map((entry, i) => (
                                          <div key={entry.id} className="flex items-center justify-between px-3 py-2 gap-2"
                                            style={{ borderBottom: i < (passwordHistoryMap[u.id]?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                            <div className="flex items-center gap-2 min-w-0">
                                              <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: 'rgba(255,255,255,0.22)' }}>
                                                {new Date(entry.setAt).toLocaleDateString()} {new Date(entry.setAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                              <span className="font-mono text-sm font-bold truncate" style={{ color: i === 0 ? '#60A5FA' : 'rgba(255,255,255,0.7)' }}>
                                                {entry.password}
                                              </span>
                                              {i === 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                                                style={{ background: 'rgba(0,122,255,0.2)', color: '#60A5FA' }}>LATEST</span>}
                                            </div>
                                            <button onClick={() => { navigator.clipboard.writeText(entry.password); toast.success('Password copied'); }}
                                              className="p-1 rounded-lg flex-shrink-0 transition-colors"
                                              style={{ color: 'rgba(255,255,255,0.22)' }}
                                              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.6)')}
                                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.22)')}>
                                              <Copy className="w-3 h-3" />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
                                Password shown is the last admin-set password. Use Reset to generate a new one if the client is locked out.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>{tenantUsers.length} users</p>
                            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                              onClick={() => setPanel('addUser')}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
                              style={{ background: 'rgba(0,122,255,0.15)', color: '#60A5FA', border: '1px solid rgba(0,122,255,0.25)' }}>
                              <UserPlus className="w-3.5 h-3.5" /> Add User
                            </motion.button>
                          </div>
                          {tenantUsers.length === 0 && (
                            <div className="flex flex-col items-center gap-3 py-10">
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <Users className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.18)' }} />
                              </div>
                              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No users yet</p>
                            </div>
                          )}
                          {tenantUsers.map(u => (
                            <motion.div key={u.id} whileHover={{ scale: 1.005 }}
                              className="flex items-center justify-between p-4 rounded-2xl"
                              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                  style={{ background: u.isActive ? 'linear-gradient(135deg, #007AFF,#5856D6)' : 'rgba(255,255,255,0.08)' }}>
                                  {u.firstName[0]}{u.lastName[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{u.firstName} {u.lastName}</p>
                                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.32)' }}>
                                    {u.email} · {u.role}
                                    {u.tempPassword && <span className="ml-1.5 font-mono text-[11px]" style={{ color: '#60A5FA' }}>· pw: {u.tempPassword}</span>}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <StatusPill status={u.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                                {[
                                  { icon: <Key className="w-3.5 h-3.5" />, label: 'Reset password', action: () => resetPw(u) },
                                  { icon: u.isActive ? <ToggleRight className="w-4 h-4" style={{ color: '#34C759' }} /> : <ToggleLeft className="w-4 h-4" />, label: 'Toggle', action: () => toggleUser(u) },
                                ].map(({ icon, label, action }) => (
                                  <motion.button key={label} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    onClick={action} title={label}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                                    style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
                                    {icon}
                                  </motion.button>
                                ))}
                                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => deleteUser(u)} title="Delete user"
                                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                                  style={{ background: 'rgba(255,59,48,0.1)', color: '#FF6B6B' }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* ── Subscription & Billing tab ────────────────────── */}
                      {tenantTab === 'billing' && (
                        <div className="space-y-5">

                          {/* ── Send Subscription Offer ── */}
                          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {/* Section header */}
                            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                              <CreditCard className="w-4 h-4" style={{ color: '#7c3aed' }} />
                              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Send Subscription Offer</p>
                              <p className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>Sends to {selectedTenant.businessEmail}</p>
                            </div>

                            <div className="p-5 space-y-4">
                              {/* Title */}
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Email title *</label>
                                <input
                                  value={offer.title}
                                  onChange={e => setOffer(p => ({ ...p, title: e.target.value }))}
                                  placeholder="Your MCCL POS Subscription"
                                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
                                />
                              </div>

                              {/* Description */}
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Description / intro</label>
                                <textarea
                                  value={offer.description}
                                  onChange={e => setOffer(p => ({ ...p, description: e.target.value }))}
                                  rows={3}
                                  placeholder="Welcome to TrueDesk POS! Here's your subscription details..."
                                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
                                />
                              </div>

                              {/* Plan + Price + Billing cycle */}
                              <div className="grid grid-cols-3 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Plan</label>
                                  <select
                                    value={offer.plan}
                                    onChange={e => setOffer(p => ({ ...p, plan: e.target.value }))}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
                                  >
                                    {['STARTER','PROFESSIONAL','BUSINESS','ENTERPRISE','CUSTOM'].map(p => (
                                      <option key={p} value={p} style={{ background: '#1a1a2e' }}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Custom price *</label>
                                  <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1px solid rgba(124,58,237,0.4)', background: 'rgba(124,58,237,0.08)' }}>
                                    <span className="px-3 text-sm font-semibold" style={{ color: 'rgba(167,139,250,0.8)' }}>£</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      value={offer.pricePerMonth}
                                      onChange={e => setOffer(p => ({ ...p, pricePerMonth: e.target.value }))}
                                      placeholder="0.00"
                                      className="flex-1 py-2.5 pr-3 text-sm outline-none"
                                      style={{ background: 'transparent', color: '#c4b5fd' }}
                                    />
                                    <span className="pr-3 text-xs" style={{ color: 'rgba(167,139,250,0.5)' }}>/mo</span>
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Billing cycle</label>
                                  <select
                                    value={offer.billingCycle}
                                    onChange={e => setOffer(p => ({ ...p, billingCycle: e.target.value as any }))}
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
                                  >
                                    <option value="monthly" style={{ background: '#1a1a2e' }}>Monthly</option>
                                    <option value="quarterly" style={{ background: '#1a1a2e' }}>Quarterly</option>
                                    <option value="yearly" style={{ background: '#1a1a2e' }}>Yearly</option>
                                  </select>
                                </div>
                              </div>

                              {/* Checkout URL */}
                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>LemonSqueezy checkout URL *</label>
                                <input
                                  value={offer.checkoutUrl}
                                  onChange={e => setOffer(p => ({ ...p, checkoutUrl: e.target.value }))}
                                  placeholder="https://yourstore.lemonsqueezy.com/buy/..."
                                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
                                />
                              </div>

                              {/* Features — auto-synced from Features tab */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div>
                                    <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Features</label>
                                    <span className="ml-2 text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>auto-synced from Features tab</span>
                                  </div>
                                  <button onClick={syncOfferFeatures}
                                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <RefreshCw className="w-3 h-3" /> Re-sync
                                  </button>
                                </div>

                                {offer.features.length === 0 && (
                                  <div className="py-4 text-center rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>No features loaded — go to Features tab first, then come back</p>
                                  </div>
                                )}

                                {/* Standard features */}
                                {offer.features.filter(f => !f.isCustom).length > 0 && (
                                  <div className="space-y-1 mb-3">
                                    <p className="text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Included in plan</p>
                                    {offer.features.filter(f => !f.isCustom).map(f => (
                                      <div key={f.id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(52,199,89,0.06)', border: '1px solid rgba(52,199,89,0.15)' }}>
                                        <span style={{ color: '#34C759', fontSize: 13 }}>✓</span>
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{f.name}</span>
                                          {f.description && <span className="text-xs ml-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.description}</span>}
                                        </div>
                                        <button onClick={() => removeOfferFeature(f.id)} className="p-0.5 rounded" style={{ color: 'rgba(255,255,255,0.2)' }}><X className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Custom / highlighted features */}
                                {offer.features.filter(f => f.isCustom).length > 0 && (
                                  <div className="space-y-1">
                                    <p className="text-xs mb-1.5" style={{ color: 'rgba(124,58,237,0.8)' }}>✦ Custom / tailored features</p>
                                    {offer.features.filter(f => f.isCustom).map(f => (
                                      <div key={f.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.28)' }}>
                                        <span style={{ color: '#a78bfa', fontSize: 13 }}>✦</span>
                                        <div className="flex-1 min-w-0">
                                          <span className="text-xs font-semibold" style={{ color: '#c4b5fd' }}>{f.name}</span>
                                          {f.description && <span className="text-xs ml-2" style={{ color: 'rgba(196,181,253,0.5)' }}>{f.description}</span>}
                                        </div>
                                        <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>
                                          {f.price > 0 ? `+£${f.price}/mo` : 'Included'}
                                        </span>
                                        <button onClick={() => removeOfferFeature(f.id)} className="p-0.5 rounded" style={{ color: 'rgba(167,139,250,0.4)' }}><X className="w-3 h-3" /></button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Confirmation modal section */}
                              <div className="rounded-xl p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>Post-purchase confirmation (shown after payment)</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Confirmation title</label>
                                    <input value={offer.confirmModal.title}
                                      onChange={e => setOffer(p => ({ ...p, confirmModal: { ...p.confirmModal, title: e.target.value } }))}
                                      placeholder="Thanks for your order!"
                                      className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
                                  </div>
                                  <div>
                                    <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Button text</label>
                                    <input value={offer.confirmModal.buttonText}
                                      onChange={e => setOffer(p => ({ ...p, confirmModal: { ...p.confirmModal, buttonText: e.target.value } }))}
                                      placeholder="Access Your POS"
                                      className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
                                  </div>
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Confirmation message</label>
                                  <textarea value={offer.confirmModal.message}
                                    onChange={e => setOffer(p => ({ ...p, confirmModal: { ...p.confirmModal, message: e.target.value } }))}
                                    rows={2}
                                    placeholder="Your payment was successful. A receipt is on its way to your inbox."
                                    className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
                                </div>
                                <div>
                                  <label className="block text-xs mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Button link (tenant POS URL)</label>
                                  <input value={offer.confirmModal.buttonLink}
                                    onChange={e => setOffer(p => ({ ...p, confirmModal: { ...p.confirmModal, buttonLink: e.target.value } }))}
                                    placeholder={`https://${selectedTenant.subdomain}.truedesk.co.uk`}
                                    className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }} />
                                </div>
                              </div>

                              {/* Send button */}
                              {showConfirmSend ? (
                                <div className="rounded-xl p-4 text-center space-y-3" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)' }}>
                                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Send offer to {selectedTenant.businessEmail}?</p>
                                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>This will send an email with the subscription details and checkout link.</p>
                                  <div className="flex gap-3 justify-center">
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                      onClick={() => setShowConfirmSend(false)}
                                      className="px-4 py-2 rounded-xl text-sm font-medium"
                                      style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                      Cancel
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                      onClick={sendSubscriptionOffer}
                                      disabled={sendingOffer}
                                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
                                      style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff' }}>
                                      {sendingOffer ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending…</> : <><Check className="w-3.5 h-3.5" /> Yes, Send Email</>}
                                    </motion.button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {/* Copy link — works without email/SMTP */}
                                  {offer.checkoutUrl && (
                                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                      onClick={() => {
                                        navigator.clipboard.writeText(offer.checkoutUrl);
                                        toast.success('Checkout link copied — share via WhatsApp, SMS or any channel');
                                      }}
                                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
                                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                      <Copy className="w-4 h-4" />
                                      Copy Checkout Link
                                    </motion.button>
                                  )}
                                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowConfirmSend(true)}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
                                    <CreditCard className="w-4 h-4" />
                                    Send Subscription Offer Email
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Custom Feature Build Invoice ── */}
                          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,165,0,0.04)', border: '1px solid rgba(255,165,0,0.15)' }}>
                            <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid rgba(255,165,0,0.12)' }}>
                              <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />
                              <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Custom Feature Build Invoice</p>
                              <p className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.3)' }}>Charge for development work</p>
                            </div>

                            <div className="p-5 space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Invoice title</label>
                                  <input
                                    value={devInvoice.title}
                                    onChange={e => setDevInvoice(p => ({ ...p, title: e.target.value }))}
                                    placeholder="Custom Feature Development Invoice"
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,165,0,0.2)', color: 'rgba(255,255,255,0.85)' }}
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>LemonSqueezy payment URL *</label>
                                  <input
                                    value={devInvoice.checkoutUrl}
                                    onChange={e => setDevInvoice(p => ({ ...p, checkoutUrl: e.target.value }))}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,165,0,0.2)', color: 'rgba(255,255,255,0.85)' }}
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Message to client</label>
                                <textarea
                                  value={devInvoice.description}
                                  onChange={e => setDevInvoice(p => ({ ...p, description: e.target.value }))}
                                  rows={2}
                                  placeholder="Please find below the development invoice for your custom features..."
                                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
                                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,165,0,0.2)', color: 'rgba(255,255,255,0.85)' }}
                                />
                              </div>

                              {/* Line items — auto-populated from custom features */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>Invoice line items</label>
                                  <button onClick={addDevItem}
                                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                                    style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.25)' }}>
                                    <Plus className="w-3 h-3" /> {devInvoice.items.length === 0 && tenantFeatures.some(f => f.isEnabled && (f.category?.toLowerCase() === 'custom' || Number(f.additionalCost) > 0)) ? 'Load Custom Features' : 'Add Item'}
                                  </button>
                                </div>

                                <div className="space-y-2">
                                  {devInvoice.items.map((item, idx) => (
                                    <div key={item.id} className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                                      <div className="flex gap-2 items-center">
                                        <span className="text-xs font-bold w-5 text-center" style={{ color: 'rgba(245,158,11,0.6)' }}>{idx + 1}</span>
                                        <input value={item.name} onChange={e => updateDevItem(item.id, 'name', e.target.value)}
                                          placeholder="Feature / service name"
                                          className="flex-1 px-3 py-2 rounded-lg text-xs outline-none"
                                          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,158,11,0.2)', color: 'rgba(255,255,255,0.8)' }} />
                                        <div className="flex items-center gap-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '4px 10px' }}>
                                          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>£</span>
                                          <input type="number" value={item.cost || ''} onChange={e => updateDevItem(item.id, 'cost', parseFloat(e.target.value) || 0)}
                                            placeholder="0"
                                            className="w-16 text-xs outline-none text-right"
                                            style={{ background: 'transparent', color: '#f59e0b' }} />
                                        </div>
                                        <button onClick={() => removeDevItem(item.id)} className="p-1 rounded-lg" style={{ color: 'rgba(255,255,255,0.25)' }}><X className="w-3.5 h-3.5" /></button>
                                      </div>
                                      <input value={item.description} onChange={e => updateDevItem(item.id, 'description', e.target.value)}
                                        placeholder="Description of the work done..."
                                        className="w-full px-3 py-2 rounded-lg text-xs outline-none ml-7"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(245,158,11,0.12)', color: 'rgba(255,255,255,0.6)' }} />
                                    </div>
                                  ))}

                                  {devInvoice.items.length === 0 && (
                                    <p className="text-xs py-2 text-center" style={{ color: 'rgba(255,255,255,0.2)' }}>No items — click "Load Custom Features" or "Add Item"</p>
                                  )}

                                  {devInvoice.items.length > 0 && (
                                    <div className="flex justify-end pt-1">
                                      <div className="px-4 py-2 rounded-xl" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Total: </span>
                                        <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>
                                          £{devInvoice.items.reduce((sum, i) => sum + (i.cost || 0), 0).toFixed(2)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Send button */}
                              {showConfirmDevSend ? (
                                <div className="rounded-xl p-4 text-center space-y-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                                  <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>Send development invoice to {selectedTenant.businessEmail}?</p>
                                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Total: £{devInvoice.items.reduce((sum, i) => sum + (i.cost || 0), 0).toFixed(2)}</p>
                                  <div className="flex gap-3 justify-center">
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                      onClick={() => setShowConfirmDevSend(false)}
                                      className="px-4 py-2 rounded-xl text-sm font-medium"
                                      style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                      Cancel
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                      onClick={sendDevInvoice}
                                      disabled={sendingDevInvoice}
                                      className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold"
                                      style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff' }}>
                                      {sendingDevInvoice ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending…</> : <><Check className="w-3.5 h-3.5" /> Yes, Send Invoice</>}
                                    </motion.button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {devInvoice.checkoutUrl && (
                                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                      onClick={() => {
                                        navigator.clipboard.writeText(devInvoice.checkoutUrl);
                                        toast.success('Payment link copied — share via WhatsApp, SMS or any channel');
                                      }}
                                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
                                      style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}>
                                      <Copy className="w-4 h-4" />
                                      Copy Payment Link
                                    </motion.button>
                                  )}
                                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                                    onClick={() => setShowConfirmDevSend(true)}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold"
                                    style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: '#fff', boxShadow: '0 4px 14px rgba(217,119,6,0.25)' }}>
                                    <Zap className="w-4 h-4" />
                                    Send Development Invoice Email
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Invoice history ── */}
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>Invoice history ({tenantInvoices.length})</p>
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={generateInvoice}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium"
                                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <FileText className="w-3 h-3" /> Generate Invoice
                              </motion.button>
                            </div>
                            {tenantInvoices.length === 0 && (
                              <div className="flex flex-col items-center gap-3 py-8">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                  <FileText className="w-6 h-6" style={{ color: 'rgba(255,255,255,0.15)' }} />
                                </div>
                                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>No invoices yet</p>
                              </div>
                            )}
                            <div className="space-y-2">
                              {tenantInvoices.map(inv => (
                                <div key={inv.id} className="flex items-center justify-between p-4 rounded-2xl"
                                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                  <div>
                                    <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.85)' }}>{inv.invoiceNumber}</p>
                                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.85)' }}>£{inv.amount}</p>
                                    <StatusPill status={inv.status} />
                                    {inv.status !== 'PAID' && (
                                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                        onClick={() => markPaid(inv.id)}
                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                                        style={{ background: 'rgba(52,199,89,0.12)', color: '#34C759', border: '1px solid rgba(52,199,89,0.22)' }}>
                                        Mark Paid
                                      </motion.button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                        </div>
                      )}

                      {/* ── Activity tab ──────────────────────────────────── */}
                      {tenantTab === 'activity' && (
                        <div className="space-y-2">
                          {tenantActivity.length === 0 && (
                            <div className="flex flex-col items-center gap-3 py-10">
                              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <Clock className="w-7 h-7" style={{ color: 'rgba(255,255,255,0.18)' }} />
                              </div>
                              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No activity yet</p>
                            </div>
                          )}
                          {tenantActivity.map((log: any) => (
                            <div key={log.id} className="flex items-start gap-3 p-3.5 rounded-xl"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                                style={{ background: '#007AFF', boxShadow: '0 0 6px rgba(0,122,255,0.6)' }} />
                              <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>{log.action}</p>
                                {log.description && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{log.description}</p>}
                              </div>
                              <p className="text-[11px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.2)' }}>{new Date(log.createdAt).toLocaleString()}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Features */}
                      {tenantTab === 'features' && (() => {
                        const CORE_KEYS = new Set(['pos', 'inventory', 'customers', 'sales', 'repairs', 'cashiers']);
                        const STANDARD_KEYS = new Set(['shifts', 'float_management', 'petty_cash', 'stock_taking', 'calendar', 'tasks', 'history']);
                        const PREMIUM_KEYS = new Set(['financial_intelligence', 'chatbot', 'google_drive']);

                        const coreFeatures     = tenantFeatures.filter(f => CORE_KEYS.has(f.featureKey));
                        const nonCoreFeatures  = tenantFeatures.filter(f => !CORE_KEYS.has(f.featureKey));
                        const enabledNonCore   = nonCoreFeatures.filter(f => f.isEnabled);
                        const disabledNonCore  = nonCoreFeatures.filter(f => !f.isEnabled);

                        const TIER_COLORS: Record<string, { bg: string; text: string }> = {
                          Core:     { bg: 'rgba(59,130,246,0.2)',  text: '#60A5FA' },
                          Standard: { bg: 'rgba(52,199,89,0.15)',  text: '#34C759' },
                          Premium:  { bg: 'rgba(139,92,246,0.2)',  text: '#A78BFA' },
                        };

                        const getTier = (key: string) => {
                          if (CORE_KEYS.has(key)) return 'Core';
                          if (STANDARD_KEYS.has(key)) return 'Standard';
                          if (PREMIUM_KEYS.has(key)) return 'Premium';
                          return 'Standard';
                        };

                        const FeatureCard = ({ f, zone, locked = false }: { f: TenantFeature; zone: 'enabled' | 'available' | 'core'; locked?: boolean }) => {
                          const tier = getTier(f.featureKey);
                          const tc = TIER_COLORS[tier] ?? { bg: '#F3F4F6', text: '#374151' };
                          return (
                            <motion.div
                              key={f.featureId}
                              layout
                              initial={{ opacity: 0, scale: 0.97 }}
                              animate={{ opacity: 1, scale: 1 }}
                              draggable={!locked}
                              onDragStart={locked ? undefined : () => { dragFeatureId.current = f.featureId; }}
                              onDragEnd={locked ? undefined : () => { dragFeatureId.current = null; }}
                              className="flex items-center justify-between px-3 py-2.5 rounded-xl select-none"
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                cursor: locked ? 'default' : 'grab',
                                border: zone === 'core'
                                  ? '1px solid rgba(59,130,246,0.25)'
                                  : zone === 'enabled'
                                    ? '1px solid rgba(52,199,89,0.25)'
                                    : '1px solid rgba(255,255,255,0.07)',
                                opacity: locked ? 0.75 : 1,
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: zone === 'available' ? 'rgba(255,255,255,0.2)' : '#34C759', boxShadow: zone !== 'available' ? '0 0 5px rgba(52,199,89,0.6)' : 'none' }} />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{f.featureName}</p>
                                  <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.featureKey}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                {locked && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,159,10,0.15)', color: '#FF9F0A' }}>LOCKED</span>
                                )}
                                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: tc.bg, color: tc.text }}>{tier}</span>
                              </div>
                            </motion.div>
                          );
                        };

                        const handleDrop = (toEnabled: boolean) => {
                          const id = dragFeatureId.current;
                          if (!id) return;
                          // Never allow dragging core features
                          const feature = tenantFeatures.find(f => f.featureId === id);
                          if (feature && CORE_KEYS.has(feature.featureKey)) return;
                          setTenantFeatures(prev =>
                            prev.map(f => f.featureId === id ? { ...f, isEnabled: toEnabled } : f)
                          );
                        };

                        const tenantPlan = selectedTenant?.subscription?.plan || 'STARTER';

                        return (
                          <div className="space-y-5">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                                  Drag Standard & Premium features to enable or disable them.
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                  Core features are always active and cannot be disabled. Current plan: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>{tenantPlan}</strong>
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                  onClick={() =>
                                    customerProfilesApi.getFeatures(selectedTenant!.id)
                                      .then(r => setTenantFeatures(r.data || []))
                                      .catch(() => toast.error('Failed to reload'))
                                  }
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
                                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.65)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                  <RefreshCw className="w-3.5 h-3.5" /> Reload
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                  disabled={savingFeatures} onClick={saveFeatures}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
                                  style={{ background: savingFeatures ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.2)', color: '#60A5FA', border: '1px solid rgba(0,122,255,0.3)', opacity: savingFeatures ? 0.6 : 1 }}>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  {savingFeatures ? 'Saving…' : `Save & Activate (${enabledNonCore.length} add-ons)`}
                                </motion.button>
                              </div>
                            </div>

                            {tenantFeatures.length === 0
                              ? <div className="text-center py-10" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>No features found — click Reload or check that features are seeded.</div>
                              : (
                                <div className="space-y-4">
                                  {/* Core Features */}
                                  <div className="rounded-2xl p-4 space-y-2"
                                    style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-2 h-2 rounded-full" style={{ background: '#60A5FA', boxShadow: '0 0 6px rgba(96,165,250,0.7)' }} />
                                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#60A5FA' }}>
                                        Core — Always Active ({coreFeatures.length})
                                      </p>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: 'rgba(59,130,246,0.15)', color: '#60A5FA', border: '1px solid rgba(59,130,246,0.25)' }}>
                                        Cannot be disabled
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      {coreFeatures.map(f => <FeatureCard key={f.featureId} f={f} zone="core" locked />)}
                                      {coreFeatures.length === 0 && (
                                        <p className="text-xs col-span-2 text-center py-4" style={{ color: '#8E8E93' }}>No core features found — seed defaults first</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Standard & Premium — drag-and-drop */}
                                  <div className="grid grid-cols-2 gap-4">
                                    {/* Enabled zone */}
                                    <div
                                      className="rounded-2xl p-4 space-y-2 min-h-[280px]"
                                      style={{
                                        background: 'rgba(52,199,89,0.04)',
                                        border: '1.5px dashed rgba(52,199,89,0.3)',
                                        transition: 'border-color 0.15s, background 0.15s',
                                      }}
                                      onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#34C759'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(52,199,89,0.08)'; }}
                                      onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,199,89,0.3)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(52,199,89,0.04)'; }}
                                      onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,199,89,0.3)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(52,199,89,0.04)'; handleDrop(true); }}
                                    >
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full" style={{ background: '#34C759', boxShadow: '0 0 5px rgba(52,199,89,0.7)' }} />
                                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34C759' }}>
                                          Add-ons Active — {enabledNonCore.length}
                                        </p>
                                      </div>
                                      {enabledNonCore.length === 0 && (
                                        <p className="text-xs text-center py-8" style={{ color: 'rgba(52,199,89,0.35)' }}>
                                          Drop add-ons here to enable them
                                        </p>
                                      )}
                                      {enabledNonCore.map(f => <FeatureCard key={f.featureId} f={f} zone="enabled" />)}
                                    </div>

                                    {/* Disabled zone */}
                                    <div
                                      className="rounded-2xl p-4 space-y-2 min-h-[280px]"
                                      style={{
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1.5px dashed rgba(255,255,255,0.1)',
                                        transition: 'border-color 0.15s, background 0.15s',
                                      }}
                                      onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.3)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                      onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; }}
                                      onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'; handleDrop(false); }}
                                    >
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
                                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                          Add-ons Disabled — {disabledNonCore.length}
                                        </p>
                                      </div>
                                      {disabledNonCore.length === 0 && (
                                        <p className="text-xs text-center py-8" style={{ color: 'rgba(255,255,255,0.15)' }}>
                                          Drop add-ons here to disable them
                                        </p>
                                      )}
                                      {disabledNonCore.map(f => <FeatureCard key={f.featureId} f={f} zone="available" />)}
                                    </div>
                                  </div>

                                  {/* Plan legend */}
                                  <div className="flex items-center gap-4 text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ background: '#60A5FA' }} />
                                      Core — all plans
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ background: '#34C759' }} />
                                      Standard — Professional+
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ background: '#A78BFA' }} />
                                      Premium — Business+
                                    </span>
                                  </div>
                                </div>
                              )
                            }
                          </div>
                        );
                      })()}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main view content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, x: direction * 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 30 }}
              transition={spring}
              className="absolute inset-0 overflow-y-auto px-8 py-6"
            >

              {/* ── Overview ────────────────────────────────────────────── */}
              {activeView === 'overview' && (
                <div className="space-y-6">
                  {/* Stat cards */}
                  {loading ? <SkeletonStatCards /> : (
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: 'Total Tenants', value: stats.totalTenants, sub: `+${stats.weeklyGrowth} this week`, icon: <Building2 />, gradient: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)', onClick: () => navigate('tenants') },
                      { label: 'Monthly Revenue', value: `£${stats.mrr.toLocaleString()}`, sub: 'MRR', icon: <DollarSign />, gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)', onClick: () => navigate('billing') },
                      { label: 'Open Bugs', value: bugStats.open || 0, sub: `${bugStats.critical || 0} critical`, icon: <Bug />, gradient: 'linear-gradient(135deg, #FF3B30 0%, #FF6B6B 100%)', onClick: () => navigate('bugs') },
                      { label: 'Feature Requests', value: featureRequests.length, sub: `${featureRequests.filter(r => r.status === 'PLANNED').length} planned`, icon: <Lightbulb />, gradient: 'linear-gradient(135deg, #FF9F0A 0%, #FF6B35 100%)', onClick: () => navigate('requests') },
                    ].map(({ label, value, sub, icon, gradient, onClick }) => (
                      <motion.button
                        key={label}
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={onClick}
                        className="rounded-2xl p-5 text-left shadow-sm"
                        style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.6)' }}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg"
                          style={{ background: gradient }}>
                          {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
                        </div>
                        <p className="text-2xl font-bold tracking-tight" style={{ color: '#1D1D1F' }}>{value}</p>
                        <p className="text-sm font-medium mt-0.5" style={{ color: '#3C3C43' }}>{label}</p>
                        <p className="text-xs mt-1" style={{ color: '#8E8E93' }}>{sub}</p>
                      </motion.button>
                    ))}
                  </div>
                  )}

                  {/* Recent + Provision */}
                  <div className="grid grid-cols-3 gap-5">
                    <div className="col-span-2 rounded-2xl p-5"
                      style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.6)' }}>
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-base font-bold" style={{ color: '#1D1D1F' }}>Recent Tenants</p>
                        <motion.button whileHover={{ x: 2 }} onClick={() => navigate('tenants')}
                          className="flex items-center gap-0.5 text-sm font-medium" style={{ color: '#007AFF' }}>
                          View all <ChevronRight className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                      <div className="space-y-1">
                        {loading
                          ? [...Array(6)].map((_, i) => <SkeletonTenantListRow key={i} />)
                          : tenants.length === 0
                            ? <p className="text-sm text-center py-5" style={{ color: '#8E8E93' }}>No tenants yet</p>
                            : tenants.slice(0, 6).map(t => (
                              <motion.div key={t.id} whileHover={{ scale: 1.01, x: 4 }}
                                className="flex items-center justify-between p-2.5 rounded-xl cursor-pointer group"
                                style={{ background: 'rgba(0,0,0,0.02)' }}
                                onClick={() => openTenant(t)}>
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow"
                                    style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>{av(t.businessName)}</div>
                                  <div>
                                    <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>{t.businessName}</p>
                                    <p className="text-[11px] font-mono" style={{ color: '#8E8E93' }}>{t.subdomain}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <StatusPill status={t.status} />
                                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#007AFF' }} />
                                </div>
                              </motion.div>
                            ))
                        }
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Provision card */}
                      <motion.button
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setPanel('createTenant')}
                        className="w-full rounded-2xl p-5 flex flex-col items-center justify-center gap-3 shadow-xl text-white"
                        style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)', minHeight: 160 }}
                      >
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                          <Plus className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-base">New Tenant</p>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>Provision an instance</p>
                        </div>
                      </motion.button>

                      {/* System mini card */}
                      <div className="rounded-2xl p-4 space-y-2"
                        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
                        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#8E8E93' }}>System</p>
                        {[
                          { l: 'Uptime', v: '99.9%', ok: true },
                          { l: 'Features', v: features.length, ok: true },
                          { l: 'In-progress bugs', v: bugStats.inProgress || 0, ok: !bugStats.inProgress },
                        ].map(({ l, v, ok }) => (
                          <div key={l} className="flex items-center justify-between">
                            <p className="text-xs" style={{ color: '#6E6E73' }}>{l}</p>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold" style={{ color: '#1D1D1F' }}>{v}</p>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ background: ok ? '#34C759' : '#FF9F0A' }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Tenants ──────────────────────────────────────────────── */}
              {activeView === 'tenants' && (
                <div className="space-y-4">
                  <p className="text-sm" style={{ color: '#6E6E73' }}>{filtTenants.length} results</p>
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.6)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          {['Business', 'Code', 'Plan', 'Users', 'Status', 'Created', ''].map((h, i) => (
                            <th key={i} className={`px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${i === 6 ? 'text-right' : ''}`}
                              style={{ color: '#6E6E73' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loading && [...Array(7)].map((_, i) => <SkeletonTableRow key={i} cols={7} />)}
                        {!loading && filtTenants.map((t, idx) => (
                          <motion.tr key={t.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            whileHover={{ backgroundColor: 'rgba(0,122,255,0.03)' }}
                            className="cursor-pointer transition-colors"
                            style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                            onClick={() => openTenant(t)}
                          >
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md flex-shrink-0"
                                  style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>{av(t.businessName)}</div>
                                <div>
                                  <p className="font-semibold" style={{ color: '#1D1D1F' }}>{t.businessName}</p>
                                  <p className="text-xs" style={{ color: '#8E8E93' }}>{t.businessEmail}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5"><span className="font-mono text-xs px-2 py-0.5 rounded-lg" style={{ background: '#EEF2FF', color: '#5856D6' }}>{t.subdomain}</span></td>
                            <td className="px-5 py-3.5 text-sm" style={{ color: '#3C3C43' }}>{t.subscription?.plan || '—'}</td>
                            <td className="px-5 py-3.5">
                              <span className="flex items-center gap-1 text-sm" style={{ color: '#6E6E73' }}>
                                <Users className="w-3.5 h-3.5" />{t._count?.customerUsers ?? t.users?.length ?? 0}
                              </span>
                            </td>
                            <td className="px-5 py-3.5"><StatusPill status={t.status} /></td>
                            <td className="px-5 py-3.5 text-xs" style={{ color: '#8E8E93' }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                            <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <IconBtn icon={<Eye className="w-4 h-4" />} label="View" onClick={() => openTenant(t)} />
                                {t.status === 'ACTIVE'
                                  ? <IconBtn icon={<XCircle className="w-4 h-4" style={{ color: '#FF3B30' }} />} label="Suspend" onClick={() => changeStatus(t.id, 'SUSPENDED', t.businessName)} />
                                  : <IconBtn icon={<CheckCircle className="w-4 h-4" style={{ color: '#34C759' }} />} label="Activate" onClick={() => changeStatus(t.id, 'ACTIVE', t.businessName)} />
                                }
                                <IconBtn icon={<Trash2 className="w-4 h-4" style={{ color: '#FF3B30' }} />} label="Delete" onClick={() => deleteTenant(t.id, t.businessName)} />
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                        {!loading && filtTenants.length === 0 && (
                          <tr><td colSpan={7}><div className="py-16"><EmptyState icon={<Building2 />} label="No tenants found" /></div></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Features ─────────────────────────────────────────────── */}
              {activeView === 'features' && (
                <div className="space-y-4">
                  {!loading && filtFeatures.length === 0
                    ? <div className="rounded-2xl p-16" style={{ background: 'rgba(255,255,255,0.8)' }}><EmptyState icon={<Package />} label="No features — click Seed Defaults" /></div>
                    : (
                      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                              {['Feature', 'Key', 'Category', 'Tenants', 'Cost', 'Version', 'Status'].map(h => (
                                <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6E6E73' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {loading && [...Array(5)].map((_, i) => <SkeletonTableRow key={i} cols={7} />)}
                            {!loading && filtFeatures.map((f, idx) => (
                              <motion.tr key={f.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold" style={{ color: '#1D1D1F' }}>{f.featureName}</p>
                                    {f.isIncludedInBase && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#DBEAFE', color: '#1E40AF' }}>BASE</span>}
                                  </div>
                                </td>
                                <td className="px-5 py-3.5"><span className="font-mono text-xs" style={{ color: '#8E8E93' }}>{f.featureKey}</span></td>
                                <td className="px-5 py-3.5"><span className="text-xs px-2 py-0.5 rounded-lg capitalize font-medium" style={{ background: 'rgba(0,0,0,0.06)', color: '#3C3C43' }}>{f.category}</span></td>
                                <td className="px-5 py-3.5 text-sm" style={{ color: '#6E6E73' }}>{f._count?.customerFeatures ?? 0}</td>
                                <td className="px-5 py-3.5 text-sm">{f.additionalCost > 0 ? <span style={{ color: '#1D1D1F' }}>£{f.additionalCost}/mo</span> : <span style={{ color: '#34C759' }}>Free</span>}</td>
                                <td className="px-5 py-3.5"><span className="font-mono text-xs" style={{ color: '#8E8E93' }}>{f.currentVersion || '1.0.0'}</span></td>
                                <td className="px-5 py-3.5"><StatusPill status={f.status} /></td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  }
                </div>
              )}

              {/* ── Bugs ─────────────────────────────────────────────────── */}
              {activeView === 'bugs' && (
                <div className="space-y-3">
                  {loading && [...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                  {!loading && filtBugs.length === 0 && <div className="rounded-2xl p-16" style={{ background: 'rgba(255,255,255,0.8)' }}><EmptyState icon={<Bug />} label="No bug reports" /></div>}
                  {!loading && filtBugs.map((bug, idx) => (
                    <motion.div key={bug.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                      whileHover={{ scale: 1.005, y: -1 }}
                      className="p-5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.6)' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow"
                            style={{ background: bug.priority === 'CRITICAL' ? 'linear-gradient(135deg,#FF3B30,#FF6B6B)' : bug.priority === 'HIGH' ? 'linear-gradient(135deg,#FF9F0A,#FF6B35)' : 'linear-gradient(135deg,#007AFF,#5AC8FA)' }}>
                            <Bug className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>{bug.title}</p>
                            <p className="text-sm mt-0.5 line-clamp-2" style={{ color: '#6E6E73' }}>{bug.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <PriorityPill priority={bug.priority} />
                              {bug.customerProfile && <span className="text-xs" style={{ color: '#8E8E93' }}>· {bug.customerProfile.businessName}</span>}
                              <span className="text-xs" style={{ color: '#C7C7CC' }}>{new Date(bug.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusPill status={bug.status} />
                          {bug.status === 'OPEN' && <AppleBtn size="sm" variant="secondary" onClick={() => updateBugStatus(bug.id, 'IN_PROGRESS')}>Start</AppleBtn>}
                          {bug.status === 'IN_PROGRESS' && <AppleBtn size="sm" variant="secondary" onClick={() => updateBugStatus(bug.id, 'RESOLVED')}>Resolve</AppleBtn>}
                          {bug.status === 'RESOLVED' && <AppleBtn size="sm" variant="secondary" onClick={() => updateBugStatus(bug.id, 'CLOSED')}>Close</AppleBtn>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── Requests ─────────────────────────────────────────────── */}
              {activeView === 'requests' && (
                <div className="space-y-3">
                  {loading && [...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
                  {!loading && filtRequests.length === 0 && <div className="rounded-2xl p-16" style={{ background: 'rgba(255,255,255,0.8)' }}><EmptyState icon={<Lightbulb />} label="No feature requests" /></div>}
                  {!loading && filtRequests.map((req, idx) => (
                    <motion.div key={req.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.04 }}
                      whileHover={{ scale: 1.005, y: -1 }}
                      className="p-5 rounded-2xl"
                      style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow"
                            style={{ background: 'linear-gradient(135deg,#FF9F0A,#FF6B35)' }}>
                            <Lightbulb className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>{req.title}</p>
                            <p className="text-sm mt-0.5 line-clamp-2" style={{ color: '#6E6E73' }}>{req.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              {req.customerProfile && <span className="text-xs" style={{ color: '#8E8E93' }}>· {req.customerProfile.businessName}</span>}
                              <span className="text-xs" style={{ color: '#C7C7CC' }}>{new Date(req.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                            onClick={() => featureRequestsApi.vote(req.id).then(loadAll)}
                            className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-xl"
                            style={{ background: 'rgba(0,122,255,0.08)', color: '#007AFF' }}>
                            <TrendingUp className="w-3.5 h-3.5" />{req.votes}
                          </motion.button>
                          <StatusPill status={req.status} />
                          <select
                            value={req.status}
                            onChange={e => updateRequestStatus(req.id, e.target.value)}
                            className="text-xs font-medium px-2.5 py-1.5 rounded-xl outline-none cursor-pointer"
                            style={{ background: 'rgba(118,118,128,0.1)', color: '#3C3C43', border: 'none' }}>
                            {['SUBMITTED','UNDER_REVIEW','APPROVED','IN_DEVELOPMENT','TESTING','RELEASED','REJECTED'].map(s => (
                              <option key={s} value={s}>{STATUS_META[s]?.label || s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* ── Billing ───────────────────────────────────────────────── */}
              {activeView === 'billing' && (
                <div className="space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Monthly Revenue', value: `£${stats.mrr.toLocaleString()}`, icon: <DollarSign />, g: 'linear-gradient(135deg,#34C759,#30D158)' },
                      { label: 'Active Subscriptions', value: tenants.filter(t => t.status === 'ACTIVE').length, icon: <CheckCircle />, g: 'linear-gradient(135deg,#007AFF,#5AC8FA)' },
                      { label: 'Pending Setup', value: tenants.filter(t => t.status === 'PENDING_SETUP').length, icon: <Clock />, g: 'linear-gradient(135deg,#FF9F0A,#FF6B35)' },
                    ].map(({ label, value, icon, g }) => (
                      <div key={label} className="rounded-2xl p-5 flex items-center gap-4"
                        style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ background: g }}>
                          {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
                        </div>
                        <div>
                          <p className="text-2xl font-bold tracking-tight" style={{ color: '#1D1D1F' }}>{value}</p>
                          <p className="text-xs font-medium" style={{ color: '#6E6E73' }}>{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
                    <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <p className="font-bold" style={{ color: '#1D1D1F' }}>All Subscriptions</p>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                          {['Business', 'Plan', 'Monthly', 'Users', 'Status', 'Next Billing'].map(h => (
                            <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#6E6E73' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tenants.map(t => (
                          <motion.tr key={t.id} whileHover={{ backgroundColor: 'rgba(0,122,255,0.02)' }}
                            className="cursor-pointer" style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                            onClick={() => openTenant(t)}>
                            <td className="px-5 py-3.5">
                              <p className="font-semibold text-sm" style={{ color: '#1D1D1F' }}>{t.businessName}</p>
                              <p className="text-[11px] font-mono" style={{ color: '#8E8E93' }}>{t.subdomain}</p>
                            </td>
                            <td className="px-5 py-3.5 text-sm" style={{ color: '#3C3C43' }}>{t.subscription?.plan || '—'}</td>
                            <td className="px-5 py-3.5 text-sm font-medium" style={{ color: '#1D1D1F' }}>{t.subscription?.basePrice ? `£${t.subscription.basePrice}` : '—'}</td>
                            <td className="px-5 py-3.5 text-sm" style={{ color: '#6E6E73' }}>{t.subscription?.currentUsers ?? '—'}</td>
                            <td className="px-5 py-3.5"><StatusPill status={t.status} /></td>
                            <td className="px-5 py-3.5 text-sm" style={{ color: '#8E8E93' }}>{t.subscription?.nextBillingDate ? new Date(t.subscription.nextBillingDate).toLocaleDateString() : '—'}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Settings ─────────────────────────────────────────────── */}
              {/* ── Backups ──────────────────────────────────────────────── */}
              {activeView === 'backups' && (() => {
                const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;
                const fmtDate = (s: string) => new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                const loadStatus = async () => {
                  try {
                    const [s, f] = await Promise.all([backupApi.getStatus(), backupApi.listFiles()]);
                    setBackupStatus(s.data);
                    setBackupFiles(f.data);
                  } catch { toast.error('Failed to load backup info'); }
                };

                const triggerDownload = (blob: Blob, filename: string) => {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = filename;
                  document.body.appendChild(a); a.click();
                  document.body.removeChild(a); URL.revokeObjectURL(url);
                };

                const runBackup = async (key: string, apiFn: () => Promise<any>, toDrive: boolean, filename: string) => {
                  setBackupLoading(p => ({ ...p, [key]: true }));
                  try {
                    const res = await apiFn();
                    if (toDrive) {
                      setBackupDriveLinks(p => ({ ...p, [key]: res.data.driveLink }));
                      toast.success('Saved to Google Drive');
                    } else {
                      triggerDownload(new Blob([res.data]), filename);
                      toast.success('Download started');
                    }
                    await loadStatus();
                  } catch (e: any) {
                    toast.error(e?.response?.data?.message || 'Backup failed');
                  } finally {
                    setBackupLoading(p => ({ ...p, [key]: false }));
                  }
                };

                const BackupCard = ({ title, subtitle, icon, gradient, dlKey, driveKey, onDownload, onDrive }: any) => (
                  <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.6)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow" style={{ background: gradient }}>
                        {icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold" style={{ color: '#1D1D1F' }}>{title}</p>
                        <p className="text-xs" style={{ color: '#8E8E93' }}>{subtitle}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <motion.button whileTap={{ scale: 0.95 }} onClick={onDownload} disabled={backupLoading[dlKey]}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#007AFF,#5856D6)' }}>
                        {backupLoading[dlKey] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Download to PC
                      </motion.button>
                      {backupStatus?.driveConfigured ? (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={onDrive} disabled={backupLoading[driveKey]}
                          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-opacity disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#34C759,#30A14E)' }}>
                          {backupLoading[driveKey] ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                          Save to Drive
                        </motion.button>
                      ) : (
                        <div className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-medium" style={{ background: 'rgba(0,0,0,0.04)', color: '#8E8E93' }}>
                          <CloudUpload className="w-3.5 h-3.5" /> Drive not set up
                        </div>
                      )}
                    </div>
                    {backupDriveLinks[driveKey] && (
                      <a href={backupDriveLinks[driveKey]} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#34C759' }}>
                        <CheckCircle className="w-3.5 h-3.5" /> Saved to Drive — Open
                      </a>
                    )}
                  </div>
                );

                // Load status on first render of this view
                if (!backupStatus) { loadStatus(); }

                return (
                  <div className="space-y-6">
                    {/* Drive status banner */}
                    {backupStatus && !backupStatus.driveConfigured && (
                      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)' }}>
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#FF9F0A' }} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#FF9F0A' }}>Google Drive not configured</p>
                          <p className="text-xs mt-0.5" style={{ color: '#92400E' }}>
                            Set <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code> and <code className="font-mono bg-amber-100 px-1 rounded">GOOGLE_DRIVE_FOLDER_ID</code> in the mainframe-backend .env to enable Drive uploads.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Backup cards grid */}
                    <div>
                      <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: '#8E8E93' }}>Create Backup</p>
                      <div className="grid grid-cols-1 gap-3">
                        <BackupCard
                          title="Mainframe Database"
                          subtitle="All admin data, tenants, billing, users"
                          icon={<Server className="w-5 h-5" />}
                          gradient="linear-gradient(135deg,#5856D6,#AF52DE)"
                          dlKey="mf-dl" driveKey="mf-drive"
                          onDownload={() => runBackup('mf-dl', () => backupApi.backupMainframe(false), false, `mainframe-${new Date().toISOString().slice(0,10)}.sql`)}
                          onDrive={() => runBackup('mf-drive', () => backupApi.backupMainframe(true), true, '')}
                        />
                        <BackupCard
                          title="Full POS Database"
                          subtitle="All tenants' sales, inventory, customers, repairs"
                          icon={<Database className="w-5 h-5" />}
                          gradient="linear-gradient(135deg,#007AFF,#5856D6)"
                          dlKey="pos-dl" driveKey="pos-drive"
                          onDownload={() => runBackup('pos-dl', () => backupApi.backupPosFull(false), false, `pos-full-${new Date().toISOString().slice(0,10)}.sql`)}
                          onDrive={() => runBackup('pos-drive', () => backupApi.backupPosFull(true), true, '')}
                        />
                        {tenants.map(t => (
                          <BackupCard
                            key={t.id}
                            title={t.businessName}
                            subtitle={`${t.subdomain} — sales, customers, inventory, repairs`}
                            icon={<span className="text-xs font-bold">{t.businessName.slice(0,2).toUpperCase()}</span>}
                            gradient="linear-gradient(135deg,#FF9F0A,#FF6B35)"
                            dlKey={`t-dl-${t.subdomain}`} driveKey={`t-drive-${t.subdomain}`}
                            onDownload={() => runBackup(`t-dl-${t.subdomain}`, () => backupApi.backupTenant(t.subdomain, false), false, `${t.subdomain}-${new Date().toISOString().slice(0,10)}.json`)}
                            onDrive={() => runBackup(`t-drive-${t.subdomain}`, () => backupApi.backupTenant(t.subdomain, true), true, '')}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Saved backup files */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#8E8E93' }}>Saved on Server ({backupFiles.length})</p>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={loadStatus}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg"
                          style={{ background: 'rgba(0,122,255,0.08)', color: '#007AFF' }}>
                          <RefreshCw className="w-3 h-3" /> Refresh
                        </motion.button>
                      </div>
                      {backupFiles.length === 0 ? (
                        <div className="rounded-2xl p-8 flex flex-col items-center gap-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
                          <FolderOpen className="w-8 h-8" style={{ color: '#C7C7CC' }} />
                          <p className="text-sm" style={{ color: '#8E8E93' }}>No backups saved on server yet</p>
                        </div>
                      ) : (
                        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.6)' }}>
                          <table className="w-full text-sm">
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                                {['File', 'Size', 'Created', ''].map((h, i) => (
                                  <th key={i} className={`px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider ${i === 3 ? 'text-right' : ''}`} style={{ color: '#6E6E73' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {backupFiles.map(f => (
                                <tr key={f.filename} style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                  <td className="px-4 py-3 font-mono text-xs" style={{ color: '#1D1D1F' }}>{f.filename}</td>
                                  <td className="px-4 py-3 text-xs" style={{ color: '#6E6E73' }}>{fmtSize(f.size)}</td>
                                  <td className="px-4 py-3 text-xs" style={{ color: '#6E6E73' }}>{fmtDate(f.createdAt)}</td>
                                  <td className="px-4 py-3 text-right">
                                    <button onClick={async () => {
                                      if (!confirm(`Delete ${f.filename}?`)) return;
                                      try { await backupApi.deleteFile(f.filename); await loadStatus(); toast.success('Deleted'); }
                                      catch { toast.error('Failed to delete'); }
                                    }} className="text-xs font-medium px-2 py-1 rounded-lg transition-colors hover:bg-red-50" style={{ color: '#FF3B30' }}>
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {activeView === 'settings' && (
                <div className="grid grid-cols-2 gap-5">
                  <div className="rounded-2xl p-6 space-y-3" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
                    <p className="text-base font-bold mb-4" style={{ color: '#1D1D1F' }}>System Status</p>
                    {[
                      { l: 'Uptime', v: '99.9%', ok: true },
                      { l: 'Total tenants', v: stats.totalTenants, ok: true },
                      { l: 'Active tenants', v: stats.activeTenants, ok: true },
                      { l: 'Open bugs', v: bugStats.open || 0, ok: !(bugStats.open) },
                      { l: 'Critical bugs', v: bugStats.critical || 0, ok: !(bugStats.critical) },
                      { l: 'Features configured', v: features.length, ok: features.length > 0 },
                    ].map(({ l, v, ok }) => (
                      <div key={l} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
                        <p className="text-sm" style={{ color: '#3C3C43' }}>{l}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold" style={{ color: '#1D1D1F' }}>{v}</p>
                          <div className="w-2 h-2 rounded-full" style={{ background: ok ? '#34C759' : '#FF9F0A' }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
                      <p className="text-base font-bold mb-4" style={{ color: '#1D1D1F' }}>Quick Actions</p>
                      <div className="space-y-2">
                        {[
                          { l: 'Provision New Tenant', g: 'linear-gradient(135deg,#007AFF,#5856D6)', action: () => setPanel('createTenant'), icon: <Plus className="w-4 h-4" /> },
                          { l: 'Seed Default Features', g: 'linear-gradient(135deg,#FF9F0A,#FF6B35)', action: seedFeatures, icon: <Zap className="w-4 h-4" /> },
                          { l: 'Report a Bug', g: 'linear-gradient(135deg,#FF3B30,#FF6B6B)', action: () => setPanel('createBug'), icon: <Bug className="w-4 h-4" /> },
                          { l: 'New Feature Request', g: 'linear-gradient(135deg,#AF52DE,#5856D6)', action: () => setPanel('createRequest'), icon: <Lightbulb className="w-4 h-4" /> },
                          { l: 'Refresh All Data', g: 'linear-gradient(135deg,#34C759,#30D158)', action: loadAll, icon: <RefreshCw className="w-4 h-4" /> },
                        ].map(({ l, g, action, icon }) => (
                          <motion.button key={l} whileHover={{ x: 4, scale: 1.01 }} whileTap={{ scale: 0.98 }}
                            onClick={action}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left"
                            style={{ background: 'rgba(0,0,0,0.03)', color: '#1D1D1F' }}>
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ background: g }}>
                              {icon}
                            </div>
                            {l}
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.6)' }}>
                      <p className="text-sm font-bold mb-3" style={{ color: '#1D1D1F' }}>Admin</p>
                      {[['Name', `${admin?.firstName} ${admin?.lastName}`], ['Email', admin?.email || ''], ['Role', admin?.role || '']].map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1.5">
                          <p className="text-xs" style={{ color: '#8E8E93' }}>{k}</p>
                          <p className="text-xs font-medium" style={{ color: '#1D1D1F' }}>{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */
      /* SIDE PANELS (replace all dialogs)                                     */}

      {/* Create Tenant */}
      <SidePanel
        open={panel === 'createTenant'}
        onClose={() => setPanel('none')}
        title={newTenant.isExistingClient ? 'Add Existing Client' : 'Provision New Tenant'}
        subtitle={newTenant.isExistingClient ? 'Register an existing client — POS will not be re-provisioned' : 'Create a new customer POS instance'}
        width="w-[540px]"
        footer={
          <div className="flex justify-end gap-3">
            <AppleBtn variant="secondary" onClick={() => setPanel('none')}>Cancel</AppleBtn>
            <AppleBtn variant="primary" disabled={creating} onClick={createTenant}>
              <Plus className="w-3.5 h-3.5" />{creating ? 'Creating…' : 'Create Tenant'}
            </AppleBtn>
          </div>
        }
      >
        <div className="space-y-6">
          <FormSection title="Business Info">
            <Field label="Business Name" required>
              <AppleInput placeholder="B-House Jewellery Ltd" value={newTenant.businessName} onChange={e => setNewTenant(p => ({ ...p, businessName: e.target.value }))} />
            </Field>
            <Field label="Business Email" required>
              <AppleInput type="email" placeholder="admin@bhouse.com" value={newTenant.businessEmail} onChange={e => setNewTenant(p => ({ ...p, businessEmail: e.target.value }))} />
            </Field>
          </FormSection>

          <FormSection title="Company Code">
            <Field label="Company Code" required hint="Customers enter this at the POS login screen">
              <div className="space-y-1.5">
                <AppleInput
                  placeholder="bhouse"
                  value={newTenant.subdomain}
                  onChange={e => onSubdomainChange(e.target.value)}
                  status={subdomainValid === true ? 'ok' : subdomainValid === false ? 'error' : undefined}
                />
                <AnimatePresence>
                  {subdomainChecking && <motion.p key="checking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs" style={{ color: '#8E8E93' }}>Checking…</motion.p>}
                  {subdomainValid === true && <motion.p key="valid" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs flex items-center gap-1" style={{ color: '#34C759' }}><Check className="w-3 h-3" />Available</motion.p>}
                  {subdomainValid === false && <motion.p key="invalid" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs flex items-center gap-1" style={{ color: '#FF3B30' }}><AlertCircle className="w-3 h-3" />Already taken</motion.p>}
                </AnimatePresence>
              </div>
            </Field>
          </FormSection>

          <FormSection title="Primary Contact">
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name" required>
                <AppleInput placeholder="John" value={newTenant.contactFirstName} onChange={e => setNewTenant(p => ({ ...p, contactFirstName: e.target.value }))} />
              </Field>
              <Field label="Last Name" required>
                <AppleInput placeholder="Doe" value={newTenant.contactLastName} onChange={e => setNewTenant(p => ({ ...p, contactLastName: e.target.value }))} />
              </Field>
            </div>
            <Field label="Contact Email" required>
              <AppleInput type="email" placeholder="john@bhouse.com" value={newTenant.contactEmail} onChange={e => setNewTenant(p => ({ ...p, contactEmail: e.target.value }))} />
            </Field>
            <Field label="Phone">
              <AppleInput placeholder="+44 20 1234 5678" value={newTenant.contactPhone} onChange={e => setNewTenant(p => ({ ...p, contactPhone: e.target.value }))} />
            </Field>
          </FormSection>

          <FormSection title="Subscription Plan">
            <select value={newTenant.plan} onChange={e => setNewTenant(p => ({ ...p, plan: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer"
              style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}>
              <option value="STARTER">Starter — £29/month</option>
              <option value="PROFESSIONAL">Professional — £79/month</option>
              <option value="BUSINESS">Business — £199/month</option>
              <option value="ENTERPRISE">Enterprise — £499/month</option>
              <option value="CUSTOM">Custom — set price below</option>
            </select>

            {/* Custom price — shown only when CUSTOM plan selected */}
            {newTenant.plan === 'CUSTOM' && (
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: '#8E8E93' }}>Custom price per month</p>
                  <div className="flex items-center rounded-xl overflow-hidden" style={{ border: '1.5px solid rgba(124,58,237,0.45)', background: 'rgba(124,58,237,0.06)' }}>
                    <span className="px-3 text-sm font-semibold" style={{ color: 'rgba(124,58,237,0.8)' }}>£</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newTenant.customPrice}
                      onChange={e => setNewTenant(p => ({ ...p, customPrice: e.target.value }))}
                      placeholder="0.00"
                      className="flex-1 py-2.5 pr-3 text-sm outline-none"
                      style={{ background: 'transparent', color: '#6d28d9' }}
                    />
                    <span className="pr-3 text-xs font-medium" style={{ color: 'rgba(124,58,237,0.5)' }}>/mo</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1.5" style={{ color: '#8E8E93' }}>Billing cycle</p>
                  <select value={newTenant.billingCycle} onChange={e => setNewTenant(p => ({ ...p, billingCycle: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer"
                    style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}>
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
            )}

            {/* Billing cycle for non-custom plans */}
            {newTenant.plan !== 'CUSTOM' && (
              <div className="mt-3">
                <p className="text-xs font-medium mb-1.5" style={{ color: '#8E8E93' }}>Billing cycle</p>
                <select value={newTenant.billingCycle} onChange={e => setNewTenant(p => ({ ...p, billingCycle: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none cursor-pointer"
                  style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}>
                  <option value="MONTHLY">Monthly</option>
                  <option value="QUARTERLY">Quarterly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            )}
          </FormSection>

          <FormSection title="Client Type">
            <button
              type="button"
              onClick={() => setNewTenant(p => ({ ...p, isExistingClient: !p.isExistingClient }))}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-colors"
              style={{
                background: newTenant.isExistingClient ? 'rgba(52,199,89,0.08)' : 'rgba(118,118,128,0.08)',
                border: newTenant.isExistingClient ? '1.5px solid rgba(52,199,89,0.3)' : '1.5px solid transparent',
              }}>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>Existing Client</p>
                <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>
                  {newTenant.isExistingClient
                    ? 'POS provisioning will be skipped — profile activated immediately'
                    : 'New client — a fresh POS instance will be provisioned'}
                </p>
              </div>
              <div className="flex-shrink-0 ml-3">
                {newTenant.isExistingClient
                  ? <ToggleRight className="w-6 h-6" style={{ color: '#34C759' }} />
                  : <ToggleLeft className="w-6 h-6" style={{ color: '#C7C7CC' }} />}
              </div>
            </button>
          </FormSection>
        </div>
      </SidePanel>

      {/* Provisioning result */}
      <SidePanel
        open={panel === 'provisionResult'}
        onClose={() => setPanel('none')}
        title="Tenant Provisioned"
        subtitle="Share these credentials with the customer"
        footer={<AppleBtn variant="primary" className="w-full justify-center" onClick={() => setPanel('none')}>Done</AppleBtn>}
      >
        {provisionResult && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: 'linear-gradient(135deg, rgba(0,122,255,0.06), rgba(88,86,214,0.06))', border: '1px solid rgba(0,122,255,0.15)' }}>
              {[
                { l: 'Company Code', v: provisionResult.companyCode, mono: true, accent: false },
                { l: 'Owner Email', v: provisionResult.ownerEmail, mono: false, accent: false },
                { l: 'Temporary Password', v: provisionResult.ownerPassword, mono: true, accent: true },
              ].map(({ l, v, mono, accent }) => (
                <div key={l}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#8E8E93' }}>{l}</p>
                  <p className={`text-sm font-bold ${mono ? 'font-mono' : ''}`}
                    style={{ color: accent ? '#007AFF' : '#1D1D1F' }}>{v}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#FF9F0A' }} />
              <p className="text-xs" style={{ color: '#92400E' }}>Save these credentials now. The password cannot be retrieved after closing this panel.</p>
            </div>
          </div>
        )}
      </SidePanel>

      {/* Create Bug */}
      <SidePanel open={panel === 'createBug'} onClose={() => setPanel('none')} title="Report a Bug"
        footer={<div className="flex justify-end gap-3"><AppleBtn variant="secondary" onClick={() => setPanel('none')}>Cancel</AppleBtn><AppleBtn variant="danger" onClick={createBug}>Submit Report</AppleBtn></div>}>
        <div className="space-y-5">
          <Field label="Title" required><AppleInput placeholder="Brief summary of the issue" value={newBug.title} onChange={e => setNewBug(p => ({ ...p, title: e.target.value }))} /></Field>
          <Field label="Description" required>
            <textarea value={newBug.description} onChange={e => setNewBug(p => ({ ...p, description: e.target.value }))}
              className="w-full min-h-[120px] px-4 py-3 rounded-xl text-sm font-medium resize-none outline-none"
              style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}
              placeholder="Steps to reproduce, expected vs actual behaviour…" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority">
              <select value={newBug.priority} onChange={e => setNewBug(p => ({ ...p, priority: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
                style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}>
                {['LOW','MEDIUM','HIGH','CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Customer">
              <select value={newBug.customerProfileId} onChange={e => setNewBug(p => ({ ...p, customerProfileId: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
                style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}>
                <option value="">None</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.businessName}</option>)}
              </select>
            </Field>
          </div>
        </div>
      </SidePanel>

      {/* Create Request */}
      <SidePanel open={panel === 'createRequest'} onClose={() => setPanel('none')} title="New Feature Request"
        footer={<div className="flex justify-end gap-3"><AppleBtn variant="secondary" onClick={() => setPanel('none')}>Cancel</AppleBtn><AppleBtn variant="primary" onClick={createRequest}>Submit</AppleBtn></div>}>
        <div className="space-y-5">
          <Field label="Title" required><AppleInput placeholder="Feature idea" value={newRequest.title} onChange={e => setNewRequest(p => ({ ...p, title: e.target.value }))} /></Field>
          <Field label="Description" required>
            <textarea value={newRequest.description} onChange={e => setNewRequest(p => ({ ...p, description: e.target.value }))}
              className="w-full min-h-[120px] px-4 py-3 rounded-xl text-sm font-medium resize-none outline-none"
              style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}
              placeholder="What problem does this solve? How should it work?" />
          </Field>
          <Field label="Customer">
            <select value={newRequest.customerProfileId} onChange={e => setNewRequest(p => ({ ...p, customerProfileId: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
              style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}>
              <option value="">None</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.businessName}</option>)}
            </select>
          </Field>
        </div>
      </SidePanel>

      {/* Create Feature */}
      <SidePanel open={panel === 'createFeature'} onClose={() => setPanel('none')} title="New Feature"
        footer={<div className="flex justify-end gap-3"><AppleBtn variant="secondary" onClick={() => setPanel('none')}>Cancel</AppleBtn><AppleBtn variant="primary" onClick={createFeature}>Create Feature</AppleBtn></div>}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Feature Key" required hint="snake_case, e.g. google_drive"><AppleInput placeholder="google_drive" value={newFeature.featureKey} onChange={e => setNewFeature(p => ({ ...p, featureKey: e.target.value.toLowerCase().replace(/\s/g, '_') }))} /></Field>
            <Field label="Feature Name" required><AppleInput placeholder="Google Drive" value={newFeature.featureName} onChange={e => setNewFeature(p => ({ ...p, featureName: e.target.value }))} /></Field>
          </div>
          <Field label="Description"><AppleInput placeholder="Brief description" value={newFeature.description} onChange={e => setNewFeature(p => ({ ...p, description: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select value={newFeature.category} onChange={e => setNewFeature(p => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
                style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}>
                {['core','reporting','analytics','integrations','ai','other'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </Field>
            <Field label="Additional Cost (£/mo)"><AppleInput type="number" min="0" value={newFeature.additionalCost} onChange={e => setNewFeature(p => ({ ...p, additionalCost: parseFloat(e.target.value) || 0 }))} /></Field>
          </div>
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.03)' }}>
            <div className="relative">
              <input type="checkbox" checked={newFeature.isIncludedInBase} onChange={e => setNewFeature(p => ({ ...p, isIncludedInBase: e.target.checked }))} className="sr-only" />
              <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: newFeature.isIncludedInBase ? '#007AFF' : 'rgba(0,0,0,0.1)' }}>
                {newFeature.isIncludedInBase && <Check className="w-3 h-3 text-white" />}
              </div>
            </div>
            <p className="text-sm font-medium" style={{ color: '#1D1D1F' }}>Included in base plan</p>
          </label>
        </div>
      </SidePanel>

      {/* Add User */}
      <SidePanel open={panel === 'addUser'} onClose={() => setPanel('none')} title={`Add User`} subtitle={selectedTenant?.businessName}
        footer={<div className="flex justify-end gap-3"><AppleBtn variant="secondary" onClick={() => setPanel('none')}>Cancel</AppleBtn><AppleBtn variant="primary" disabled={savingUser} onClick={addUser}><UserPlus className="w-3.5 h-3.5" />{savingUser ? 'Adding…' : 'Add User'}</AppleBtn></div>}>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required><AppleInput value={newUser.firstName} onChange={e => setNewUser(p => ({ ...p, firstName: e.target.value }))} /></Field>
            <Field label="Last Name" required><AppleInput value={newUser.lastName} onChange={e => setNewUser(p => ({ ...p, lastName: e.target.value }))} /></Field>
          </div>
          <Field label="Email" required><AppleInput type="email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))} /></Field>
          <Field label="Password" required><AppleInput type="password" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} /></Field>
          <Field label="Role">
            <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium outline-none"
              style={{ background: 'rgba(118,118,128,0.08)', color: '#1D1D1F', border: 'none' }}>
              {['OWNER','MANAGER','STAFF','CASHIER'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
      </SidePanel>
    </div>
  );
};

// ─── Small shared components ──────────────────────────────────────────────────

const EmptyState: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-8">
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.04)' }}>
      {React.cloneElement(icon as React.ReactElement, { className: 'w-7 h-7', style: { color: '#C7C7CC' } })}
    </div>
    <p className="text-sm font-medium" style={{ color: '#8E8E93' }}>{label}</p>
  </div>
);

const IconBtn: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.88 }}
    onClick={e => { e.stopPropagation(); onClick(); }}
    title={label}
    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
    style={{ background: 'rgba(0,0,0,0.04)', color: '#6E6E73' }}
  >
    {icon}
  </motion.button>
);

const FormSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-4">
    <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#8E8E93' }}>{title}</p>
    <div className="space-y-3">{children}</div>
  </div>
);

export default MainFrameDashboard;
