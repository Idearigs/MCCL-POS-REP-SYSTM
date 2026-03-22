import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard, Building2, Package, CreditCard, Settings,
  Plus, TrendingUp, Users, ChevronRight, Server, Zap,
  CheckCircle, AlertCircle, Search, Eye, ArrowUpRight, DollarSign,
  Bug, Lightbulb, RefreshCw, XCircle, Clock, LogOut, Trash2,
  Key, UserPlus, ToggleLeft, ToggleRight, FileText,
  Check, X, ChevronLeft, Copy, Shield,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  customerProfilesApi, customerUsersApi, subscriptionsApi, featuresApi,
  bugReportsApi, featureRequestsApi, subdomainApi,
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
  SUBMITTED:    { label: 'Submitted',   dot: '#5AC8FA', bg: '#E0F2FE', text: '#0C4A6E' },
  UNDER_REVIEW: { label: 'In Review',   dot: '#AF52DE', bg: '#EDE9FE', text: '#5B21B6' },
  PLANNED:      { label: 'Planned',     dot: '#5856D6', bg: '#EEF2FF', text: '#3730A3' },
  RELEASED:     { label: 'Released',    dot: '#34C759', bg: '#D1FAE5', text: '#065F46' },
  REJECTED:     { label: 'Rejected',    dot: '#FF3B30', bg: '#FEE2E2', text: '#991B1B' },
  STABLE:       { label: 'Stable',      dot: '#34C759', bg: '#D1FAE5', text: '#065F46' },
  BETA:         { label: 'Beta',        dot: '#FF9F0A', bg: '#FEF3C7', text: '#92400E' },
  DEPRECATED:   { label: 'Deprecated',  dot: '#8E8E93', bg: '#F3F4F6', text: '#374151' },
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

// ─── Types ────────────────────────────────────────────────────────────────────
interface Tenant {
  id: string; businessName: string; businessEmail: string; businessPhone?: string;
  subdomain: string; status: string; createdAt: string;
  contact?: { firstName: string; lastName: string; email: string; phone?: string };
  subscription?: { plan: string; basePrice: number; currentUsers: number; nextBillingDate: string };
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
interface Invoice {
  id: string; invoiceNumber: string; amount: number; status: string;
  dueDate: string; paidAt?: string;
}

type View = 'overview' | 'tenants' | 'features' | 'bugs' | 'requests' | 'billing' | 'settings';

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
  const [tenantInvoices, setTenantInvoices] = useState<Invoice[]>([]);
  const [tenantActivity, setTenantActivity] = useState<any[]>([]);
  const [tenantFeatures, setTenantFeatures] = useState<TenantFeature[]>([]);
  const [savingFeatures, setSavingFeatures] = useState(false);
  const dragFeatureId = React.useRef<string | null>(null);

  // Panel states
  const [panel, setPanel] = useState<'none' | 'createTenant' | 'createBug' | 'createRequest' | 'createFeature' | 'addUser' | 'provisionResult'>('none');

  // Provisioning result
  const [provisionResult, setProvisionResult] = useState<{ ownerEmail: string; ownerPassword: string; companyCode: string } | null>(null);

