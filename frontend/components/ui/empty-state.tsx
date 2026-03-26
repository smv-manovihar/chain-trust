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
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8 py-20 rounded-[3rem] border-2 border-dashed border-border/40 bg-muted/5 animate-in fade-in zoom-in-95 duration-700",
        className,
      )}
    >
      <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 relative group">
        <Icon className="h-10 w-10 text-primary relative z-10" />
      </div>

      <h3 className="text-2xl tracking-tighter mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed mb-8">
        {description}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        {action &&
          (action.href ? (
            <Button
              asChild
              className="rounded-full h-12 px-8 shadow-xl shadow-primary/20 font-bold"
            >
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ) : (
            <Button
              onClick={action.onClick}
              className="rounded-full h-12 px-8 shadow-xl shadow-primary/20 font-bold"
            >
              {action.label}
            </Button>
          ))}

        {secondaryAction &&
          (secondaryAction.href ? (
            <Button
              variant="outline"
              asChild
              className="rounded-full h-12 px-8 font-bold"
            >
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="rounded-full h-12 px-8 font-bold"
            >
              {secondaryAction.label}
            </Button>
          ))}
      </div>
    </div>
  );
}
