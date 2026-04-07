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
    <div className={cn("flex flex-col gap-4 pb-4 relative", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-3 sm:gap-4">
            {backHref && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-10 sm:w-10 rounded-full -ml-2 shrink-0 hover:bg-primary/10 hover:text-primary transition-all active:scale-95 mt-0.5"
                asChild
              >
                <Link href={backHref}>
                  <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Link>
              </Button>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <h1 className="font-black tracking-tight text-foreground text-xl sm:text-3xl lg:text-4xl truncate">
                {title}
              </h1>
              
              {description && (
                <div className="text-muted-foreground text-xs sm:text-sm leading-relaxed font-medium">
                  {description}
                </div>
              )}
              
              {stats && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {stats}
                </div>
              )}
            </div>
          </div>
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
