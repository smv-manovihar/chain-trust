"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { verifyEmailWithOTP, resendVerificationEmail } from "@/api";
import { useAuth } from "@/contexts/auth-context";
import { Mail, RefreshCw, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface EmailVerificationModalProps {
  email: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function EmailVerificationModal({
  email,
  isOpen,
  onOpenChange,
  onSuccess,
}: EmailVerificationModalProps) {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { setUser } = useAuth();

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSubmit = async () => {
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await verifyEmailWithOTP({ email, otp });

      if (response && response.user) {
        setSuccess("Email verified successfully!");
        setUser(response.user);
        toast.success("Email verified successfully!");
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setError("Verification failed");
      }
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError("");

    try {
      const response = await resendVerificationEmail({
        email,
        method: "otp",
      });

      if (response.emailSent) {
        setSuccess("Verification email sent successfully!");
        toast.success("Verification code sent!");
        setCountdown(60); // 60 second cooldown
        setTimeout(() => setSuccess(""), 3000);
      } else {
        setError(response.message || "Failed to resend email");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend email");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-xl">Verify Your Email</DialogTitle>
          <DialogDescription>
            We sent a 6-digit verification code to
            <br />
            <span className="font-medium text-foreground">{email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4 py-4">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => {
              setOtp(value);
              setError("");
            }}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <XCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isLoading || otp.length !== 6}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? "Verifying..." : "Verify Email"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={isResending || countdown > 0}
            className="text-muted-foreground"
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : countdown > 0 ? (
              `Resend in ${countdown}s`
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" /> Resend Code
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
