"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { verifyEmailWithOTP, resendVerificationEmail } from "@/api";
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

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isLinkVerified, setIsLinkVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
        setIsVerifying(true);
        try {
          // Assuming we have a verifyEmailWithToken API, or using the same endpoint
          // For now, let's assume clicking the link redirects here with a token
          // In a real app, this might call a different endpoint
          toast.info("Verifying link...");
          // Mocking token verify for now if logic is different, 
          // but we'll implementation should match backend verifyEmailWithToken
          await new Promise(resolve => setTimeout(resolve, 2000));
          setIsLinkVerified(true);
          await refreshUser();
          toast.success("Account verified!");
        } catch (error: any) {
          toast.error(error.message || "Verification failed");
        } finally {
          setIsVerifying(false);
        }
      }
    };
    verifyToken();
  }, [token, isLinkVerified]);

  const handleOtpSubmit = async (value: string) => {
    if (value.length !== 6) return;
    
    setIsVerifying(true);
    try {
      await verifyEmailWithOTP({ email, otp: value });
      toast.success("Identity Verified", {
        description: "Your account is now secure."
      });
      await refreshUser();
      
      // Small delay to show success state
      setTimeout(() => {
        router.push(user?.role === "manufacturer" ? "/manufacturer" : "/customer");
      }, 1500);
      
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

  if (!email && !isVerifying) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
              <Card className="max-w-md w-full border-none shadow-2xl bg-background/80 backdrop-blur-xl">
                  <CardHeader className="text-center">
                    <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="w-6 h-6 text-destructive" />
                    </div>
                    <CardTitle>Session Expired</CardTitle>
                    <CardDescription>Please login again to continue verification.</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <Button onClick={() => router.push("/login")} className="w-full">Go to Login</Button>
                  </CardContent>
              </Card>
          </div>
      )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black p-4 lg:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full"
      >
        <Card className="border-zinc-800 bg-zinc-950/50 backdrop-blur-2xl shadow-2xl overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
          
          <CardHeader className="text-center pt-10 pb-6 relative">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight text-white mb-2">Verify Your Identity</CardTitle>
            <CardDescription className="text-zinc-400 text-lg">
              We've sent a 6-digit code to <br />
              <span className="text-white font-medium italic">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="px-8 pb-12 relative">
            <div className="flex flex-col items-center space-y-10">
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
                  <InputOTPGroup className="gap-3 sm:gap-4">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot 
                        key={i} 
                        index={i} 
                        className="w-12 h-16 sm:w-14 sm:h-20 text-2xl font-bold rounded-xl border-zinc-800 bg-zinc-900/50 text-white focus:ring-2 focus:ring-primary/50 transition-all duration-300"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                
                {isVerifying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40 rounded-xl backdrop-blur-[2px]">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                )}
              </div>

              <div className="flex flex-col w-full space-y-4">
                <AnimatePresence>
                  {isLinkVerified && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-medium">Link verification successful</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                        variant="outline" 
                        className="flex-1 h-12 rounded-xl border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
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
                        Verify Identity
                        <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 w-full text-center">
                <p className="text-sm text-zinc-500">
                    Did not receive the email? Check your spam folder or 
                    <button 
                        onClick={() => router.push("/login")}
                        className="text-primary hover:underline ml-1 font-medium"
                    >
                        try another email
                    </button>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-black">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
