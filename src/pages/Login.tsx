import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import IntroAnimation from "@/components/ui/intro-animation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, User, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

// Define the form schema with Zod
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  companySlug: z.string().min(1, { message: "Company code is required" }),
});

// Define the form values type
type FormValues = z.infer<typeof formSchema>;

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { auth, login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showIntroAnimation, setShowIntroAnimation] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!auth.loading && auth.isAuthenticated) {
      const urlParams = new URLSearchParams(location.search);
      const redirectTo = urlParams.get('redirect') || location.state?.from?.pathname || '/dashboard';
      navigate(redirectTo, { replace: true });
    }
  }, [auth.loading, auth.isAuthenticated, navigate, location.state, location.search]);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      companySlug: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);

    try {
      const success = await login(data.email, data.password, data.companySlug || undefined);

      if (success) {
        toast({
          title: "Login successful",
          description: "Welcome to TrueDesk",
        });
        setShowIntroAnimation(true);
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error: any) {
      const errorMessage = error.message || "Invalid email or password";
      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle intro animation completion
  const handleIntroComplete = () => {
    const urlParams = new URLSearchParams(location.search);
    const redirectTo = urlParams.get('redirect') || location.state?.from?.pathname || '/dashboard';
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      {showIntroAnimation && (
        <IntroAnimation
          targetRoute={location.state?.from?.pathname || '/dashboard'}
          onComplete={handleIntroComplete}
        />
      )}

      {/* Login Card */}
      <div className="w-full max-w-md mx-4">
        {/* Logo & Branding */}
        <div className="text-center mb-10">
          {/* TruedeskPOS Logo */}
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              {/* Logo Icon */}
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="w-9 h-9 text-white"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" strokeLinecap="round" />
                  <path d="M12 17v4" strokeLinecap="round" />
                  <path d="M6 8h4M6 11h8" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Brand Name */}
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            TrueDesk
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Sign in to your account
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Company Code Field */}
              <FormField
                control={form.control}
                name="companySlug"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Company code"
                          className="pl-12 h-12 text-base bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs font-medium text-red-500 mt-1.5 ml-1" />
                  </FormItem>
                )}
              />

              {/* Email Field */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="Email address"
                          className="pl-12 h-12 text-base bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </div>
                    <FormMessage className="text-xs font-medium text-red-500 mt-1.5 ml-1" />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <LockKeyhole className="h-5 w-5" />
                      </div>
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          className="pl-12 pr-12 h-12 text-base bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <FormMessage className="text-xs font-medium text-red-500 mt-1.5 ml-1" />
                  </FormItem>
                )}
              />

              {/* Login Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <span>Sign In</span>
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-400 mt-8">
          © {new Date().getFullYear()} TrueDesk. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
