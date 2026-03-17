"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateRole } from "@/api";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/layout/auth-layout";
import { useAuth } from "@/contexts/auth-context";
import {
  User,
  Building2,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "motion/react"; // Use motion/react as per project convention

export default function SelectRolePage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<
    "customer" | "manufacturer" | null
  >(null);

  const handleSelect = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    try {
      await updateRole(selectedRole);
      await refreshUser();

      if (selectedRole === "manufacturer") {
        router.push("/manufacturer");
      } else {
        router.push("/customer");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      // Handle error (maybe show toast)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Choose Your Path"
      subtitle="Select how you'll interact with the ChainTrust ecosystem to get started."
    >
      <div className="flex flex-col space-y-2 text-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome to ChainTrust
        </h1>
        <p className="text-sm text-muted-foreground">
          Select your account type to continue
        </p>
      </div>

      <div className="grid gap-4">
        {/* Customer Option */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50",
            selectedRole === "customer"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-muted bg-card hover:bg-muted/30",
          )}
          onClick={() => setSelectedRole("customer")}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "rounded-lg p-3 transition-colors",
                selectedRole === "customer"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold leading-none tracking-tight">
                Consumer
              </h3>
              <p className="text-sm text-muted-foreground">
                Verify medicines and report issues.
              </p>
            </div>
            {selectedRole === "customer" && (
              <div className="absolute top-4 right-4 text-primary animate-in fade-in zoom-in">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
          </div>
        </motion.div>

        {/* Manufacturer Option */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:border-primary/50",
            selectedRole === "manufacturer"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-muted bg-card hover:bg-muted/30",
          )}
          onClick={() => setSelectedRole("manufacturer")}
        >
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "rounded-lg p-3 transition-colors",
                selectedRole === "manufacturer"
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold leading-none tracking-tight">
                Manufacturer
              </h3>
              <p className="text-sm text-muted-foreground">
                Manage products and supply chain.
              </p>
            </div>
            {selectedRole === "manufacturer" && (
              <div className="absolute top-4 right-4 text-primary animate-in fade-in zoom-in">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <Button
        className="w-full mt-8 h-12 text-base shadow-lg shadow-primary/20"
        size="lg"
        disabled={!selectedRole || isLoading}
        onClick={handleSelect}
      >
        {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
        {isLoading ? (
          "Setting up..."
        ) : (
          <>
            Continue
            <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    </AuthLayout>
  );
}