  // Forms
  const [newTenant, setNewTenant] = useState({ businessName: '', businessEmail: '', subdomain: '', contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '', plan: 'PROFESSIONAL', isExistingClient: false });
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
    } catch { toast.error('Failed to load tenant'); }
  };

  const closeTenant = () => setSelectedTenant(null);

  const loadTenantTab = async (tab: typeof tenantTab) => {
    setTenantTab(tab);
    if (!selectedTenant) return;
    if (tab === 'users' && !tenantUsers.length) {
      customerUsersApi.getByProfile(selectedTenant.id).then(r => setTenantUsers(r.data || [])).catch(() => {});
    }
    if (tab === 'billing' && !tenantInvoices.length) {
      subscriptionsApi.getInvoices(selectedTenant.id).then(r => setTenantInvoices(r.data || [])).catch(() => {});
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
      setNewTenant({ businessName: '', businessEmail: '', subdomain: '', contactFirstName: '', contactLastName: '', contactEmail: '', contactPhone: '', plan: 'PROFESSIONAL', isExistingClient: false });
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
  const filtRequests = featureRequests.filter(r => r.title.toLowerCase().includes(q));
  const filtFeatures = features.filter(f => f.featureName.toLowerCase().includes(q) || f.featureKey.toLowerCase().includes(q));

  // ── Nav items ───────────────────────────────────────────────────────────────
  const navItems: { id: View; label: string; icon: React.FC<any>; badge?: number }[] = [
    { id: 'overview',  label: 'Overview',          icon: LayoutDashboard },
    { id: 'tenants',   label: 'Tenants',            icon: Building2,  badge: stats.totalTenants || undefined },
    { id: 'features',  label: 'Features',           icon: Package,    badge: features.length || undefined },
    { id: 'bugs',      label: 'Bug Reports',        icon: Bug,        badge: bugStats.open || undefined },
    { id: 'requests',  label: 'Feature Requests',   icon: Lightbulb,  badge: featureRequests.length || undefined },
    { id: 'billing',   label: 'Billing',            icon: CreditCard },
    { id: 'settings',  label: 'Settings',           icon: Settings },
  ];

  // Determine slide direction based on nav order
  const viewOrder: View[] = ['overview', 'tenants', 'features', 'bugs', 'requests', 'billing', 'settings'];
  const direction = viewOrder.indexOf(activeView) >= viewOrder.indexOf(prevView) ? 1 : -1;

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F2F2F7', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif' }}>
      <Toaster position="top-center" toastOptions={{
        style: { borderRadius: 14, background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(0,0,0,0.08)', fontFamily: 'inherit' },
      }} />

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="w-60 flex flex-col flex-shrink-0" style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'saturate(180%) blur(20px)', borderRight: '1px solid rgba(0,0,0,0.08)' }}>
        {/* Logo */}
        <div className="px-5 pt-7 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}>
              <Server className="w-4.5 h-4.5 text-white" style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight" style={{ color: '#1D1D1F' }}>TruedeskPOS</p>
              <p className="text-[9px] font-semibold tracking-[0.15em] uppercase" style={{ color: '#8E8E93' }}>Mainframe</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon, badge }) => {
            const active = activeView === id;
            return (
              <motion.button
                key={id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors"
                style={{
                  background: active ? 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' : 'transparent',
                  boxShadow: active ? '0 4px 12px rgba(0,122,255,0.3)' : 'none',
                }}
              >
                <span className="flex items-center gap-2.5 text-sm font-medium" style={{ color: active ? '#fff' : '#3C3C43' }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {label}
                </span>
                {badge !== undefined && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={{ background: active ? 'rgba(255,255,255,0.25)' : 'rgba(120,120,128,0.12)', color: active ? '#fff' : '#6E6E73' }}>
                    {badge}
                  </span>
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 mt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2.5 mb-2 px-1">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}>
              {admin?.firstName?.[0]}{admin?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#1D1D1F' }}>{admin?.firstName} {admin?.lastName}</p>
              <p className="text-[10px]" style={{ color: '#8E8E93' }}>{admin?.role}</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
            style={{ color: '#FF3B30', background: 'rgba(255,59,48,0.06)' }}
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
                className="absolute inset-0 z-20 flex flex-col"
                style={{ background: '#F2F2F7' }}
              >
                {/* Tenant header */}
                <div className="px-8 py-5 flex items-center gap-4 flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={closeTenant}
                    className="flex items-center gap-1 text-sm font-medium"
                    style={{ color: '#007AFF' }}
                  >
                    <ChevronLeft className="w-4 h-4" /> Tenants
                  </motion.button>
                  <div className="w-px h-5" style={{ background: 'rgba(0,0,0,0.12)' }} />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' }}>
                      {av(selectedTenant.businessName)}
                    </div>
                    <div>
                      <p className="text-base font-bold" style={{ color: '#1D1D1F' }}>{selectedTenant.businessName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md" style={{ background: '#EEF2FF', color: '#5856D6' }}>{selectedTenant.subdomain}</span>
                        <StatusPill status={selectedTenant.status} />
                      </div>
                    </div>
                  </div>
                  <div className="ml-auto flex gap-2">
                    {selectedTenant.status === 'PENDING_SETUP' && (
                      <AppleBtn variant="primary" size="sm" onClick={() => reprovision(selectedTenant.id, selectedTenant.businessName)}>
                        <RefreshCw className="w-3.5 h-3.5" />Re-provision
                      </AppleBtn>
                    )}
                    {selectedTenant.status !== 'ACTIVE'
                      ? <AppleBtn variant="primary" size="sm" onClick={() => changeStatus(selectedTenant.id, 'ACTIVE', selectedTenant.businessName)}><CheckCircle className="w-3.5 h-3.5" />Activate</AppleBtn>
                      : <AppleBtn variant="danger" size="sm" onClick={() => changeStatus(selectedTenant.id, 'SUSPENDED', selectedTenant.businessName)}><XCircle className="w-3.5 h-3.5" />Suspend</AppleBtn>
                    }
                    <IconBtn icon={<Trash2 className="w-4 h-4" style={{ color: '#FF3B30' }} />} label="Delete tenant" onClick={() => deleteTenant(selectedTenant.id, selectedTenant.businessName)} />
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex px-8 gap-1 pt-4 flex-shrink-0">
                  {(['info', 'users', 'billing', 'activity', 'features'] as const).map(tab => (
                    <motion.button
                      key={tab}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => loadTenantTab(tab)}
                      className="px-4 py-1.5 rounded-xl text-sm font-medium capitalize transition-all"
                      style={{
                        background: tenantTab === tab ? 'rgba(0,122,255,0.1)' : 'transparent',
                        color: tenantTab === tab ? '#007AFF' : '#6E6E73',
                      }}
                    >
                      {tab}
                    </motion.button>
                  ))}
                </div>

                {/* Tenant tab content */}
                <div className="flex-1 overflow-y-auto px-8 py-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tenantTab}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={springFast}
                    >
                      {/* Info */}
                      {tenantTab === 'info' && (
                        <div className="space-y-5">
                          <div className="grid grid-cols-3 gap-5">
                            <Card>
                              <CardTitle>Business</CardTitle>
                              <InfoRow label="Email" value={selectedTenant.businessEmail} />
                              <InfoRow label="Phone" value={selectedTenant.businessPhone || '—'} />
                              <InfoRow label="Company Code" value={selectedTenant.subdomain} mono />
                              <InfoRow label="Created" value={new Date(selectedTenant.createdAt).toLocaleDateString()} />
                            </Card>
                            <Card>
                              <CardTitle>Contact</CardTitle>
                              {selectedTenant.contact ? <>
                                <InfoRow label="Name" value={`${selectedTenant.contact.firstName} ${selectedTenant.contact.lastName}`} />
                                <InfoRow label="Email" value={selectedTenant.contact.email} />
                                <InfoRow label="Phone" value={selectedTenant.contact.phone || '—'} />
                              </> : <p className="text-sm" style={{ color: '#8E8E93' }}>No contact info</p>}
                            </Card>
                            {selectedTenant.subscription && (
                              <Card gradient>
                                <CardTitle light>Subscription</CardTitle>
                                <InfoRow label="Plan" value={selectedTenant.subscription.plan} light />
                                <InfoRow label="Monthly" value={`£${selectedTenant.subscription.basePrice}`} light />
                                <InfoRow label="Users" value={String(selectedTenant.subscription.currentUsers)} light />
                                <InfoRow label="Next Bill" value={new Date(selectedTenant.subscription.nextBillingDate).toLocaleDateString()} light />
                              </Card>
                            )}
                          </div>

                          {/* POS Login Details — always visible */}
                          <div className="rounded-2xl p-5"
                            style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <div className="flex items-center gap-2 mb-4">
                              <Shield className="w-4 h-4" style={{ color: '#5856D6' }} />
                              <p className="text-sm font-bold" style={{ color: '#1D1D1F' }}>POS Login Details</p>
                              <span className="text-[10px] font-semibold ml-auto" style={{ color: '#8E8E93' }}>
                                Share these with the client
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { l: 'Login URL', v: `https://${selectedTenant.subdomain}.truedesk.co.uk/login` },
                                { l: 'Company Code', v: selectedTenant.subdomain },
                                { l: 'Owner Email', v: selectedTenant.contact?.email || selectedTenant.businessEmail },
                              ].map(({ l, v }) => (
                                <div key={l} className="flex items-center justify-between px-3 py-2.5 rounded-xl gap-2"
                                  style={{ background: 'rgba(118,118,128,0.06)' }}>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#8E8E93' }}>{l}</p>
                                    <p className="text-sm font-mono font-semibold truncate" style={{ color: '#1D1D1F' }}>{v}</p>
                                  </div>
                                  <button onClick={() => { navigator.clipboard.writeText(v); toast.success(`${l} copied`); }}
                                    className="p-1.5 rounded-lg flex-shrink-0 hover:bg-black/5 transition-colors">
                                    <Copy className="w-3.5 h-3.5" style={{ color: '#8E8E93' }} />
                                  </button>
                                </div>
                              ))}
                              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl gap-2"
                                style={{ background: 'rgba(118,118,128,0.06)' }}>
                                <div className="min-w-0">
                                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#8E8E93' }}>Password</p>
                                  <p className="text-sm font-mono font-semibold" style={{ color: '#8E8E93' }}>
                                    See Users tab
                                  </p>
                                </div>
                                <button onClick={() => loadTenantTab('users')}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0 hover:bg-black/5 transition-colors"
                                  style={{ color: '#007AFF' }}>
                                  View
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Users */}
                      {tenantTab === 'users' && (
                        <div className="space-y-4">
                          {/* Login credentials card — shown when we have users with credentials */}
                          {tenantUsers.some(u => u.tempPassword) && (
                            <div className="rounded-2xl p-5 space-y-4"
                              style={{ background: 'linear-gradient(135deg, rgba(0,122,255,0.05), rgba(88,86,214,0.05))', border: '1.5px solid rgba(0,122,255,0.18)' }}>
                              <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4" style={{ color: '#007AFF' }} />
                                <p className="text-sm font-bold" style={{ color: '#007AFF' }}>Login Credentials</p>
                                <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto font-semibold" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
                                  Company Code: {selectedTenant?.subdomain}
                                </span>
                              </div>
                              {tenantUsers.filter(u => u.tempPassword).map(u => (
                                <div key={u.id} className="rounded-xl p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)' }}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-[11px] flex-shrink-0"
                                      style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
                                      {u.firstName[0]}{u.lastName[0]}
                                    </div>
                                    <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>{u.firstName} {u.lastName}</p>
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#6E6E73' }}>{u.role}</span>
                                    {u.mustChangePassword && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#92400E' }}>Must change password</span>
                                    )}
                                  </div>
                                  {[
                                    { l: 'Email', v: u.email, mono: false },
                                    { l: 'Company Code', v: selectedTenant?.subdomain || '', mono: true },
                                    { l: 'Current Password', v: u.tempPassword || '', mono: true },
                                  ].map(({ l, v, mono }) => (
                                    <div key={l} className="flex items-center justify-between gap-2">
                                      <p className="text-[11px] font-semibold uppercase tracking-wider w-28 flex-shrink-0" style={{ color: '#8E8E93' }}>{l}</p>
                                      <p className={`text-sm flex-1 ${mono ? 'font-mono font-bold' : 'font-medium'}`} style={{ color: '#1D1D1F' }}>{v}</p>
                                      <button
                                        onClick={() => { navigator.clipboard.writeText(v); toast.success(`${l} copied`); }}
                                        className="p-1.5 rounded-lg flex-shrink-0 hover:bg-black/5 transition-colors"
                                        title={`Copy ${l}`}>
                                        <Copy className="w-3.5 h-3.5" style={{ color: '#8E8E93' }} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              ))}
                              <p className="text-[11px]" style={{ color: '#8E8E93' }}>
                                Password shown is the last admin-set password. If the user has changed their own password since, this may no longer be accurate — use "Reset Password" to generate a new one.
                              </p>
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium" style={{ color: '#6E6E73' }}>{tenantUsers.length} users</p>
                            <AppleBtn variant="primary" size="sm" onClick={() => setPanel('addUser')}><UserPlus className="w-3.5 h-3.5" />Add User</AppleBtn>
                          </div>
                          {tenantUsers.length === 0 && <EmptyState icon={<Users />} label="No users yet" />}
                          {tenantUsers.map(u => (
                            <motion.div key={u.id} whileHover={{ scale: 1.005 }}
                              className="flex items-center justify-between p-4 rounded-2xl"
                              style={{ background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,0,0,0.06)' }}>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
                                  style={{ background: u.isActive ? 'linear-gradient(135deg, #007AFF,#5856D6)' : '#C7C7CC' }}>
                                  {u.firstName[0]}{u.lastName[0]}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>{u.firstName} {u.lastName}</p>
                                  <p className="text-xs" style={{ color: '#8E8E93' }}>
                                    {u.email} · {u.role}
                                    {u.tempPassword && <span className="ml-1.5 font-mono text-[11px]" style={{ color: '#007AFF' }}>· pw: {u.tempPassword}</span>}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <StatusPill status={u.isActive ? 'ACTIVE' : 'SUSPENDED'} />
                                <IconBtn icon={<Key className="w-3.5 h-3.5" />} label="Reset password" onClick={() => resetPw(u)} />
                                <IconBtn icon={u.isActive ? <ToggleRight className="w-4 h-4" style={{ color: '#34C759' }} /> : <ToggleLeft className="w-4 h-4" />} label="Toggle" onClick={() => toggleUser(u)} />
                                <IconBtn icon={<Trash2 className="w-3.5 h-3.5" style={{ color: '#FF3B30' }} />} label="Delete" onClick={() => deleteUser(u)} />
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Billing */}
                      {tenantTab === 'billing' && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium" style={{ color: '#6E6E73' }}>{tenantInvoices.length} invoices</p>
                            <AppleBtn variant="secondary" size="sm" onClick={generateInvoice}><FileText className="w-3.5 h-3.5" />Generate Invoice</AppleBtn>
                          </div>
                          {tenantInvoices.length === 0 && <EmptyState icon={<FileText />} label="No invoices yet" />}
                          {tenantInvoices.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between p-4 rounded-2xl"
                              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(0,0,0,0.06)' }}>
                              <div>
                                <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>{inv.invoiceNumber}</p>
                                <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>Due {new Date(inv.dueDate).toLocaleDateString()}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <p className="text-sm font-bold" style={{ color: '#1D1D1F' }}>£{inv.amount}</p>
                                <StatusPill status={inv.status} />
                                {inv.status !== 'PAID' && (
                                  <AppleBtn size="sm" variant="ghost" onClick={() => markPaid(inv.id)}>Mark Paid</AppleBtn>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Activity */}
                      {tenantTab === 'activity' && (
                        <div className="space-y-2">
                          {tenantActivity.length === 0 && <EmptyState icon={<Clock />} label="No activity yet" />}
                          {tenantActivity.map((log: any) => (
                            <div key={log.id} className="flex items-start gap-3 p-3.5 rounded-xl"
                              style={{ background: 'rgba(255,255,255,0.7)' }}>
                              <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#007AFF' }} />
                              <div className="flex-1">
                                <p className="text-sm font-medium" style={{ color: '#1D1D1F' }}>{log.action}</p>
                                {log.description && <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>{log.description}</p>}
                              </div>
                              <p className="text-[11px] flex-shrink-0" style={{ color: '#C7C7CC' }}>{new Date(log.createdAt).toLocaleString()}</p>
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
                          Core:     { bg: '#DBEAFE', text: '#1E40AF' },
                          Standard: { bg: '#D1FAE5', text: '#065F46' },
                          Premium:  { bg: '#EDE9FE', text: '#5B21B6' },
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
                                background: locked ? 'rgba(59,130,246,0.04)' : 'rgba(255,255,255,0.9)',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
                                cursor: locked ? 'default' : 'grab',
                                border: zone === 'core'
                                  ? '1px solid rgba(59,130,246,0.2)'
                                  : zone === 'enabled'
                                    ? '1px solid rgba(52,199,89,0.2)'
                                    : '1px solid rgba(0,0,0,0.06)',
                                opacity: locked ? 0.85 : 1,
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{ background: zone === 'available' ? '#C7C7CC' : '#34C759' }} />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold truncate" style={{ color: '#1D1D1F' }}>{f.featureName}</p>
                                  <p className="text-[11px] font-mono" style={{ color: '#8E8E93' }}>{f.featureKey}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                {locked && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#FEF3C7', color: '#92400E' }}>LOCKED</span>
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
                                <p className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
                                  Drag Standard & Premium features to enable or disable them.
                                </p>
                                <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>
                                  Core features are always active and cannot be disabled. Current plan: <strong>{tenantPlan}</strong>
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <AppleBtn variant="secondary" size="sm" onClick={() =>
                                  customerProfilesApi.getFeatures(selectedTenant!.id)
                                    .then(r => setTenantFeatures(r.data || []))
                                    .catch(() => toast.error('Failed to reload'))
                                }>
                                  <RefreshCw className="w-3.5 h-3.5" /> Reload
                                </AppleBtn>
                                <AppleBtn variant="primary" disabled={savingFeatures} onClick={saveFeatures}>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  {savingFeatures ? 'Saving…' : `Save & Activate (${enabledNonCore.length} add-ons)`}
                                </AppleBtn>
                              </div>
                            </div>

                            {tenantFeatures.length === 0
                              ? <div style={{ textAlign: 'center', padding: '2rem', color: '#8E8E93', fontSize: 14 }}>No features found — click Reload or check that features are seeded.</div>
                              : (
                                <div className="space-y-4">
                                  {/* Core Features — locked, always on */}
                                  <div className="rounded-2xl p-4 space-y-2"
                                    style={{ background: 'rgba(59,130,246,0.04)', border: '1.5px solid rgba(59,130,246,0.15)' }}>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                                      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#3B82F6' }}>
                                        Core — Always Active ({coreFeatures.length})
                                      </p>
                                      <span className="text-[10px] px-2 py-0.5 rounded-full ml-auto" style={{ background: '#DBEAFE', color: '#1E40AF' }}>
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
                                        background: 'rgba(52,199,89,0.05)',
                                        border: '2px dashed rgba(52,199,89,0.35)',
                                        transition: 'border-color 0.15s',
                                      }}
                                      onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#34C759'; }}
                                      onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,199,89,0.35)'; }}
                                      onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(52,199,89,0.35)'; handleDrop(true); }}
                                    >
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full" style={{ background: '#34C759' }} />
                                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#34C759' }}>
                                          Add-ons Active — {enabledNonCore.length}
                                        </p>
                                      </div>
                                      {enabledNonCore.length === 0 && (
                                        <p className="text-xs text-center py-8" style={{ color: 'rgba(52,199,89,0.5)' }}>
                                          Drop add-ons here to enable them
                                        </p>
                                      )}
                                      {enabledNonCore.map(f => <FeatureCard key={f.featureId} f={f} zone="enabled" />)}
                                    </div>

                                    {/* Disabled zone */}
                                    <div
                                      className="rounded-2xl p-4 space-y-2 min-h-[280px]"
                                      style={{
                                        background: 'rgba(120,120,128,0.05)',
                                        border: '2px dashed rgba(120,120,128,0.25)',
                                        transition: 'border-color 0.15s',
                                      }}
                                      onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = '#8E8E93'; }}
                                      onDragLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(120,120,128,0.25)'; }}
                                      onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(120,120,128,0.25)'; handleDrop(false); }}
                                    >
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="w-2 h-2 rounded-full" style={{ background: '#C7C7CC' }} />
                                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#8E8E93' }}>
                                          Add-ons Disabled — {disabledNonCore.length}
                                        </p>
                                      </div>
                                      {disabledNonCore.length === 0 && (
                                        <p className="text-xs text-center py-8" style={{ color: 'rgba(120,120,128,0.4)' }}>
                                          Drop add-ons here to disable them
                                        </p>
                                      )}
                                      {disabledNonCore.map(f => <FeatureCard key={f.featureId} f={f} zone="available" />)}
                                    </div>
                                  </div>

                                  {/* Plan legend */}
                                  <div className="flex items-center gap-4 text-[11px]" style={{ color: '#8E8E93' }}>
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ background: '#3B82F6' }} />
                                      Core — all plans
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
                                      Standard — Professional+
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full" style={{ background: '#8B5CF6' }} />
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
                        {tenants.slice(0, 6).map(t => (
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
                        ))}
                        {tenants.length === 0 && <p className="text-sm text-center py-5" style={{ color: '#8E8E93' }}>{loading ? 'Loading…' : 'No tenants yet'}</p>}
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
                        {filtTenants.map((t, idx) => (
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
                        {filtTenants.length === 0 && (
                          <tr><td colSpan={7}><div className="py-16"><EmptyState icon={<Building2 />} label={loading ? 'Loading…' : 'No tenants found'} /></div></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Features ─────────────────────────────────────────────── */}
              {activeView === 'features' && (
                <div className="space-y-4">
                  {filtFeatures.length === 0
                    ? <div className="rounded-2xl p-16" style={{ background: 'rgba(255,255,255,0.8)' }}><EmptyState icon={<Package />} label={loading ? 'Loading…' : 'No features — click Seed Defaults'} /></div>
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
                            {filtFeatures.map((f, idx) => (
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
                  {filtBugs.length === 0 && <div className="rounded-2xl p-16" style={{ background: 'rgba(255,255,255,0.8)' }}><EmptyState icon={<Bug />} label={loading ? 'Loading…' : 'No bug reports'} /></div>}
                  {filtBugs.map((bug, idx) => (
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
                  {filtRequests.length === 0 && <div className="rounded-2xl p-16" style={{ background: 'rgba(255,255,255,0.8)' }}><EmptyState icon={<Lightbulb />} label={loading ? 'Loading…' : 'No feature requests'} /></div>}
                  {filtRequests.map((req, idx) => (
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
                            {['SUBMITTED','UNDER_REVIEW','PLANNED','IN_PROGRESS','RELEASED','REJECTED'].map(s => (
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
            </select>
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

const Card: React.FC<{ children: React.ReactNode; gradient?: boolean }> = ({ children, gradient }) => (
  <div className="rounded-2xl p-5 space-y-3"
    style={{
      background: gradient ? 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' : 'rgba(255,255,255,0.8)',
      backdropFilter: 'blur(10px)',
      border: gradient ? 'none' : '1px solid rgba(255,255,255,0.6)',
      boxShadow: gradient ? '0 8px 24px rgba(0,122,255,0.3)' : '0 2px 8px rgba(0,0,0,0.06)',
    }}>
    {children}
  </div>
);

const CardTitle: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: light ? 'rgba(255,255,255,0.6)' : '#8E8E93' }}>{children}</p>
);

const InfoRow: React.FC<{ label: string; value: string; mono?: boolean; light?: boolean }> = ({ label, value, mono, light }) => (
  <div className="flex flex-col gap-0.5">
    <p className="text-[11px]" style={{ color: light ? 'rgba(255,255,255,0.5)' : '#8E8E93' }}>{label}</p>
    <p className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`} style={{ color: light ? '#fff' : '#1D1D1F' }}>{value}</p>
  </div>
);

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
