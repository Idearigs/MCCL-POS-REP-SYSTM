import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import IntroAnimation from "@/components/ui/intro-animation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, User, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

// Define the form schema with Zod
const formSchema = z.object({
  username: z.string().min(1, { message: "Username is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Define the form values type
type FormValues = z.infer<typeof formSchema>;

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [showIntroAnimation, setShowIntroAnimation] = useState(false);
  
  // Animate the login form after component mounts
  useEffect(() => {
    const timer = setTimeout(() => setShowLoginForm(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Initialize the form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setLoginError("");
    
    try {
      console.log("Login attempt with:", data);
      
      // Simulating a network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use the login function from auth context
      const success = login(data.username, data.password);
      
      if (success) {
        // Login successful
        toast({
          title: "Login successful",
          description: "Welcome to MCCL POS System",
        });
        
        // Show intro animation instead of navigating immediately
        setShowIntroAnimation(true);
        // Navigation will happen after the intro animation completes
      } else {
        // Login failed
        setLoginError("Invalid username or password");
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid username or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      {showIntroAnimation && <IntroAnimation targetRoute="/" />}
      {/* Simple background with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50 to-gray-100 opacity-80"></div>

      {/* Logo */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="absolute top-8 left-8 md:top-12 md:left-12 z-10"
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-primary flex items-center justify-center shadow-sm">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl tracking-tight text-gray-800">MCCL POS</span>
            <span className="text-xs text-gray-500">Point of Sale System</span>
          </div>
        </div>
      </motion.div>
      
      <div className="w-full max-w-md z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: showLoginForm ? 1 : 0, y: showLoginForm ? 0 : 10 }}
          transition={{ duration: 0.4 }}
          className="w-full"
        >
          <Card className="w-full bg-white border border-gray-200 shadow-md rounded-lg overflow-hidden">
            <div className="h-1 bg-primary w-full"></div>
            <CardHeader className="space-y-2 pb-4 pt-6">
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <CardTitle className="text-2xl font-bold text-center text-gray-800">
                  Welcome Back
                </CardTitle>
                <CardDescription className="text-center mt-2 text-gray-500">
                  Sign in to access your account
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent className="pt-2 pb-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-sm font-medium text-gray-700">Username</FormLabel>
                          <div className="relative group">
                            <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-primary transition-colors duration-200">
                              <User className="h-5 w-5" />
                            </div>
                            <FormControl>
                              <Input 
                                placeholder="admin" 
                                className="pl-10 h-11 bg-white focus:bg-white transition-all duration-200 rounded-md border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary/20" 
                                {...field} 
                                disabled={isLoading}
                              />
                            </FormControl>
                          </div>
                          <FormMessage className="text-xs font-medium text-red-500" />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                  >
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <div className="flex justify-between items-center">
                            <FormLabel className="text-sm font-medium text-gray-700">Password</FormLabel>
                            <a href="#" className="text-xs text-primary hover:text-primary/80 transition-colors duration-200">
                              Forgot password?
                            </a>
                          </div>
                          <div className="relative group">
                            <div className="absolute left-3 top-3 text-gray-400 group-focus-within:text-primary transition-colors duration-200">
                              <LockKeyhole className="h-5 w-5" />
                            </div>
                            <FormControl>
                              <Input 
                                type={showPassword ? "text" : "password"}
                                placeholder="••••••••" 
                                className="pl-10 h-11 bg-white focus:bg-white transition-all duration-200 rounded-md border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary/20"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className={cn(
                                "absolute right-3 top-3 transition-colors duration-200",
                                showPassword ? "text-primary" : "text-gray-400 hover:text-gray-500"
                              )}
                              tabIndex={-1}
                            >
                              {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                              ) : (
                                <Eye className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <FormMessage className="text-xs font-medium text-red-500" />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                  >
                    <Button 
                      type="submit" 
                      className="w-full h-11 mt-4 text-base font-medium bg-primary hover:bg-primary/90 shadow-sm border-0 rounded-md transition-all duration-200" 
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Signing in...</span>
                        </div>
                      ) : (
                        <span>Sign in</span>
                      )}
                    </Button>
                  </motion.div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="flex flex-col gap-5 pt-0 pb-6">
              {/* Social login options removed as requested */}
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="text-xs text-center text-gray-500 mt-4"
              >
                Don't have an account? <a href="#" className="text-primary hover:text-primary/80 transition-all duration-200">Contact administrator</a>
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
                className="flex justify-center mt-4"
              >
                <p className="text-xs text-gray-500">© {new Date().getFullYear()} MCCL POS System. All rights reserved.</p>
              </motion.div>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
