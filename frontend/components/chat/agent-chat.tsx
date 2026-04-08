import { useEffect, useState, useRef, useCallback } from "react";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import {
  History,
  Sparkles,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Pencil,
  X,
  Loader2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ChatSession } from "@/api/agent.api";
import { AgentChatMessage } from "./agent-chat-message";
import { AgentChatInput } from "./agent-chat-input";
import { useAgent } from "@/contexts/agent-context";
import type { AgentMessage } from "@/types/agent.types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/components/ui/use-mobile";

interface AgentChatProps {
  initialSessionId?: string;
  compact?: boolean;
  onSessionChange?: (sessionId: string) => void;
  currentContext?: {
    route: string;
    params?: any;
    active_data?: any;
  };
}

export function AgentChat({
  initialSessionId,
  compact = false,
  onSessionChange,
  currentContext,
}: AgentChatProps) {
  const {
    sessions,
    currentSessionId,
    messages,
    input,
    isSending,
    isHistoryOpen,
    isLoadingMessages,
    searchQuery,
    setSearchQuery,
    setInput,
    setHistoryOpen,
    setCurrentSessionId: handleSetCurrentSessionId,
    sendMessage,
    deleteSession,
    renameSession,
    retryMessage,
    editMessage,
    deleteMessage,
    isGenerating,
    hasMoreSessions,
    isLoadingMoreSessions,
    loadMoreSessions,
    resetChat,
  } = useAgent();
  const isMobile = useIsMobile();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!isHistoryOpen || !hasMoreSessions || isLoadingMoreSessions) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreSessions();
        }
      },
      { threshold: 0.1 },
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [isHistoryOpen, hasMoreSessions, isLoadingMoreSessions, loadMoreSessions]);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const {
    scrollContainerRef: scrollRef,
    handleScroll,
    scrollToBottom,
    showScrollButton,
  } = useChatScroll(currentSessionId);

  // Sync session change to parent if needed
  useEffect(() => {
    if (currentSessionId) {
      onSessionChange?.(currentSessionId);
    }
  }, [currentSessionId, onSessionChange]);

  const handleCreateSession = () => {
    resetChat();
  };

  const handleRenameSession = async (id: string) => {
    if (!editSessionName.trim()) return;
    await renameSession(id, editSessionName);
    setEditingSessionId(null);
  };

  const handleSendMessage = useCallback(() => {
    sendMessage(currentContext);
    scrollToBottom({ behavior: "auto" });
  }, [sendMessage, currentContext, scrollToBottom]);

  const session = sessions.find((s) => s.id === currentSessionId);

  const handleRetryMessage = useCallback(
    (id: string) => {
      retryMessage(id, currentContext);
      scrollToBottom({ behavior: "auto" });
    },
    [retryMessage, currentContext, scrollToBottom],
  );

  const handleEditMessage = useCallback(
    (id: string, content: string) => {
      editMessage(id, content, currentContext);
      scrollToBottom({ behavior: "auto" });
    },
    [editMessage, currentContext, scrollToBottom],
  );

  const handleDeleteMessage = useCallback(
    (id: string) => {
      deleteMessage(id);
    },
    [deleteMessage],
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full relative overflow-hidden",
        // On mobile the AppShell header is absolute (h-14 = 56 px).
        // Push content below it; on lg+ the header is relative so no offset needed.
        compact
          ? "rounded-xl border shadow-2xl bg-background"
          : "w-full max-w-5xl mx-auto bg-transparent pt-14 lg:pt-0",
      )}
    >
      {/* Static Chat Header — flows naturally in the flex column */}
      <div className="shrink-0 w-full px-2 sm:px-4 py-2 sm:py-3 z-20">
        <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-card/50 backdrop-blur-xl border border-primary/10 shadow-lg rounded-xl sm:rounded-2xl pointer-events-auto w-full max-w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 pr-2">
            <div className="shrink-0 p-1 sm:p-1.5 rounded-full bg-primary/10 text-primary transition-colors duration-300">
              {isHistoryOpen ? (
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
              {session && (
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate mt-0.5 sm:mt-1">
                  {session.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {isMobile ? (
              <Drawer open={isHistoryOpen} onOpenChange={setHistoryOpen}>
                <DrawerTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-xl transition-all duration-300",
                      isHistoryOpen
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "hover:bg-primary/10",
                    )}
                  >
                    {isHistoryOpen ? (
                      <X className="w-4 h-4" />
                    ) : (
                      <History className="w-4 h-4" />
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="p-0 border-none bg-background rounded-t-[32px] flex flex-col max-h-[85vh] w-full max-w-full mx-auto overflow-hidden">
                  <DrawerHeader className="sr-only">
                    <DrawerTitle>Chat History</DrawerTitle>
                    <DrawerDescription>
                      Search and manage your past chat conversations.
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="p-4 border-b bg-muted/30 shrink-0 w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold">
                        Chat <span className="text-primary">History</span>
                      </h2>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 gap-2 rounded-xl hover:bg-primary/10 transition-all text-primary"
                        onClick={handleCreateSession}
                      >
                        <Plus className="w-4 h-4" />
                        <span className="font-semibold">New Chat</span>
                      </Button>
                    </div>
                    <div className="relative w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-11 w-full text-sm bg-background border-none shadow-sm rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto overflow-x-hidden w-full overscroll-contain">
                    <div className="p-3 sm:p-4 space-y-2 pb-8 w-full max-w-full">
                      {sessions.map((s: ChatSession) => (
                        <div
                          key={s.id}
                          className={cn(
                            "group relative flex items-center p-3 sm:p-3.5 rounded-3xl transition-all duration-200 cursor-pointer border border-transparent mb-1 w-full overflow-hidden",
                            currentSessionId === s.id
                              ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                              : "hover:bg-muted/40 hover:border-border/30",
                          )}
                          onClick={() => {
                            handleSetCurrentSessionId(s.id);
                            setHistoryOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div
                              className={cn(
                                "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                currentSessionId === s.id
                                  ? "bg-primary/20"
                                  : "bg-muted",
                              )}
                            >
                              <MessageSquare className="w-5 h-5 opacity-70" />
                            </div>
                            {editingSessionId === s.id ? (
                              <Input
                                autoFocus
                                value={editSessionName}
                                onChange={(e) =>
                                  setEditSessionName(e.target.value)
                                }
                                onBlur={() => setEditingSessionId(null)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleRenameSession(s.id)
                                }
                                className="flex-1 min-w-0 h-9 text-sm px-2 py-0 bg-background rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-sm font-bold truncate group-hover:text-primary transition-colors">
                                  {s.name}
                                </span>
                                <span className="text-xs opacity-60">
                                  {formatDistanceToNow(new Date(s.updated_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                          <div
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 p-1 rounded-2xl bg-background/90 backdrop-blur-md shadow-sm border border-border/40 z-10",
                              "opacity-100", // <-- Now always visible on mobile
                            )}
                          >
                            {editingSessionId === s.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-primary hover:bg-primary/10 transition-all shrink-0"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleRenameSession(s.id);
                                  }}
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-muted-foreground hover:bg-muted transition-all shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSessionId(null);
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full hover:bg-background shadow-sm border border-transparent hover:border-border/50 transition-all shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSessionId(s.id);
                                    setEditSessionName(s.name);
                                  }}
                                >
                                  <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSessionToDelete(s.id);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {hasMoreSessions && (
                        <div
                          ref={loadMoreRef}
                          className="py-6 flex justify-center"
                        >
                          <Loader2 className="w-6 h-6 animate-spin text-primary/50" />
                        </div>
                      )}

                      {sessions.length === 0 && !isLoadingMoreSessions && (
                        <div className="p-12 text-center text-muted-foreground text-sm italic">
                          No chat history found
                        </div>
                      )}
                    </div>
                  </div>
                </DrawerContent>
              </Drawer>
            ) : (
              <Popover open={isHistoryOpen} onOpenChange={setHistoryOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-8 w-8 sm:h-9 sm:w-9 rounded-xl transition-all duration-300",
                          isHistoryOpen
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "hover:bg-primary/10",
                        )}
                      >
                        {isHistoryOpen ? (
                          <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                          <History className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent
                    side={isHistoryOpen ? "left" : "bottom"}
                    sideOffset={12}
                  >
                    <p>{isHistoryOpen ? "Close" : "History"}</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  align="end"
                  side="bottom"
                  sideOffset={12}
                  className="w-[calc(100vw-32px)] sm:w-[400px] p-0 rounded-[32px] shadow-2xl border-primary/10 overflow-hidden"
                >
                  <div className="p-2 sm:p-3 border-b bg-muted/30">
                    <div className="flex items-center justify-between mb-2 sm:mb-3 px-1">
                      <h3 className="text-xs sm:text-sm font-bold">
                        Chat <span className="text-primary">History</span>
                      </h3>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 sm:h-8 hover:bg-primary/10 transition-all text-primary rounded-lg text-[10px] sm:text-xs gap-1.5 sm:gap-2 px-2"
                        onClick={handleCreateSession}
                      >
                        <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        <span className="font-semibold">New Chat</span>
                      </Button>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search chats..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-[11px] sm:text-xs bg-background border-none shadow-sm"
                      />
                    </div>
                  </div>
                  <ScrollArea className="flex-1 max-h-[60vh]">
                    <div className="p-2 space-y-1.5 pb-2">
                      {sessions.map((s: ChatSession) => (
                        <div
                          key={s.id}
                          className={cn(
                            "group relative flex items-center p-2 sm:p-2.5 rounded-2xl transition-all duration-200 cursor-pointer border border-transparent mb-0.5 overflow-hidden",
                            currentSessionId === s.id
                              ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
                              : "hover:bg-muted/40 hover:border-border/30",
                          )}
                          onClick={() => {
                            handleSetCurrentSessionId(s.id);
                            setHistoryOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div
                              className={cn(
                                "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                currentSessionId === s.id
                                  ? "bg-primary/20"
                                  : "bg-muted",
                              )}
                            >
                              <MessageSquare className="w-4 h-4 opacity-70" />
                            </div>
                            {editingSessionId === s.id ? (
                              <Input
                                autoFocus
                                value={editSessionName}
                                onChange={(e) =>
                                  setEditSessionName(e.target.value)
                                }
                                onBlur={() => setEditingSessionId(null)}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && handleRenameSession(s.id)
                                }
                                className="flex-1 min-w-0 h-7 text-[11px] sm:text-xs px-1.5 py-0 bg-background rounded-md"
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <div className="flex flex-col min-w-0 flex-1">
                                <span className="text-xs sm:text-sm font-semibold truncate group-hover:text-primary transition-colors">
                                  {s.name}
                                </span>
                                <span className="text-[10px] sm:text-[11px] opacity-60">
                                  {formatDistanceToNow(new Date(s.updated_at), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                          <div
                            className={cn(
                              "absolute right-2 top-1/2 -translate-y-1/2 flex items-center p-0.5 rounded-xl bg-background/80 backdrop-blur-md shadow-sm border border-border/40 z-10 transition-opacity gap-0.5",
                              editingSessionId === s.id
                                ? "opacity-100"
                                : "sm:opacity-0 group-hover:opacity-100",
                            )}
                          >
                            {editingSessionId === s.id ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-primary hover:bg-primary/10 transition-all shrink-0"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleRenameSession(s.id);
                                  }}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-muted-foreground hover:bg-muted transition-all shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingSessionId(null);
                                  }}
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-background shadow-sm border border-transparent hover:border-border/50 transition-all shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingSessionId(s.id);
                                        setEditSessionName(s.name);
                                      }}
                                    >
                                      <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Rename Chat</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSessionToDelete(s.id);
                                      }}
                                    >
                                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Delete Chat</TooltipContent>
                                </Tooltip>
                              </>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Infinite Scroll Trigger */}
                      {hasMoreSessions && (
                        <div
                          ref={loadMoreRef}
                          className="py-4 flex justify-center"
                        >
                          <Loader2 className="w-5 h-5 animate-spin text-primary/50" />
                        </div>
                      )}

                      {sessions.length === 0 && !isLoadingMoreSessions && (
                        <div className="p-8 text-center text-muted-foreground text-xs italic">
                          No chat history found
                        </div>
                      )}
                    </div>
                  </ScrollArea>
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
                  onClick={handleCreateSession}
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

      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Chat Area Scroll Container */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
        >
          <div
            key={currentSessionId || "new"}
            className={cn(
              "max-w-3xl mx-auto w-full pt-4 sm:pt-6 pb-0 sm:pb-8 flex flex-col min-h-full transition-all duration-300 animate-in fade-in fill-mode-both",
              compact ? "px-1 sm:px-1.5" : "px-3 sm:px-6 md:px-8 lg:px-10",
            )}
          >
            {!currentSessionId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary/40" />
                </div>
                <div className="max-w-[200px]">
                  <p className="text-sm font-medium">Start a conversation</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Your AI assistant is ready to help you manage your medicines
                    and more.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6 flex-1">
                {isLoadingMessages && messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
                    <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
                    <p className="text-xs text-muted-foreground mt-4 font-medium animate-pulse">
                      Retrieving Secure History...
                    </p>
                  </div>
                ) : (
                  isLoadingMessages && (
                    <div className="flex justify-center p-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
                    </div>
                  )
                )}

                {messages.map((msg: AgentMessage) => (
                  <AgentChatMessage
                    key={msg.id}
                    message={msg}
                    compact={compact}
                    onRetry={handleRetryMessage}
                    onEdit={handleEditMessage}
                    onDelete={handleDeleteMessage}
                    isGenerating={isGenerating}
                  />
                ))}

                {/* Spacer to ensure last message is well above the floating input */}
                <div
                  className="h-16 shrink-0 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <div className="mt-auto shrink-0 w-full z-20 mb-4 md:mb-0 px-2 sm:px-0">
          <AgentChatInput
            input={input}
            setInput={setInput}
            sendMessage={handleSendMessage}
            isSending={isSending}
            compact={compact}
            isNewSession={!currentSessionId}
            showScrollDown={showScrollButton}
            scrollToBottom={() => scrollToBottom()}
          />
        </div>
      </div>

      <AlertDialog
        open={!!sessionToDelete}
        onOpenChange={(open) => !open && setSessionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete chat session?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its
              messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sessionToDelete) {
                  deleteSession(sessionToDelete);
                  setSessionToDelete(null);
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
