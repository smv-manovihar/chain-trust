"use client";

import React, { useState, useRef, Suspense, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/layout/auth-layout";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { resetPassword, requestPasswordReset } from "@/api";
import { toast } from "sonner";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const passwordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const RESEND_COOLDOWN = 60; // seconds

// ─── OTP Step ─────────────────────────────────────────────────────────────────

interface OtpStepProps {
  onConfirm: (otp: string) => void;
  onResend: () => void;
  resendCountdown: number;
  isResending: boolean;
  email: string;
}

function OtpStep({ onConfirm, onResend, resendCountdown, isResending, email }: OtpStepProps) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const otp = digits.join("");

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    // Paste support: full 6-digit string into first box
    if (value.length === 6 && index === 0) {
      const ds = value.slice(0, 6).split("");
      setDigits(ds);
      refs.current[5]?.focus();
      return;
    }
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    if (value && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = () => {
    if (otp.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError("");
    onConfirm(otp);
  };

  return (
    <div className="space-y-5">
      {/* ── Email hint ── */}
      <p className="text-sm text-center text-muted-foreground">
        We sent a 6-digit code to{" "}
        <span className="font-medium text-foreground">{email}</span>
      </p>

      {/* ── Digit boxes ── */}
      <div className="flex gap-2 justify-between">
        {digits.map((d, i) => (
          <input
            key={i}
            id={`otp-digit-${i}`}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={[
              "flex h-12 w-full rounded-md border border-input bg-background",
              "text-center text-xl font-bold tabular-nums tracking-tight",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
              "transition-all duration-150",
            ].join(" ")}
            aria-label={`Reset code digit ${i + 1}`}
          />
        ))}
      </div>

      {error && (
        <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive animate-in fade-in zoom-in-95">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <Button
        id="otp-continue"
        type="button"
        className="w-full"
        onClick={handleSubmit}
        disabled={otp.length !== 6}
      >
        Continue
      </Button>

      {/* ── Resend ── */}
      <div className="flex items-center justify-between pt-1">
        <Button
          variant="link"
          size="sm"
          className="text-muted-foreground gap-1.5 px-0"
          asChild
        >
          <Link href="/forgot-password">
            <ArrowLeft className="h-3.5 w-3.5" />
            Change email
          </Link>
        </Button>

        <Button
          variant="link"
          size="sm"
          className="gap-1.5 px-0"
          type="button"
          onClick={onResend}
          disabled={isResending || resendCountdown > 0}
        >
          {isResending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : resendCountdown > 0 ? (
            <Clock className="h-3.5 w-3.5" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend code"}
        </Button>
      </div>
    </div>
  );
}

// ─── Password Step ────────────────────────────────────────────────────────────

interface PasswordStepProps {
  onSubmit: (newPassword: string) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  error: string;
}

function PasswordStep({ onSubmit, onBack, isLoading, error }: PasswordStepProps) {
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const handleSubmit = async (data: PasswordFormValues) => {
    await onSubmit(data.newPassword);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {error && (
          <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive animate-in fade-in zoom-in-95">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New Password</FormLabel>
              <FormControl>
                <Input
                  id="reset-new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  placeholder="Re-enter new password"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          id="reset-password-submit"
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? "Resetting password…" : "Reset Password"}
        </Button>

        <div className="text-center">
          <Button
            variant="link"
            size="sm"
            type="button"
            className="text-muted-foreground gap-1.5"
            onClick={onBack}
            disabled={isLoading}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Re-enter code
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Main form (uses searchParams — must be inside Suspense) ──────────────────

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  // Wizard step: "otp" | "password" | "success"
  const [step, setStep] = useState<"otp" | "password" | "success">("otp");
  const [confirmedOtp, setConfirmedOtp] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);

  // ── Countdown timer ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // ── Beforeunload guard ───────────────────────────────────────────────────────
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    e.preventDefault();
    // Modern browsers show their own generic message; setting returnValue triggers it
    e.returnValue = "";
  }, []);

  useEffect(() => {
    // Attach guard as soon as the user is on the reset flow (not on success)
    if (step !== "success") {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [step, handleBeforeUnload]);

  // ── Resend code ──────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (!email) return;
    setIsResending(true);
    try {
      await requestPasswordReset(email);
      toast.success("New code sent to your inbox.");
      setResendCountdown(RESEND_COOLDOWN);
      // Go back to OTP step and clear any confirmed OTP
      setStep("otp");
      setConfirmedOtp("");
      setSubmitError("");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  // ── OTP confirmed → move to password step ───────────────────────────────────
  const handleOtpConfirm = (otp: string) => {
    setConfirmedOtp(otp);
    setSubmitError("");
    setStep("password");
  };

  // ── Final submit ─────────────────────────────────────────────────────────────
  const handlePasswordSubmit = async (newPassword: string) => {
    if (!email) {
      setSubmitError("Email is missing. Please restart from the forgot password page.");
      return;
    }
    setIsLoading(true);
    setSubmitError("");
    try {
      await resetPassword({ email, otp: confirmedOtp, newPassword });
      // Remove beforeunload guard before navigating
      window.removeEventListener("beforeunload", handleBeforeUnload);
      setStep("success");
      toast.success("Password reset successfully");
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to reset password.";
      setSubmitError(message);
      // If OTP was wrong/expired, send user back to OTP step
      if (message.toLowerCase().includes("code") || message.toLowerCase().includes("otp")) {
        setStep("otp");
        setConfirmedOtp("");
        toast.error(message);
        setSubmitError("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success ──────────────────────────────────────────────────────────────────
  if (step === "success") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in-95">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20">
          <CheckCircle2 className="h-7 w-7 text-green-500" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-medium text-foreground">Password updated</p>
          <p className="text-sm text-muted-foreground">
            All sessions signed out for security. Redirecting to sign in…
          </p>
        </div>
        <Button className="w-full mt-2" asChild>
          <Link href="/login">Sign In Now</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* ── Step indicator ── */}
      <div className="flex items-center gap-3 mb-2">
        {/* Step 1 bubble */}
        <div className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
          step === "otp"
            ? "bg-primary text-primary-foreground"
            : "bg-primary/15 text-primary",
        ].join(" ")}>
          {step === "password" ? <KeyRound className="h-3.5 w-3.5" /> : "1"}
        </div>
        <div className={[
          "h-px flex-1 transition-colors",
          step === "password" ? "bg-primary" : "bg-border",
        ].join(" ")} />
        {/* Step 2 bubble */}
        <div className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
          step === "password"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground",
        ].join(" ")}>
          2
        </div>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        {step === "otp" ? "Step 1 of 2 — Verify your identity" : "Step 2 of 2 — Set your new password"}
      </p>

      {step === "otp" ? (
        <OtpStep
          email={email}
          onConfirm={handleOtpConfirm}
          onResend={handleResend}
          resendCountdown={resendCountdown}
          isResending={isResending}
        />
      ) : (
        <PasswordStep
          onSubmit={handlePasswordSubmit}
          onBack={() => { setStep("otp"); setSubmitError(""); }}
          isLoading={isLoading}
          error={submitError}
        />
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Verify your identity with the code we sent, then choose a new password."
    >
      <div className="flex flex-col space-y-2 text-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Check your inbox for a 6-digit code
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
