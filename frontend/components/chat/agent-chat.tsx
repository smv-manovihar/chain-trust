import { useEffect, useState, useRef, useCallback } from "react";
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
    setInput,
    setHistoryOpen,
    setCurrentSessionId,
    sendMessage,
    createSession,
    deleteSession,
    renameSession,
    retryMessage,
    editMessage,
    deleteMessage,
  } = useAgent();

  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const wasAtBottomRef = useRef(true);

  // Initialize with initialSessionId if provided and no session is active
  useEffect(() => {
    if (initialSessionId && !currentSessionId) {
      setCurrentSessionId(initialSessionId);
    }
  }, [initialSessionId, currentSessionId, setCurrentSessionId]);

  // Sync session change to parent if needed
  useEffect(() => {
    if (currentSessionId) {
      onSessionChange?.(currentSessionId);
    }
  }, [currentSessionId, onSessionChange]);

  // Scroll management
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior,
      });
    }
  }, []);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsAtBottom(atBottom);
    wasAtBottomRef.current = atBottom;
    setShowScrollButton(!atBottom && scrollHeight > clientHeight);
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (scrollEl) {
      scrollEl.addEventListener("scroll", handleScroll);
      return () => scrollEl.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  // Handle auto-scroll on new messages
  useEffect(() => {
    if (wasAtBottomRef.current) {
      scrollToBottom("auto");
    }
  }, [messages, scrollToBottom]);

  const handleCreateSession = async () => {
    await createSession();
  };

  const handleRenameSession = async (id: string) => {
    if (!editSessionName.trim()) return;
    await renameSession(id, editSessionName);
    setEditingSessionId(null);
  };

  const filteredSessions = sessions.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const session = sessions.find(s => s.id === currentSessionId);

  return (
    <div
      className={cn(
        "flex flex-col h-full relative overflow-hidden",
        compact
          ? "rounded-xl border shadow-2xl bg-background"
          : "w-full max-w-5xl mx-auto bg-transparent",
      )}
    >
      {/* Floating Header */}
      <div className="sticky top-0 z-[40] w-full px-2 sm:px-4 pt-2 sm:pt-4 pb-1 sm:pb-2">
        <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-background/80 backdrop-blur-xl border border-primary/10 shadow-lg rounded-xl sm:rounded-2xl">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="p-1 sm:p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className={cn(compact ? "w-3.5 h-3.5" : "w-4 h-4 sm:w-5 sm:h-5")} />
            </div>
            <div>
              <h3
                className={cn(
                  "font-semibold text-foreground leading-none",
                  compact ? "text-xs" : "text-sm sm:text-base",
                )}
              >
                ChainTrust AI
              </h3>
              {session && (
                <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-[100px] sm:max-w-[120px] mt-0.5 sm:mt-1">
                  {session.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHistoryOpen(!isHistoryOpen)}
              className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl", isHistoryOpen && "bg-muted")}
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateSession}
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Session History Sidebar/Overlay - Optimized for Mobile Overlay */}
        <div
          className={cn(
            "absolute inset-0 z-30 bg-card/98 backdrop-blur-md transition-all duration-300 ease-in-out flex flex-col border-r",
            isHistoryOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0",
          )}
        >
          <div className="p-3 sm:p-4 border-b space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-xs sm:text-sm">Chat History</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setHistoryOpen(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-8 text-[11px] sm:text-xs bg-muted/30 border-none"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 p-1.5 sm:p-2">
            <div className="space-y-0.5 sm:space-y-1">
              {filteredSessions.map((s: ChatSession) => (
                <div
                  key={s.id}
                  className={cn(
                    "group flex items-center justify-between p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer",
                    currentSessionId === s.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    setHistoryOpen(false);
                  }}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0">
                    <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 opacity-60" />
                    {editingSessionId === s.id ? (
                      <Input
                        autoFocus
                        value={editSessionName}
                        onChange={(e) => setEditSessionName(e.target.value)}
                        onBlur={() => handleRenameSession(s.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleRenameSession(s.id)
                        }
                        className="h-6 text-[11px] sm:text-xs px-1 py-0 bg-background"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] sm:text-xs font-medium truncate">
                          {s.name}
                        </span>
                        <span className="text-[9px] sm:text-[10px] opacity-50">
                          {formatDistanceToNow(new Date(s.updated_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-6 sm:w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSessionId(s.id);
                        setEditSessionName(s.name);
                      }}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-6 sm:w-6 hover:text-destructive text-destructive/70 sm:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSessionToDelete(s.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
          <div className={cn(
            "max-w-3xl mx-auto w-full pt-2 sm:pt-4 px-3 sm:px-6 md:px-8 lg:px-10 pb-0 sm:pb-8 flex flex-col min-h-full",
            compact ? "px-2" : ""
          )}>
            {!currentSessionId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
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
                {isLoadingMessages && (
                  <div className="flex justify-center p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary/40" />
                  </div>
                )}

                {messages.map((msg: AgentMessage) => (
                  <AgentChatMessage
                    key={msg.id}
                    message={msg}
                    compact={compact}
                    onRetry={retryMessage}
                    onEdit={editMessage}
                    onDelete={deleteMessage}
                  />
                ))}

                {/* Spacer to ensure last message is well above the floating input */}
                <div className="h-32 sm:h-40 shrink-0 pointer-events-none" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

        {/* Chat Input */}
        <AgentChatInput
          input={input}
          setInput={setInput}
          sendMessage={() => sendMessage(currentContext)}
          isSending={isSending}
          compact={compact}
          showScrollDown={showScrollButton}
          scrollToBottom={() => scrollToBottom()}
        />
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
