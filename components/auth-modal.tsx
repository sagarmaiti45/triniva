"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, User, ArrowRight, X, Sparkles, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import Image from "next/image";
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
import { useGuestId } from "@/hooks/use-guest-id";

// Schema for login
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Schema for registration
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Schema for OTP
const otpSchema = z.object({
  otp: z.string().length(6, "OTP must be 6 digits"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;
type OTPFormData = z.infer<typeof otpSchema>;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const { executeRecaptcha } = useGoogleReCaptcha();
  const guestId = useGuestId();

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // OTP form
  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      otp: "",
    },
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Execute reCAPTCHA if available
      let recaptchaToken = null;
      if (executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha("login");
        } catch (error) {
          console.log("reCAPTCHA execution failed, proceeding without it");
        }
      }
      
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          recaptchaToken,
          guestId, // Include guest ID for account merging
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Check if user needs verification
        if (result.requiresVerification) {
          setUserEmail(result.email);
          
          // Try to send new OTP
          const otpResponse = await fetch("/api/auth/resend-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: result.email }),
          });
          
          const otpResult = await otpResponse.json();
          
          if (!otpResponse.ok) {
            // Check if rate limited
            if (otpResponse.status === 429) {
              toast.error("Too many attempts. Please try again after 1 hour.", {
                duration: 6000,
              });
            } else {
              toast.error(otpResult.error || "Failed to send verification code");
            }
            return;
          }
          
          // OTP sent successfully, show OTP screen
          setShowOTP(true);
          toast("Please verify your email. We've sent a new verification code.", {
            duration: 5000,
          });
          return;
        }
        throw new Error(result.error || "Login failed");
      }

      toast.success("Logged in successfully!");
      onClose();
      // Redirect or update user state
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      // Execute reCAPTCHA if available
      let recaptchaToken = null;
      if (executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha("register");
        } catch (error) {
          console.log("reCAPTCHA execution failed, proceeding without it");
        }
      }
      
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          recaptchaToken,
          guestId, // Include guest ID for account merging
        }),
      });

      const result = await response.json();
      console.log("Registration response:", { ok: response.ok, status: response.status, result });

      if (!response.ok && !result.requiresVerification) {
        throw new Error(result.error || "Registration failed");
      }

      // Show OTP verification
      setUserEmail(data.email);
      setShowOTP(true);
      
      if (result.requiresVerification) {
        toast("Account exists but not verified. We've sent a new verification code.", {
            duration: 5000,
          });
      } else {
        toast.success("Registration successful! Please check your email for OTP");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPVerify = async (data: OTPFormData) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          otp: data.otp,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "OTP verification failed");
      }

      toast.success("Email verified successfully!");
      setShowOTP(false);
      onClose();
      // Redirect or update user state
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "OTP verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error("Maximum attempts reached. Please try again after 1 hour.", {
            duration: 6000,
          });
        } else {
          toast.error(result.error || "Failed to resend OTP");
        }
        return;
      }

      toast.success("OTP sent to your email!");
    } catch (error) {
      toast.error("Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-full h-full p-0 border-0 bg-background/95 backdrop-blur-md [&>button]:hidden overflow-hidden">
        <div className="relative w-full h-full">
          <div className="flex h-full">
          {/* Left side - Image/Branding */}
          <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden">
            {/* Background image */}
            <div className="absolute inset-0">
              <Image
                src="/images/auth-bg.webp"
                alt="Authentication background"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-transparent" />
            </div>
            <div className="relative z-10 text-center px-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="mb-8 flex justify-center">
                  <div className="h-24 w-24 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-4">
                    <img src="/images/triniva.svg" alt="Triniva AI Logo" className="h-16 w-16" />
                  </div>
                </div>
                <h1 className="text-5xl font-bold text-white mb-4">Triniva AI</h1>
                <p className="text-xl text-white/80 mb-8">
                  Create stunning images with the power of AI
                </p>
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="text-center bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                    <div className="text-3xl font-bold text-white">500+</div>
                    <div className="text-sm text-white/70">Images Created</div>
                  </div>
                  <div className="text-center bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                    <div className="text-3xl font-bold text-white">50+</div>
                    <div className="text-sm text-white/70">Early Users</div>
                  </div>
                  <div className="text-center bg-black/30 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                    <div className="text-3xl font-bold text-white">5.0★</div>
                    <div className="text-sm text-white/70">Beta Rating</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Right side - Auth forms */}
          <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 md:right-8 md:top-8 z-50 rounded-full bg-gray-100 dark:bg-gray-800 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            
            <div className="w-full max-w-md">{/* Header for mobile */}
              <div className="lg:hidden text-center mb-8">
                <h1 className="text-3xl font-bold gradient-text mb-2">Triniva AI</h1>
              </div>

              <AnimatePresence mode="wait">
                {showOTP ? (
                  <motion.div
                    key="otp"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className="text-3xl font-bold tracking-tight">Verify your email</h2>
                      <p className="text-muted-foreground mt-2">
                        We've sent a verification code to<br />
                        <span className="font-medium text-foreground">{userEmail}</span>
                      </p>
                    </div>

                    <form onSubmit={otpForm.handleSubmit(handleOTPVerify)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="otp" className="text-sm font-medium">
                          Verification Code
                        </Label>
                        <Input
                          id="otp"
                          type="text"
                          placeholder="000000"
                          maxLength={6}
                          className="h-14 text-center text-2xl tracking-[0.5em] font-semibold"
                          {...otpForm.register("otp")}
                        />
                        {otpForm.formState.errors.otp && (
                          <p className="text-sm text-destructive">
                            {otpForm.formState.errors.otp.message}
                          </p>
                        )}
                      </div>

                      <Button
                        type="submit"
                        size="lg"
                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-gradient-start to-gradient-end hover:opacity-90 text-white"
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify Email
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>

                      <div className="space-y-3">
                        <div className="text-center">
                          <button
                            type="button"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            onClick={handleResendOTP}
                            disabled={isLoading}
                          >
                            Didn't receive the code? <span className="underline">Resend</span>
                          </button>
                        </div>
                        
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-border" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">or</span>
                          </div>
                        </div>
                        
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className="w-full h-12 text-base font-medium"
                          onClick={() => {
                            setShowOTP(false);
                            setUserEmail("");
                            otpForm.reset();
                          }}
                          disabled={isLoading}
                        >
                          Go Back
                        </Button>
                      </div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="auth"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-6"
                  >
                    <div className="text-center">
                      <h2 className="text-3xl font-bold tracking-tight">
                        {activeTab === "login" ? "Welcome back" : "Create an account"}
                      </h2>
                      <p className="text-muted-foreground mt-2">
                        {activeTab === "login" 
                          ? "Sign in to your account to continue" 
                          : "Get started with your free account"}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Tab buttons */}
                      <div className="flex rounded-lg bg-muted p-1">
                        <button
                          onClick={() => setActiveTab("login")}
                          className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                            activeTab === "login"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Sign In
                        </button>
                        <button
                          onClick={() => setActiveTab("register")}
                          className={`flex-1 rounded-md py-2 text-sm font-medium transition-all ${
                            activeTab === "register"
                              ? "bg-background text-foreground shadow-sm"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          Sign Up
                        </button>
                      </div>

                      {/* Forms */}
                      <AnimatePresence mode="wait">
                        {activeTab === "login" ? (
                          <motion.form
                            key="login"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            onSubmit={loginForm.handleSubmit(handleLogin)}
                            className="space-y-4"
                          >
                            <div className="space-y-2">
                              <Label htmlFor="login-email" className="text-sm font-medium">
                                Email address
                              </Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  id="login-email"
                                  type="email"
                                  placeholder="you@example.com"
                                  className="h-12 pl-11 text-base"
                                  {...loginForm.register("email")}
                                />
                              </div>
                              {loginForm.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                  {loginForm.formState.errors.email.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Label htmlFor="login-password" className="text-sm font-medium">
                                  Password
                                </Label>
                                <button
                                  type="button"
                                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Forgot password?
                                </button>
                              </div>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  id="login-password"
                                  type="password"
                                  placeholder="••••••••"
                                  className="h-12 pl-11 text-base"
                                  {...loginForm.register("password")}
                                />
                              </div>
                              {loginForm.formState.errors.password && (
                                <p className="text-sm text-destructive">
                                  {loginForm.formState.errors.password.message}
                                </p>
                              )}
                            </div>

                            <Button
                              type="submit"
                              size="lg"
                              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-gradient-start to-gradient-end hover:opacity-90 text-white"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Signing in...
                                </>
                              ) : (
                                <>
                                  <LogIn className="mr-2 h-4 w-4" />
                                  Sign In
                                </>
                              )}
                            </Button>
                          </motion.form>
                        ) : (

                          <motion.form
                            key="register"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onSubmit={registerForm.handleSubmit(handleRegister)}
                            className="space-y-4"
                          >
                            <div className="space-y-2">
                              <Label htmlFor="register-name" className="text-sm font-medium">
                                Full name
                              </Label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  id="register-name"
                                  type="text"
                                  placeholder="John Doe"
                                  className="h-12 pl-11 text-base"
                                  {...registerForm.register("name")}
                                />
                              </div>
                              {registerForm.formState.errors.name && (
                                <p className="text-sm text-destructive">
                                  {registerForm.formState.errors.name.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-email" className="text-sm font-medium">
                                Email address
                              </Label>
                              <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  id="register-email"
                                  type="email"
                                  placeholder="you@example.com"
                                  className="h-12 pl-11 text-base"
                                  {...registerForm.register("email")}
                                />
                              </div>
                              {registerForm.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                  {registerForm.formState.errors.email.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-password" className="text-sm font-medium">
                                Password
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  id="register-password"
                                  type="password"
                                  placeholder="••••••••"
                                  className="h-12 pl-11 text-base"
                                  {...registerForm.register("password")}
                                />
                              </div>
                              {registerForm.formState.errors.password && (
                                <p className="text-sm text-destructive">
                                  {registerForm.formState.errors.password.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-confirm-password" className="text-sm font-medium">
                                Confirm password
                              </Label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                  id="register-confirm-password"
                                  type="password"
                                  placeholder="••••••••"
                                  className="h-12 pl-11 text-base"
                                  {...registerForm.register("confirmPassword")}
                                />
                              </div>
                              {registerForm.formState.errors.confirmPassword && (
                                <p className="text-sm text-destructive">
                                  {registerForm.formState.errors.confirmPassword.message}
                                </p>
                              )}
                            </div>

                            <Button
                              type="submit"
                              size="lg"
                              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-gradient-start to-gradient-end hover:opacity-90 text-white"
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Creating account...
                                </>
                              ) : (
                                <>
                                  <User className="mr-2 h-4 w-4" />
                                  Create Account
                                </>
                              )}
                            </Button>

                            <div className="space-y-2">
                              <p className="text-xs text-center text-muted-foreground">
                                By signing up, you agree to our{" "}
                                <a href="#" className="underline hover:text-foreground">
                                  Terms of Service
                                </a>{" "}
                                and{" "}
                                <a href="#" className="underline hover:text-foreground">
                                  Privacy Policy
                                </a>
                              </p>
                              <p className="text-xs text-center text-muted-foreground">
                                This site is protected by reCAPTCHA and the Google{" "}
                                <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                                  Privacy Policy
                                </a>{" "}
                                and{" "}
                                <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                                  Terms of Service
                                </a>{" "}
                                apply.
                              </p>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}