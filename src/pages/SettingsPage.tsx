import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, Lock, Eye, EyeOff, RotateCcw, Loader2, UserCircle, Printer } from 'lucide-react';
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
  const [printerModel, setPrinterModel] = useState<'ONIX' | 'EPSON' | 'OTHER'>(settings.printer.model);
  const [autoPrint, setAutoPrint] = useState(settings.printer.autoPrint);
  const [copies, setCopies] = useState<1 | 2>(settings.printer.copies);
  const [footerText, setFooterText] = useState(settings.printer.footerText);

  const onSubmitPrinter = async () => {
    await updatePrinterSettings({ model: printerModel, autoPrint, copies, footerText });
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
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
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

                {/* Printer Model */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Printer Model</label>
                  <p className="text-sm text-muted-foreground">
                    Both ONIX and EPSON use 80mm paper. Select your model for optimal settings.
                  </p>
                  <div className="flex gap-3 mt-2">
                    {(['EPSON', 'ONIX', 'OTHER'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPrinterModel(m)}
                        className={`flex-1 rounded-lg border-2 py-3 text-sm font-semibold transition-colors ${
                          printerModel === m
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {m === 'OTHER' ? 'Other 80mm' : m}
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

                <div className="pt-2">
                  <Button
                    onClick={onSubmitPrinter}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Printer Settings
                  </Button>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings Tab */}
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
