"use client";

import React, { useRef, useState } from "react";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { UserNav } from "@/components/layout/user-nav";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useSidebar } from "@/contexts/sidebar-context";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingAgent } from "@/components/chat/floating-agent";

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  mobileSidebar: (props: { 
    mainRef: React.RefObject<HTMLDivElement | null>; 
    open: boolean; 
    onOpenChange: React.Dispatch<React.SetStateAction<boolean>>; 
  }) => React.ReactNode;
}

export function AppShell({ children, sidebar, mobileSidebar }: AppShellProps) {
  const mainRef = useRef<HTMLDivElement>(null);
  const { isMobileOpen, setIsMobileOpen } = useSidebar();
  const headerVisible = useScrollDirection(mainRef);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-primary/20 font-sans">
      {/* Desktop Sidebar — Contained, No Double-Blur */}
      <div className="hidden lg:block h-full shrink-0 border-r z-40">
        {sidebar}
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebar({ 
        mainRef, 
        open: isMobileOpen, 
        onOpenChange: setIsMobileOpen 
      })}

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header — Modern, Clinical, and Sticky */}
        <header
          className={cn(
             "flex h-14 lg:h-16 shrink-0 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md lg:px-8 shadow-sm z-30 transition-transform duration-300 ease-in-out",
             "sticky top-0 left-0 right-0 lg:relative",
             !headerVisible && !isMobileOpen && "-translate-y-full lg:translate-y-0",
          )}
        >
          {/* Mobile Menu Balance Spacer */}
          <div className="flex items-center gap-4 lg:hidden">
             {/* The hamburger is usually rendered by the MobileSidebar component itself or a separate toggle */}
             <div className="w-10" /> 
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {/* Optional breadcrumbs or status can go here */}
          </div>

          <div className="flex items-center justify-end gap-2 lg:gap-4 flex-1">
            <NotificationBell />
            
            <AnimatedThemeToggler className="rounded-full shadow-inner bg-muted/20" />

            <div className="hidden border-l h-6 mx-1 border-border lg:block" />

            <div className="flex items-center gap-2">
              <UserNav />
            </div>
          </div>
        </header>

        {/* Main Content Area — Strictly Contained */}
        <main
          className="flex-1 overflow-hidden bg-muted/30 relative"
        >
          {/* Native scrollable div for better scroll tracking with useScrollDirection */}
          <div 
            ref={mainRef}
            className="h-full w-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                variants={{
                  initial: { opacity: 0, y: 10 },
                  animate: { opacity: 1, y: 0 },
                }}
                initial="initial"
                animate="animate"
                transition={{ 
                  duration: 0.25, 
                  ease: "easeInOut" 
                }}
                className="mx-auto max-w-7xl w-full p-4 lg:p-8"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
          
          <FloatingAgent />

          {/* Optional background grid specific to the content area */}
          <div className="absolute inset-0 bg-grid-pattern-global pointer-events-none opacity-40 -z-10" />
        </main>
      </div>
    </div>
  );
}
