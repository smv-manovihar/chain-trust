"use client";
import { BrandLogo } from "@/components/layout/brand-logo";
import {
  LayoutDashboard,
  Package,
  Settings,
  LogOut,
  Menu,
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "../ui/sheet";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

export const navGroups = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/manufacturer",
        icon: LayoutDashboard,
      },
      {
        label: "Analytics",
        href: "/manufacturer/analytics",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Inventory & Production",
    items: [
      {
        label: "Products",
        href: "/manufacturer/products",
        icon: Package,
      },
      {
        label: "Batches",
        href: "/manufacturer/batches",
        icon: Boxes,
      },
    ],
  },
  {
    label: "Configuration",
    items: [
      {
        label: "Settings",
        href: "/manufacturer/settings",
        icon: Settings,
      },
    ],
  },
];

import { SidebarContent } from "./sidebar-content";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ManufacturerSidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden transition-all duration-300 md:block relative flex-shrink-0 h-full z-20 bg-background",
        isCollapsed ? "w-20" : "w-72",
        className
      )}
    >
      <div className="flex h-full flex-col bg-card/50 backdrop-blur-xl border-r shadow-sm">
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b px-6",
            isCollapsed ? "justify-center px-2" : "gap-3"
          )}
        >
          <BrandLogo size="sm" withText={!isCollapsed} />
        </div>

        <SidebarContent
          navGroups={navGroups}
          isCollapsed={isCollapsed}
          className="flex-1"
        />
      </div>

      <Button
        variant="outline"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-background shadow-md border-border text-muted-foreground hover:text-foreground transition-transform hover:scale-110 z-30"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}

import { Sling as Hamburger } from "hamburger-react";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

export function MobileSidebar({ 
  mainRef,
  open: externalOpen,
  onOpenChange 
}: { 
  mainRef?: React.RefObject<HTMLElement | null>;
  open?: boolean;
  onOpenChange?: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const open = externalOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;


  const isVisible = useScrollDirection(mainRef);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <div
        className={cn(
          "md:hidden z-[110] transition-all duration-300 ease-in-out",
          "fixed left-0 top-0 flex items-center h-14 pl-3",
          !isVisible && !open && "-translate-y-full",
        )}
      >
        <Hamburger toggled={open} toggle={setOpen} size={20} />
      </div>

      {/* Custom Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-[90] bg-background/40 backdrop-blur-sm md:hidden transition-all duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Custom Sidebar Panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[100] w-[85vw] max-w-[300px] md:hidden transition-transform duration-300 ease-in-out",
          "bg-background/80 backdrop-blur-2xl border-r border-border/50 shadow-2xl rounded-r-[2.5rem] flex flex-col overflow-hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 shrink-0 items-center border-b px-6 pl-14 gap-3">
          <BrandLogo size="sm" />
        </div>
        <SidebarContent
          navGroups={navGroups}
          onNavigate={() => setOpen(false)}
          className="flex-1"
        />
      </div>
    </>
  );
}
