"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateRole } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { User, Building2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SelectRolePage() {
  const router = useRouter();
  const { refreshUser, user } = useAuth();
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
        router.push("/customer-home");
      }
    } catch (error) {
      console.error("Failed to update role:", error);
      // Handle error (maybe show toast)
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Welcome to PharmaSecure
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            How would you like to use the platform?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div
              className={cn(
                "cursor-pointer rounded-lg border-2 p-6 transition-all hover:border-primary",
                selectedRole === "customer"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-gray-200",
              )}
              onClick={() => setSelectedRole("customer")}
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="rounded-full bg-blue-100 p-4">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Customer</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    I want to verify medicines and report issues.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "cursor-pointer rounded-lg border-2 p-6 transition-all hover:border-primary",
                selectedRole === "manufacturer"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-gray-200",
              )}
              onClick={() => setSelectedRole("manufacturer")}
            >
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="rounded-full bg-purple-100 p-4">
                  <Building2 className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Manufacturer</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    I represent a pharmaceutical company.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Button
            className="w-full text-lg h-12"
            size="lg"
            disabled={!selectedRole || isLoading}
            onClick={handleSelect}
          >
            {isLoading ? (
              "Setting up..."
            ) : (
              <>
                Continue as{" "}
                {selectedRole
                  ? selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)
                  : "..."}
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
