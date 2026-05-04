import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Users, UserCheck, UserX, Clock,
  AlertTriangle, Building2, Briefcase, MoreVertical, Eye,
  Edit, Trash2, RefreshCw, Download,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  hrmsService,
  Employee,
  EmployeeStatus,
  EmploymentType,
  HrmsStats,
  Department,
  CreateEmployeeData,
} from '../../services/hrmsService';

// ─── Status Helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<EmployeeStatus, string> = {
  PROBATION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  ON_LEAVE: 'bg-blue-100 text-blue-800 border-blue-200',
  SUSPENDED: 'bg-orange-100 text-orange-800 border-orange-200',
  TERMINATED: 'bg-red-100 text-red-800 border-red-200',
  INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200',
};

const TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full Time',
  PART_TIME: 'Part Time',
  ZERO_HOURS: 'Zero Hours',
  CASUAL: 'Casual',
  FIXED_TERM: 'Fixed Term',
  CONTRACTOR: 'Contractor',
  APPRENTICE: 'Apprentice',
  INTERN: 'Intern',
};

// ─── Add Employee Dialog ──────────────────────────────────────────────────────

const AddEmployeeDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onCreated: (emp: Employee) => void;
  departments: Department[];
}> = ({ open, onClose, onCreated, departments }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<CreateEmployeeData>>({
    country: 'GB',
    taxCode: '1257L',
  });

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.startDate) {
      toast.error('First name, last name and start date are required');
      return;
    }
    setSaving(true);
    try {
      const emp = await hrmsService.createEmployee(form as CreateEmployeeData);
      toast.success(`Employee ${emp.employeeNumber} created`);
      onCreated(emp);
      onClose();
      setForm({ country: 'GB', taxCode: '1257L' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create employee');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Employee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Personal */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Title</Label>
              <Select onValueChange={(v) => set('title', v)}>
                <SelectTrigger><SelectValue placeholder="Title" /></SelectTrigger>
                <SelectContent>
                  {['MR','MRS','MS','MISS','DR','PROF','OTHER'].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>First Name *</Label>
              <Input value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} required />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={form.lastName || ''} onChange={(e) => set('lastName', e.target.value)} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Work Email</Label>
              <Input type="email" value={form.workEmail || ''} onChange={(e) => set('workEmail', e.target.value)} />
            </div>
            <div>
              <Label>Personal Phone</Label>
              <Input value={form.personalPhone || ''} onChange={(e) => set('personalPhone', e.target.value)} />
            </div>
          </div>

          {/* Employment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date *</Label>
              <Input type="date" value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)} required />
            </div>
            <div>
              <Label>Job Title</Label>
              <Input value={form.jobTitle || ''} onChange={(e) => set('jobTitle', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Department</Label>
              <Select onValueChange={(v) => set('departmentId', v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select defaultValue="FULL_TIME" onValueChange={(v) => set('employmentType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Contract Type</Label>
              <Select defaultValue="PERMANENT" onValueChange={(v) => set('contractType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['PERMANENT','FIXED_TERM','CASUAL','AGENCY','SELF_EMPLOYED','ZERO_HOURS'].map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Pay Frequency</Label>
              <Select defaultValue="MONTHLY" onValueChange={(v) => set('payFrequency', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['WEEKLY','FORTNIGHTLY','FOUR_WEEKLY','MONTHLY'].map((f) => (
                    <SelectItem key={f} value={f}>{f.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payroll */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Annual Salary (£)</Label>
              <Input type="number" min="0" step="500" value={form.salary || ''} onChange={(e) => set('salary', Number(e.target.value))} />
            </div>
            <div>
              <Label>Hourly Rate (£)</Label>
              <Input type="number" min="0" step="0.01" value={form.hourlyRate || ''} onChange={(e) => set('hourlyRate', Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>NI Number</Label>
              <Input placeholder="AB 12 34 56 C" value={form.niNumber || ''} onChange={(e) => set('niNumber', e.target.value)} />
            </div>
            <div>
              <Label>Tax Code</Label>
              <Input value={form.taxCode || '1257L'} onChange={(e) => set('taxCode', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Starter Declaration</Label>
              <Select onValueChange={(v) => set('starterDeclaration', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A — First job since 6 April</SelectItem>
                  <SelectItem value="B">B — Another job / pension</SelectItem>
                  <SelectItem value="C">C — Student loan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Annual Leave (days)</Label>
              <Input type="number" min="0" max="365" value={form.annualLeaveEntitlement || 28} onChange={(e) => set('annualLeaveEntitlement', Number(e.target.value))} />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Address Line 1</Label>
              <Input value={form.addressLine1 || ''} onChange={(e) => set('addressLine1', e.target.value)} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Postcode</Label>
              <Input value={form.postcode || ''} onChange={(e) => set('postcode', e.target.value)} />
            </div>
            <div>
              <Label>Right to Work Checked</Label>
              <Select defaultValue="false" onValueChange={(v) => set('rightToWorkChecked', v === 'true')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">No</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create Employee'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<HrmsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | 'ALL'>('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [meta, setMeta] = useState({ total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [empResult, deptResult, statsResult] = await Promise.all([
        hrmsService.getEmployees({
          page,
          limit: 20,
          search: search || undefined,
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          departmentId: deptFilter !== 'ALL' ? deptFilter : undefined,
        }),
        hrmsService.getDepartments(),
        hrmsService.getStats(),
      ]);
      setEmployees(empResult.data);
      setMeta(empResult.meta);
      setDepartments(deptResult);
      setStats(statsResult);
    } catch (err: any) {
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, deptFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTerminate = async (emp: Employee) => {
    if (!confirm(`Terminate ${emp.fullName}? This will soft-delete the record.`)) return;
    try {
      await hrmsService.terminateEmployee(emp.id);
      toast.success(`${emp.fullName} terminated`);
      loadData();
    } catch {
      toast.error('Failed to terminate employee');
    }
  };

  return (
    <MainLayout pageTitle="HR Management">
      <div className="space-y-6 p-6">
        {/* HRMS Section Navigation */}
        <div className="flex items-center gap-1 border-b pb-3">
          <Button variant="default" size="sm" className="text-sm">
            Employees
          </Button>
          <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms/payroll')}>
            Payroll
          </Button>
          <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms/attendance')}>
            Time &amp; Attendance
          </Button>
          <Button variant="ghost" size="sm" className="text-sm" onClick={() => navigate('/hrms/reports')}>
            Reports
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Employees</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {stats?.total ?? 0} total · {stats?.byStatus?.ACTIVE ?? 0} active
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1" /> Add Employee
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <UserCheck className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.byStatus.ACTIVE ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Probation</p>
                  <p className="text-2xl font-bold">{stats.byStatus.PROBATION ?? 0}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Leave Pending</p>
                  <p className="text-2xl font-bold">{stats.pendingLeaveRequests}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, number, email..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as any); setPage(1); }}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {(['PROBATION','ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED','INACTIVE'] as EmployeeStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Loading employees...
              </div>
            ) : employees.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground">
                <Users className="h-10 w-10 opacity-30" />
                <p>No employees found</p>
                <Button size="sm" onClick={() => setShowAdd(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add First Employee
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Employee</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Dept / Role</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Type</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Start Date</th>
                      <th className="text-left px-4 py-3 font-medium hidden xl:table-cell">Salary</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{emp.fullName}</p>
                            <p className="text-xs text-muted-foreground">{emp.employeeNumber}</p>
                            {emp.workEmail && (
                              <p className="text-xs text-muted-foreground hidden sm:block">{emp.workEmail}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div>
                            {emp.departmentName && (
                              <p className="text-xs flex items-center gap-1">
                                <Building2 className="h-3 w-3" /> {emp.departmentName}
                              </p>
                            )}
                            {emp.jobTitle && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Briefcase className="h-3 w-3" /> {emp.jobTitle}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className="text-xs">{TYPE_LABELS[emp.employmentType] ?? emp.employmentType}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs border ${STATUS_COLORS[emp.status] ?? ''}`}>
                            {emp.status.replace(/_/g, ' ')}
                          </Badge>
                          {emp.pensionEnrolled && (
                            <Badge variant="outline" className="ml-1 text-xs">Pension</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">
                          {emp.startDate ? new Date(emp.startDate).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell text-xs">
                          {emp.salary ? `£${emp.salary.toLocaleString()}` : emp.hourlyRate ? `£${emp.hourlyRate}/hr` : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/hrms/employees/${emp.id}`)}>
                                <Eye className="h-4 w-4 mr-2" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/hrms/employees/${emp.id}?edit=true`)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              {emp.status !== 'TERMINATED' && (
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleTerminate(emp)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Terminate
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  Page {meta.page} of {meta.totalPages} · {meta.total} employees
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AddEmployeeDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(emp) => { setEmployees((prev) => [emp, ...prev]); }}
        departments={departments}
      />
    </MainLayout>
  );
};

export default EmployeesPage;
