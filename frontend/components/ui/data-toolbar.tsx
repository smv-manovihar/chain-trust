"use client";

import React from "react";
import { Search, Grid, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataToolbarProps {
  search?: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  };
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  viewToggle?: {
    mode: "grid" | "list";
    onChange: (mode: "grid" | "list") => void;
  };
  className?: string;
  sticky?: boolean;
}

/**
 * A unified toolbar for data filtering, searching, and view switching.
 * Standardizes the layout across Customer and Manufacturer modules.
 */
export function DataToolbar({
  search,
  filters,
  actions,
  viewToggle,
  className,
  sticky = true,
}: DataToolbarProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center gap-3 py-2 transition-all",
        sticky && "sticky top-4 z-30 bg-background/60 backdrop-blur-3xl px-1 -mx-1",
        className
      )}
    >
      {search && (
        <div className="relative flex-1 w-full">
          <Input
            placeholder={search.placeholder || "Search..."}
            className="pl-11 h-11 sm:h-12 rounded-full border-border/40 bg-background/50 focus-visible:ring-primary/20 shadow-sm transition-all focus:bg-background"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
          />
          <Search 
            className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50 pointer-events-none z-10" 
            aria-hidden="true" 
          />
        </div>
      )}

      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
        {filters && (
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            {filters}
          </div>
        )}

        {viewToggle && (
          <div className="hidden sm:flex bg-muted/40 p-1 rounded-full border border-border/40 shrink-0">
            <Button
              variant={viewToggle.mode === "grid" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => viewToggle.onChange("grid")}
              className={cn(
                "h-9 w-9 rounded-full transition-all active:scale-95",
                viewToggle.mode === "grid" ? "shadow-sm bg-background hover:bg-background" : "hover:bg-primary/5 hover:text-primary"
              )}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button
              variant={viewToggle.mode === "list" ? "secondary" : "ghost"}
              size="icon"
              onClick={() => viewToggle.onChange("list")}
              className={cn(
                "h-9 w-9 rounded-full transition-all active:scale-95",
                viewToggle.mode === "list" ? "shadow-sm bg-background hover:bg-background" : "hover:bg-primary/5 hover:text-primary"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}

        {actions && (
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
