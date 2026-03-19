import React from "react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Card } from "@/components/ui/card";

interface AuthLayoutProps {
  children: React.ReactNode;
  image?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({
  children,
  title = "ChainTrust",
  subtitle = "Secure Pharmaceutical Supply Chain",
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden p-4 md:p-8">
      {/* Background Decor - Global grid is now in layout.tsx */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-full max-w-[1000px] grid md:grid-cols-2 rounded-3xl shadow-2xl border-border/50 overflow-hidden relative z-10 p-0">
        {/* Left: Branding & Info */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-muted/30 border-r border-border/50 relative overflow-hidden shrink-0">
          {/* Subtle texture for left panel */}
          <div className="absolute inset-0 bg-grid-pattern opacity-[0.5] z-0" />

          <div className="relative z-10 space-y-6">
            <BrandLogo size="md" />
            <div className="space-y-4 pt-4">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                {title}
              </h2>
              <p className="text-muted-foreground text-lg leading-relaxed text-balance">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-sm text-muted-foreground mt-12 font-medium">
            <div className="h-1 w-1 rounded-full bg-primary" />©{" "}
            {new Date().getFullYear()} ChainTrust
          </div>
        </div>

        {/* Right: Form Area */}
        <div className="flex flex-col p-6 md:p-12 bg-card w-full">
          {/* Mobile-only Logo */}
          <div className="md:hidden flex flex-col items-center space-y-2 mb-8 shrink-0">
            <BrandLogo size="sm" />
          </div>

          <div className="w-full max-w-sm mx-auto space-y-6 animate-fade-in-up my-auto">
            {children}
          </div>
        </div>
      </Card>
    </div>
  );
}
