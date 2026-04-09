"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatSession } from "@/api/agent.api";
import { ChatSessionItem } from "./chat-session-item";
import { cn } from "@/lib/utils";

interface ChatHistoryListProps {
  sessions: ChatSession[];
  currentSessionId: string | undefined;
  onSessionSelect: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
  onCreateSession: () => void;
  onSearch?: (query: string) => void;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  isMobile?: boolean;
}

export function ChatHistoryList({
  sessions,
  currentSessionId,
  onSessionSelect,
  onRename,
  onDelete,
  onCreateSession,
  onSearch,
  hasMore,
  isLoadingMore,
  onLoadMore,
  isMobile = false,
}: ChatHistoryListProps) {
  const [localSearch, setLocalSearch] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Debounced search sync
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch?.(localSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, onSearch]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, onLoadMore]);

  const ListContent = (
    <div
      className={cn("space-y-1.5 p-2", isMobile && "p-3 sm:p-4 space-y-2 pb-8")}
    >
      {sessions.map((s) => (
        <ChatSessionItem
          key={s.id}
          session={s}
          isActive={currentSessionId === s.id}
          onSelect={onSessionSelect}
          onRename={onRename}
          onDelete={onDelete}
          isMobile={isMobile}
        />
      ))}

      {/* Infinite Scroll Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary/50" />
        </div>
      )}

      {sessions.length === 0 && !isLoadingMore && (
        <div
          className={cn(
            "p-8 text-center text-muted-foreground text-xs italic",
            isMobile && "p-12 text-sm",
          )}
        >
          No chat history found
        </div>
      )}
    </div>
  );

  return (
    <div className={cn("flex flex-col overflow-hidden h-full max-h-[60dvh]")}>
      {/* Search & Action Header */}
      <div className={cn("p-2 sm:p-3 border-b shrink-0", isMobile && "p-4")}>
        <div className="flex items-center justify-between mb-2 sm:mb-3 px-1">
          <h3
            className={cn(
              "text-xs sm:text-sm font-bold",
              isMobile && "text-lg",
            )}
          >
            Chat <span className="text-primary">History</span>
          </h3>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-7 sm:h-8 hover:bg-primary/10 transition-all text-primary rounded-lg text-[10px] sm:text-xs gap-1.5 sm:gap-2 px-2",
              isMobile && "h-9 rounded-xl px-3 text-sm",
            )}
            onClick={onCreateSession}
          >
            <Plus
              className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5", isMobile && "h-4 w-4")}
            />
            <span className="font-semibold">New Chat</span>
          </Button>
        </div>
        <div className="relative">
          <Search
            className={cn(
              "absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground",
              isMobile && "left-3 h-4 w-4",
            )}
          />
          <Input
            placeholder="Search chats..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className={cn(
              "pl-8 h-8 text-[11px] sm:text-xs bg-background border-none shadow-sm rounded-lg",
              isMobile && "pl-9 h-11 text-sm rounded-xl",
            )}
          />
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20">
        {ListContent}
      </div>
    </div>
  );
}
