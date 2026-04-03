"use client";
import { BrandLogo } from "@/components/layout/brand-logo";
import {
  LayoutDashboard,
  Package,
  Settings,
  BarChart3,
  Boxes,
  Bell,
  PanelLeft,
  Bot,
  QrCode,
} from "lucide-react";
import { Button } from "../ui/button";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
      {
        label: "AI Agent",
        href: "/manufacturer/agent",
        icon: Bot,
      },
      {
        label: "Verify Product",
        href: "/verify",
        icon: QrCode,
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
    label: "Account",
    items: [
      {
        label: "Notifications",
        href: "/manufacturer/notifications",
        icon: Bell,
      },
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
  const { isCollapsed, toggleSidebar } = useSidebar();

  return (
    <aside
      className={cn(
        "hidden transition-all duration-300 lg:block relative flex-shrink-0 h-full z-20 bg-background group/sidebar",
        isCollapsed ? "w-20 cursor-ew-resize" : "w-72 cursor-default",
        className,
      )}
      onClick={isCollapsed ? toggleSidebar : undefined}
      role={isCollapsed ? "button" : undefined}
      tabIndex={isCollapsed ? 0 : -1}
      aria-label={isCollapsed ? "Expand sidebar" : undefined}
      onKeyDown={(e) => {
        if (!isCollapsed) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        toggleSidebar();
      }}
    >
      <div className="flex h-full flex-col bg-card/50 backdrop-blur-xl border-r shadow-sm">
        <div
          className={cn(
            "flex h-16 shrink-0 items-center border-b px-6 relative group/logo",
            isCollapsed ? "justify-center px-2" : "gap-3",
          )}
        >
          <BrandLogo size="sm" withText={!isCollapsed} />

          {!isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "ml-auto rounded-full h-7 w-7 bg-background shadow-md border-border text-muted-foreground hover:text-foreground transition-all hover:scale-110 z-30 cursor-pointer",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSidebar();
                  }}
                  aria-label="Toggle sidebar"
                  title="Toggle sidebar"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[10rem]">
                Toggle sidebar
              </TooltipContent>
            </Tooltip>
          )}

          {/* Logo Hover Toggle (Visible when collapsed) */}
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center bg-background opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSidebar();
                  }}
                  aria-label="Expand sidebar"
                >
                  <PanelLeft className="h-5 w-5 text-primary rotate-180" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          )}
        </div>

        <SidebarContent
          navGroups={navGroups}
          isCollapsed={isCollapsed}
          className="flex-1"
        />
      </div>
    </aside>
  );
}

import { Sling as Hamburger } from "hamburger-react";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

export function MobileSidebar({
  mainRef,
  open: externalOpen,
  onOpenChange,
}: {
  mainRef?: React.RefObject<HTMLDivElement | null>;
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
      <button
        type="button"
        aria-label="Close mobile sidebar"
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-[90] bg-background/40 backdrop-blur-sm md:hidden transition-all duration-300 p-0 m-0 border-0 appearance-none",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      />

      {/* Custom Sidebar Panel */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-[100] w-[85vw] max-w-[300px] md:hidden transition-transform duration-300 ease-in-out",
          "bg-background/80 backdrop-blur-2xl border-r border-border/50 shadow-2xl rounded-r-[2.5rem] flex flex-col overflow-hidden",
          open ? "translate-x-0" : "-translate-x-full",
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
