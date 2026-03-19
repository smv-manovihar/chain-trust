"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { useAuth } from "@/contexts/auth-context";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";
import { UserNav } from "@/components/layout/user-nav";
import { Sling as Hamburger } from "hamburger-react";
import { MobileSidebar } from "./mobile-sidebar";
import { BrandLogo } from "./brand-logo";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { useIsMobile } from "@/hooks/use-mobile";

interface HeaderProps {
  variant?: "default" | "floating";
}

export function Header({ variant = "default" }: HeaderProps = {}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const scrolled = useScroll(10);
  const isVisible = useScrollDirection();
  const isFloating = variant === "floating";
  const [isOpen, setOpen] = useState(false);

  const navLinks = [
    { href: "/#hero", label: "Overview" },
    { href: "/#features", label: "Features" },
    { href: "/#cta", label: "Get Started" },
  ];

  const isMobile = useIsMobile();

  return (
    <>
      <div
        className={cn(
          "md:hidden z-[110] transition-all duration-300 ease-in-out",
          "fixed left-0 flex items-center h-14 pl-3",
          isFloating ? "top-2" : "top-0",
          !isVisible && !isOpen && "-translate-y-full",
        )}
      >
        <Hamburger toggled={isOpen} toggle={setOpen} size={20} />
      </div>

      {/* Sidebar rendered at root level — hamburger above it via z-[110] */}
      <MobileSidebar
        isOpen={isOpen}
        onClose={() => setOpen(false)}
        links={navLinks}
      />

      <header
        className={cn(
          "sticky top-0 w-full z-50 transition-all duration-300 ease-in-out",
          !isVisible && !isOpen && "-translate-y-full",
          isFloating
            ? cn(
                "mx-auto max-w-5xl md:rounded-full md:border md:transition-all md:ease-out p-2",
                scrolled
                  ? "bg-background/95 supports-[backdrop-filter]:bg-background/50 border-border backdrop-blur-lg md:top-4 md:max-w-4xl md:shadow"
                  : "bg-transparent border-transparent backdrop-blur-none shadow-none",
              )
            : cn(
                "border-b transition-all duration-300",
                scrolled
                  ? "border-border/40 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
                  : "border-transparent bg-transparent backdrop-blur-none",
              ),
        )}
      >
        <div
          className={cn(
            "mx-auto flex items-center justify-between px-4 transition-all ease-out",
            isFloating
              ? cn(
                  "h-14 w-full md:h-12 md:transition-all md:ease-out",
                  scrolled && "md:px-2",
                )
              : "h-14 md:h-16 max-w-7xl md:px-6",
          )}
        >
          {/* Mobile left spacer — matches hamburger width so logo centres correctly */}
          <div className="md:hidden w-10 shrink-0" aria-hidden="true" />

          {/* Logo */}
          <BrandLogo
            size="sm"
            textClassName={cn("xs:block", isMobile ? "hidden" : "block")}
            className="mr-auto md:mr-0 ml-1 md:ml-0 overflow-hidden"
          />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 bg-muted/40 px-6 py-2.5 rounded-full border border-border/50 backdrop-blur-md shadow-sm">
            {navLinks.map((link) => (
              <div key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-all duration-300 hover:-translate-y-0.5"
                >
                  {link.label}
                </Link>
              </div>
            ))}
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
                  <Button
                    variant="ghost"
                    className="hidden sm:inline-flex hover:bg-muted/50 rounded-full px-5 h-10 transition-colors font-medium"
                    asChild
                  >
                    <Link href="/login">Log in</Link>
                  </Button>
                  <Button
                    asChild
                    className="rounded-full px-4 sm:px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
                  >
                    <Link href="/register">
                      <span className="hidden sm:inline">Get Started</span>
                      <span className="sm:hidden">Sign Up</span>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
