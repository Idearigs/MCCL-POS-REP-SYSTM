import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, Building2, Loader2, AlertCircle, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { outletService, type Outlet } from '../../services/outletService';
import { useAuth } from '../../contexts/AuthContext';

interface OutletFormValues {
  name: string;
  code: string;
  password: string;
  address: string;
  phone: string;
}

const emptyForm = (): OutletFormValues => ({
  name: '', code: '', password: '', address: '', phone: '',
});

export function OutletManagement() {
  const { auth } = useAuth();
  const isOwner = auth.user?.role === 'OWNER';

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [billing, setBilling] = useState<{ count: number; extra: number; monthlyExtra: number; summary: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Outlet | null>(null);
  const [form, setForm] = useState<OutletFormValues>(emptyForm());
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Outlet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, bill] = await Promise.all([
        outletService.getOutlets(),
        outletService.getBilling(),
      ]);
      setOutlets(list);
      setBilling(bill);
    } catch {
      toast.error('Failed to load outlets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const openEdit = (outlet: Outlet) => {
    setEditing(outlet);
    setForm({
      name: outlet.name,
      code: outlet.code,
      password: '',
      address: outlet.address ?? '',
      phone: outlet.phone ?? '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Name and Code are required');
      return;
    }
    if (!editing && !form.password) {
      toast.error('Password is required for new outlets');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await outletService.updateOutlet(editing.id, {
          name: form.name,
          code: form.code.toUpperCase(),
          address: form.address || undefined,
          phone: form.phone || undefined,
          ...(form.password ? { password: form.password } : {}),
        });
        toast.success('Outlet updated');
      } else {
        await outletService.createOutlet({
          name: form.name,
          code: form.code.toUpperCase(),
          password: form.password,
          address: form.address || undefined,
          phone: form.phone || undefined,
        });
        toast.success('Outlet created');
      }
      setFormOpen(false);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to save outlet');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await outletService.deleteOutlet(deleteTarget.id);
      toast.success(`${deleteTarget.name} deleted`);
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to delete outlet');
    } finally {
      setDeleting(false);
    }
  };

  const monthlyTotal = (billing?.extra ?? 0) > 0
    ? `£${100 + (billing?.monthlyExtra ?? 0)}/month (base + ${billing?.extra} extra outlet${(billing?.extra ?? 0) > 1 ? 's' : ''})`
    : '£100/month — included in plan';

  return (
    <div className="space-y-6">
      {/* Billing summary */}
      <Card className="border-orange-200 bg-orange-50/40">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Outlet Billing</CardTitle>
          </div>
          <CardDescription>
            First 2 outlets: included in your £100/month plan.
            Additional outlets: £85/month each.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{billing?.summary}</p>
              <Badge variant={billing && billing.extra > 0 ? 'destructive' : 'secondary'} className="text-xs">
                {monthlyTotal}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outlet list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Outlets
              </CardTitle>
              <CardDescription>
                Each outlet has its own password. Staff must select and unlock an outlet at login.
              </CardDescription>
            </div>
            {isOwner && (
              <Button size="sm" onClick={openCreate} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Outlet
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading outlets…
            </div>
          )}

          {!loading && outlets.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 opacity-30" />
              <p className="text-sm">No outlets yet. Add your first outlet above.</p>
            </div>
          )}

          <div className="space-y-3">
            {outlets.map((outlet) => (
              <div
                key={outlet.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-orange-100 flex items-center justify-center font-bold text-orange-600">
                    {outlet.code.slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{outlet.name}</p>
                      {outlet.isPrimary && (
                        <Badge variant="outline" className="text-xs py-0">Primary</Badge>
                      )}
                      {!outlet.isActive && (
                        <Badge variant="secondary" className="text-xs py-0">Inactive</Badge>
                      )}
                    </div>
                    {outlet.address && (
                      <p className="text-xs text-muted-foreground">{outlet.address}</p>
                    )}
                  </div>
                </div>

                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(outlet)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!outlet.isPrimary && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget(outlet)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Outlet' : 'Add New Outlet'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Update outlet details. Leave password blank to keep existing.'
                : 'New outlets require a password that staff use to unlock them at login.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="o-name">Outlet Name</Label>
                <Input
                  id="o-name"
                  placeholder="e.g. London Outlet"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="o-code">Code (2–8 chars)</Label>
                <Input
                  id="o-code"
                  placeholder="LON"
                  value={form.code}
                  maxLength={8}
                  onChange={(e) =>
                    setForm(f => ({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="o-password">
                  Password {editing && <span className="text-muted-foreground text-xs">(optional)</span>}
                </Label>
                <Input
                  id="o-password"
                  type="password"
                  placeholder={editing ? 'Leave blank to keep' : 'Min 4 characters'}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="o-address">Address (optional)</Label>
                <Input
                  id="o-address"
                  placeholder="123 High Street, London"
                  value={form.address}
                  onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="o-phone">Phone (optional)</Label>
                <Input
                  id="o-phone"
                  placeholder="+44 20 1234 5678"
                  value={form.phone}
                  onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? 'Save Changes' : 'Create Outlet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This outlet will be permanently deleted. Staff currently on this outlet will
              need to select a different one at next login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Outlet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
