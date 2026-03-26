"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { resendVerificationEmail } from "@/api/auth.api";
import { 
  InputOTP, 
  InputOTPGroup, 
  InputOTPSlot 
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Mail, RefreshCw, CheckCircle2, Loader2, Lock, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { AuthLayout } from "@/components/layout/auth-layout";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser, verifyEmailWithToken, verifyEmailWithOTP, changeEmail, isLoading } = useAuth();
  
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isLinkVerified, setIsLinkVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const verifyAbortRef = useRef<AbortController | null>(null);

  const email = user?.email || searchParams.get("email") || "";
  const token = searchParams.get("token");

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Handle direct link verification if token is present
  useEffect(() => {
    const verifyToken = async () => {
      if (token && !isLinkVerified) {
        if (verifyAbortRef.current) verifyAbortRef.current.abort();
        const controller = new AbortController();
        verifyAbortRef.current = controller;

        setIsVerifying(true);
        try {
          toast.info("Verifying link...");
          
          await verifyEmailWithToken(token);

          if (controller.signal.aborted) return;

          setIsLinkVerified(true);
          toast.success("Account verified!");
          
          // Small delay to show success state before redirecting
          setTimeout(() => {
            const currentRole = user?.role || "customer";
            router.push(currentRole === "manufacturer" ? "/manufacturer" : "/customer");
          }, 800);
          
        } catch (error: any) {
          if (error.name === 'AbortError') return;
          toast.error(error.message || "Verification failed");
        } finally {
          if (verifyAbortRef.current === controller) {
            setIsVerifying(false);
          }
        }
      }
    };
    verifyToken();
    return () => verifyAbortRef.current?.abort();
  }, [token, isLinkVerified, verifyEmailWithToken, router, user?.role]);

  const handleOtpSubmit = async (value: string) => {
    if (value.length !== 6) return;
    
    setIsVerifying(true);
    try {
      await verifyEmailWithOTP({ email, otp: value });
      toast.success("Identity Verified", {
        description: "Your account is now secure."
      });
      
      // Small delay to show success state
      setTimeout(() => {
        const currentRole = user?.role || "customer";
        router.push(currentRole === "manufacturer" ? "/manufacturer" : "/customer");
      }, 500);
      
    } catch (error: any) {
      toast.error("Invalid Code", {
        description: error.message || "Please check the code and try again."
      });
      setOtp("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await resendVerificationEmail({ email, method: "otp" });
      toast.success("New Code Sent", {
        description: "Please check your inbox."
      });
      setCountdown(60);
    } catch (error: any) {
      toast.error("Failed to resend", {
        description: error.message
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || newEmail === email) {
        setIsEditingEmail(false);
        return;
    }
    setIsUpdatingEmail(true);
    try {
        await changeEmail(email, newEmail);
        setIsEditingEmail(false);
        setOtp("");
        setCountdown(0);
    } catch (err) {
        // Error toast already shown in context
    } finally {
        setIsUpdatingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthLayout 
      title="Verify Your Identity" 
      subtitle={isEditingEmail ? "Update your email address below" : `We've sent a 6-digit code to ${email}`}
    >
      <div className="flex flex-col items-center space-y-8 py-4">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-2 border border-primary/20">
          <Mail className="w-8 h-8 text-primary" />
        </div>

        {isEditingEmail ? (
            <div className="w-full space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground ml-1">New Email Address</label>
                    <input 
                        type="email"
                        className="w-full h-12 px-4 rounded-xl border border-border bg-muted/30 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                        placeholder="new-email@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        autoFocus
                    />
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant="ghost" 
                        className="flex-1" 
                        onClick={() => setIsEditingEmail(false)}
                        disabled={isUpdatingEmail}
                    >
                        Cancel
                    </Button>
                    <Button 
                        className="flex-1 bg-primary text-white" 
                        onClick={handleChangeEmail}
                        disabled={isUpdatingEmail || !newEmail || newEmail === email}
                    >
                        {isUpdatingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Email"}
                    </Button>
                </div>
            </div>
        ) : (
            <div className="relative group">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(val) => {
                  setOtp(val);
                  if (val.length === 6) handleOtpSubmit(val);
                }}
                disabled={isVerifying}
              >
                <InputOTPGroup className="gap-2 sm:gap-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot 
                      key={i} 
                      index={i} 
                      className="w-10 h-14 sm:w-12 sm:h-16 text-xl font-bold rounded-xl border-border bg-muted/30 focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              
              {isVerifying && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-xl backdrop-blur-[2px]">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              )}
            </div>
        )}

        <div className="flex flex-col w-full space-y-4">
          <AnimatePresence>
            {isLinkVerified && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-600"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Link verification successful</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isEditingEmail && (
              <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                      variant="outline" 
                      className="flex-1 h-12 rounded-xl"
                      onClick={handleResend}
                      disabled={isResending || countdown > 0}
                  >
                      {isResending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <RefreshCw className={`mr-2 h-4 w-4 ${countdown > 0 ? 'opacity-50' : ''}`} />
                      )}
                      {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
                  </Button>
                  
                  <Button 
                      className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      onClick={() => handleOtpSubmit(otp)}
                      disabled={isVerifying || otp.length !== 6}
                  >
                      Verify
                      <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
              </div>
          )}
        </div>

        <div className="pt-4 border-t border-border w-full text-center">
          <p className="text-sm text-muted-foreground">
              {isEditingEmail ? "Entered the wrong email?" : "Did not receive the email?"} 
              <button 
                  onClick={() => {
                      if (isEditingEmail) {
                          setIsEditingEmail(false);
                      } else {
                          setIsEditingEmail(true);
                          setNewEmail(email);
                      }
                  }}
                  className="text-primary hover:underline ml-1 font-medium"
              >
                  {isEditingEmail ? "Go back" : "Edit email address"}
              </button>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
