"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface SidebarContextType {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  setIsCollapsed: (v: boolean | ((prev: boolean) => boolean)) => void;
  setIsMobileOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setCollapsedState] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("chain_trust_sidebar_collapsed");
    if (saved !== null) {
      setCollapsedState(saved === "true");
    }
  }, []);

  const setIsCollapsed = useCallback((v: boolean | ((prev: boolean) => boolean)) => {
    setCollapsedState((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      localStorage.setItem("chain_trust_sidebar_collapsed", String(next));
      return next;
    });
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, [setIsCollapsed]);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  // Avoid hydration flicker: wait until mounted to use the persisted state
  // But to avoid a layout shift, we can return the default (false) while SSR
  // and then update it. Since we're using "use client" and standard patterns
  // this is the cleanest way without complex cookie-based solutions.

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed: isMounted ? isCollapsed : false,
        isMobileOpen,
        setIsCollapsed,
        setIsMobileOpen,
        toggleSidebar,
        toggleMobileMenu,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
