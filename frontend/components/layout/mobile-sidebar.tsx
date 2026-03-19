"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { BrandLogo } from "./brand-logo";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  links: { href: string; label: string }[];
}

export function MobileSidebar({ isOpen, onClose, links }: MobileSidebarProps) {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-[90] bg-background/40 backdrop-blur-sm md:hidden",
          "transition-opacity duration-300 ease-in-out",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Sidebar Panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 left-0 z-[100] w-[80vw] max-w-[300px] md:hidden",
          "bg-background/80 backdrop-blur-2xl border-r border-border/50 shadow-2xl",
          "rounded-r-[2.5rem] overflow-hidden flex flex-col",
          "transition-transform duration-300 ease-in-out will-change-transform",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Top spacer — leaves room for the floating hamburger above */}
        <div className="h-14 shrink-0 border-b border-border/10 flex items-center pl-[60px] pr-8 mt-2">
          <BrandLogo size="sm" onClick={onClose} />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 flex flex-col gap-1 p-5 overflow-y-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={cn(
                "group flex items-center px-4 py-3.5",
                "text-base font-medium text-foreground/75 hover:text-primary",
                "rounded-2xl hover:bg-primary/5 active:scale-[0.97]",
                "transition-all duration-200"
              )}
            >
              <span className="relative">
                {link.label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-primary transition-all duration-300 group-hover:w-full" />
              </span>
            </Link>
          ))}
        </nav>

        {/* Auth Actions */}
        {!isAuthenticated && !isLoading && (
          <div className="p-6 pb-10 border-t border-border/10 space-y-2.5 bg-muted/20">
            <Button
              variant="outline"
              className="w-full rounded-2xl h-11 border-primary/20 hover:bg-primary/5 hover:text-primary transition-all active:scale-95"
              asChild
              onClick={onClose}
            >
              <Link href="/login">Log in</Link>
            </Button>
            <Button
              className="w-full rounded-2xl h-11 shadow-xl shadow-primary/20 transition-all active:scale-95"
              asChild
              onClick={onClose}
            >
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 py-5 text-center">
          <p className="text-[10px] text-muted-foreground/40 font-medium tracking-wide">
            © 2026 ChainTrust Protocol
          </p>
        </div>
      </div>
    </>
  );
}