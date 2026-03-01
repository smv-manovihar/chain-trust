"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useAuth } from "@/contexts/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const getDashboardLink = () => {
    if (user?.role === "manufacturer") {
      return "/manufacturer";
    }
    return "/customer-home";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <span className="text-sm">C</span>
          </div>
          <span className="text-foreground tracking-tight">ChainTrust</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/verify-product"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Verify Product
          </Link>
          <Link
            href="/cabinet"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Personal Cabinet
          </Link>
          <Link
            href="/manufacturer"
            className="text-sm font-medium hover:text-primary transition-colors"
          >
            Manufacturer
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <AnimatedThemeToggler className="rounded-full p-2 hover:bg-muted" />

          <div className="hidden md:flex gap-2">
            {isLoading ? (
              <div className="h-9 w-20 bg-muted animate-pulse rounded-md" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    {user.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-7 w-7 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                    <span className="max-w-[100px] truncate">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push(getDashboardLink())}
                    >
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={() => router.push("/settings")}
                    >
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                    onSelect={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  asChild
                  className="rounded-full px-6 shadow-lg shadow-primary/20"
                >
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
