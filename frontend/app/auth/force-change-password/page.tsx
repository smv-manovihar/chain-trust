"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { changePassword } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/layout/auth-layout";

export default function ForceChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user, refreshUser, logout } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
      });

      // Update user state (clears mustChangePassword)
      await refreshUser();

      toast.success("Password changed successfully");
      router.push(
        user?.role === "manufacturer" ? "/manufacturer" : "/customer-home",
      );
    } catch (error: any) {
      toast.error("Failed to change password", {
        description:
          error.response?.data?.message || "Please check your current password",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Change Password"
      subtitle="For security, you must change your password to continue."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current-password">Current Password</Label>
          <Input
            id="current-password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            placeholder="Enter your temporary/current password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="new-password">New Password</Label>
          <Input
            id="new-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder="At least 8 characters"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirm Password</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Re-enter new password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Change Password & Continue
        </Button>

        <div className="text-center">
          <Button variant="link" type="button" onClick={() => logout()}>
            Sign Out
          </Button>
        </div>
      </form>
    </AuthLayout>
  );
}
