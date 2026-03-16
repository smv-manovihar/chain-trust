"use client";

import { ManufacturerSidebar, MobileSidebar } from "@/components/layout/manufacturer-sidebar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/user-nav";

export default function ManufacturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-foreground selection:bg-primary/20">
      <ManufacturerSidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header Layer */}
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md md:px-6 shadow-sm">
          <MobileSidebar />
          
          <div className="flex-1 flex items-center justify-end gap-2 md:gap-4">
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
