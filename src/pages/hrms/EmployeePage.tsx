import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Edit, Save, X, User, Briefcase, CreditCard,
  MapPin, Phone, Mail, Shield, Calendar, Building2, AlertTriangle,
  Plus, CheckCircle, XCircle, Clock,
} from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  hrmsService, Employee, LeaveRequest, LeaveType, LeaveStatus,
  Department, Position,
} from '../../services/hrmsService';

// ─── Leave Request Dialog ─────────────────────────────────────────────────────

const LeaveDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  employeeId: string;
  onCreated: (lr: LeaveRequest) => void;
}> = ({ open, onClose, employeeId, onCreated }) => {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ leaveType: 'ANNUAL' as LeaveType, startDate: '', endDate: '', notes: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate) { toast.error('Dates required'); return; }
    setSaving(true);
    try {
      const lr = await hrmsService.createLeaveRequest(employeeId, form);
      toast.success('Leave request submitted');
      onCreated(lr);
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Submit Leave Request</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Leave Type</Label>
            <Select value={form.leaveType} onValueChange={(v) => setForm((p) => ({ ...p, leaveType: v as LeaveType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['ANNUAL','SICK','MATERNITY','PATERNITY','SHARED_PARENTAL','COMPASSIONATE','JURY_DUTY','STUDY','UNPAID','OTHER'] as LeaveType[]).map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} required /></div>
            <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))} required /></div>
          </div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Submitting...' : 'Submit'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Info Row ─────────────────────────────────────────────────────────────────

const InfoRow: React.FC<{ label: string; value?: string | number | null; sensitive?: boolean }> = ({ label, value, sensitive }) => (
  <div className="flex justify-between py-2 border-b last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-medium ${sensitive ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
);

