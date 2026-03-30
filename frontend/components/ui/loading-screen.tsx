"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message = "Loading...", className }: LoadingScreenProps) {
  return (
    <div 
      className={cn(
        "flex min-h-[400px] h-full w-full flex-col items-center justify-center gap-4 text-muted-foreground animate-in fade-in duration-300",
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary/80" />
        <div className="absolute h-10 w-10 rounded-full border-4 border-primary/10" />
      </div>
      <p className="text-sm font-bold tracking-tight opacity-50 uppercase">
        {message}
      </p>
    </div>
  );
}
