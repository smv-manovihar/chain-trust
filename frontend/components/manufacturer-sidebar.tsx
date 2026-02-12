"use client";

"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  QrCode,
  Settings,
  LogOut,
  Menu,
  Truck,
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ManufacturerSidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsiveness
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const navGroups = [
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
        {
          label: "QR Manager",
          href: "/manufacturer/qr-manager",
          icon: QrCode,
        },
      ],
    },
    {
      label: "Logistics",
      items: [
        {
          label: "Supply Chain",
          href: "/manufacturer/supply-chain",
          icon: Truck,
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

  const SidebarContent = () => (
    <div className="flex h-full flex-col gap-4">
      <div
        className={cn(
          "flex h-[60px] items-center border-b px-6",
          isCollapsed ? "justify-center px-2" : "gap-2",
        )}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground font-bold shrink-0">
          P
        </div>
        {!isCollapsed && (
          <span className="font-bold text-lg tracking-tight">PharmaSecure</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {navGroups.map((group, index) => (
          <div key={index} className="mb-4 px-3">
            {!isCollapsed && (
              <h4 className="mb-2 px-4 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                {group.label}
              </h4>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Button
                    key={item.href}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start",
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "hover:bg-muted",
                      isCollapsed ? "justify-center px-2" : "px-4",
                    )}
                    asChild
                  >
                    <Link href={item.href}>
                      <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </Button>
                );
              })}
            </div>
            {!isCollapsed && index < navGroups.length - 1 && (
              <div className="mx-4 my-2 border-t border-border/50" />
            )}
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 hover:border-destructive/20",
            isCollapsed && "justify-center px-2",
          )}
          onClick={logout}
        >
          <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
          {!isCollapsed && "Sign Out"}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-3 left-4 z-50 md:hidden"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "hidden border-r bg-card transition-all duration-300 md:flex md:flex-col sticky top-0 h-screen",
        isCollapsed ? "w-20" : "w-72",
        className,
      )}
    >
      <SidebarContent />
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-muted"
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
