import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatures } from "@/contexts/FeatureContext";
import TenantSuspendedScreen from "@/components/auth/TenantSuspendedScreen";
import { z } from "zod";
import { useForm } from "react-hook-form";
import IntroAnimation from "@/components/ui/intro-animation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, User, Building2, KeyRound } from "lucide-react";

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
import {
  hasPinDevice,
  getPinDevice,
  setupPin,
  unlockPin,
  forgetPinDevice,
  isValidPin,
  PIN_LENGTH,
  PinUnlockError,
} from "@/lib/pinAuth";

// Define the form schema with Zod
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
  companySlug: z.string().min(1, { message: "Company code is required" }),
});

type FormValues = z.infer<typeof formSchema>;

type Mode = "password" | "pin" | "setup";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { auth, login, logout } = useAuth();
  const { reload: reloadFeatures } = useFeatures();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showIntroAnimation, setShowIntroAnimation] = useState(false);

  // Start on the PIN pad if this device has been set up for quick sign-in.
  const [mode, setMode] = useState<Mode>(() =>
    hasPinDevice() ? "pin" : "password",
  );
  const [pinDevice] = useState(() => getPinDevice());

  // PIN unlock state
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);

  // Set-PIN state (shown once after the first password login on a device)
  const [setupCtx, setSetupCtx] = useState<{ email: string; companySlug: string } | null>(null);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

  const redirectTarget = (): string => {
    const urlParams = new URLSearchParams(location.search);
    return (
      urlParams.get("redirect") ||
      location.state?.from?.pathname ||
      "/dashboard"
    );
  };

  // Note: we intentionally do NOT auto-redirect on auth here — after a PIN
  // unlock we hard-reload into the app, and password login uses the intro
  // animation below.

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "", password: "", companySlug: "" },
  });

  // ─── Password login ───────────────────────────────────────────────────────
  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    try {
      const success = await login(
        data.email,
        data.password,
        data.companySlug || undefined,
      );

      if (success) {
        toast({ title: "Login successful", description: "Welcome to TrueDesk" });
        reloadFeatures();
        // First password login on a device with no PIN yet → offer to set one.
        if (!hasPinDevice()) {
          setSetupCtx({ email: data.email, companySlug: data.companySlug });
          setMode("setup");
        } else {
          setShowIntroAnimation(true);
        }
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error: any) {
      if (error.code === "TENANT_SUSPENDED") return;
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ─── PIN quick unlock ─────────────────────────────────────────────────────
  const handlePinUnlock = async (enteredPin: string) => {
    setIsLoading(true);
    setPinError(null);
    try {
      // Verifies the PIN server-side and, on success, installs a fresh token
      // pair into the apiClient (throws PinUnlockError otherwise).
      await unlockPin(enteredPin);
      // Hard-reload into the app so AuthContext bootstraps from the fresh token.
      window.location.replace(redirectTarget());
    } catch (err) {
      const e = err as PinUnlockError;
      if (e.code === "LOCKED_OUT") {
        setMode("password");
        toast({
          title: "Too many attempts",
          description: "Quick sign-in is locked. Please use your password.",
          variant: "destructive",
        });
      } else if (e.code === "NETWORK") {
        setPin("");
        setPinError("Network error — check your connection and try again");
      } else {
        setPin("");
        setPinError(
          e.attemptsLeft != null
            ? `Incorrect PIN — ${e.attemptsLeft} ${e.attemptsLeft === 1 ? "try" : "tries"} left`
            : "Incorrect PIN",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onPinChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setPin(digits);
    setPinError(null);
    if (digits.length === PIN_LENGTH) void handlePinUnlock(digits);
  };

  // ─── Set a PIN (after first password login) ───────────────────────────────
  const handleSavePin = async () => {
    setSetupError(null);
    if (!isValidPin(newPin)) {
      setSetupError(`PIN must be ${PIN_LENGTH} digits`);
      return;
    }
    if (newPin !== confirmPin) {
      setSetupError("PINs do not match");
      return;
    }
    if (!setupCtx) {
      finishSetup();
      return;
    }
    try {
      await setupPin(newPin, {
        email: setupCtx.email,
        companySlug: setupCtx.companySlug,
      });
      toast({ title: "Quick sign-in enabled", description: "Next time, just enter your PIN." });
    } catch {
      // Non-fatal — proceed into the app either way.
    }
    finishSetup();
  };

  const finishSetup = () => {
    setNewPin("");
    setConfirmPin("");
    setShowIntroAnimation(true);
  };

  const handleIntroComplete = () => {
    navigate(redirectTarget(), { replace: true });
  };

  // Suspended tenant — full-screen suspension screen
  if (auth.tenantInfo?.status === "SUSPENDED") {
    return <TenantSuspendedScreen tenantInfo={auth.tenantInfo} onLogout={logout} />;
  }

  const pinInputClass =
    "text-center text-2xl tracking-[0.6em] font-semibold h-14 bg-slate-50 border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      {showIntroAnimation && (
        <IntroAnimation
          targetRoute={redirectTarget()}
          onComplete={handleIntroComplete}
        />
      )}

      <div className="w-full max-w-md mx-4">
        {/* Logo & Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9 text-white" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" strokeLinecap="round" />
                  <path d="M12 17v4" strokeLinecap="round" />
                  <path d="M6 8h4M6 11h8" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TrueDesk</h1>
          <p className="text-slate-500 text-sm mt-1">
            {mode === "pin"
              ? "Enter your PIN to continue"
              : mode === "setup"
                ? "Set a quick sign-in PIN"
                : "Sign in to your account"}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8">
          {/* ── PIN quick unlock ─────────────────────────────────────────── */}
          {mode === "pin" && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-3">
                  <KeyRound className="h-6 w-6" />
                </div>
                <p className="text-sm text-slate-500">
                  Signing in as{" "}
                  <span className="font-medium text-slate-700">{pinDevice?.email}</span>
                </p>
              </div>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                placeholder="● ● ● ● ● ●"
                className={pinInputClass}
                value={pin}
                disabled={isLoading}
                onChange={(e) => onPinChange(e.target.value)}
              />
              {pinError && (
                <p className="text-sm font-medium text-red-500 text-center">{pinError}</p>
              )}
              {isLoading && (
                <p className="text-sm text-slate-400 text-center">Signing in…</p>
              )}
              <div className="flex items-center justify-between text-sm pt-2">
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-700"
                  onClick={() => { setPin(""); setPinError(null); setMode("password"); }}
                >
                  Use password
                </button>
                <button
                  type="button"
                  className="text-slate-400 hover:text-red-500"
                  onClick={() => { void forgetPinDevice(); setPin(""); setPinError(null); setMode("password"); }}
                >
                  Forget this device
                </button>
              </div>
            </div>
          )}

          {/* ── Set a PIN ────────────────────────────────────────────────── */}
          {mode === "setup" && (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 text-center -mt-1">
                Next time on this device you can sign in with just a {PIN_LENGTH}-digit PIN.
              </p>
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                autoFocus
                placeholder="New PIN"
                className={pinInputClass}
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
              />
              <Input
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="Confirm PIN"
                className={pinInputClass}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH))}
              />
              {setupError && (
                <p className="text-sm font-medium text-red-500 text-center">{setupError}</p>
              )}
              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={finishSetup}
                >
                  Skip
                </Button>
                <Button
                  type="button"
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  onClick={handleSavePin}
                >
                  Save PIN
                </Button>
              </div>
            </div>
          )}

          {/* ── Password login ───────────────────────────────────────────── */}
          {mode === "password" && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="organization"
                            spellCheck={false}
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs font-medium text-red-500 mt-1.5 ml-1" />
                    </FormItem>
                  )}
                />

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
                            autoCapitalize="none"
                            autoCorrect="off"
                            autoComplete="email"
                            {...field}
                            disabled={isLoading}
                          />
                        </FormControl>
                      </div>
                      <FormMessage className="text-xs font-medium text-red-500 mt-1.5 ml-1" />
                    </FormItem>
                  )}
                />

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

                {hasPinDevice() && (
                  <button
                    type="button"
                    className="w-full text-sm text-slate-500 hover:text-slate-700 pt-1"
                    onClick={() => { setPinError(null); setPin(""); setMode("pin"); }}
                  >
                    Use PIN instead
                  </button>
                )}
              </form>
            </Form>
          )}
        </div>

        <p className="text-center text-sm text-slate-400 mt-8">
          © {new Date().getFullYear()} TrueDesk. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
