"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { deleteAccount } from "@/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DangerZoneSettingsProps {
  role: "customer" | "manufacturer";
}

export function DangerZoneSettings({ role }: DangerZoneSettingsProps) {
  const { logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      await deleteAccount();
      toast.success("Account deleted successfully");
      logout();
    } catch (error) {
      toast.error("Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-destructive/20 bg-destructive/[0.02]">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg font-black text-destructive tracking-tighter">
            Danger Zone
          </CardTitle>
        </div>
        <CardDescription>
          Critical actions for your account management.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-black text-muted-foreground/50 px-1">
            Session Management
          </h3>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 rounded-2xl h-14 px-6 font-bold border-destructive/10 text-destructive hover:bg-destructive/5 transition-all"
            onClick={logout}
          >
            <LogOut className="h-5 w-5" />
            Sign out of all devices
          </Button>
        </div>

        <div className="pt-6 border-t border-destructive/10 space-y-4">
          <h3 className="text-sm font-black text-muted-foreground/50 px-1">
            Permanent Deletion
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed px-1">
            Deleting your account is permanent. All associated{" "}
            {role === "manufacturer"
              ? "batch data, team links,"
              : "medication history"}{" "}
            and personal information will be wiped from our secure servers.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full justify-start gap-3 rounded-2xl h-14 px-6 bg-destructive hover:bg-destructive shadow-lg shadow-destructive/20 active:scale-95 transition-all"
              >
                <Shield className="h-5 w-5" />
                Delete {role === "manufacturer"
                  ? "Manufacturer"
                  : "Personal"}{" "}
                Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2.5rem] p-8 border-destructive/20 shadow-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-2xl font-black text-destructive tracking-tighter">
                  Final Security Check
                </AlertDialogTitle>
                <AlertDialogDescription className="text-base text-muted-foreground/80 mt-2 font-medium">
                  This action is irreversible. You will lose access to all your
                  {role === "manufacturer"
                    ? " batch registration history and cryptographic keys."
                    : " saved medications and verification history."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-8 gap-3">
                <AlertDialogCancel className="rounded-full h-12 px-8 font-bold border-muted">
                  Keep My Account
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  className="rounded-full h-12 px-8 text-xs bg-destructive hover:bg-destructive/90"
                >
                  Yes, Wipe Everything
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
