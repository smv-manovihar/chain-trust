"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CustomerRegisterForm } from "@/components/auth/customer-register-form";
import { ManufacturerRegisterForm } from "@/components/auth/manufacturer-register-form";
import { Loader2 } from "lucide-react";

function RegisterContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get("role");

  if (role === "manufacturer") {
    return <ManufacturerRegisterForm />;
  }

  return <CustomerRegisterForm />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
