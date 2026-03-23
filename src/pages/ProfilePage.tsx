import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, Mail, Phone, Camera, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/services/apiClient';

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// ── Helpers ───────────────────────────────────────────────────────────────────
const profileExtrasKey = (userId: string) => `profile_extras_${userId}`;
const notifPrefsKey    = (userId: string) => `notif_prefs_${userId}`;

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName:  z.string().min(1, 'Last name is required'),
  email:     z.string().email('Invalid email'),
  phone:     z.string().optional(),
  bio:       z.string().optional(),
  jobTitle:  z.string().optional(),
  department: z.string().optional(),
});

const notifSchema = z.object({
  emailNotifications: z.boolean(),
  smsNotifications:   z.boolean(),
  pushNotifications:  z.boolean(),
  weeklyDigest:       z.boolean(),
  mentionAlerts:      z.boolean(),
  paymentReminders:   z.boolean(),
});

type ProfileValues = z.infer<typeof profileSchema>;
type NotifValues   = z.infer<typeof notifSchema>;

// ── Component ─────────────────────────────────────────────────────────────────
const ProfilePage: React.FC = () => {
  const { auth } = useAuth();
  const user = auth.user;
  const userId = user?.id || '';

  const [saving, setSaving]             = useState(false);
  const [savingNotif, setSavingNotif]   = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showUpload, setShowUpload]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load extras from localStorage
  const extras = userId ? JSON.parse(localStorage.getItem(profileExtrasKey(userId)) || '{}') : {};
  const savedNotifs = userId ? JSON.parse(localStorage.getItem(notifPrefsKey(userId)) || '{}') : {};

  // Profile form — initialise from real auth data + localStorage extras
  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName:  user?.name?.split(' ')[0] || '',
      lastName:   user?.name?.split(' ').slice(1).join(' ') || '',
      email:      user?.email || '',
      phone:      extras.phone || '',
      bio:        extras.bio || '',
      jobTitle:   extras.jobTitle || '',
      department: extras.department || '',
    },
  });

  // Keep form in sync if auth updates (e.g. after page-refresh /me call)
  useEffect(() => {
    if (user?.name) {
      const [first, ...rest] = user.name.split(' ');
      profileForm.setValue('firstName', first || '');
      profileForm.setValue('lastName', rest.join(' ') || '');
    }
    if (user?.email) profileForm.setValue('email', user.email);
  }, [user?.name, user?.email]);

  // Notification form — from localStorage
  const notifForm = useForm<NotifValues>({
    resolver: zodResolver(notifSchema),
    defaultValues: {
      emailNotifications: savedNotifs.emailNotifications ?? true,
      smsNotifications:   savedNotifs.smsNotifications   ?? false,
      pushNotifications:  savedNotifs.pushNotifications  ?? true,
      weeklyDigest:       savedNotifs.weeklyDigest        ?? true,
      mentionAlerts:      savedNotifs.mentionAlerts       ?? true,
      paymentReminders:   savedNotifs.paymentReminders    ?? true,
    },
  });

  // Live-watch for summary card
  const watchedFirst  = profileForm.watch('firstName');
  const watchedLast   = profileForm.watch('lastName');
  const watchedEmail  = profileForm.watch('email');
  const watchedPhone  = profileForm.watch('phone');
  const watchedTitle  = profileForm.watch('jobTitle');
  const watchedDept   = profileForm.watch('department');
  const fullName      = `${watchedFirst} ${watchedLast}`.trim() || 'No name';

  // ── Save profile ─────────────────────────────────────────────────────────
  const onSubmitProfile = async (data: ProfileValues) => {
    if (!userId) { toast.error('Not authenticated'); return; }
    setSaving(true);
    try {
      // Save name to backend
      await apiClient.patch(`/auth/users/${userId}`, {
        firstName: data.firstName,
        lastName:  data.lastName,
      });

      // Save extra fields (phone, bio, jobTitle, department) to localStorage
      const extras = { phone: data.phone, bio: data.bio, jobTitle: data.jobTitle, department: data.department };
      localStorage.setItem(profileExtrasKey(userId), JSON.stringify(extras));

      toast.success('Profile saved successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // ── Save notifications ────────────────────────────────────────────────────
  const onSubmitNotif = (data: NotifValues) => {
    setSavingNotif(true);
    try {
      localStorage.setItem(notifPrefsKey(userId), JSON.stringify(data));
      toast.success('Notification preferences saved');
    } catch {
      toast.error('Failed to save preferences');
    } finally {
      setSavingNotif(false);
    }
  };

  // ── Avatar upload ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected if needed
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      // Compress via canvas to keep well under localStorage quota
      const img = new Image();
      img.onload = () => {
        const MAX = 256;
        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        setProfileImage(compressed);
        try {
          if (userId) localStorage.setItem(`profile_img_${userId}`, compressed);
          toast.success('Profile picture updated');
        } catch {
          toast.error('Image too large to save — try a smaller file');
        }
        setShowUpload(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Load saved avatar on mount
  useEffect(() => {
    if (userId) {
      const saved = localStorage.getItem(`profile_img_${userId}`);
      if (saved) setProfileImage(saved);
    }
  }, [userId]);

  const formatRole = (role?: string) => {
    if (!role) return '';
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  return (
    <MainLayout pageTitle="My Profile">
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">

          {/* ── Summary Card ─────────────────────────────────────────────── */}
          <Card className="w-full md:w-1/3">
            <CardHeader className="pb-4">
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center pb-6">
              <Avatar className="h-24 w-24 mb-4">
                {profileImage && <AvatarImage src={profileImage} alt={fullName} />}
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                  {getInitials(fullName)}
                </AvatarFallback>
              </Avatar>

              <h3 className="text-xl font-semibold">{fullName}</h3>
              {watchedTitle && <p className="text-muted-foreground text-sm">{watchedTitle}</p>}
              {watchedDept  && <p className="text-xs text-muted-foreground mt-0.5">{watchedDept}</p>}
              {user?.role   && <Badge variant="secondary" className="mt-2">{formatRole(user.role)}</Badge>}

              <div className="w-full mt-6 space-y-2 text-left">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{watchedEmail}</span>
                </div>
                {watchedPhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{watchedPhone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <div className="w-full md:w-2/3">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile Information</TabsTrigger>
                <TabsTrigger value="notifications">Notification Settings</TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">

                        {/* Avatar */}
                        <div className="flex flex-col items-center pb-6 border-b">
                          <div className="relative mb-3">
                            <Avatar className="h-24 w-24 cursor-pointer" onClick={() => setShowUpload(true)}>
                              {profileImage && <AvatarImage src={profileImage} alt={fullName} />}
                              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                {getInitials(fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <Button type="button" size="icon" variant="outline"
                              className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background"
                              onClick={() => setShowUpload(true)}>
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground">Click the camera icon to update your photo</p>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>

                        {/* Upload modal */}
                        {showUpload && (
                          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-background rounded-xl p-6 w-full max-w-sm shadow-xl">
                              <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold">Update Profile Picture</h3>
                                <Button variant="ghost" size="icon" onClick={() => setShowUpload(false)}><X className="h-4 w-4" /></Button>
                              </div>
                              <div className="flex flex-col items-center gap-4 py-4">
                                <Avatar className="h-28 w-28">
                                  {profileImage && <AvatarImage src={profileImage} alt={fullName} />}
                                  <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                                    {getInitials(fullName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex gap-2">
                                  <Button type="button" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="h-4 w-4 mr-2" />Upload Photo
                                  </Button>
                                  {profileImage && (
                                    <Button type="button" variant="outline" onClick={() => {
                                      setProfileImage(null);
                                      if (userId) localStorage.removeItem(`profile_img_${userId}`);
                                      toast.success('Profile picture removed');
                                      setShowUpload(false);
                                    }}>
                                      <X className="h-4 w-4 mr-2" />Remove
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <Button variant="outline" onClick={() => setShowUpload(false)}>Close</Button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Name */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={profileForm.control} name="firstName" render={({ field }) => (
                            <FormItem>
                              <FormLabel>First Name</FormLabel>
                              <FormControl><Input placeholder="First name" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={profileForm.control} name="lastName" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Last Name</FormLabel>
                              <FormControl><Input placeholder="Last name" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        {/* Email + Phone */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={profileForm.control} name="email" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl><Input type="email" placeholder="your@email.com" {...field} disabled /></FormControl>
                              <FormDescription>Email cannot be changed here.</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={profileForm.control} name="phone" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone</FormLabel>
                              <FormControl><Input placeholder="+44 20 1234 5678" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        {/* Bio */}
                        <FormField control={profileForm.control} name="bio" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bio</FormLabel>
                            <FormControl>
                              <Textarea placeholder="A short description about yourself" className="resize-none min-h-[90px]" {...field} />
                            </FormControl>
                            <FormDescription>Brief description for your profile.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />

                        {/* Job title + Department */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField control={profileForm.control} name="jobTitle" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Title</FormLabel>
                              <FormControl><Input placeholder="e.g. Store Manager" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                          <FormField control={profileForm.control} name="department" render={({ field }) => (
                            <FormItem>
                              <FormLabel>Department</FormLabel>
                              <FormControl><Input placeholder="e.g. Sales" {...field} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )} />
                        </div>

                        <Button type="submit" disabled={saving} className="flex items-center gap-2">
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {saving ? 'Saving…' : 'Save Changes'}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose how you want to be notified</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...notifForm}>
                      <form onSubmit={notifForm.handleSubmit(onSubmitNotif)} className="space-y-4">

                        {[
                          { name: 'emailNotifications' as const, label: 'Email Notifications', desc: 'Receive notifications via email' },
                          { name: 'smsNotifications'   as const, label: 'SMS Notifications',   desc: 'Receive notifications via SMS' },
                          { name: 'pushNotifications'  as const, label: 'Push Notifications',  desc: 'Receive in-app push notifications' },
                        ].map(({ name, label, desc }) => (
                          <FormField key={name} control={notifForm.control} name={name} render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <FormLabel className="text-base">{label}</FormLabel>
                                <FormDescription>{desc}</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )} />
                        ))}

                        <Separator />
                        <h3 className="text-base font-semibold">Notification Types</h3>

                        {[
                          { name: 'weeklyDigest'    as const, label: 'Weekly Digest',     desc: 'A weekly summary of activities' },
                          { name: 'mentionAlerts'   as const, label: 'Mention Alerts',    desc: 'When someone mentions you' },
                          { name: 'paymentReminders' as const, label: 'Payment Reminders', desc: 'Reminders about upcoming payments' },
                        ].map(({ name, label, desc }) => (
                          <FormField key={name} control={notifForm.control} name={name} render={({ field }) => (
                            <FormItem className="flex items-center justify-between rounded-lg border p-4">
                              <div>
                                <FormLabel className="text-base">{label}</FormLabel>
                                <FormDescription>{desc}</FormDescription>
                              </div>
                              <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                            </FormItem>
                          )} />
                        ))}

                        <Button type="submit" disabled={savingNotif} className="flex items-center gap-2">
                          {savingNotif ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          {savingNotif ? 'Saving…' : 'Save Preferences'}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProfilePage;
