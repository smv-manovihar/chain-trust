"use client";

import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../ui/button";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface SidebarContentProps {
  navGroups: NavGroup[];
  isCollapsed?: boolean;
  onNavigate?: () => void;
  className?: string;
}

export function SidebarContent({
  navGroups,
  isCollapsed = false,
  onNavigate,
  className,
}: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full flex-col gap-4", className)}>
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
                // Check if active: exact match or starts with (for nested routes)
                // but handle special case for dashboard root
                const isActive = 
                  item.href === "/manufacturer" || item.href === "/customer"
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                return (
                  <div key={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start transition-all duration-200 cursor-pointer",
                        isActive
                          ? "bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        isCollapsed ? "justify-center px-2" : "px-4",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onNavigate) onNavigate();
                      }}
                      asChild
                    >
                      <Link href={item.href}>
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            !isCollapsed && "mr-3",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        {!isCollapsed && <span>{item.label}</span>}
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
            {!isCollapsed && index < navGroups.length - 1 && (
              <div className="mx-4 mt-6 border-t border-border/50" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
