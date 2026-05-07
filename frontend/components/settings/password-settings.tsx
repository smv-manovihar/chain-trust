"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Shield, Loader2, Lock } from "lucide-react";
import { changePassword } from "@/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";

// Password schema is now dynamic within the component to handle hasPassword state

export function PasswordSettings() {
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const hasPassword = user?.hasPassword ?? true;

  const passwordSchema = z
    .object({
      currentPassword: hasPassword 
        ? z.string().min(1, "Current password is required") 
        : z.string().optional(),
      newPassword: z.string().min(8, "Password must be at least 8 characters"),
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    });

  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof passwordSchema>) => {
    setIsLoading(true);
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success(hasPassword ? "Password Updated" : "Password Set", {
        description: hasPassword 
          ? "Your security credentials have been refreshed."
          : "You can now use this password to log in via email.",
      });
      await refreshUser();
      form.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast.error(hasPassword ? "Update Failed" : "Setup Failed", {
        description:
          error.response?.data?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-black">
            {hasPassword ? "Change Password" : "Set Account Password"}
          </CardTitle>
        </div>
        <CardDescription>
          {hasPassword 
            ? "Ensure your account stays secure with a strong password."
            : "Set a password to enable traditional email login alongside your social account."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasPassword && (
          <div className="mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/10 flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-primary">Traditional Login Enabled</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You're currently using a social login. Setting a password allows you to log in manually using your email address as well.
              </p>
            </div>
          </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {hasPassword && (
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground/70">
                      Current Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        className="rounded-xl h-12 bg-muted/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground/70">
                      {hasPassword ? "New Password" : "Create Password"}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        className="rounded-xl h-12 bg-muted/20"
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
                    <FormLabel className="text-xs text-muted-foreground/70">
                      Confirm {hasPassword ? "New" : ""} Password
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        className="rounded-xl h-12 bg-muted/20"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border mt-6">
              <Button
                type="submit"
                disabled={isLoading}
                className="rounded-full px-8 h-12 shadow-lg shadow-primary/20"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {hasPassword ? "Update Credentials" : "Save Password"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
