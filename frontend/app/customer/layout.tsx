"use client";

import {
  CustomerSidebar,
  MobileSidebar,
} from "@/components/layout/customer-sidebar";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserNav } from "@/components/layout/user-nav";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { useRef, useState } from "react";
import { cn } from "@/lib/utils";


export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const mainRef = useRef<HTMLElement>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const headerVisible = useScrollDirection(mainRef);


  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20">
      <CustomerSidebar />
      <MobileSidebar 
        mainRef={mainRef} 
        open={isMobileMenuOpen} 
        onOpenChange={setIsMobileMenuOpen} 
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header Layer — auto-hides on mobile scroll */}
        <header
          className={cn(
            "flex h-14 md:h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur-md md:px-6 shadow-sm z-10 transition-transform duration-300 ease-out",
            "absolute top-0 left-0 right-0 md:relative",
            !headerVisible && !isMobileMenuOpen && "-translate-y-full md:translate-y-0",
          )}
        >

          <div className="flex items-center gap-4 md:hidden invisible">
            {/* Spacer for layout balance since hamburger is now fixed */}
            <div className="w-10" />
          </div>
          <div className="hidden md:block">{/* Layout balance spacer */}</div>

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
        <main
          ref={mainRef}
          className="flex-1 overflow-x-hidden overflow-y-auto bg-muted/5 p-4 md:p-6 lg:p-8 relative pt-[calc(3.5rem+1rem)] md:pt-6 lg:pt-8"
        >

          <div className="mx-auto max-w-7xl w-full h-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
