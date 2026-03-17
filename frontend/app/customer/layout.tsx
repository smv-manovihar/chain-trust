"use client";

import { CustomerSidebar, MobileSidebar } from "@/components/layout/customer-sidebar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/user-nav";

import { BrandLogo } from "@/components/layout/brand-logo";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <CustomerSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Layer */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-md md:px-6 shadow-sm z-10">
          <div className="flex items-center gap-4 md:hidden">
            <MobileSidebar />
          </div>
          <div className="hidden md:block">
             {/* Layout balance spacer */}
          </div>
          
          <div className="flex items-center justify-end gap-2 md:gap-4 flex-1">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground transition-colors"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
              <span className="sr-only">Toggle notifications</span>
            </Button>
            <AnimatedThemeToggler />
            
            <div className="hidden border-l h-6 mx-2 border-border md:block" />
            
            <div className="flex items-center gap-2">
              <UserNav />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/5 p-4 md:p-6 lg:p-8 relative">
          <div className="mx-auto max-w-7xl w-full h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