// ─── Status Colors ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  PROBATION: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  ACTIVE: 'bg-green-100 text-green-800 border-green-200',
  ON_LEAVE: 'bg-blue-100 text-blue-800 border-blue-200',
  SUSPENDED: 'bg-orange-100 text-orange-800 border-orange-200',
  TERMINATED: 'bg-red-100 text-red-800 border-red-200',
  INACTIVE: 'bg-gray-100 text-gray-600 border-gray-200',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const EmployeePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');
  const [saving, setSaving] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Employee>>({});

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [emp, leaves, depts, posits] = await Promise.all([
          hrmsService.getEmployee(id),
          hrmsService.getLeaveRequests(id),
          hrmsService.getDepartments(),
          hrmsService.getPositions(),
        ]);
        setEmployee(emp);
        setLeaveRequests(leaves);
        setDepartments(depts);
        setPositions(posits);
        setEditForm(emp);
      } catch {
        toast.error('Failed to load employee');
        navigate('/hrms');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleSave = async () => {
    if (!id || !editForm) return;
    setSaving(true);
    try {
      const updated = await hrmsService.updateEmployee(id, editForm as any);
      setEmployee(updated);
      setEditing(false);
      toast.success('Employee updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveAction = async (lr: LeaveRequest, status: LeaveStatus) => {
    try {
      await hrmsService.updateLeaveStatus(lr.id, status);
      setLeaveRequests((prev) => prev.map((r) => r.id === lr.id ? { ...r, status } : r));
      toast.success(`Leave ${status.toLowerCase()}`);
    } catch {
      toast.error('Failed to update leave status');
    }
  };

  const set = (k: string, v: any) => setEditForm((p) => ({ ...p, [k]: v }));

  if (loading) {
    return (
      <MainLayout pageTitle="Employee">
        <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>
      </MainLayout>
    );
  }

  if (!employee) return null;

  return (
    <MainLayout pageTitle={employee.fullName}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/hrms')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{employee.fullName}</h1>
                <Badge className={`border ${STATUS_COLORS[employee.status]}`}>
                  {employee.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {employee.employeeNumber} · {employee.jobTitle || 'No title'} · {employee.departmentName || 'No dept'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => { setEditing(false); setEditForm(employee); }}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="space-y-2">
          {!employee.rightToWorkChecked && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Right to work not verified — must be checked before employee starts work.
            </div>
          )}
          {employee.pensionEligible && !employee.pensionEnrolled && (
            <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Employee is eligible for pension auto-enrolment but not yet enrolled.
            </div>
          )}
          {employee.probationEndDate && new Date(employee.probationEndDate) <= new Date(Date.now() + 30 * 86400000) && employee.status === 'PROBATION' && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <Clock className="h-4 w-4 shrink-0" />
              Probation ends {new Date(employee.probationEndDate).toLocaleDateString('en-GB')} — review required.
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personal">
          <TabsList>
            <TabsTrigger value="personal"><User className="h-4 w-4 mr-1" />Personal</TabsTrigger>
            <TabsTrigger value="employment"><Briefcase className="h-4 w-4 mr-1" />Employment</TabsTrigger>
            <TabsTrigger value="payroll"><CreditCard className="h-4 w-4 mr-1" />Payroll</TabsTrigger>
            <TabsTrigger value="leave"><Calendar className="h-4 w-4 mr-1" />Leave</TabsTrigger>
          </TabsList>

          {/* Personal Tab */}
          <TabsContent value="personal">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />Personal Details</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>First Name</Label><Input value={editForm.firstName || ''} onChange={(e) => set('firstName', e.target.value)} /></div>
                        <div><Label>Last Name</Label><Input value={editForm.lastName || ''} onChange={(e) => set('lastName', e.target.value)} /></div>
                      </div>
                      <div><Label>Date of Birth</Label><Input type="date" value={editForm.dateOfBirth?.split('T')[0] || ''} onChange={(e) => set('dateOfBirth', e.target.value)} /></div>
                      <div><Label>Gender</Label>
                        <Select value={editForm.gender || ''} onValueChange={(v) => set('gender', v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {['MALE','FEMALE','NON_BINARY','PREFER_NOT_TO_SAY'].map((g) => <SelectItem key={g} value={g}>{g.replace(/_/g, ' ')}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Nationality</Label><Input value={editForm.nationality || ''} onChange={(e) => set('nationality', e.target.value)} /></div>
                    </div>
                  ) : (
                    <>
                      <InfoRow label="Full Name" value={employee.fullName} />
                      <InfoRow label="Date of Birth" value={employee.dateOfBirth ? new Date(employee.dateOfBirth).toLocaleDateString('en-GB') : null} />
                      <InfoRow label="Gender" value={employee.gender?.replace(/_/g, ' ')} />
                      <InfoRow label="Marital Status" value={employee.maritalStatus?.replace(/_/g, ' ')} />
                      <InfoRow label="Nationality" value={employee.nationality} />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" />Contact</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-3">
                      <div><Label>Work Email</Label><Input type="email" value={editForm.workEmail || ''} onChange={(e) => set('workEmail', e.target.value)} /></div>
                      <div><Label>Personal Phone</Label><Input value={editForm.personalPhone || ''} onChange={(e) => set('personalPhone', e.target.value)} /></div>
                      <div><Label>Work Phone</Label><Input value={editForm.workPhone || ''} onChange={(e) => set('workPhone', e.target.value)} /></div>
                    </div>
                  ) : (
                    <>
                      <InfoRow label="Work Email" value={employee.workEmail} />
                      <InfoRow label="Personal Email" value={employee.personalEmail} />
                      <InfoRow label="Personal Phone" value={employee.personalPhone} />
                      <InfoRow label="Work Phone" value={employee.workPhone} />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" />Address</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-3">
                      <div><Label>Address Line 1</Label><Input value={editForm.addressLine1 || ''} onChange={(e) => set('addressLine1', e.target.value)} /></div>
                      <div><Label>Address Line 2</Label><Input value={editForm.addressLine2 || ''} onChange={(e) => set('addressLine2', e.target.value)} /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><Label>City</Label><Input value={editForm.city || ''} onChange={(e) => set('city', e.target.value)} /></div>
                        <div><Label>County</Label><Input value={editForm.county || ''} onChange={(e) => set('county', e.target.value)} /></div>
                      </div>
                      <div><Label>Postcode</Label><Input value={editForm.postcode || ''} onChange={(e) => set('postcode', e.target.value)} /></div>
                    </div>
                  ) : (
                    <>
                      <InfoRow label="Address" value={[employee.addressLine1, employee.addressLine2].filter(Boolean).join(', ')} />
                      <InfoRow label="City" value={employee.city} />
                      <InfoRow label="County" value={employee.county} />
                      <InfoRow label="Postcode" value={employee.postcode} />
                      <InfoRow label="Country" value={employee.country} />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Emergency Contact</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-3">
                      <div><Label>Name</Label><Input value={editForm.emergencyName || ''} onChange={(e) => set('emergencyName', e.target.value)} /></div>
                      <div><Label>Phone</Label><Input value={editForm.emergencyPhone || ''} onChange={(e) => set('emergencyPhone', e.target.value)} /></div>
                      <div><Label>Relationship</Label><Input value={editForm.emergencyRelation || ''} onChange={(e) => set('emergencyRelation', e.target.value)} /></div>
                    </div>
                  ) : (
                    <>
                      <InfoRow label="Name" value={employee.emergencyName} />
                      <InfoRow label="Phone" value={employee.emergencyPhone} />
                      <InfoRow label="Relationship" value={employee.emergencyRelation} />
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Employment Tab */}
          <TabsContent value="employment">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Briefcase className="h-4 w-4" />Employment Details</CardTitle></CardHeader>
                <CardContent>
                  {editing ? (
                    <div className="space-y-3">
                      <div><Label>Job Title</Label><Input value={editForm.jobTitle || ''} onChange={(e) => set('jobTitle', e.target.value)} /></div>
                      <div><Label>Department</Label>
                        <Select value={editForm.departmentId || ''} onValueChange={(v) => set('departmentId', v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Status</Label>
                        <Select value={editForm.status || ''} onValueChange={(v) => set('status', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['PROBATION','ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED','INACTIVE'].map((s) => (
                              <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Employment Type</Label>
                        <Select value={editForm.employmentType || ''} onValueChange={(v) => set('employmentType', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['FULL_TIME','PART_TIME','ZERO_HOURS','CASUAL','FIXED_TERM','CONTRACTOR','APPRENTICE','INTERN'].map((t) => (
                              <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label>Contract Type</Label>
                        <Select value={editForm.contractType || ''} onValueChange={(v) => set('contractType', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['PERMANENT','FIXED_TERM','CASUAL','AGENCY','SELF_EMPLOYED','ZERO_HOURS'].map((c) => (
                              <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <InfoRow label="Job Title" value={employee.jobTitle} />
                      <InfoRow label="Department" value={employee.departmentName} />
                      <InfoRow label="Status" value={employee.status.replace(/_/g, ' ')} />
                      <InfoRow label="Employment Type" value={employee.employmentType.replace(/_/g, ' ')} />
                      <InfoRow label="Contract Type" value={employee.contractType.replace(/_/g, ' ')} />
                      <InfoRow label="Start Date" value={employee.startDate ? new Date(employee.startDate).toLocaleDateString('en-GB') : null} />
                      <InfoRow label="Probation End" value={employee.probationEndDate ? new Date(employee.probationEndDate).toLocaleDateString('en-GB') : null} />
                      <InfoRow label="Notice Period" value={employee.noticePeriodDays ? `${employee.noticePeriodDays} days` : null} />
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Compliance</CardTitle></CardHeader>
                <CardContent>
                  <InfoRow label="Right to Work Verified" value={employee.rightToWorkChecked ? '✓ Yes' : '✗ No'} />
                  {employee.rightToWorkExpiry && (
                    <InfoRow label="RTW Expiry" value={new Date(employee.rightToWorkExpiry).toLocaleDateString('en-GB')} />
                  )}
                  <InfoRow label="Pension Eligible" value={employee.pensionEligible ? 'Yes' : 'No'} />
                  <InfoRow label="Pension Enrolled" value={employee.pensionEnrolled ? 'Yes' : 'No'} />
                  {employee.pensionEnrolled && (
                    <>
                      <InfoRow label="Employer Contribution" value={employee.employerPensionPct ? `${employee.employerPensionPct}%` : null} />
                      <InfoRow label="Employee Contribution" value={employee.employeePensionPct ? `${employee.employeePensionPct}%` : null} />
                    </>
                  )}
                  <InfoRow label="Annual Leave Entitlement" value={`${employee.annualLeaveEntitlement} days`} />
                  <InfoRow label="Student Loan Plan" value={employee.studentLoanPlan ? `Plan ${employee.studentLoanPlan}` : null} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" />Payroll Information</CardTitle></CardHeader>
              <CardContent className="max-w-lg">
                {editing ? (
                  <div className="space-y-3">
                    <div><Label>Annual Salary (£)</Label><Input type="number" value={editForm.salary || ''} onChange={(e) => set('salary', Number(e.target.value))} /></div>
                    <div><Label>Hourly Rate (£)</Label><Input type="number" step="0.01" value={editForm.hourlyRate || ''} onChange={(e) => set('hourlyRate', Number(e.target.value))} /></div>
                    <div><Label>Contracted Hours / Week</Label><Input type="number" step="0.5" value={editForm.contractedHours || ''} onChange={(e) => set('contractedHours', Number(e.target.value))} /></div>
                    <div><Label>Pay Frequency</Label>
                      <Select value={editForm.payFrequency || ''} onValueChange={(v) => set('payFrequency', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['WEEKLY','FORTNIGHTLY','FOUR_WEEKLY','MONTHLY'].map((f) => <SelectItem key={f} value={f}>{f.replace(/_/g, ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>NI Number (encrypted)</Label><Input placeholder="AB 12 34 56 C" onChange={(e) => set('niNumber', e.target.value)} /></div>
                    <div><Label>Tax Code</Label><Input value={editForm.taxCode || ''} onChange={(e) => set('taxCode', e.target.value)} /></div>
                    <div><Label>NI Category</Label>
                      <Select value={editForm.niCategory || 'A'} onValueChange={(v) => set('niCategory', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {['A','B','C','H','J','M','Z'].map((c) => <SelectItem key={c} value={c}>Category {c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label>Bank Name</Label><Input value={editForm.bankName || ''} onChange={(e) => set('bankName', e.target.value)} /></div>
                    <div><Label>Sort Code (encrypted)</Label><Input placeholder="12-34-56" onChange={(e) => set('bankSortCode', e.target.value)} /></div>
                    <div><Label>Account Number (encrypted)</Label><Input placeholder="12345678" onChange={(e) => set('bankAccountNo', e.target.value)} /></div>
                  </div>
                ) : (
                  <>
                    <InfoRow label="Annual Salary" value={employee.salary ? `£${employee.salary.toLocaleString()}` : null} />
                    <InfoRow label="Hourly Rate" value={employee.hourlyRate ? `£${employee.hourlyRate.toFixed(2)}/hr` : null} />
                    <InfoRow label="Contracted Hours" value={employee.contractedHours ? `${employee.contractedHours}h/week` : null} />
                    <InfoRow label="Pay Frequency" value={employee.payFrequency?.replace(/_/g, ' ')} />
                    <InfoRow label="NI Number" value={employee.niNumberMasked} sensitive />
                    <InfoRow label="Tax Code" value={employee.taxCode} />
                    <InfoRow label="NI Category" value={employee.niCategory ? `Category ${employee.niCategory}` : null} />
                    <InfoRow label="Starter Declaration" value={employee.starterDeclaration ? `Statement ${employee.starterDeclaration}` : null} />
                    <InfoRow label="P45 Received" value={employee.p45Received ? 'Yes' : 'No'} />
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">BANKING (masked)</p>
                      <InfoRow label="Bank" value={employee.bankName} />
                      <InfoRow label="Sort Code" value={employee.bankSortCodeMasked} sensitive />
                      <InfoRow label="Account No." value={employee.bankAccountNoMasked} sensitive />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leave Tab */}
          <TabsContent value="leave">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Leave Requests</h3>
                <Button size="sm" onClick={() => setShowLeaveDialog(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Request Leave
                </Button>
              </div>

              {leaveRequests.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                    No leave requests
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {leaveRequests.map((lr) => (
                    <Card key={lr.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{lr.leaveType.replace(/_/g, ' ')}</span>
                            <Badge className={`text-xs ${STATUS_COLORS[lr.status]}`}>{lr.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(lr.startDate).toLocaleDateString('en-GB')} – {new Date(lr.endDate).toLocaleDateString('en-GB')} · {Number(lr.days)} day{Number(lr.days) !== 1 ? 's' : ''}
                          </p>
                          {lr.notes && <p className="text-xs text-muted-foreground">{lr.notes}</p>}
                          {lr.rejectedReason && <p className="text-xs text-red-600">Reason: {lr.rejectedReason}</p>}
                        </div>
                        {lr.status === 'PENDING' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleLeaveAction(lr, 'APPROVED' as LeaveStatus)}>
                              <CheckCircle className="h-4 w-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleLeaveAction(lr, 'REJECTED' as LeaveStatus)}>
                              <XCircle className="h-4 w-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <LeaveDialog
        open={showLeaveDialog}
        onClose={() => setShowLeaveDialog(false)}
        employeeId={employee.id}
        onCreated={(lr) => setLeaveRequests((prev) => [lr, ...prev])}
      />
    </MainLayout>
  );
};

export default EmployeePage;
