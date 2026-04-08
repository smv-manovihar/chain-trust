"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Loader2,
  Mail,
} from "lucide-react";
import { requestPasswordReset } from "@/api";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError("");

    try {
      await requestPasswordReset(data.email);
      setSubmittedEmail(data.email);
      setSent(true);

      // Navigate to reset page after short delay so user can read success message
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(data.email)}`);
      }, 2000);
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Account recovery"
      subtitle="We'll send a secure one-time code to your inbox so you can set a new password."
    >
      <div className="flex flex-col space-y-2 text-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Forgot password?
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter your account email to receive a reset code
        </p>
      </div>

      {sent ? (
        /* ── Success state ── */
        <div className="flex flex-col items-center gap-4 py-4 animate-in fade-in zoom-in-95">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 ring-1 ring-green-500/20">
            <CheckCircle2 className="h-7 w-7 text-green-500" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-medium text-foreground">Reset code sent</p>
            <p className="text-sm text-muted-foreground">
              Check{" "}
              <span className="font-medium text-foreground">
                {submittedEmail}
              </span>{" "}
              for a 6-digit code.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Redirecting to the reset page…
          </p>
          <Button variant="outline" className="w-full mt-2" asChild>
            <Link
              href={`/reset-password?email=${encodeURIComponent(submittedEmail)}`}
            >
              Continue to Reset Password
            </Link>
          </Button>
        </div>
      ) : (
        /* ── Form state ── */
        <>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 text-destructive animate-in fade-in zoom-in-95">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-password-email"
                          type="email"
                          placeholder="name@example.com"
                          className="pl-9"
                          autoComplete="email"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                id="forgot-password-submit"
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isLoading ? "Sending reset code…" : "Send Reset Code"}
              </Button>
            </form>
          </Form>

          <div className="text-center pt-2">
            <Button
              variant="link"
              size="sm"
              className="text-muted-foreground gap-1.5"
              asChild
            >
              <Link href="/login">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Sign In
              </Link>
            </Button>
          </div>
        </>
      )}
    </AuthLayout>
  );
}
