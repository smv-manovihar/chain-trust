"use client";

import { memo, useState } from "react";
import { History, Sparkles, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useIsMobile } from "@/components/ui/use-mobile";
import { ChatSession } from "@/api/agent.api";
import { ChatHistoryList } from "./chat-history-list";
import { cn } from "@/lib/utils";

interface ChatHeaderProps {
  sessions: ChatSession[];
  currentSessionId: string | undefined;
  currentSession: ChatSession | undefined;
  onSearch: (query: string) => void;
  onSessionSelect: (id: string) => void;
  onCreateSession: () => void;
  onRenameSession: (id: string, name: string) => Promise<void>;
  onDeleteSession: (id: string) => void;
  hasMoreSessions: boolean;
  isLoadingMoreSessions: boolean;
  onLoadMoreSessions: () => void;
  onResetChat: () => void;
  compact?: boolean;
}

export const ChatHeader = memo(function ChatHeader({
  sessions,
  currentSessionId,
  currentSession,
  onSearch,
  onSessionSelect,
  onCreateSession,
  onRenameSession,
  onDeleteSession,
  hasMoreSessions,
  isLoadingMoreSessions,
  onLoadMoreSessions,
  onResetChat,
  compact = false,
}: ChatHeaderProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const historyListProps = {
    sessions,
    currentSessionId,
    onSessionSelect: (id: string) => {
      onSessionSelect(id);
      setIsOpen(false);
    },
    onRename: onRenameSession,
    onDelete: onDeleteSession,
    onCreateSession: () => {
      onCreateSession();
      setIsOpen(false);
    },
    onSearch,
    hasMore: hasMoreSessions,
    isLoadingMore: isLoadingMoreSessions,
    onLoadMore: onLoadMoreSessions,
  };

  return (
    <div className="shrink-0 w-full px-2 sm:px-4 py-2 sm:py-3 z-20">
      <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-card/50 backdrop-blur-xl border border-primary/10 shadow-lg rounded-xl sm:rounded-2xl pointer-events-auto w-full max-w-full">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 pr-2">
          <div className="shrink-0 p-1 sm:p-1.5 rounded-full bg-primary/10 text-primary transition-colors duration-300">
            {isOpen ? (
              <History
                className={cn(
                  compact ? "w-3.5 h-3.5" : "w-4 h-4 sm:w-5 sm:h-5",
                )}
              />
            ) : (
              <Sparkles
                className={cn(
                  compact ? "w-3.5 h-3.5" : "w-4 h-4 sm:w-5 sm:h-5",
                )}
              />
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm font-bold truncate">
              ChainTrust <span className="text-primary">AI</span>
            </h3>
            {currentSession && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mt-0.5 sm:mt-1">
                {currentSession.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {isMobile ? (
            <Drawer open={isOpen} onOpenChange={setIsOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-xl transition-all duration-300",
                    isOpen
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "hover:bg-primary/10",
                  )}
                >
                  {isOpen ? (
                    <X className="w-4 h-4" />
                  ) : (
                    <History className="w-4 h-4" />
                  )}
                </Button>
              </DrawerTrigger>
              <DrawerContent className="p-0 border-none rounded-t-2xl flex flex-col max-h-[85vh] w-full max-w-full mx-auto overflow-hidden">
                <DrawerHeader className="sr-only">
                  <DrawerTitle>Chat History</DrawerTitle>
                  <DrawerDescription>
                    Search and manage your past chat conversations.
                  </DrawerDescription>
                </DrawerHeader>
                <ChatHistoryList {...historyListProps} isMobile={true} />
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 sm:h-9 sm:w-9 rounded-xl transition-all duration-300",
                        isOpen
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                          : "hover:bg-primary/10",
                      )}
                    >
                      {isOpen ? (
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                      ) : (
                        <History className="w-4 h-4 sm:w-5 sm:h-5" />
                      )}
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side={isOpen ? "left" : "bottom"}
                  sideOffset={12}
                >
                  <p>{isOpen ? "Close" : "History"}</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={12}
                className="w-[calc(100vw-32px)] sm:w-[400px] p-0 rounded-3xl shadow-2xl border-primary/10 overflow-hidden flex flex-col max-h-[80dvh]"
              >
                <ChatHistoryList {...historyListProps} />
              </PopoverContent>
            </Popover>
          )}

          <div className="h-6 w-px bg-primary/10 mx-0.5" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl hover:bg-primary/10 transition-all duration-300"
                onClick={onCreateSession}
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={12}>
              New Chat
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
});
