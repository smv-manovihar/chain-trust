"use client";

import React from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string | React.ReactNode;
  description?: string | React.ReactNode;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  backHref?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  stats,
  backHref,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 pb-6 sm:pb-8 relative", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-3">
            {backHref && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full -ml-2 shrink-0 hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
                asChild
              >
                <Link href={backHref}>
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <h1 className="font-black tracking-tight text-foreground text-xl sm:text-3xl lg:text-4xl truncate">
              {title}
            </h1>
          </div>
          
          {(description || stats) && (
            <div className="flex flex-col gap-2">
              {description && (
                <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
                  {description}
                </p>
              )}
              {stats && (
                <div className="flex flex-wrap items-center gap-2">
                  {stats}
                </div>
              )}
            </div>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 sm:gap-4 shrink-0 w-full sm:w-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
