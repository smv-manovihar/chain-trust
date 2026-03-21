import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  History,
  Sparkles,
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Pencil,
  Check,
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
import { agentApi, ChatSession } from "@/api/agent.api";
import { toast } from "sonner";
import { AgentChatMessage } from "./agent-chat-message";
import { AgentChatInput } from "./agent-chat-input";
import { useAgentSession } from "@/hooks/use-agent-session";
import type { AgentMessage, AgentSSEEvent } from "@/types/agent.types";
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
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    initialSessionId,
  );
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(false);

  const {
    session,
    isGenerating,
    connect,
    disconnect,
    connectionStatus,
    setSession,
  } = useAgentSession({
    sessionId: currentSessionId || "",
    onChatEvent: (event: AgentSSEEvent) => {
      const msgId = event.message_id;

      switch (event.type) {
        case "name_updated":
          if (event.name) {
            setSessions((prev: ChatSession[]) =>
              prev.map((s: ChatSession) =>
                s.id === currentSessionId ? { ...s, name: event.name! } : s,
              ),
            );
          }
          break;

        case "token":
          if (msgId && event.content) {
            setMessages((prev: AgentMessage[]) => {
              const existing = prev.find((m) => m.id === msgId);
              if (existing) {
                return prev.map((m: AgentMessage) =>
                  m.id === msgId
                    ? {
                        ...m,
                        content: (m.content || "") + event.content!,
                        status: "generating" as const,
                      }
                    : m,
                );
              }
              // Create assistant msg if missing
              const newMsg: AgentMessage = {
                id: msgId,
                session_id: currentSessionId!,
                role: "assistant",
                content: event.content!,
                status: "generating" as const,
                thoughts: [],
                edited: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              return [...prev, newMsg];
            });
          }
          break;

        case "partial_response":
          if (msgId && event.content) {
            setMessages((prev: AgentMessage[]) =>
              prev.map((m: AgentMessage) =>
                m.id === msgId
                  ? {
                      ...m,
                      content: event.content!,
                      status: "generating" as const,
                    }
                  : m,
              ),
            );
          }
          break;

        case "tool_start":
          if (msgId && event.tool) {
            setMessages((prev: AgentMessage[]) => {
              const existingIndex = prev.findIndex((m) => m.id === msgId);

              if (existingIndex !== -1) {
                return prev.map((m: AgentMessage) => {
                  if (m.id !== msgId) return m;
                  const thoughts = [...(m.thoughts || [])];
                  thoughts.push({
                    tool: event.tool!,
                    input: event.input,
                    status: event.status || ("running" as const),
                    message: event.message || `Running ${event.tool}...`,
                    tool_call_id: event.tool_call_id,
                  });
                  return { ...m, thoughts };
                });
              }

              // Create assistant msg if missing
              const newMsg: AgentMessage = {
                id: msgId,
                session_id: currentSessionId!,
                role: "assistant",
                content: "",
                status: "generating" as const,
                thoughts: [
                  {
                    tool: event.tool!,
                    input: event.input,
                    status: event.status || ("running" as const),
                    message: event.message || `Running ${event.tool}...`,
                    tool_call_id: event.tool_call_id,
                  },
                ],
                edited: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };
              return [...prev, newMsg];
            });
          }
          break;

        case "tool_end":
          if (msgId && event.tool_call_id) {
            setMessages((prev: AgentMessage[]) =>
              prev.map((m: AgentMessage) => {
                if (m.id !== msgId) return m;
                const thoughts = (m.thoughts || []).map((t: any) =>
                  t.tool_call_id === event.tool_call_id
                    ? {
                        ...t,
                        result: event.result,
                        status: event.status || ("completed" as const),
                        message: event.message,
                        execution_time_ms: event.execution_time_ms,
                      }
                    : t,
                );
                return { ...m, thoughts };
              }),
            );
          }
          break;

        case "done":
          if (msgId) {
            setMessages((prev: AgentMessage[]) =>
              prev.map((m: AgentMessage) =>
                m.id === msgId && m.status !== "error"
                  ? { ...m, status: "completed" as const }
                  : m,
              ),
            );
            disconnect();
          }
          break;

        case "error":
          if (msgId) {
            setMessages((prev: AgentMessage[]) =>
              prev.map((m: AgentMessage) =>
                m.id === msgId ? { ...m, status: "error" as const } : m,
              ),
            );
          }
          toast.error(event.message || "An error occurred with the AI agent");
          disconnect();
          break;
      }
    },
  });

  // Load User Sessions
  const loadSessions = useCallback(async () => {
    try {
      const data = await agentApi.listSessions();
      setSessions(data);
      if (!currentSessionId && data.length > 0) {
        setCurrentSessionId(data[0].id);
        onSessionChange?.(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load sessions", error);
    }
  }, [currentSessionId, onSessionChange]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Scroll management
  const wasAtBottomRef = useRef(true);

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

  // Initial scroll on load
  useEffect(() => {
    if (currentSessionId) {
      const loadMessages = async () => {
        setIsLoadingMessages(true);
        try {
          const data = await agentApi.listMessages(currentSessionId);
          setMessages(data);
          // Initial scroll to bottom
          setTimeout(() => scrollToBottom("auto"), 50);
        } catch (error) {
          console.error("Failed to load messages", error);
          toast.error("Failed to load chat history");
        } finally {
          setIsLoadingMessages(false);
        }
      };
      loadMessages();
    }
  }, [currentSessionId, scrollToBottom]);

  const handleCreateSession = async () => {
    try {
      const { session_id } = await agentApi.createSession();
      setCurrentSessionId(session_id);
      setIsHistoryOpen(false);
      onSessionChange?.(session_id);
      loadSessions();
    } catch (error) {
      toast.error("Failed to create new chat");
    }
  };

  const handleRenameSession = async (id: string) => {
    if (!editSessionName.trim()) return;
    try {
      await agentApi.renameSession(id, editSessionName);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name: editSessionName } : s)),
      );
      setEditingSessionId(null);
      toast.success("Chat renamed");
    } catch (error) {
      toast.error("Failed to rename chat");
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await agentApi.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSessionId === id) {
        setCurrentSessionId(undefined);
      }
      toast.success("Chat deleted");
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isSubmittingRef.current) return;

    let sessionId = currentSessionId;

    // Create session if none exists
    if (!sessionId) {
      try {
        const { session_id } = await agentApi.createSession();
        sessionId = session_id;
        setCurrentSessionId(session_id);
        onSessionChange?.(session_id);
      } catch (error) {
        toast.error("Failed to start chat");
        return;
      }
    }

    const messageContent = input;
    isSubmittingRef.current = true;
    setIsSending(true);
    setInput("");

    // Optimistic User Message
    const tempUserMsg: AgentMessage = {
      id: Date.now().toString(),
      session_id: sessionId!,
      role: "user",
      content: messageContent,
      status: "completed",
      edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages((prev: AgentMessage[]) => [...prev, tempUserMsg]);

    try {
      await agentApi.sendChatMessage(
        sessionId!,
        messageContent,
        currentContext,
      );
      // Wait for SSE to pick up the assistant's start
      connect();
      // The assistant message will ideally be streamed via SSE or we fetch it after completion
      // For now, let's rely on SSE. We might need to refresh messages after stream done.
    } catch (error) {
      toast.error("Failed to send message");
      setInput(messageContent);
    } finally {
      setIsSending(false);
      isSubmittingRef.current = false;
    }
  };

  const handleRetryMessage = async (messageId: string) => {
    if (!currentSessionId || isSubmittingRef.current) return;

    try {
      isSubmittingRef.current = true;
      setIsSending(true);

      await agentApi.retryChatMessage(currentSessionId, messageId);

      // Prune local messages: find the message and remove everything from it onwards
      setMessages((prev: AgentMessage[]) => {
        const index = prev.findIndex((m) => m.id === messageId);
        if (index === -1) return prev;

        const targetMsg = prev[index];
        const sliceIndex = targetMsg.role === "user" ? index + 1 : index;
        return prev.slice(0, sliceIndex);
      });

      // Wait for SSE to pick up the assistant's start
      connect();
    } catch (err) {
      toast.error("Failed to retry", {
        description: "Could not regenerate response. Please try again.",
      });
    } finally {
      setIsSending(false);
      isSubmittingRef.current = false;
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!currentSessionId || isSubmittingRef.current) return;

    try {
      isSubmittingRef.current = true;
      setIsSending(true);

      await agentApi.editChatMessage(currentSessionId, messageId, newContent);

      // Prune local messages: find the edited message and remove everything AFTER it
      setMessages((prev: AgentMessage[]) => {
        const index = prev.findIndex((m) => m.id === messageId);
        if (index === -1) return prev;

        // Update the edited message content and prune everything after it
        const updatedMessages = [...prev.slice(0, index + 1)];
        updatedMessages[index] = {
          ...updatedMessages[index],
          content: newContent,
          updated_at: new Date().toISOString(),
          edited: true,
        };
        return updatedMessages;
      });

      // Wait for SSE to pick up the assistant's start
      connect();
    } catch (err) {
      toast.error("Failed to edit message", {
        description: "Could not update and regenerate response.",
      });
    } finally {
      setIsSending(false);
      isSubmittingRef.current = false;
    }
  };

  const filteredSessions = sessions.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div
      className={cn(
        "flex flex-col h-full relative overflow-hidden",
        compact
          ? "rounded-xl border shadow-2xl bg-background"
          : "w-full bg-transparent",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card/30 backdrop-blur-xl z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className={compact ? "w-4 h-4" : "w-5 h-5"} />
          </div>
          <div>
            <h3
              className={cn(
                "font-semibold text-foreground",
                compact ? "text-sm" : "text-base",
              )}
            >
              ChainTrust AI
            </h3>
            {session && (
              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                {session.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={cn("h-8 w-8", isHistoryOpen && "bg-muted")}
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateSession}
            className="h-8 w-8"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col">
        {/* Session History Sidebar/Overlay */}
        <div
          className={cn(
            "absolute inset-0 z-30bg-background/95 backdrop-blur-sm transition-transform duration-300 ease-in-out flex flex-col border-r",
            isHistoryOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="p-4 border-b space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Chat History</h4>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsHistoryOpen(false)}
                className="h-7 w-7"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-muted/30 border-none"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {filteredSessions.map((s: ChatSession) => (
                <div
                  key={s.id}
                  className={cn(
                    "group flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer",
                    currentSessionId === s.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted",
                  )}
                  onClick={() => {
                    setCurrentSessionId(s.id);
                    setIsHistoryOpen(false);
                    onSessionChange?.(s.id);
                  }}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                    {editingSessionId === s.id ? (
                      <Input
                        autoFocus
                        value={editSessionName}
                        onChange={(e) => setEditSessionName(e.target.value)}
                        onBlur={() => handleRenameSession(s.id)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleRenameSession(s.id)
                        }
                        className="h-6 text-xs px-1 py-0 bg-background"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium truncate">
                          {s.name}
                        </span>
                        <span className="text-[10px] opacity-50">
                          {formatDistanceToNow(new Date(s.updated_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
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
                      className="h-6 w-6 hover:text-destructive"
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

        <div ref={scrollRef} className="flex-1 overflow-y-auto scroll-smooth">
          <div className="max-w-3xl mx-auto w-full p-4 md:p-6 lg:p-8 space-y-6 pb-48">
            {!currentSessionId && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
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
            )}

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
                onRetry={handleRetryMessage}
                onEdit={handleEditMessage}
                onDelete={async (id) => {
                  try {
                    await agentApi.deleteChatMessage(currentSessionId!, id);
                    // Match backend: prune everything from here onwards
                    setMessages((prev: AgentMessage[]) => {
                      const index = prev.findIndex((m) => m.id === id);
                      if (index === -1) return prev;
                      return prev.slice(0, index);
                    });
                    toast.success("Message deleted");
                  } catch (e) {
                    toast.error("Failed to delete message");
                  }
                }}
              />
            ))}

            {/* Added spacer to ensure last message is well above the floating input */}
            <div
              className="h-24 shrink-0 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Chat Input */}
        <AgentChatInput
          input={input}
          setInput={setInput}
          sendMessage={sendMessage}
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
                  handleDeleteSession(sessionToDelete);
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
