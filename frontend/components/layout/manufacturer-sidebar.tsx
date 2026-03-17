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

export function SidebarContent({ isCollapsed, onNavigate }: { isCollapsed?: boolean, onNavigate?: () => void }) {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <div className="flex h-full flex-col gap-4 bg-card/50 backdrop-blur-xl border-r shadow-sm">
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b px-6",
          isCollapsed ? "justify-center px-2" : "gap-3",
        )}
      >
        <BrandLogo size="sm" withText={!isCollapsed} />
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        {navGroups.map((group, index) => (
          <div key={index} className="mb-6 px-3">
            {!isCollapsed && (
              <h4 className="mb-3 px-4 text-[11px] font-semibold uppercase text-muted-foreground/70 tracking-wider">
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
                      "w-full justify-start transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isCollapsed ? "justify-center px-2" : "px-4",
                    )}
                    onClick={onNavigate}
                    asChild
                  >
                    <Link href={item.href}>
                      <Icon className={cn("h-5 w-5", !isCollapsed && "mr-3", isActive ? "text-primary" : "text-muted-foreground")} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  </Button>
                );
              })}
            </div>
            {!isCollapsed && index < navGroups.length - 1 && (
              <div className="mx-4 mt-6 border-t border-border/50" />
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-muted/20">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            isCollapsed && "justify-center px-2",
          )}
          onClick={() => {
            if (onNavigate) onNavigate();
            logout();
          }}
        >
          <LogOut className={cn("h-[18px] w-[18px]", !isCollapsed && "mr-3")} />
          {!isCollapsed && <span className="font-medium">Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function ManufacturerSidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden transition-all duration-300 md:block relative flex-shrink-0 h-full z-20 bg-background",
        isCollapsed ? "w-20" : "w-72",
        className,
      )}
    >
      <SidebarContent isCollapsed={isCollapsed} />
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


export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" className="md:hidden shrink-0">
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="md:hidden shrink-0">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[85vw] max-w-[300px] p-0 border-r-0">
        <SheetHeader className="sr-only">
          <SheetTitle>Navigation Menu</SheetTitle>
        </SheetHeader>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
