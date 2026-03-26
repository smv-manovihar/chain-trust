"use client";

import { LogOut, User, ChevronDown, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserNav() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const [cachedAvatar, setCachedAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCachedAvatar(localStorage.getItem("cached_avatar"));
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const getDashboardLink = () => {
    if (!user) return "/login";
    return user.role === "manufacturer" ? "/manufacturer" : "/customer";
  };

  if (isLoading) {
    return <div className="h-10 w-32 bg-muted/50 animate-pulse rounded-full" />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2.5 rounded-full w-10 md:w-auto h-10 p-0 md:p-2 md:pl-2 md:pr-4 border-border/60 hover:bg-muted/50 hover:border-primary/30 transition-all duration-300 shadow-sm flex items-center justify-center shrink-0"
        >
          {user.avatar || cachedAvatar ? (
            <img
              src={user.avatar || cachedAvatar || ""}
              alt={user.name}
              className="h-7 w-7 rounded-full object-cover ring-2 ring-background/50"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-inner">
              <User className="h-4 w-4" />
            </div>
          )}
          <div className="hidden md:flex flex-col items-start leading-none justify-center">
            <span className="max-w-[100px] truncate text-sm font-semibold">
              {user.name}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mt-0.5">
              {user.role || "User"}
            </span>
          </div>
          <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 p-2 rounded-3xl border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="font-normal px-2 py-3">
          <div className="flex items-center gap-3">
            {user.avatar || cachedAvatar ? (
              <img
                src={user.avatar || cachedAvatar || ""}
                alt={user.name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-primary/20"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
            )}
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none text-foreground">
                {user.name}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate max-w-[160px]">
                {user.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-border/50" />
        <DropdownMenuGroup className="p-1">
          <DropdownMenuItem
            className="cursor-pointer rounded-full py-2.5 px-3 focus:bg-primary/10 transition-colors focus:text-primary group"
            onSelect={() => router.push(getDashboardLink())}
          >
            <div className="bg-background/50 p-1.5 rounded-full mr-3 group-hover:bg-primary/20 transition-colors shadow-sm border border-border/50">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <span className="font-medium">Dashboard</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer rounded-full py-2.5 px-3 focus:bg-primary/10 transition-colors focus:text-primary group mt-1"
            onSelect={() => router.push(`/${user.role}/settings`)}
          >
            <div className="bg-background/50 p-1.5 rounded-full mr-3 group-hover:bg-primary/20 transition-colors shadow-sm border border-border/50">
              <User className="h-4 w-4" />
            </div>
            <span className="font-medium">Profile Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="my-1 bg-border/50" />
        <DropdownMenuItem
          className="cursor-pointer rounded-full py-2.5 px-3 text-destructive focus:text-destructive focus:bg-destructive/10 transition-colors group m-1"
          onSelect={handleLogout}
        >
          <div className="bg-background/50 p-1.5 rounded-full mr-3 group-hover:bg-destructive/20 transition-colors shadow-sm border border-border/50">
            <LogOut className="h-4 w-4" />
          </div>
          <span className="font-semibold">Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
