import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, Lock, Eye, EyeOff, RotateCcw, Loader2, UserCircle, Printer, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import RepairTagsSettings from '@/components/repair/RepairTagsSettings';
import { OutletManagement } from '@/components/outlets/OutletManagement';

// ─── QZ Tray certificate setup component ─────────────────────────────────────

function QzCertSetup({ configured, onSaved }: { configured: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [cert, setCert] = useState('');
  const [pkey, setPkey] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!cert.trim() || !pkey.trim()) {
      toast.error('Both certificate and private key are required');
      return;
    }
    setSaving(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3007/api/v1';
      const token = localStorage.getItem('accessToken') || '';
      const tenantId = localStorage.getItem('tenantId') || '';
      const resp = await fetch(`${API_BASE}/auth/qz-config`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ certificate: cert.trim(), privateKey: pkey.trim() }),
      });
      if (!resp.ok) throw new Error('Save failed');
      // Apply locally too so printing works immediately without re-login
      const { storeQzConfig } = await import('@/utils/qzBridge');
      storeQzConfig(cert.trim(), pkey.trim());
      toast.success('QZ Tray certificate saved — printing is ready');
      setCert('');
      setPkey('');
      setOpen(false);
      onSaved();
    } catch {
      toast.error('Failed to save certificate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">QZ Tray Certificate</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Connects this account to the local QZ Tray printer daemon.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${configured ? 'bg-green-500' : 'bg-amber-400'}`} />
            <span className="text-xs text-gray-500">{configured ? 'Configured' : 'Not set'}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
            {open ? 'Cancel' : configured ? 'Update' : 'Set up'}
          </Button>
        </div>
      </div>

      {open && (
        <div className="rounded-lg border p-4 space-y-3 bg-gray-50">
          <p className="text-xs text-gray-600">
            Open QZ Tray on this PC → right-click the Q icon → <strong>Site Manager</strong> → click <strong>+</strong> → Yes.
            Then paste the generated certificate and private key below.
          </p>
          <div>
            <label className="text-xs font-medium text-gray-700">Certificate</label>
            <Textarea
              className="mt-1 font-mono text-xs h-28"
              placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
              value={cert}
              onChange={(e) => setCert(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700">Private Key</label>
            <Textarea
              className="mt-1 font-mono text-xs h-28"
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
              value={pkey}
              onChange={(e) => setPkey(e.target.value)}
            />
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save & Activate
          </Button>
        </div>
      )}
    </div>
  );
}

// Form schemas
const generalFormSchema = z.object({
  storeName: z.string().min(2, {
    message: "Store name must be at least 2 characters.",
  }),
  phone: z.string().min(6, {
    message: "Phone number must be at least 6 digits.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  address: z.string().min(5, {
    message: "Address must be at least 5 characters.",
  }),
});

const notificationFormSchema = z.object({
  emailNotifications: z.boolean().default(false),
  smsNotifications: z.boolean().default(false),
  lowStockAlerts: z.boolean().default(true),
  repairStatusUpdates: z.boolean().default(true),
  dailySummary: z.boolean().default(false),
});

const appearanceFormSchema = z.object({
  darkMode: z.boolean().default(false),
  compactView: z.boolean().default(false),
  receiptTemplate: z.string().min(10, {
    message: "Receipt template must be at least 10 characters.",
  }),
});

const securityFormSchema = z.object({
  currentPassword: z.string().min(1, {
    message: "Current password is required.",
  }),
  newPassword: z.string().min(6, {
    message: "New password must be at least 6 characters.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Confirm password must be at least 6 characters.",
  }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type GeneralFormValues = z.infer<typeof generalFormSchema>;
type NotificationFormValues = z.infer<typeof notificationFormSchema>;
type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;
type SecurityFormValues = z.infer<typeof securityFormSchema>;

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("general");
  const navigate = useNavigate();
  const { changePassword, auth } = useAuth();
  const isBuyme = auth.tenantInfo?.tenantSlug === 'buymejewellery';
  const { settings, loading, updateGeneralSettings, updateNotificationSettings, updateAppearanceSettings, updatePrinterSettings, resetToDefaults, toggleDarkMode, toggleCompactView } = useSettings();

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // General settings form
  const generalForm = useForm<GeneralFormValues>({
    resolver: zodResolver(generalFormSchema),
    defaultValues: {
      storeName: settings.general.storeName,
      phone: settings.general.phone,
      email: settings.general.email,
      address: settings.general.address,
    },
  });

  // Notification settings form
  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: settings.notifications.emailNotifications,
      smsNotifications: settings.notifications.smsNotifications,
      lowStockAlerts: settings.notifications.lowStockAlerts,
      repairStatusUpdates: settings.notifications.repairStatusUpdates,
      dailySummary: settings.notifications.dailySummary,
    },
  });

  // Appearance settings form
  const appearanceForm = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      darkMode: settings.appearance.darkMode,
      compactView: settings.appearance.compactView,
      receiptTemplate: settings.appearance.receiptTemplate,
    },
  });

  // Printer settings (local state — no react-hook-form needed for this simple form)
  const [printerModel, setPrinterModel] = useState<'ONIX' | 'EPSON' | 'STAR_TSP100' | 'OTHER'>(settings.printer.model);
  const [printerName, setPrinterName] = useState(settings.printer.printerName ?? '');
  const [autoPrint, setAutoPrint] = useState(settings.printer.autoPrint);
  const [copies, setCopies] = useState<1 | 2>(settings.printer.copies);
  const [footerText, setFooterText] = useState(settings.printer.footerText);
  const [vatNumber, setVatNumber] = useState(settings.printer.vatNumber ?? '');
  const [drawerPin, setDrawerPin] = useState(settings.printer.drawerPin ?? '');
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [testingDrawer, setTestingDrawer] = useState(false);
  const [qzConfigured, setQzConfigured] = useState<boolean>(
    () => !!(localStorage.getItem('qz_certificate') && localStorage.getItem('qz_private_key')),
  );
  const [drawerLog, setDrawerLog] = useState<import('@/utils/qzBridge').DrawerLogEntry[]>(() => {
    try {
      const raw = localStorage.getItem('qz_drawer_log');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [showDrawerLog, setShowDrawerLog] = useState(false);

  const onSubmitPrinter = async () => {
    await updatePrinterSettings({ model: printerModel, printerName, autoPrint, copies, footerText, vatNumber: vatNumber || undefined, drawerPin: drawerPin || undefined });
  };

  const handleFindPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const { listPrinters, connectQZ } = await import('@/utils/qzBridge');
      await connectQZ();
      const found = await listPrinters();
      setAvailablePrinters(found);
      if (found.length === 0) toast.error('No printers found — make sure QZ Tray is running on this PC.');
    } catch {
      toast.error('QZ Tray not available — install and start QZ Tray on this PC first.');
    } finally {
      setLoadingPrinters(false);
    }
  };

  const handleTestPrint = async () => {
    if (!printerName) { toast.error('Enter or pick a printer name first.'); return; }
    setTestPrinting(true);
    try {
      const { printThermalReceipt } = await import('@/utils/thermalReceipt');
      await printThermalReceipt(
        {
          storeName: settings.general.storeName || 'Test Store',
          storeAddress: settings.general.address,
          storePhone: settings.general.phone,
          storeEmail: settings.general.email,
          receiptNumber: 'TEST-001',
          date: new Date().toISOString(),
          cashierName: 'Staff',
          items: [{ name: 'Test Item', quantity: 1, unitPrice: 1.00, total: 1.00 }],
          subtotal: 1.00, discountAmount: 0, taxAmount: 0, totalAmount: 1.00,
          paymentMethod: 'CASH',
          footerMessage: footerText,
        },
        { model: printerModel, copies: 1 },
        printerName,
      );
      toast.success('Test print sent!');
    } catch (e: any) {
      toast.error(`Print failed: ${e?.message ?? 'Unknown error'}`);
    } finally {
      setTestPrinting(false);
    }
  };

  const handleTestDrawer = async () => {
    if (!printerName) { toast.error('Enter or pick a printer name first.'); return; }
    setTestingDrawer(true);
    try {
      const { openCashDrawer, getDrawerLog } = await import('@/utils/qzBridge');
      await openCashDrawer(printerName, printerModel, 'manual');
      setDrawerLog(getDrawerLog());
      toast.success('Cash drawer opened!');
    } catch (e: any) {
      toast.error(`Drawer failed: ${e?.message ?? 'Unknown error'}`);
    } finally {
      setTestingDrawer(false);
    }
  };

  // Security settings form
  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Update forms when settings change
  useEffect(() => {
    generalForm.reset({
      storeName: settings.general.storeName,
      phone: settings.general.phone,
      email: settings.general.email,
      address: settings.general.address,
    });
  }, [settings.general, generalForm]);

  useEffect(() => {
    notificationForm.reset({
      emailNotifications: settings.notifications.emailNotifications,
      smsNotifications: settings.notifications.smsNotifications,
      lowStockAlerts: settings.notifications.lowStockAlerts,
      repairStatusUpdates: settings.notifications.repairStatusUpdates,
      dailySummary: settings.notifications.dailySummary,
    });
  }, [settings.notifications, notificationForm]);

  useEffect(() => {
    appearanceForm.reset({
      darkMode: settings.appearance.darkMode,
      compactView: settings.appearance.compactView,
      receiptTemplate: settings.appearance.receiptTemplate,
    });
  }, [settings.appearance, appearanceForm]);

  // Form submission handlers
  const onSubmitGeneral = async (data: GeneralFormValues) => {
    await updateGeneralSettings({
      ...settings.general,
      storeName: data.storeName,
      phone: data.phone,
      email: data.email,
      address: data.address,
    });
  };

  const onSubmitNotifications = async (data: NotificationFormValues) => {
    await updateNotificationSettings(data);
  };

  const onSubmitAppearance = async (data: AppearanceFormValues) => {
    await updateAppearanceSettings(data);
  };

  const onSubmitSecurity = async (data: SecurityFormValues) => {
    setIsChangingPassword(true);

    try {
      // Call changePassword with the correct ChangePasswordData object
      const success = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      if (success) {
        toast.success("Password changed successfully");
        securityForm.reset({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        toast.error("Current password is incorrect or password change failed");
      }
    } catch (error: any) {
      console.error('Password change error:', error);
      toast.error(error.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults? This action cannot be undone.')) {
      resetToDefaults();
    }
  };

  return (
    <MainLayout pageTitle="Settings">
      <div className="mx-auto max-w-4xl space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Subtle admin tool — sale condition editor (buymejewellery only) */}
            {isBuyme && (
              <button
                onClick={() => navigate('/settings/sale-conditions')}
                title="Edit sale item conditions"
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <UserCircle size={18} />
              </button>
            )}
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
              className="flex items-center gap-2"
            >
              <RotateCcw size={16} />
              Reset to Defaults
            </Button>
          </div>
        </div>

        <Separator className="my-6" />

        <Tabs defaultValue="general" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="outlets">Outlets</TabsTrigger>
            <TabsTrigger value="printer">Printer</TabsTrigger>
            <TabsTrigger value="repair-tags">Repair Tags</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          {/* General Settings Tab */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Manage your store information and contact details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...generalForm}>
                  <form onSubmit={generalForm.handleSubmit(onSubmitGeneral)} className="space-y-6">
                    <FormField
                      control={generalForm.control}
                      name="storeName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            This is your store's display name.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            Your store's contact phone number.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} />
                          </FormControl>
                          <FormDescription>
                            Business email for notifications and customer contact.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={generalForm.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Store Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormDescription>
                            Physical address of your store location.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="flex items-center gap-2" disabled={loading}>
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save General Settings
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how you want to receive notifications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onSubmitNotifications)} className="space-y-6">
                    <FormField
                      control={notificationForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Receive notifications via email.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="smsNotifications"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">SMS Notifications</FormLabel>
                            <FormDescription>
                              Receive notifications via SMS.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="lowStockAlerts"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Low Stock Alerts</FormLabel>
                            <FormDescription>
                              Be notified when inventory items are running low.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="repairStatusUpdates"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Repair Status Updates</FormLabel>
                            <FormDescription>
                              Get notifications when repair status changes.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={notificationForm.control}
                      name="dailySummary"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Daily Summary</FormLabel>
                            <FormDescription>
                              Receive a daily summary of sales and activities.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="flex items-center gap-2" disabled={loading}>
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Notification Settings
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Settings Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>
                  Customize how the application looks and feels.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...appearanceForm}>
                  <form onSubmit={appearanceForm.handleSubmit(onSubmitAppearance)} className="space-y-6">
                    {/* Dark Mode - applies immediately */}
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <label className="text-base font-medium">Dark Mode</label>
                        <p className="text-sm text-muted-foreground">
                          Enable dark mode for the application.
                        </p>
                      </div>
                      <Switch
                        checked={settings.appearance.darkMode}
                        onCheckedChange={() => {
                          toggleDarkMode();
                          appearanceForm.setValue('darkMode', !settings.appearance.darkMode);
                        }}
                      />
                    </div>

                    {/* Compact View - applies immediately */}
                    <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <label className="text-base font-medium">Compact View</label>
                        <p className="text-sm text-muted-foreground">
                          Show more items per page with a compact layout.
                        </p>
                      </div>
                      <Switch
                        checked={settings.appearance.compactView}
                        onCheckedChange={() => {
                          toggleCompactView();
                          appearanceForm.setValue('compactView', !settings.appearance.compactView);
                        }}
                      />
                    </div>

                    <FormField
                      control={appearanceForm.control}
                      name="receiptTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receipt Template</FormLabel>
                          <FormControl>
                            <Textarea rows={6} {...field} />
                          </FormControl>
                          <FormDescription>
                            Customize the receipt template for your sales. Use {`{ITEMS}`}, {`{TOTAL}`}, and {`{DATE}`} as placeholders.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="flex items-center gap-2" disabled={loading}>
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Appearance Settings
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Repair Tags Tab */}
          <TabsContent value="repair-tags">
            <RepairTagsSettings />
          </TabsContent>

          {/* Printer Settings Tab */}
          <TabsContent value="printer">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Thermal Printer Settings
                </CardTitle>
                <CardDescription>
                  Configure your 80mm thermal receipt printer (ONIX or EPSON).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {/* QZ Tray — Certificate Setup */}
                <QzCertSetup configured={qzConfigured} onSaved={() => setQzConfigured(true)} />

                <Separator />

                {/* QZ Tray — Printer Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Windows Printer Name (QZ Tray)</label>
                  <p className="text-xs text-muted-foreground">
                    The exact printer name as it appears in Windows. Click <strong>Find Printers</strong> to detect automatically — requires <a href="https://qz.io/download" target="_blank" rel="noreferrer" className="underline text-blue-600">QZ Tray</a> running on this PC.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={printerName}
                      onChange={(e) => setPrinterName(e.target.value)}
                      placeholder="e.g. EPSON TM-T20III"
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleFindPrinters}
                      disabled={loadingPrinters}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
                    >
                      {loadingPrinters ? 'Searching…' : 'Find Printers'}
                    </button>
                  </div>
                  {availablePrinters.length > 0 && (
                    <div className="mt-2 rounded-lg border border-gray-200 divide-y">
                      {availablePrinters.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPrinterName(p)}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${printerName === p ? 'bg-blue-50 text-blue-700 font-medium' : ''}`}
                        >
                          {p}
                          {printerName === p && <span className="ml-2 text-xs">✓ selected</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Printer Model */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Printer Model</label>
                  <p className="text-sm text-muted-foreground">
                    Select your printer model. Star TSP100 uses Star Line protocol — different from EPSON/ONIX.
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {([
                      { id: 'EPSON',       label: 'EPSON' },
                      { id: 'ONIX',        label: 'ONIX' },
                      { id: 'STAR_TSP100', label: 'Star TSP100' },
                      { id: 'OTHER',       label: 'Other 80mm' },
                    ] as const).map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPrinterModel(id)}
                        className={`flex-1 rounded-lg border-2 py-3 text-sm font-semibold transition-colors ${
                          printerModel === id
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Auto-print */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium">Auto-print after sale</label>
                    <p className="text-sm text-muted-foreground">
                      Automatically send to printer when a payment is completed, without clicking the button.
                    </p>
                  </div>
                  <Switch
                    checked={autoPrint}
                    onCheckedChange={setAutoPrint}
                  />
                </div>

                <Separator />

                {/* Number of copies */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Number of Copies</label>
                  <p className="text-sm text-muted-foreground">
                    Print 2 copies (customer + merchant) separated by a cut line.
                  </p>
                  <div className="flex gap-3 mt-2">
                    {([1, 2] as const).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCopies(n)}
                        className={`w-20 rounded-lg border-2 py-3 text-sm font-semibold transition-colors ${
                          copies === n
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {n === 1 ? '1 Copy' : '2 Copies'}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* VAT number */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">VAT Registration Number</label>
                  <p className="text-sm text-muted-foreground">Printed on every receipt below the store address (e.g. GB 123 4567 89).</p>
                  <Input
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="GB 123 4567 89"
                    className="max-w-xs"
                  />
                </div>

                {/* Drawer PIN — OWNER only */}
                {auth.user?.role === 'OWNER' && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cash Drawer PIN</label>
                    <p className="text-sm text-muted-foreground">
                      4-digit PIN staff must enter to open the cash drawer manually from the POS screen. Leave blank to disable the shortcut.
                    </p>
                    <Input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      value={drawerPin}
                      onChange={(e) => setDrawerPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="e.g. 1234"
                      className="max-w-[120px] tracking-widest text-center text-lg"
                    />
                  </div>
                )}

                {/* Footer text */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Receipt Footer Message</label>
                  <p className="text-sm text-muted-foreground">
                    Printed at the bottom of every receipt. Use \\n for a new line.
                  </p>
                  <textarea
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="Thank you for your purchase!"
                  />
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <Button
                    onClick={onSubmitPrinter}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Printer Settings
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestPrint}
                    disabled={testPrinting || !printerName}
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    {testPrinting ? 'Printing…' : 'Test Print'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestDrawer}
                    disabled={testingDrawer || !printerName}
                    className="flex items-center gap-2"
                  >
                    {testingDrawer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                    {testingDrawer ? 'Opening…' : 'Test Drawer'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowDrawerLog(v => !v)}
                    className="flex items-center gap-2 text-muted-foreground"
                  >
                    <Archive className="h-4 w-4" />
                    Drawer Log {drawerLog.length > 0 && `(${drawerLog.length})`}
                  </Button>
                </div>

                {showDrawerLog && (
                  <div className="mt-4 rounded-md border bg-muted/40 p-3 space-y-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Cash Drawer Events — last {Math.min(drawerLog.length, 50)}
                      </p>
                      {drawerLog.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs text-destructive hover:text-destructive"
                          onClick={async () => {
                            const { clearDrawerLog, getDrawerLog } = await import('@/utils/qzBridge');
                            clearDrawerLog();
                            setDrawerLog(getDrawerLog());
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    {drawerLog.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No drawer events recorded yet.</p>
                    ) : (
                      [...drawerLog].reverse().slice(0, 50).map((entry, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-border/40 last:border-0">
                          <span className="text-muted-foreground font-mono">
                            {new Date(entry.at).toLocaleString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                            })}
                          </span>
                          <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-medium ${entry.trigger === 'sale' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {entry.trigger}
                          </span>
                          <span className="ml-2 text-muted-foreground truncate max-w-[140px]">{entry.printer}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}

              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings Tab */}
          <TabsContent value="outlets">
            <OutletManagement />
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>
                  Manage your password and security preferences.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit(onSubmitSecurity)} className="space-y-6">
                    <FormField
                      control={securityForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showCurrentPassword ? "text" : "password"}
                                placeholder="Enter your current password"
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              {showCurrentPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <FormDescription>
                            Enter your current password to verify your identity.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Separator />

                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showNewPassword ? "text" : "password"}
                                placeholder="Enter your new password"
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              {showNewPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <FormDescription>
                            Your new password must be at least 6 characters long.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Confirm your new password"
                                {...field}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                              tabIndex={-1}
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <FormDescription>
                            Re-enter your new password to confirm.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="flex items-center gap-2" disabled={isChangingPassword}>
                      {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Change Password
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default SettingsPage;
