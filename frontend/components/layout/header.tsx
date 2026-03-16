"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useAuth } from "@/contexts/auth-context";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/layout/user-nav";

interface HeaderProps {
  variant?: "default" | "floating";
}

export function Header({ variant = "default" }: HeaderProps = {}) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const scrolled = useScroll(10);
  const isFloating = variant === "floating";



  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full transition-all ease-out",
        isFloating
          ? cn(
              "mx-auto max-w-5xl border-b border-transparent md:rounded-full md:border md:transition-all md:ease-out p-2",
              scrolled
                ? "bg-background/95 supports-[backdrop-filter]:bg-background/50 border-border backdrop-blur-lg md:top-4 md:max-w-4xl md:shadow"
                : "bg-transparent"
            )
          : "border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      )}
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between px-4 transition-all ease-out",
          isFloating
            ? cn("h-14 w-full md:h-12 md:transition-all md:ease-out", scrolled && "md:px-2")
            : "h-16 max-w-7xl md:px-6"
        )}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <span className="text-sm">C</span>
          </div>
          <span className="text-foreground tracking-tight">ChainTrust</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6 bg-muted/40 px-6 py-2.5 rounded-full border border-border/50 backdrop-blur-md shadow-sm">
          <Link
            href="/#hero"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:-translate-y-0.5"
          >
            Overview
          </Link>
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:-translate-y-0.5"
          >
            Features
          </Link>
          <Link
            href="/#cta"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:-translate-y-0.5"
          >
            Get Started
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <AnimatedThemeToggler className="rounded-full p-2 hover:bg-muted/50 transition-colors" />

          <div className="flex gap-2 items-center ml-2">
            {isLoading ? (
              <div className="h-10 w-32 bg-muted/50 animate-pulse rounded-full" />
            ) : isAuthenticated && user ? (
              <UserNav />
            ) : (
              <>
                <Button variant="ghost" className="hover:bg-muted/50 rounded-full px-5 h-10 transition-colors font-medium" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button
                  asChild
                  className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
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
