import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Zap,
  Bug,
  Map,
  Users,
  ChevronRight,
  Plus,
  X,
  Flame,
  ArrowRight,
  RefreshCw,
  Server,
  Code2,
  Shield,
  Cpu,
  Wrench,
  FlaskConical,
  GitBranch,
} from "lucide-react";
import { Toaster, toast } from "sonner";
import {
  featuresApi,
  bugReportsApi,
  roadmapApi,
  adminsApi,
} from "../services/api";

// ─── Types ───────────────────────────────────────────────────────────────────
type LifecycleStatus = "ALPHA" | "BETA" | "STABLE" | "DEPRECATED" | "DISABLED";
type RoadmapStatus = "BACKLOG" | "IN_DEV" | "ALPHA" | "BETA" | "SHIPPED";
type BugPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type BugStatus = "OPEN" | "IN_PROGRESS" | "TESTING" | "RESOLVED" | "CLOSED";
type InternalRole =
  | "SOFTWARE_DEVELOPER"
  | "RND"
  | "DEVOPS"
  | "SUPPORT"
  | "CYBER_SECURITY"
  | "SYSTEM_ARCHITECT"
  | "SERVER_ADMIN";

interface Feature {
  id: string;
  featureKey: string;
  featureName: string;
  description?: string;
  category: string;
  status: LifecycleStatus;
  currentVersion: string;
  isIncludedInBase: boolean;
  _count?: { customerFeatures: number; versions: number };
}
interface BugReport {
  id: string;
  title: string;
  description: string;
  priority: BugPriority;
  status: BugStatus;
  featureKey?: string;
  assignedTo?: string;
  reportedAt: string;
  updatedAt: string;
  customerProfile?: { businessName: string };
}
interface RoadmapItem {
  id: string;
  title: string;
  description?: string;
  featureKey?: string;
  status: RoadmapStatus;
  priority: BugPriority;
  assignedTo?: string;
  targetVersion?: string;
  dueDate?: string;
  createdAt: string;
}
interface Admin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: InternalRole;
  isActive: boolean;
  lastLoginAt?: string;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const spring = { type: "spring", damping: 26, stiffness: 280 } as const;

// ─── Pill helpers ─────────────────────────────────────────────────────────────
const LIFECYCLE_META: Record<
  string,
  { label: string; bg: string; text: string; ring: string }
> = {
  ALPHA: { label: "Alpha", bg: "#EEF2FF", text: "#3730A3", ring: "#6366F1" },
  BETA: { label: "Beta", bg: "#FEF3C7", text: "#92400E", ring: "#F59E0B" },
  STABLE: { label: "Stable", bg: "#D1FAE5", text: "#065F46", ring: "#34C759" },
  DEPRECATED: {
    label: "Deprecated",
    bg: "#F3F4F6",
    text: "#374151",
    ring: "#9CA3AF",
  },
  DISABLED: {
    label: "Disabled",
    bg: "#FEE2E2",
    text: "#991B1B",
    ring: "#EF4444",
  },
};

const PRIORITY_META: Record<
  string,
  { label: string; bg: string; text: string }
> = {
  CRITICAL: { label: "P0 Critical", bg: "#FEE2E2", text: "#991B1B" },
  HIGH: { label: "P1 High", bg: "#FFEDD5", text: "#9A3412" },
  MEDIUM: { label: "P2 Medium", bg: "#DBEAFE", text: "#1E40AF" },
  LOW: { label: "P3 Low", bg: "#F3F4F6", text: "#374151" },
};

const ROLE_META: Record<
  string,
  { label: string; icon: React.FC<any>; color: string }
> = {
  SOFTWARE_DEVELOPER: { label: "Software Dev", icon: Code2, color: "#007AFF" },
  RND: { label: "R&D", icon: FlaskConical, color: "#AF52DE" },
  DEVOPS: { label: "DevOps", icon: Cpu, color: "#34C759" },
  SUPPORT: { label: "Support", icon: Wrench, color: "#FF9F0A" },
  CYBER_SECURITY: { label: "Cyber Security", icon: Shield, color: "#FF3B30" },
  SYSTEM_ARCHITECT: {
    label: "Sys Architect",
    icon: GitBranch,
    color: "#5856D6",
  },
  SERVER_ADMIN: { label: "Server Admin", icon: Server, color: "#636366" },
};

