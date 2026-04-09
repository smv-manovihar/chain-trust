"use client";

import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatEmptyStateProps {
  compact?: boolean;
}

export function ChatEmptyState({ compact }: ChatEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Sparkles className="w-6 h-6 text-primary/40" />
      </div>
      <div className="max-w-[200px]">
        <p className="text-sm font-medium">Start a conversation</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Your AI assistant is ready to help you manage your medicines and more.
        </p>
      </div>
    </div>
  );
}

interface ChatLoadingStateProps {
  isMore?: boolean;
}

export function ChatLoadingState({ isMore = false }: ChatLoadingStateProps) {
  if (isMore) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
      <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
      <p className="text-xs text-muted-foreground mt-4 font-medium animate-pulse">
        Loading session...
      </p>
    </div>
  );
}
