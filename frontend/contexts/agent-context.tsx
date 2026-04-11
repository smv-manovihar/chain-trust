"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { agentApi, ChatSession } from "@/api/agent.api";
import type { AgentMessage } from "@/types/agent.types";
import { useSSEStream, SSEEvent } from "@/hooks/use-sse-stream";
import { toast } from "sonner";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Suspense } from "react";

interface AgentContextType {
  sessions: ChatSession[];
  currentSessionId: string | undefined;
  messages: AgentMessage[];
  input: string;
  isSending: boolean;
  isOpen: boolean;
  isLoadingSessions: boolean;
  isLoadingMessages: boolean;
  isGenerating: boolean;
  searchQuery: string;
  hasMoreSessions: boolean;
  isLoadingMoreSessions: boolean;

  setInput: (input: string) => void;
  setOpen: (open: boolean) => void;
  setCurrentSessionId: (id: string | undefined) => void;
  sendMessage: (context?: any) => Promise<void>;
  createSession: () => Promise<string>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;
  retryMessage: (messageId: string, context?: any) => Promise<void>;
  editMessage: (
    messageId: string,
    newContent: string,
    context?: any,
  ) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  loadMoreSessions: () => Promise<void>;
  setSearchQuery: (query: string) => void;
  stopGeneration: () => void;
  resetChat: () => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AgentProviderInner>{children}</AgentProviderInner>
    </Suspense>
  );
}

function AgentProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(
    undefined,
  );
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasMoreSessions, setHasMoreSessions] = useState(true);
  const [isLoadingMoreSessions, setIsLoadingMoreSessions] = useState(false);

  const situationalContext = React.useMemo(
    () => ({
      route: pathname,
      params: Object.fromEntries(searchParams.entries()),
    }),
    [pathname, searchParams],
  );

  const isSubmittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const sessionsAbortRef = useRef<AbortController | null>(null);
  const loadMoreAbortRef = useRef<AbortController | null>(null);
  const messagesAbortRef = useRef<AbortController | null>(null);

  // Sync session ID from URL to state
  useEffect(() => {
    // Only sync from URL if the current page actually uses URL for session state
    if (!pathname.includes("/agent")) return;

    const sessionParam = searchParams.get("session") || undefined;

    // Only update state if the URL actually differs from our current state
    // We use the functional update pattern to check the current state without adding it to deps
    setCurrentSessionId((prev) => {
      if (sessionParam !== prev) return sessionParam;
      return prev;
    });
  }, [searchParams, pathname]);

  // Update URL when currentSessionId changes (only on specific pages if needed, but here we do it generally)
  const updateUrl = useCallback(
    (id: string | undefined) => {
      // Only update if we are on a page that should have session syncing
      if (!pathname.includes("/agent")) return;

      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("session", id);
      } else {
        params.delete("session");
      }

      const query = params.toString() ? `?${params.toString()}` : "";
      const newUrl = `${pathname}${query}`;

      // Use replace to avoid bloating history
      router.replace(newUrl);
    },
    [pathname, router, searchParams],
  );

  const handleSetCurrentSessionId = useCallback(
    (id: string | undefined) => {
      setCurrentSessionId(id);
      updateUrl(id);
    },
    [updateUrl],
  );

  const loadSessions = useCallback(async (search?: string) => {
    if (sessionsAbortRef.current) sessionsAbortRef.current.abort();
    const controller = new AbortController();
    sessionsAbortRef.current = controller;

    try {
      setIsLoadingSessions(true);
      const limit = 20;
      const data = await agentApi.listSessions(
        search,
        limit,
        0,
        controller.signal,
      );
      setSessions(data);
      setHasMoreSessions(data.length === limit);
    } catch (error: any) {
      if (
        error.name === "AbortError" ||
        error.name === "CanceledError" ||
        error.message === "canceled"
      )
        return;
      console.error("Failed to load sessions", error);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const loadMessages = useCallback(async (sessionId: string) => {
    if (messagesAbortRef.current) messagesAbortRef.current.abort();
    const controller = new AbortController();
    messagesAbortRef.current = controller;

    try {
      setIsLoadingMessages(true);
      const data = await agentApi.listMessages(sessionId, controller.signal);
      setMessages(data);
    } catch (error: any) {
      if (
        error.name === "AbortError" ||
        error.name === "CanceledError" ||
        error.message === "canceled"
      )
        return;
      console.error("Failed to load messages", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      setMessages([]); // Clear stale messages immediately
      loadMessages(currentSessionId);
    } else {
      setMessages([]);
    }
    return () => messagesAbortRef.current?.abort();
  }, [currentSessionId, loadMessages]);

  // SSE Management
  const handleSSEEvent = useCallback(
    (sseEvent: SSEEvent) => {
      const { event, data } = sseEvent;
      const msgId = data.message_id;

      switch (event) {
        case "token":
          if (msgId && data.content) {
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === msgId);
              if (existing) {
                return prev.map((m) =>
                  m.id === msgId
                    ? {
                        ...m,
                        content: (m.content || "") + data.content!,
                        status: "generating" as const,
                      }
                    : m,
                );
              }
              return [
                ...prev,
                {
                  id: msgId,
                  session_id: currentSessionId!,
                  role: "assistant",
                  content: data.content!,
                  status: "generating" as const,
                  thoughts: [],
                  edited: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ];
            });
          }
          break;

        case "partial_response":
          if (msgId && data.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      content: data.content!,
                      status: "generating" as const,
                    }
                  : m,
              ),
            );
          }
          break;

        case "shift_to_thought":
          if (msgId && data.content) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      content: "", // Clear the content as it's being shifted to thoughts
                      thoughts: [
                        ...(m.thoughts || []),
                        {
                          tool: "thinking",
                          status: "thinking" as const,
                          message: data.content!,
                          execution_time_ms: 0,
                        },
                      ],
                    }
                  : m,
              ),
            );
          }
          break;

        case "tool_start":
          if (msgId && data.tool) {
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === msgId);
              const thought = {
                tool: data.tool!,
                input: data.input,
                status: data.status || ("running" as const),
                message: data.message || `Running ${data.tool}...`,
                tool_call_id: data.tool_call_id,
              };

              if (existing) {
                return prev.map((m) =>
                  m.id === msgId
                    ? { ...m, thoughts: [...(m.thoughts || []), thought] }
                    : m,
                );
              }
              return [
                ...prev,
                {
                  id: msgId,
                  session_id: currentSessionId!,
                  role: "assistant",
                  content: "",
                  status: "generating" as const,
                  thoughts: [thought],
                  edited: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ];
            });
          }
          break;

        case "tool_end":
          if (msgId && data.tool_call_id) {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id !== msgId) return m;
                return {
                  ...m,
                  thoughts: (m.thoughts || []).map((t: any) =>
                    t.tool_call_id === data.tool_call_id
                      ? {
                          ...t,
                          result: data.result,
                          status: data.status || ("completed" as const),
                          message: data.message,
                          execution_time_ms: data.execution_time_ms,
                        }
                      : t,
                  ),
                };
              }),
            );
          }
          break;

        case "name_updated":
          if (data.name) {
            setSessions((prev) =>
              prev.map((s) =>
                s.id === currentSessionId ? { ...s, name: data.name! } : s,
              ),
            );
          }
          break;

        case "done":
          setIsGenerating(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId && m.status !== "error"
                ? { ...m, status: "completed" as const }
                : m,
            ),
          );
          disconnect();
          break;

        case "error":
          setIsGenerating(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? {
                    ...m,
                    status: "error" as const,
                    content:
                      data.message ||
                      m.content ||
                      "An error occurred with the AI agent",
                  }
                : m,
            ),
          );
          toast.error(data.message || "An error occurred with the AI agent");
          disconnect();
          break;
      }
    },
    [currentSessionId],
  );

  const { connect, disconnect } = useSSEStream({
    getUrl: () =>
      currentSessionId ? agentApi.getStreamUrl(currentSessionId) : "",
    onEvent: handleSSEEvent,
    onComplete: () => setIsGenerating(false),
  });

  const sendMessage = async (context?: any) => {
    if (!input.trim() || isSubmittingRef.current) return;

    let sessionId = currentSessionId;
    let isNewSession = false;
    if (!sessionId) {
      isNewSession = true;
    }

    const messageContent = input;
    isSubmittingRef.current = true;
    setIsSending(true);
    setIsGenerating(true);
    setInput("");

    // Optimistic User Message (Temporary ID if new session)
    const tempUserMsgId = Date.now().toString();
    const tempUserMsg: AgentMessage = {
      id: tempUserMsgId,
      session_id: sessionId || "new",
      role: "user",
      content: messageContent,
      status: "completed",
      edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      let message_id: string;
      let user_message_id: string | undefined;

      if (isNewSession) {
        const result: any = await agentApi.createSession(
          messageContent,
          context || situationalContext,
          controller.signal,
        );
        sessionId = result.session_id;
        message_id = result.message_id;
        user_message_id = result.user_message_id;

        handleSetCurrentSessionId(sessionId);
        // Rename the optimistic message to the real ID and update session
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempUserMsgId
              ? { ...m, id: user_message_id!, session_id: sessionId! }
              : m,
          ),
        );
        await loadSessions();
      } else {
        const result = await agentApi.sendChatMessage(
          sessionId!,
          messageContent,
          context || situationalContext,
          controller.signal,
        );
        message_id = result.message_id;
      }

      // Add Assistant Placeholder
      const assistantPlaceholder: AgentMessage = {
        id: message_id,
        session_id: sessionId!,
        role: "assistant",
        content: "",
        status: "generating",
        thoughts: [],
        edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantPlaceholder]);

      connect();
    } catch (error: any) {
      if (error.name === "AbortError") return;
      const errorMessage =
        error.response?.data?.detail ||
        error.message ||
        "Failed to send message";
      toast.error(errorMessage);

      // Instead of rolling back the user message, add an error assistant message
      const errorAssistantMsg: AgentMessage = {
        id: `err-${Date.now()}`,
        session_id: sessionId!,
        role: "assistant",
        content: `Error: ${errorMessage}`,
        status: "error",
        thoughts: [],
        edited: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);

      setIsGenerating(false);
    } finally {
      setIsSending(false);
      isSubmittingRef.current = false;
    }
  };

  const createSession = async () => {
    try {
      const { session_id } = await agentApi.createSession();
      handleSetCurrentSessionId(session_id);
      loadSessions();
      return session_id;
    } catch (error) {
      toast.error("Failed to create new chat");
      throw error;
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await agentApi.deleteSession(id);

      // Now that deletion is complete, clear the state
      setSessions((prev) => prev.filter((s) => s.id !== id));

      if (currentSessionId === id) {
        handleSetCurrentSessionId(undefined);
        // "Clear the things" - clear search and input
        setSearchQuery("");
        setInput("");
      }

      toast.success("Chat deleted");
    } catch (error) {
      console.error("Failed to delete chat session", error);
      toast.error("Failed to delete chat");
      // Re-fetch sessions on failure to restore consistency
      loadSessions(searchQuery);
    }
  };

  const renameSession = async (id: string, name: string) => {
    try {
      await agentApi.renameSession(id, name);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name } : s)),
      );
      toast.success("Chat renamed");
    } catch (error) {
      toast.error("Failed to rename chat");
    }
  };

  const retryMessage = useCallback(
    async (messageId: string, context?: any) => {
      if (!currentSessionId || isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      setIsSending(true);
      setIsGenerating(true);

      try {
        const result = await agentApi.retryChatMessage(
          currentSessionId,
          messageId,
          context || situationalContext,
        );

        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === messageId);
          if (index === -1) return prev;

          const targetMsg = prev[index];
          const sliceIndex = targetMsg.role === "user" ? index + 1 : index;
          const truncatedMessages = prev.slice(0, sliceIndex);

          // Add Assistant Placeholder with real ID from backend
          const assistantPlaceholder: AgentMessage = {
            id: result.message_id,
            session_id: currentSessionId!,
            role: "assistant",
            content: "",
            status: "generating",
            thoughts: [],
            edited: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          return [...truncatedMessages, assistantPlaceholder];
        });

        connect();
      } catch (err) {
        toast.error("Failed to retry");
        setIsGenerating(false);
        throw err;
      } finally {
        setIsSending(false);
        isSubmittingRef.current = false;
      }
    },
    [connect, currentSessionId, situationalContext],
  );

  const editMessage = useCallback(
    async (messageId: string, newContent: string, context?: any) => {
      if (!currentSessionId || isSubmittingRef.current || !newContent.trim())
        return;

      isSubmittingRef.current = true;
      setIsSending(true);
      setIsGenerating(true);

      try {
        const result = await agentApi.editChatMessage(
          currentSessionId,
          messageId,
          newContent,
          context || situationalContext,
        );

        setMessages((prev) => {
          const index = prev.findIndex((m) => m.id === messageId);
          if (index === -1) return prev;

          // Update the user message and truncate everything after it
          const updatedMessages = [...prev.slice(0, index + 1)];
          updatedMessages[index] = {
            ...updatedMessages[index],
            content: newContent,
            updated_at: new Date().toISOString(),
            edited: true,
          };

          // Add Assistant Placeholder with real ID from backend
          const assistantPlaceholder: AgentMessage = {
            id: result.message_id,
            session_id: currentSessionId,
            role: "assistant",
            content: "",
            status: "generating",
            thoughts: [],
            edited: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          return [...updatedMessages, assistantPlaceholder];
        });

        connect();
      } catch (error: any) {
        if (error.name === "AbortError") return;
        toast.error("Failed to edit message");
        setIsGenerating(false);
        throw error;
      } finally {
        setIsSending(false);
        isSubmittingRef.current = false;
      }
    },
    [connect, currentSessionId, situationalContext],
  );

  const deleteMessage = async (messageId: string) => {
    if (!currentSessionId) return;
    try {
      await agentApi.deleteChatMessage(currentSessionId, messageId);
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === messageId);
        if (index === -1) return prev;
        return prev.slice(0, index);
      });
      toast.success("Message deleted");
    } catch (e) {
      toast.error("Failed to delete message");
    }
  };

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    disconnect();
    setIsGenerating(false);
    setIsSending(false);
    isSubmittingRef.current = false;
  }, [disconnect]);

  const resetChat = useCallback(() => {
    stopGeneration();
    handleSetCurrentSessionId(undefined);
    setInput("");
  }, [handleSetCurrentSessionId, stopGeneration]);

  const loadMoreSessions = useCallback(async () => {
    if (isLoadingMoreSessions || !hasMoreSessions) return;

    if (loadMoreAbortRef.current) loadMoreAbortRef.current.abort();
    const controller = new AbortController();
    loadMoreAbortRef.current = controller;

    try {
      setIsLoadingMoreSessions(true);
      const limit = 20;
      const offset = sessions.length;
      const data = await agentApi.listSessions(
        searchQuery,
        limit,
        offset,
        controller.signal,
      );

      if (data.length > 0) {
        setSessions((prev) => [...prev, ...data]);
      }
      setHasMoreSessions(data.length === limit);
    } catch (error: any) {
      if (
        error.name === "AbortError" ||
        error.name === "CanceledError" ||
        error.message === "canceled"
      )
        return;
      console.error("Failed to load more sessions:", error);
    } finally {
      setIsLoadingMoreSessions(false);
    }
  }, [hasMoreSessions, isLoadingMoreSessions, searchQuery, sessions.length]);

  const refreshSessions = useCallback(
    () => loadSessions(searchQuery),
    [loadSessions, searchQuery],
  );

  // Sync sessions on mount and search changes
  useEffect(() => {
    if (!isAuthenticated || isAuthLoading) return;

    const timer = setTimeout(() => {
      loadSessions(searchQuery);
    }, 300); // 300ms debounce
    return () => {
      clearTimeout(timer);
      sessionsAbortRef.current?.abort();
    };
  }, [loadSessions, searchQuery, isAuthenticated, isAuthLoading]);

  const contextValue = React.useMemo(
    () => ({
      sessions,
      currentSessionId,
      messages,
      input,
      isSending,
      isOpen,
      isLoadingSessions,
      isLoadingMessages,
      isGenerating,
      searchQuery,
      hasMoreSessions,
      isLoadingMoreSessions,
      setInput,
      setOpen,
      setCurrentSessionId: handleSetCurrentSessionId,
      sendMessage,
      createSession,
      deleteSession,
      renameSession,
      retryMessage,
      editMessage,
      deleteMessage,
      refreshSessions,
      loadMoreSessions,
      setSearchQuery,
      stopGeneration,
      resetChat,
    }),
    [
      sessions,
      currentSessionId,
      messages,
      input,
      isSending,
      isOpen,
      isLoadingSessions,
      isLoadingMessages,
      isGenerating,
      searchQuery,
      hasMoreSessions,
      isLoadingMoreSessions,
      setInput,
      setOpen,
      handleSetCurrentSessionId,
      sendMessage,
      createSession,
      deleteSession,
      renameSession,
      retryMessage,
      editMessage,
      deleteMessage,
      refreshSessions,
      loadMoreSessions,
      setSearchQuery,
      stopGeneration,
      resetChat,
    ],
  );

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
