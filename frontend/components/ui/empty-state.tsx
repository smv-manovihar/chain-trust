"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "./button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 rounded-[3rem] border-2 border-dashed border-border/40 bg-muted/5 animate-in fade-in zoom-in-95 duration-700",
        compact ? "py-10" : "py-20",
        className,
      )}
    >
      <div className={cn(
        "rounded-full bg-primary/5 flex items-center justify-center relative group",
        compact ? "h-14 w-14 mb-4" : "h-20 w-20 mb-6"
      )}>
        <Icon className={cn(
          "text-primary relative z-10",
          compact ? "h-6 w-6" : "h-10 w-10"
        )} />
      </div>

      <h3 className={cn(
        "tracking-tighter mb-2",
        compact ? "text-lg" : "text-2xl"
      )}>{title}</h3>
      <p className={cn(
        "text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed mb-8",
        compact ? "text-xs" : "text-sm text-muted-foreground"
      )}>
        {description}
      </p>

      {/* Action buttons stay consistent but can be adjusted via compact if needed */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {action &&
          (action.href ? (
            <Button
              asChild
              className="rounded-full h-12 px-8 shadow-xl shadow-primary/20 font-bold transition-all active:scale-95"
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              onClick={action.onClick}
              className="rounded-full h-12 px-8 shadow-xl shadow-primary/20 font-bold transition-all active:scale-95"
            >
              {action.label}
            </Button>
          ))}

        {secondaryAction &&
          (secondaryAction.href ? (
            <Button
              variant="outline"
              asChild
              className="rounded-full h-12 px-8 font-bold transition-all active:scale-95"
            >
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="rounded-full h-12 px-8 font-bold transition-all active:scale-95"
            >
              {secondaryAction.label}
            </Button>
          ))}
      </div>
    </div>
  );
}