const LifecyclePill: React.FC<{ status: string }> = ({ status }) => {
  const m = LIFECYCLE_META[status] || LIFECYCLE_META.DISABLED;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: m.bg, color: m.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: m.ring }}
      />
      {m.label}
    </span>
  );
};

const PriorityPill: React.FC<{ priority: string }> = ({ priority }) => {
  const m = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
  return (
    <span
      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{ background: m.bg, color: m.text }}
    >
      {m.label}
    </span>
  );
};

// ─── Apple-style button ───────────────────────────────────────────────────────
const Btn: React.FC<{
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({
  onClick,
  variant = "secondary",
  size = "md",
  disabled,
  className = "",
  children,
}) => {
  const v = {
    primary: { bg: "#007AFF", text: "#fff" },
    secondary: { bg: "rgba(120,120,128,0.12)", text: "#1D1D1F" },
    danger: { bg: "#FF3B30", text: "#fff" },
    ghost: { bg: "transparent", text: "#007AFF" },
  }[variant];
  const s = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      onClick={onClick}
      disabled={disabled}
      className={`${s} rounded-xl font-medium inline-flex items-center gap-2 ${className}`}
      style={{ background: v.bg, color: v.text, opacity: disabled ? 0.5 : 1 }}
    >
      {children}
    </motion.button>
  );
};

const AppleInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = "",
  ...props
}) => (
  <input
    {...props}
    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none ${className}`}
    style={{
      background: "rgba(118,118,128,0.08)",
      color: "#1D1D1F",
      border: "1.5px solid transparent",
    }}
  />
);

const AppleSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({
  className = "",
  ...props
}) => (
  <select
    {...props}
    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none ${className}`}
    style={{
      background: "rgba(118,118,128,0.08)",
      color: "#1D1D1F",
      border: "1.5px solid transparent",
    }}
  />
);

const AppleTextarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
> = ({ className = "", ...props }) => (
  <textarea
    {...props}
    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none ${className}`}
    style={{
      background: "rgba(118,118,128,0.08)",
      color: "#1D1D1F",
      border: "1.5px solid transparent",
    }}
  />
);

// ─── Side Panel ───────────────────────────────────────────────────────────────
const SidePanel: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ open, onClose, title, subtitle, children, footer }) => (
  <AnimatePresence>
    {open && (
      <>
        <motion.div
          key="bd"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
        />
        <motion.div
          key="panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={spring}
          className="fixed right-0 top-0 h-full w-[480px] z-50 flex flex-col"
          style={{
            background: "rgba(255,255,255,0.94)",
            backdropFilter: "saturate(180%) blur(40px)",
            boxShadow: "-16px 0 48px rgba(0,0,0,0.12)",
          }}
        >
          <div className="flex items-start justify-between px-6 py-5 border-b border-black/5">
            <div>
              <h2
                className="text-lg font-semibold"
                style={{ color: "#1D1D1F" }}
              >
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm mt-0.5" style={{ color: "#6E6E73" }}>
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#E5E5EA" }}
            >
              <X className="w-4 h-4" style={{ color: "#3C3C43" }} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 border-t border-black/5">{footer}</div>
          )}
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

const Field: React.FC<{
  label: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, required, children }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-medium" style={{ color: "#1D1D1F" }}>
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 1: Feature Lifecycle
// ═══════════════════════════════════════════════════════════════════════════════
const FeatureLifecycleTab: React.FC<{
  features: Feature[];
  onRefresh: () => void;
}> = ({ features, onRefresh }) => {
  const [filter, setFilter] = useState<"ALL" | LifecycleStatus>("ALL");
  const [promoting, setPromoting] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [panel, setPanel] = useState(false);
  const [form, setForm] = useState({
    featureKey: "",
    featureName: "",
    description: "",
    category: "core",
  });

  const PROMOTE_NEXT: Record<string, string> = {
    ALPHA: "Beta",
    BETA: "Stable",
    STABLE: "Deprecated",
  };
  const STATUSES: Array<"ALL" | LifecycleStatus> = [
    "ALL",
    "ALPHA",
    "BETA",
    "STABLE",
    "DEPRECATED",
    "DISABLED",
  ];

  const visible =
    filter === "ALL" ? features : features.filter((f) => f.status === filter);

  const promote = async (id: string) => {
    setPromoting(id);
    try {
      await featuresApi.promote(id);
      toast.success("Feature promoted");
      onRefresh();
    } catch {
      toast.error("Promotion failed");
    } finally {
      setPromoting(null);
      setConfirmId(null);
    }
  };

  const createFeature = async () => {
    if (!form.featureKey || !form.featureName)
      return toast.error("Key and name are required");
    setCreating(true);
    try {
      await featuresApi.create(form);
      toast.success("Feature created in ALPHA");
      setPanel(false);
      setForm({
        featureKey: "",
        featureName: "",
        description: "",
        category: "core",
      });
      onRefresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    } finally {
      setCreating(false);
    }
  };

  const statusCounts = features.reduce<Record<string, number>>((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-5 gap-3">
        {(["ALPHA", "BETA", "STABLE", "DEPRECATED", "DISABLED"] as const).map(
          (s) => {
            const m = LIFECYCLE_META[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(s === filter ? "ALL" : s)}
                className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02]"
                style={{
                  background: filter === s ? m.bg : "rgba(255,255,255,0.7)",
                  border: `1px solid ${filter === s ? m.ring + "44" : "rgba(255,255,255,0.6)"}`,
                }}
              >
                <div
                  className="text-xl font-bold mb-1"
                  style={{ color: m.text }}
                >
                  {statusCounts[s] || 0}
                </div>
                <div className="text-xs font-medium" style={{ color: m.ring }}>
                  {m.label}
                </div>
              </button>
            );
          },
        )}
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="text-xs px-3 py-1.5 rounded-full font-medium transition-all"
              style={{
                background: filter === s ? "#007AFF" : "rgba(120,120,128,0.1)",
                color: filter === s ? "#fff" : "#3C3C43",
              }}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <Btn variant="primary" size="sm" onClick={() => setPanel(true)}>
          <Plus className="w-3.5 h-3.5" /> New Feature
        </Btn>
      </div>

      {/* Feature table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.8)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              {[
                "Feature",
                "Key",
                "Category",
                "Version",
                "Tenants",
                "Status",
                "Promote",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6E6E73" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "#8E8E93" }}
                >
                  No features match this filter
                </td>
              </tr>
            )}
            {visible.map((f) => (
              <tr
                key={f.id}
                style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
              >
                <td
                  className="px-4 py-3 font-medium"
                  style={{ color: "#1D1D1F" }}
                >
                  {f.featureName}
                </td>
                <td
                  className="px-4 py-3 font-mono text-xs"
                  style={{ color: "#8E8E93" }}
                >
                  {f.featureKey}
                </td>
                <td
                  className="px-4 py-3 text-xs capitalize"
                  style={{ color: "#6E6E73" }}
                >
                  {f.category}
                </td>
                <td
                  className="px-4 py-3 text-xs font-mono"
                  style={{ color: "#8E8E93" }}
                >
                  {f.currentVersion}
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#6E6E73" }}>
                  {f._count?.customerFeatures ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <LifecyclePill status={f.status} />
                </td>
                <td className="px-4 py-3">
                  {PROMOTE_NEXT[f.status] ? (
                    confirmId === f.id ? (
                      <div className="flex gap-2">
                        <Btn
                          size="sm"
                          variant="primary"
                          disabled={promoting === f.id}
                          onClick={() => promote(f.id)}
                        >
                          {promoting === f.id
                            ? "Promoting…"
                            : `→ ${PROMOTE_NEXT[f.status]}`}
                        </Btn>
                        <Btn size="sm" onClick={() => setConfirmId(null)}>
                          Cancel
                        </Btn>
                      </div>
                    ) : (
                      <Btn size="sm" onClick={() => setConfirmId(f.id)}>
                        Promote <ChevronRight className="w-3.5 h-3.5" />
                      </Btn>
                    )
                  ) : (
                    <span className="text-xs" style={{ color: "#C7C7CC" }}>
                      —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create panel */}
      <SidePanel
        open={panel}
        onClose={() => setPanel(false)}
        title="New Feature"
        subtitle="Starts in ALPHA — invisible to clients until promoted"
        footer={
          <div className="flex gap-3">
            <Btn variant="primary" disabled={creating} onClick={createFeature}>
              {creating ? "Creating…" : "Create Feature"}
            </Btn>
            <Btn onClick={() => setPanel(false)}>Cancel</Btn>
          </div>
        }
      >
        <Field label="Feature Key" required>
          <AppleInput
            value={form.featureKey}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                featureKey: e.target.value.toLowerCase().replace(/\s/g, "_"),
              }))
            }
            placeholder="e.g. hr_analytics"
          />
        </Field>
        <Field label="Feature Name" required>
          <AppleInput
            value={form.featureName}
            onChange={(e) =>
              setForm((p) => ({ ...p, featureName: e.target.value }))
            }
            placeholder="e.g. HR Analytics"
          />
        </Field>
        <Field label="Category">
          <AppleSelect
            value={form.category}
            onChange={(e) =>
              setForm((p) => ({ ...p, category: e.target.value }))
            }
          >
            {[
              "core",
              "operations",
              "finance",
              "analytics",
              "tools",
              "ai",
              "integrations",
              "hr",
            ].map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </AppleSelect>
        </Field>
        <Field label="Description">
          <AppleTextarea
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="What does this feature do?"
          />
        </Field>
      </SidePanel>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 2: Bug Channel
// ═══════════════════════════════════════════════════════════════════════════════
const BugChannelTab: React.FC<{
  bugs: BugReport[];
  admins: Admin[];
  onRefresh: () => void;
}> = ({ bugs, admins, onRefresh }) => {
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | BugPriority>(
    "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<"ALL" | BugStatus>("ALL");
  const [selected, setSelected] = useState<BugReport | null>(null);
  const [updating, setUpdating] = useState(false);
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});

  const visible = bugs.filter(
    (b) =>
      (priorityFilter === "ALL" || b.priority === priorityFilter) &&
      (statusFilter === "ALL" || b.status === statusFilter),
  );

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      await bugReportsApi.updateStatus(id, status);
      toast.success(`Status → ${status}`);
      onRefresh();
      if (selected?.id === id)
        setSelected((prev) =>
          prev ? { ...prev, status: status as BugStatus } : null,
        );
    } catch {
      toast.error("Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const assignBug = async (id: string, adminId: string) => {
    const admin = admins.find((a) => a.id === adminId);
    const name = admin ? `${admin.firstName} ${admin.lastName}` : "";
    try {
      await bugReportsApi.update(id, { assignedTo: name });
      setAssignMap((p) => ({ ...p, [id]: adminId }));
      toast.success(`Assigned to ${name}`);
      onRefresh();
    } catch {
      toast.error("Assignment failed");
    }
  };

  const NEXT_STATUS: Record<string, string> = {
    OPEN: "IN_PROGRESS",
    IN_PROGRESS: "TESTING",
    TESTING: "RESOLVED",
    RESOLVED: "CLOSED",
  };
  const STATUS_COLOR: Record<string, string> = {
    OPEN: "#FF3B30",
    IN_PROGRESS: "#AF52DE",
    TESTING: "#FF9F0A",
    RESOLVED: "#34C759",
    CLOSED: "#8E8E93",
  };

  const priorityCounts = bugs.reduce<Record<string, number>>((a, b) => {
    a[b.priority] = (a[b.priority] || 0) + 1;
    return a;
  }, {});

  return (
    <div className="space-y-5">
      {/* Priority stat cards */}
      <div className="grid grid-cols-4 gap-3">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((p) => {
          const m = PRIORITY_META[p];
          return (
            <button
              key={p}
              onClick={() =>
                setPriorityFilter(p === priorityFilter ? "ALL" : p)
              }
              className="rounded-2xl p-4 text-left transition-all hover:scale-[1.02]"
              style={{
                background:
                  priorityFilter === p ? m.bg : "rgba(255,255,255,0.7)",
                border: `1px solid rgba(255,255,255,0.6)`,
              }}
            >
              <div className="text-xl font-bold mb-1" style={{ color: m.text }}>
                {priorityCounts[p] || 0}
              </div>
              <div className="text-xs font-medium" style={{ color: m.text }}>
                {m.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {(
            [
              "ALL",
              "OPEN",
              "IN_PROGRESS",
              "TESTING",
              "RESOLVED",
              "CLOSED",
            ] as const
          ).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s as any)}
              className="text-xs px-3 py-1.5 rounded-full font-medium"
              style={{
                background:
                  statusFilter === s ? "#007AFF" : "rgba(120,120,128,0.1)",
                color: statusFilter === s ? "#fff" : "#3C3C43",
              }}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Bug table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.8)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              {[
                "Priority",
                "Title",
                "Feature",
                "Status",
                "Assigned To",
                "Reported",
                "Action",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6E6E73" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "#8E8E93" }}
                >
                  No bugs match this filter
                </td>
              </tr>
            )}
            {visible.map((b) => (
              <tr
                key={b.id}
                style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
              >
                <td className="px-4 py-3">
                  <PriorityPill priority={b.priority} />
                </td>
                <td className="px-4 py-3 max-w-[200px]">
                  <div
                    className="font-medium truncate"
                    style={{ color: "#1D1D1F" }}
                  >
                    {b.title}
                  </div>
                  {b.customerProfile && (
                    <div
                      className="text-xs truncate"
                      style={{ color: "#8E8E93" }}
                    >
                      {b.customerProfile.businessName}
                    </div>
                  )}
                </td>
                <td
                  className="px-4 py-3 font-mono text-xs"
                  style={{ color: "#8E8E93" }}
                >
                  {b.featureKey || "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: `${STATUS_COLOR[b.status]}18`,
                      color: STATUS_COLOR[b.status],
                    }}
                  >
                    {b.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    className="text-xs rounded-lg px-2 py-1 outline-none"
                    style={{
                      background: "rgba(118,118,128,0.08)",
                      color: "#1D1D1F",
                    }}
                    value={assignMap[b.id] || ""}
                    onChange={(e) => assignBug(b.id, e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {admins.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.firstName} {a.lastName}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#8E8E93" }}>
                  {new Date(b.reportedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {NEXT_STATUS[b.status] && (
                    <Btn
                      size="sm"
                      disabled={updating}
                      onClick={() => updateStatus(b.id, NEXT_STATUS[b.status])}
                    >
                      → {NEXT_STATUS[b.status].replace("_", " ")}
                    </Btn>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bug detail panel */}
      <SidePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || ""}
        subtitle={`${selected?.priority} · ${selected?.status}`}
      >
        {selected && (
          <div className="space-y-4">
            <div>
              <p
                className="text-xs font-medium mb-1"
                style={{ color: "#8E8E93" }}
              >
                Description
              </p>
              <p className="text-sm" style={{ color: "#1D1D1F" }}>
                {selected.description}
              </p>
            </div>
            <div className="flex gap-3">
              <PriorityPill priority={selected.priority} />
            </div>
          </div>
        )}
      </SidePanel>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 3: Roadmap Kanban
// ═══════════════════════════════════════════════════════════════════════════════
const KANBAN_COLS: Array<{ id: RoadmapStatus; label: string; color: string }> =
  [
    { id: "BACKLOG", label: "Backlog", color: "#8E8E93" },
    { id: "IN_DEV", label: "In Dev", color: "#007AFF" },
    { id: "ALPHA", label: "Alpha", color: "#5856D6" },
    { id: "BETA", label: "Beta", color: "#FF9F0A" },
    { id: "SHIPPED", label: "Shipped", color: "#34C759" },
  ];

const RoadmapTab: React.FC<{
  items: RoadmapItem[];
  admins: Admin[];
  onRefresh: () => void;
}> = ({ items, admins, onRefresh }) => {
  const [panel, setPanel] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<RoadmapItem | null>(null);
  const [saving, setSaving] = useState(false);
  const emptyForm = {
    title: "",
    description: "",
    featureKey: "",
    status: "BACKLOG" as RoadmapStatus,
    priority: "MEDIUM" as BugPriority,
    assignedTo: "",
    targetVersion: "",
  };
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setForm(emptyForm);
    setPanel("create");
  };
  const openEdit = (item: RoadmapItem) => {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description || "",
      featureKey: item.featureKey || "",
      status: item.status,
      priority: item.priority,
      assignedTo: item.assignedTo || "",
      targetVersion: item.targetVersion || "",
    });
    setPanel("edit");
  };

  const save = async () => {
    if (!form.title) return toast.error("Title is required");
    setSaving(true);
    try {
      if (panel === "create") {
        await roadmapApi.create(form);
        toast.success("Item added to roadmap");
      } else if (editing) {
        await roadmapApi.update(editing.id, form);
        toast.success("Item updated");
      }
      setPanel(null);
      onRefresh();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const move = async (item: RoadmapItem, direction: 1 | -1) => {
    const idx = KANBAN_COLS.findIndex((c) => c.id === item.status);
    const next = KANBAN_COLS[idx + direction];
    if (!next) return;
    try {
      await roadmapApi.update(item.id, { ...item, status: next.id });
      toast.success(`Moved to ${next.label}`);
      onRefresh();
    } catch {
      toast.error("Move failed");
    }
  };

  const del = async (id: string) => {
    try {
      await roadmapApi.delete(id);
      toast.success("Item removed");
      onRefresh();
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Btn variant="primary" size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" /> Add Item
        </Btn>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-5 gap-3 items-start">
        {KANBAN_COLS.map((col) => {
          const colItems = items.filter((i) => i.status === col.id);
          return (
            <div
              key={col.id}
              className="rounded-2xl p-3 space-y-2 min-h-[200px]"
              style={{
                background: "rgba(255,255,255,0.6)",
                border: "1px solid rgba(255,255,255,0.7)",
              }}
            >
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: col.color }}
                  />
                  <span
                    className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: col.color }}
                  >
                    {col.label}
                  </span>
                </div>
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: `${col.color}18`, color: col.color }}
                >
                  {colItems.length}
                </span>
              </div>

              {/* Cards */}
              {colItems.map((item) => {
                const colIdx = KANBAN_COLS.findIndex(
                  (c) => c.id === item.status,
                );
                return (
                  <motion.div
                    key={item.id}
                    layout
                    whileHover={{ y: -1 }}
                    className="rounded-xl p-3 cursor-pointer group"
                    style={{
                      background: "rgba(255,255,255,0.9)",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                      border: "1px solid rgba(0,0,0,0.04)",
                    }}
                    onClick={() => openEdit(item)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p
                        className="text-xs font-semibold leading-tight flex-1"
                        style={{ color: "#1D1D1F" }}
                      >
                        {item.title}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          del(item.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                      >
                        <X className="w-3 h-3" style={{ color: "#FF3B30" }} />
                      </button>
                    </div>
                    {item.featureKey && (
                      <span
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: "#EEF2FF", color: "#3730A3" }}
                      >
                        {item.featureKey}
                      </span>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <PriorityPill priority={item.priority} />
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {colIdx > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              move(item, -1);
                            }}
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-black/5"
                          >
                            <ArrowLeft
                              className="w-3 h-3"
                              style={{ color: "#8E8E93" }}
                            />
                          </button>
                        )}
                        {colIdx < KANBAN_COLS.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              move(item, 1);
                            }}
                            className="w-5 h-5 rounded flex items-center justify-center hover:bg-black/5"
                          >
                            <ArrowRight
                              className="w-3 h-3"
                              style={{ color: "#8E8E93" }}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Create / Edit panel */}
      <SidePanel
        open={!!panel}
        onClose={() => setPanel(null)}
        title={panel === "create" ? "New Roadmap Item" : "Edit Item"}
        footer={
          <div className="flex gap-3">
            <Btn variant="primary" disabled={saving} onClick={save}>
              {saving ? "Saving…" : "Save"}
            </Btn>
            <Btn onClick={() => setPanel(null)}>Cancel</Btn>
          </div>
        }
      >
        <Field label="Title" required>
          <AppleInput
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="What are we building?"
          />
        </Field>
        <Field label="Description">
          <AppleTextarea
            rows={3}
            value={form.description}
            onChange={(e) =>
              setForm((p) => ({ ...p, description: e.target.value }))
            }
            placeholder="Brief summary…"
          />
        </Field>
        <Field label="Feature Key">
          <AppleInput
            value={form.featureKey}
            onChange={(e) =>
              setForm((p) => ({ ...p, featureKey: e.target.value }))
            }
            placeholder="e.g. hr_analytics"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <AppleSelect
              value={form.status}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  status: e.target.value as RoadmapStatus,
                }))
              }
            >
              {KANBAN_COLS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </AppleSelect>
          </Field>
          <Field label="Priority">
            <AppleSelect
              value={form.priority}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  priority: e.target.value as BugPriority,
                }))
              }
            >
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_META[p].label}
                </option>
              ))}
            </AppleSelect>
          </Field>
        </div>
        <Field label="Assigned To">
          <AppleSelect
            value={form.assignedTo}
            onChange={(e) =>
              setForm((p) => ({ ...p, assignedTo: e.target.value }))
            }
          >
            <option value="">Unassigned</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </AppleSelect>
        </Field>
        <Field label="Target Version">
          <AppleInput
            value={form.targetVersion}
            onChange={(e) =>
              setForm((p) => ({ ...p, targetVersion: e.target.value }))
            }
            placeholder="e.g. 2.5.0"
          />
        </Field>
      </SidePanel>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Tab 4: Team
// ═══════════════════════════════════════════════════════════════════════════════
const TeamTab: React.FC<{ admins: Admin[]; onRefresh: () => void }> = ({
  admins,
  onRefresh,
}) => {
  const [panel, setPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "SOFTWARE_DEVELOPER" as InternalRole,
  });

  const createAdmin = async () => {
    if (!form.firstName || !form.email || !form.password)
      return toast.error("Name, email and password are required");
    setSaving(true);
    try {
      await adminsApi.create(form);
      toast.success("Team member created");
      setPanel(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "SOFTWARE_DEVELOPER",
      });
      onRefresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Create failed");
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (id: string, role: string) => {
    try {
      await adminsApi.update(id, { role });
      toast.success("Role updated");
      onRefresh();
    } catch {
      toast.error("Update failed");
    }
  };

  const ROLES = Object.keys(ROLE_META) as InternalRole[];

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Btn variant="primary" size="sm" onClick={() => setPanel(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Member
        </Btn>
      </div>

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.8)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
              {["Member", "Email", "Role", "Status", "Last Login"].map((h) => (
                <th
                  key={h}
                  className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "#6E6E73" }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map((a) => (
              <tr
                key={a.id}
                style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}
              >
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{
                        background:
                          "linear-gradient(135deg, #007AFF 0%, #5856D6 100%)",
                      }}
                    >
                      {a.firstName[0]}
                      {a.lastName[0]}
                    </div>
                    <div>
                      <div className="font-medium" style={{ color: "#1D1D1F" }}>
                        {a.firstName} {a.lastName}
                      </div>
                    </div>
                  </div>
                </td>
                <td
                  className="px-5 py-3.5 text-sm"
                  style={{ color: "#6E6E73" }}
                >
                  {a.email}
                </td>
                <td className="px-5 py-3.5">
                  <select
                    className="text-xs rounded-lg px-2 py-1 outline-none"
                    style={{
                      background: "rgba(118,118,128,0.08)",
                      color: "#1D1D1F",
                    }}
                    value={a.role}
                    onChange={(e) => updateRole(a.id, e.target.value)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_META[r].label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{
                      background: a.isActive ? "#D1FAE5" : "#F3F4F6",
                      color: a.isActive ? "#065F46" : "#374151",
                    }}
                  >
                    {a.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td
                  className="px-5 py-3.5 text-xs"
                  style={{ color: "#8E8E93" }}
                >
                  {a.lastLoginAt
                    ? new Date(a.lastLoginAt).toLocaleDateString()
                    : "Never"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SidePanel
        open={panel}
        onClose={() => setPanel(false)}
        title="Add Team Member"
        footer={
          <div className="flex gap-3">
            <Btn variant="primary" disabled={saving} onClick={createAdmin}>
              {saving ? "Creating…" : "Create"}
            </Btn>
            <Btn onClick={() => setPanel(false)}>Cancel</Btn>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name" required>
            <AppleInput
              value={form.firstName}
              onChange={(e) =>
                setForm((p) => ({ ...p, firstName: e.target.value }))
              }
            />
          </Field>
          <Field label="Last Name">
            <AppleInput
              value={form.lastName}
              onChange={(e) =>
                setForm((p) => ({ ...p, lastName: e.target.value }))
              }
            />
          </Field>
        </div>
        <Field label="Email" required>
          <AppleInput
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          />
        </Field>
        <Field label="Password" required>
          <AppleInput
            type="password"
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
          />
        </Field>
        <Field label="Role">
          <AppleSelect
            value={form.role}
            onChange={(e) =>
              setForm((p) => ({ ...p, role: e.target.value as InternalRole }))
            }
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_META[r].label}
              </option>
            ))}
          </AppleSelect>
        </Field>
      </SidePanel>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main DevPortalPage
// ═══════════════════════════════════════════════════════════════════════════════
type Tab = "lifecycle" | "bugs" | "roadmap" | "team";

const TAB_CONFIG: Array<{ id: Tab; label: string; icon: React.FC<any> }> = [
  { id: "lifecycle", label: "Feature Lifecycle", icon: Zap },
  { id: "bugs", label: "Bug Channel", icon: Bug },
  { id: "roadmap", label: "Roadmap", icon: Map },
  { id: "team", label: "Team", icon: Users },
];

const DevPortalPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("lifecycle");
  const [loading, setLoading] = useState(true);

  const [features, setFeatures] = useState<Feature[]>([]);
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [fr, br, rr, ar] = await Promise.all([
        featuresApi.getAll().then((r) => (Array.isArray(r.data) ? r.data : [])),
        bugReportsApi.getAll().then((r) => r.data.data || r.data || []),
        roadmapApi.getAll().then((r) => (Array.isArray(r.data) ? r.data : [])),
        adminsApi.getAll().then((r) => (Array.isArray(r.data) ? r.data : [])),
      ]);
      setFeatures(fr);
      setBugs(Array.isArray(br) ? br : []);
      setRoadmap(rr);
      setAdmins(ar);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const openBugs = bugs.filter((b) => b.status === "OPEN").length;
  const critBugs = bugs.filter((b) => b.priority === "CRITICAL").length;
  const alphaFeatures = features.filter((f) => f.status === "ALPHA").length;

  return (
    <div
      className="min-h-screen"
      style={{
        background: "#F2F2F7",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      <Toaster
        position="top-center"
        toastOptions={{ style: { borderRadius: 14, fontFamily: "inherit" } }}
      />

      {/* Header */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-70"
            style={{ color: "#007AFF" }}
          >
            <ArrowLeft className="w-4 h-4" /> Mainframe
          </button>
          <span style={{ color: "#C7C7CC" }}>/</span>
          <span className="text-sm font-medium" style={{ color: "#1D1D1F" }}>
            Developer Portal
          </span>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "#1D1D1F" }}
            >
              Developer Portal
            </h1>
            <p className="text-sm mt-1" style={{ color: "#6E6E73" }}>
              Feature lifecycle, bug channel, roadmap & team management
            </p>
          </div>
          <button
            onClick={loadAll}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5"
            title="Refresh"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              style={{ color: "#8E8E93" }}
            />
          </button>
        </div>

        {/* Summary chips */}
        {!loading && (
          <div className="flex gap-3 mt-4">
            {critBugs > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "#FEE2E2", color: "#991B1B" }}
              >
                <Flame className="w-3.5 h-3.5" /> {critBugs} Critical Bug
                {critBugs !== 1 ? "s" : ""}
              </div>
            )}
            {openBugs > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "#DBEAFE", color: "#1E40AF" }}
              >
                <Bug className="w-3.5 h-3.5" /> {openBugs} Open
              </div>
            )}
            {alphaFeatures > 0 && (
              <div
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: "#EEF2FF", color: "#3730A3" }}
              >
                <FlaskConical className="w-3.5 h-3.5" /> {alphaFeatures} in
                Alpha
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="px-8">
        <div
          className="flex gap-1 p-1 rounded-2xl w-fit"
          style={{ background: "rgba(120,120,128,0.12)" }}
        >
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === id ? "#fff" : "transparent",
                color: tab === id ? "#1D1D1F" : "#6E6E73",
                boxShadow: tab === id ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw
              className="w-8 h-8 animate-spin"
              style={{ color: "#C7C7CC" }}
            />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {tab === "lifecycle" && (
                <FeatureLifecycleTab features={features} onRefresh={loadAll} />
              )}
              {tab === "bugs" && (
                <BugChannelTab
                  bugs={bugs}
                  admins={admins}
                  onRefresh={loadAll}
                />
              )}
              {tab === "roadmap" && (
                <RoadmapTab
                  items={roadmap}
                  admins={admins}
                  onRefresh={loadAll}
                />
              )}
              {tab === "team" && (
                <TeamTab admins={admins} onRefresh={loadAll} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default DevPortalPage;
