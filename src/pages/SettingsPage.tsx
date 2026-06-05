import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, Lock, Eye, EyeOff, RotateCcw, Loader2, UserCircle, Printer, Archive, ScanLine, Eye as EyeIcon, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import MainLayout from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import RepairTagsSettings from '@/components/repair/RepairTagsSettings';
import PosTilesSettings from '@/components/pos/PosTilesSettings';
import FeaturesHelp from '@/components/settings/FeaturesHelp';
import { OutletManagement } from '@/components/outlets/OutletManagement';
import { ReceiptPreviewModal } from '@/components/printer/ReceiptPreviewModal';
import { usePrinterDetection } from '@/hooks/usePrinterDetection';
import { PrinterSelectorDialog } from '@/components/printer/PrinterSelectorDialog';

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
  tradingName: z.string().optional(),
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
  const { settings, loading, updateGeneralSettings, updateNotificationSettings, updateAppearanceSettings, updatePrinterSettings, updateReceiptTypes, updateCashUpSettings, resetToDefaults, toggleDarkMode, toggleCompactView } = useSettings();

  // Cash-up settings (plain local form, synced from context)
  const [cashUpForm, setCashUpForm] = useState({
    varianceThreshold: settings.cashUp.varianceThreshold,
    companyRegistrationNumber: settings.cashUp.companyRegistrationNumber,
    registerId: settings.cashUp.registerId,
  });
  useEffect(() => {
    setCashUpForm({
      varianceThreshold: settings.cashUp.varianceThreshold,
      companyRegistrationNumber: settings.cashUp.companyRegistrationNumber,
      registerId: settings.cashUp.registerId,
    });
  }, [settings.cashUp]);

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
      tradingName: settings.general.tradingName ?? '',
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
  const [headerText, setHeaderText] = useState(settings.printer.headerText ?? '');
  const [footerText, setFooterText] = useState(settings.printer.footerText);
  const [vatNumber, setVatNumber] = useState(settings.printer.vatNumber ?? '');
  const [drawerPin, setDrawerPin] = useState(settings.printer.drawerPin ?? '');
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestLoading, setSmsTestLoading] = useState(false);
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
  const [showPreview, setShowPreview] = useState(false);

  // Receipt type states
  const [rtSalesHeader, setRtSalesHeader] = useState(settings.receiptTypes.sales.headerText);
  const [rtSalesFooter, setRtSalesFooter] = useState(settings.receiptTypes.sales.footerText);
  const [rtPettyCashHeader, setRtPettyCashHeader] = useState(settings.receiptTypes.pettyCash.headerText);
  const [rtPettyCashFooter, setRtPettyCashFooter] = useState(settings.receiptTypes.pettyCash.footerText);
  const [rtLayawayHeader, setRtLayawayHeader] = useState(settings.receiptTypes.layaway.headerText);
  const [rtLayawayFooter, setRtLayawayFooter] = useState(settings.receiptTypes.layaway.footerText);
  const [savingReceiptTypes, setSavingReceiptTypes] = useState(false);

  const onSubmitReceiptTypes = async () => {
    setSavingReceiptTypes(true);
    await updateReceiptTypes({
      sales: { headerText: rtSalesHeader, footerText: rtSalesFooter },
      pettyCash: { headerText: rtPettyCashHeader, footerText: rtPettyCashFooter },
      layaway: { headerText: rtLayawayHeader, footerText: rtLayawayFooter },
    });
    setSavingReceiptTypes(false);
  };

  const printerDetection = usePrinterDetection();

  const onSubmitPrinter = async () => {
    await updatePrinterSettings({ model: 'STAR_TSP100', printerName, autoPrint, copies, headerText, footerText, vatNumber: vatNumber || undefined, drawerPin: drawerPin || undefined });
  };

  const handleFindPrinters = async () => {
    setLoadingPrinters(true);
    try {
      const { listPrinters, connectQZ } = await import('@/utils/qzBridge');
      await connectQZ();
      const found = await listPrinters();
      setAvailablePrinters(found);
      if (found.length === 0) {
        toast.error('No printers found — make sure QZ Tray is running on this PC.');
      } else {
        // Auto-select if only one found and nothing selected yet
        if (found.length === 1 && !printerName) setPrinterName(found[0]);
        toast.success(`Found ${found.length} printer${found.length > 1 ? 's' : ''}`);
      }
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
          tradingName: settings.general.tradingName,
          storeAddress: settings.general.address,
          storePhone: settings.general.phone,
          storeEmail: settings.general.email,
          vatNumber: settings.printer.vatNumber,
          receiptNumber: 'TEST-001',
          date: new Date().toISOString(),
          cashierName: 'Staff',
          items: [{ name: 'Test Item', quantity: 1, unitPrice: 1.00, total: 1.00 }],
          subtotal: 1.00, discountAmount: 0, taxAmount: 0, totalAmount: 1.00,
          paymentMethod: 'CASH',
          headerMessage: settings.receiptTypes.sales.headerText || undefined,
          footerMessage: settings.receiptTypes.sales.footerText,
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
      tradingName: settings.general.tradingName ?? '',
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

  // Auto-scan printers when switching to the printer tab
  useEffect(() => {
    if (activeTab !== 'printer') return;
    handleFindPrinters();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Sync printerName when detection dialog selects a new printer
  useEffect(() => {
    if (settings.printer.printerName) setPrinterName(settings.printer.printerName);
  }, [settings.printer.printerName]);

  // Sync receipt type text areas when settings loads from server
  useEffect(() => {
    setRtSalesHeader(settings.receiptTypes.sales.headerText);
    setRtSalesFooter(settings.receiptTypes.sales.footerText);
    setRtPettyCashHeader(settings.receiptTypes.pettyCash.headerText);
    setRtPettyCashFooter(settings.receiptTypes.pettyCash.footerText);
    setRtLayawayHeader(settings.receiptTypes.layaway.headerText);
    setRtLayawayFooter(settings.receiptTypes.layaway.footerText);
  }, [settings.receiptTypes]);

  // Form submission handlers
  const onSubmitGeneral = async (data: GeneralFormValues) => {
    await updateGeneralSettings({
      ...settings.general,
      storeName: data.storeName,
      tradingName: data.tradingName,
      phone: data.phone,
      email: data.email,
      address: data.address,
    });
  };

  const onSubmitNotifications = async (data: NotificationFormValues) => {
    await updateNotificationSettings(data);
  };

  const handleSmsTest = async () => {
    const phone = smsTestPhone.trim();
    if (!phone) {
      toast.error('Enter a phone number to send the test SMS to');
      return;
    }
    setSmsTestLoading(true);
    try {
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3007/api/v1';
      const token = localStorage.getItem('accessToken') || '';
      const tenantId = localStorage.getItem('tenantId') || '';
      const resp = await fetch(`${API_BASE}/sms/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenantId,
        },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const result = await resp.json();
      if (result.success) {
        toast.success(`Test SMS sent to ${phone}`);
      } else {
        toast.error(`SMS failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      toast.error('Could not reach SMS service');
    } finally {
      setSmsTestLoading(false);
    }
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
          <TabsList className="flex w-full justify-start overflow-x-auto [&>*]:flex-shrink-0">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="outlets">Outlets</TabsTrigger>
            <TabsTrigger value="printer">Printer</TabsTrigger>
            <TabsTrigger value="receipt-types">Receipts</TabsTrigger>
            <TabsTrigger value="cashup">Cash-Up</TabsTrigger>
            {(auth.user?.role === 'OWNER' || auth.user?.role === 'MANAGER') && (
              <TabsTrigger value="pos-tiles">POS Tiles</TabsTrigger>
            )}
            <TabsTrigger value="repair-tags">Repair Tags</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="features" className="relative">
              Features
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
            </TabsTrigger>
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
                      name="tradingName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trading Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g. A trading name of Beeston Jewellers Ltd" />
                          </FormControl>
                          <FormDescription>
                            Legal entity line printed on receipts below the store name.
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

                    {/* SMS Test */}
                    <div className="rounded-lg border p-4 space-y-3">
                      <div className="space-y-0.5">
                        <p className="text-base font-medium">Test SMS</p>
                        <p className="text-sm text-muted-foreground">
                          Send a test message to verify your TextMagic integration is working.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder="e.g. 07859 888649"
                          value={smsTestPhone}
                          onChange={(e) => setSmsTestPhone(e.target.value)}
                          className="max-w-xs"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleSmsTest}
                          disabled={smsTestLoading}
                          className="flex items-center gap-2"
                        >
                          {smsTestLoading
                            ? <Loader2 size={16} className="animate-spin" />
                            : <MessageSquare size={16} />}
                          Send Test SMS
                        </Button>
                      </div>
                    </div>

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

          {/* Cash-Up Tab */}
          <TabsContent value="cashup">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Cash-Up & Z-Report
                </CardTitle>
                <CardDescription>
                  Controls for end-of-day shift reconciliation and the Z-report receipt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="varianceThreshold">Manager-PIN variance threshold (£)</Label>
                    <Input
                      id="varianceThreshold"
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashUpForm.varianceThreshold}
                      onChange={(e) =>
                        setCashUpForm((p) => ({ ...p, varianceThreshold: parseFloat(e.target.value) || 0 }))
                      }
                    />
                    <p className="text-xs text-gray-500">
                      A cash variance above this amount requires a manager PIN to close the shift.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="registerId">Register / Till ID</Label>
                    <Input
                      id="registerId"
                      value={cashUpForm.registerId}
                      onChange={(e) =>
                        setCashUpForm((p) => ({ ...p, registerId: e.target.value }))
                      }
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500">Printed on the Z-report header.</p>
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="companyRegistrationNumber">Company registration number</Label>
                    <Input
                      id="companyRegistrationNumber"
                      value={cashUpForm.companyRegistrationNumber}
                      onChange={(e) =>
                        setCashUpForm((p) => ({ ...p, companyRegistrationNumber: e.target.value }))
                      }
                      placeholder="e.g. 01234567"
                    />
                    <p className="text-xs text-gray-500">
                      Printed on the Z-report alongside the store address and VAT number (set in the Printer tab).
                    </p>
                  </div>
                </div>
                <Button onClick={() => updateCashUpSettings(cashUpForm)} disabled={loading} className="gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Save Cash-Up Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Repair Tags Tab */}
          {(auth.user?.role === 'OWNER' || auth.user?.role === 'MANAGER') && (
            <TabsContent value="pos-tiles">
              <PosTilesSettings />
            </TabsContent>
          )}

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
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Connected Printer</label>
                    <button
                      type="button"
                      onClick={handleFindPrinters}
                      disabled={loadingPrinters}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {loadingPrinters ? <Loader2 className="h-3 w-3 animate-spin" /> : <ScanLine className="h-3 w-3" />}
                      {loadingPrinters ? 'Scanning…' : 'Scan printers'}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click <strong>Scan printers</strong> to auto-detect — requires <a href="https://qz.io/download" target="_blank" rel="noreferrer" className="underline text-blue-600">QZ Tray</a> running on this PC. Or type the name manually.
                  </p>
                  <input
                    type="text"
                    value={printerName}
                    onChange={(e) => setPrinterName(e.target.value)}
                    placeholder="e.g. STAR TSP143 Cutter (TSP100)"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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
                {auth.user?.role === 'OWNER' ? (
                  <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4 text-amber-600" />
                      <label className="text-sm font-semibold text-amber-800">Cash Drawer PIN <span className="ml-1 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-bold text-amber-900">OWNER ONLY</span></label>
                    </div>
                    <p className="text-sm text-amber-700">
                      4-digit PIN required to open the cash drawer from the POS toolbar. Leave blank to disable the button.
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
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Lock className="h-4 w-4" />
                      <span className="text-sm font-medium">Cash Drawer PIN — Owner access only</span>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-blue-100 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 p-3 text-sm text-blue-800 dark:text-blue-300">
                  Receipt header and footer messages are managed in the <strong>Receipts</strong> tab.
                </div>

                <div className="pt-2 flex items-center flex-wrap gap-3">
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
                    onClick={() => setShowPreview(true)}
                    className="flex items-center gap-2"
                  >
                    <EyeIcon className="h-4 w-4" />
                    Preview Receipt
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

          {/* Receipt Types Tab */}
          <TabsContent value="receipt-types">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  Receipt Templates
                </CardTitle>
                <CardDescription>
                  Configure header and footer text for each receipt type. Changes apply immediately when printing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">

                {/* Sales Receipt */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Printer className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Sales Receipt</h3>
                      <p className="text-xs text-muted-foreground">Printed after every POS sale</p>
                    </div>
                  </div>
                  <div className="grid gap-4 pl-11">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Header</label>
                      <p className="text-xs text-muted-foreground">Printed below the store address. Leave blank to omit. Use \n for new lines.</p>
                      <textarea
                        value={rtSalesHeader}
                        onChange={(e) => setRtSalesHeader(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="e.g. SALE ON NOW — 20% OFF ALL RINGS"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Footer</label>
                      <p className="text-xs text-muted-foreground">Printed at the bottom of the receipt.</p>
                      <textarea
                        value={rtSalesFooter}
                        onChange={(e) => setRtSalesFooter(e.target.value)}
                        rows={4}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Thank you for your purchase!"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Petty Cash Receipt */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Printer className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Petty Cash Voucher</h3>
                      <p className="text-xs text-muted-foreground">Printed for petty cash expenses</p>
                    </div>
                  </div>
                  <div className="grid gap-4 pl-11">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Header</label>
                      <textarea
                        value={rtPettyCashHeader}
                        onChange={(e) => setRtPettyCashHeader(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="e.g. PETTY CASH VOUCHER"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Footer</label>
                      <textarea
                        value={rtPettyCashFooter}
                        onChange={(e) => setRtPettyCashFooter(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Authorised signature: ___________"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Layaway Receipt */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Printer className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">Layaway Receipt</h3>
                      <p className="text-xs text-muted-foreground">Printed for layaway deposits and reservations</p>
                    </div>
                  </div>
                  <div className="grid gap-4 pl-11">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Header</label>
                      <textarea
                        value={rtLayawayHeader}
                        onChange={(e) => setRtLayawayHeader(e.target.value)}
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="e.g. LAYAWAY RECEIPT"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Footer</label>
                      <textarea
                        value={rtLayawayFooter}
                        onChange={(e) => setRtLayawayFooter(e.target.value)}
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Thank you for your layaway deposit."
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={onSubmitReceiptTypes} disabled={savingReceiptTypes} className="flex items-center gap-2">
                    {savingReceiptTypes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Receipt Templates
                  </Button>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Outlets Tab */}
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

          {/* Features & Help Tab */}
          <TabsContent value="features">
            <Card>
              <CardContent className="pt-6">
                <FeaturesHelp />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Receipt preview modal */}
      <ReceiptPreviewModal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        storeName={settings.general.storeName}
        tradingName={settings.general.tradingName}
        storeAddress={settings.general.address}
        storePhone={settings.general.phone}
        vatNumber={vatNumber || settings.printer.vatNumber}
        headerText={headerText || settings.printer.headerText || undefined}
        footerText={footerText || settings.printer.footerText}
        model={printerModel}
        copies={copies}
      />

      {/* Printer selector — fires from detection hook when multiple/replacement printers found */}
      <PrinterSelectorDialog
        open={printerDetection.showSelector}
        printers={printerDetection.selectorPrinters}
        mode={printerDetection.selectorMode}
        missingPrinter={printerDetection.missingPrinter}
        onSelect={async (p) => { await printerDetection.confirmSelect(p); setPrinterName(p); }}
        onDismiss={printerDetection.dismiss}
      />
    </MainLayout>
  );
};

export default SettingsPage;
