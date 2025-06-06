import React, { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, User, Mail, Phone, MapPin, Camera, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Form schema
const profileFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  displayName: z.string().min(2, {
    message: "Display name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().min(6, {
    message: "Phone number must be at least 6 digits.",
  }),
  bio: z.string().optional(),
  jobTitle: z.string().min(2, {
    message: "Job title must be at least 2 characters.",
  }),
  department: z.string().min(2, {
    message: "Department must be at least 2 characters.",
  }),
});

const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  pushNotifications: z.boolean().default(true),
  weeklyDigest: z.boolean().default(true),
  mentionAlerts: z.boolean().default(true),
  paymentReminders: z.boolean().default(true),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type NotificationPreferencesValues = z.infer<typeof notificationPreferencesSchema>;

const ProfilePage: React.FC = () => {
  const { auth } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [isUploading, setIsUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>("https://github.com/shadcn.png");
  const [showImageUpload, setShowImageUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "Staff Member",
      displayName: "Staff",
      email: "staff@idearigs.com",
      phone: "+94 77 123 4567",
      bio: "System administrator at Idearigs Pvt Ltd.",
      jobTitle: "System Administrator",
      department: "IT Department",
    },
  });

  // Notification preferences form
  const notificationForm = useForm<NotificationPreferencesValues>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      weeklyDigest: true,
      mentionAlerts: true,
      paymentReminders: true,
    },
  });

  // Form submission handlers
  const onSubmitProfile = (data: ProfileFormValues) => {
    toast.success("Profile updated successfully");
    console.log(data);
  };

  const onSubmitNotifications = (data: NotificationPreferencesValues) => {
    toast.success("Notification preferences updated successfully");
    console.log(data);
  };

  const handleAvatarClick = () => {
    setShowImageUpload(true);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        setIsUploading(false);
        if (event.target?.result) {
          setProfileImage(event.target.result as string);
          toast.success("Profile picture updated successfully");
          setShowImageUpload(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    toast.success("Profile picture removed");
    setShowImageUpload(false);
  };

  return (
    <MainLayout pageTitle="My Profile">
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          {/* Profile Summary Card */}
          <Card className="w-full md:w-1/3">
            <CardHeader className="pb-4">
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information and settings</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center pb-6">
              <div className="relative mb-4">
                <Avatar className="h-24 w-24">
                  {profileImage ? (
                    <AvatarImage src={profileImage} alt="Profile" />
                  ) : (
                    <AvatarFallback className="text-2xl">{profileForm.getValues().fullName.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                  )}
                </Avatar>
              </div>
              <h3 className="text-xl font-semibold">{profileForm.getValues().fullName}</h3>
              <p className="text-muted-foreground">{profileForm.getValues().jobTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{profileForm.getValues().department}</p>
              
              <div className="w-full mt-6 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profileForm.getValues().email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{profileForm.getValues().phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Colombo, Sri Lanka</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings Tabs */}
          <div className="w-full md:w-2/3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile Information</TabsTrigger>
                <TabsTrigger value="notifications">Notification Settings</TabsTrigger>
              </TabsList>
              
              {/* Profile Information Tab */}
              <TabsContent value="profile" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...profileForm}>
                      <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-6">
                        <div className="flex flex-col items-center mb-6 pb-6 border-b">
                          <div className="relative mb-4">
                            <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
                              {profileImage ? (
                                <AvatarImage src={profileImage} alt="Profile" />
                              ) : (
                                <AvatarFallback className="text-2xl">{profileForm.getValues().fullName.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                              )}
                            </Avatar>
                            <Button 
                              size="icon" 
                              variant="outline" 
                              className="absolute bottom-0 right-0 rounded-full h-8 w-8 bg-background"
                              onClick={handleAvatarClick}
                              disabled={isUploading}
                            >
                              {isUploading ? (
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Camera className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">Click on the avatar or camera icon to update your profile picture</p>
                          
                          {/* Hidden file input */}
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileInputChange}
                          />
                          
                          {/* Image upload modal */}
                          {showImageUpload && (
                            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                              <div className="bg-background rounded-lg p-6 w-full max-w-md">
                                <div className="flex justify-between items-center mb-4">
                                  <h3 className="text-lg font-semibold">Update Profile Picture</h3>
                                  <Button variant="ghost" size="icon" onClick={() => setShowImageUpload(false)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                
                                <div className="flex flex-col items-center justify-center gap-4 py-6">
                                  <Avatar className="h-32 w-32">
                                    {profileImage ? (
                                      <AvatarImage src={profileImage} alt="Profile" />
                                    ) : (
                                      <AvatarFallback className="text-4xl">{profileForm.getValues().fullName.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                                    )}
                                  </Avatar>
                                  
                                  <div className="flex gap-2 mt-4">
                                    <Button 
                                      onClick={triggerFileInput}
                                      className="flex items-center gap-2"
                                    >
                                      <Upload size={16} />
                                      Upload Photo
                                    </Button>
                                    
                                    {profileImage && (
                                      <Button 
                                        variant="outline" 
                                        onClick={removeProfileImage}
                                        className="flex items-center gap-2"
                                      >
                                        <X size={16} />
                                        Remove
                                      </Button>
                                    )}
                                  </div>
                                  
                                  <p className="text-sm text-muted-foreground mt-2">
                                    Recommended: Square image, at least 300x300 pixels
                                  </p>
                                </div>
                                
                                <div className="flex justify-end gap-2 mt-4">
                                  <Button variant="outline" onClick={() => setShowImageUpload(false)}>Cancel</Button>
                                  <Button onClick={() => setShowImageUpload(false)}>Save</Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Full Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your full name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="displayName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Display Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your display name" {...field} />
                                </FormControl>
                                <FormDescription>
                                  This is the name that will be displayed to other users.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your email" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your phone number" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <FormField
                          control={profileForm.control}
                          name="bio"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Bio</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Tell us a little bit about yourself" 
                                  className="resize-none min-h-[100px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormDescription>
                                Brief description for your profile.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={profileForm.control}
                            name="jobTitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your job title" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your department" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <Button type="submit" className="flex items-center gap-2">
                          <Save size={16} />
                          Save Changes
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Notification Settings Tab */}
              <TabsContent value="notifications" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Manage how you receive notifications</CardDescription>
                  </CardHeader>
                  <CardContent>
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
                                  Receive notifications via email
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
                                  Receive notifications via SMS
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
                          name="pushNotifications"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Push Notifications</FormLabel>
                                <FormDescription>
                                  Receive push notifications in the app
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
                        
                        <Separator />
                        <h3 className="text-lg font-medium">Notification Types</h3>
                        
                        <FormField
                          control={notificationForm.control}
                          name="weeklyDigest"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Weekly Digest</FormLabel>
                                <FormDescription>
                                  Receive a weekly summary of activities
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
                          name="mentionAlerts"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Mention Alerts</FormLabel>
                                <FormDescription>
                                  Receive notifications when you are mentioned
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
                          name="paymentReminders"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">Payment Reminders</FormLabel>
                                <FormDescription>
                                  Receive reminders about upcoming payments
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
                        
                        <Button type="submit" className="flex items-center gap-2">
                          <Save size={16} />
                          Save Preferences
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
