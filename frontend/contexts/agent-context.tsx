"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { agentApi, ChatSession } from "@/api/agent.api";
import type { AgentMessage, AgentSSEEvent } from "@/types/agent.types";
import { useSSEStream, SSEEvent } from "@/hooks/use-sse-stream";
import { toast } from "sonner";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

interface AgentContextType {
  sessions: ChatSession[];
  currentSessionId: string | undefined;
  messages: AgentMessage[];
  input: string;
  isSending: boolean;
  isOpen: boolean;
  isHistoryOpen: boolean;
  isLoadingSessions: boolean;
  isLoadingMessages: boolean;
  isGenerating: boolean;

  setInput: (input: string) => void;
  setOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  setCurrentSessionId: (id: string | undefined) => void;
  sendMessage: (context?: any) => Promise<void>;
  createSession: () => Promise<string>;
  deleteSession: (id: string) => Promise<void>;
  renameSession: (id: string, name: string) => Promise<void>;
  retryMessage: (messageId: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isOpen, setOpen] = useState(false);
  const [isHistoryOpen, setHistoryOpen] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isSubmittingRef = useRef(false);
  const sessionsAbortRef = useRef<AbortController | null>(null);
  const messagesAbortRef = useRef<AbortController | null>(null);

  // Sync session ID with URL search param 's'
  useEffect(() => {
    const s = searchParams.get("s");
    if (s && s !== currentSessionId) {
      setCurrentSessionId(s);
    }
  }, [searchParams, currentSessionId]);

  // Update URL when currentSessionId changes (only on specific pages if needed, but here we do it generally)
  const updateUrl = useCallback((id: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id) {
      params.set("s", id);
    } else {
      params.delete("s");
    }
    const query = params.toString() ? `?${params.toString()}` : "";
    // Only update if we are on a page that should have session syncing, or just do it globally
    // For now, let's assume we want it reflected whenever the agent is active
    if (pathname.includes("/agent")) {
      router.replace(`${pathname}${query}`);
    }
  }, [pathname, router, searchParams]);

  const handleSetCurrentSessionId = useCallback((id: string | undefined) => {
    setCurrentSessionId(id);
    updateUrl(id);
  }, [updateUrl]);

  const loadSessions = useCallback(async () => {
    if (sessionsAbortRef.current) sessionsAbortRef.current.abort();
    const controller = new AbortController();
    sessionsAbortRef.current = controller;

    try {
      setIsLoadingSessions(true);
      const data = await agentApi.listSessions(controller.signal);
      setSessions(data);
    } catch (error: any) {
      if (error.name === "AbortError") return;
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
      if (error.name === "AbortError") return;
      console.error("Failed to load messages", error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    return () => sessionsAbortRef.current?.abort();
  }, [loadSessions]);

  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId);
    } else {
      setMessages([]);
    }
    return () => messagesAbortRef.current?.abort();
  }, [currentSessionId, loadMessages]);

  // SSE Management
  const handleSSEEvent = useCallback((sseEvent: SSEEvent) => {
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
                  : m
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
                ? { ...m, content: data.content!, status: "generating" as const }
                : m
            )
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
                  : m
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
                    : t
                ),
              };
            })
          );
        }
        break;

      case "name_updated":
        if (data.name) {
          setSessions((prev) =>
            prev.map((s) => (s.id === currentSessionId ? { ...s, name: data.name! } : s))
          );
        }
        break;

      case "done":
        setIsGenerating(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId && m.status !== "error" ? { ...m, status: "completed" as const } : m
          )
        );
        disconnect();
        break;

      case "error":
        setIsGenerating(false);
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, status: "error" as const } : m))
        );
        toast.error(data.message || "An error occurred with the AI agent");
        disconnect();
        break;
    }
  }, [currentSessionId]);

  const { connect, disconnect } = useSSEStream({
    getUrl: () => (currentSessionId ? agentApi.getStreamUrl(currentSessionId) : ""),
    onEvent: handleSSEEvent,
    onComplete: () => setIsGenerating(false),
  });

  const sendMessage = async (context?: any) => {
    if (!input.trim() || isSubmittingRef.current) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const { session_id } = await agentApi.createSession();
        sessionId = session_id;
        handleSetCurrentSessionId(session_id);
        await loadSessions();
      } catch (error) {
        toast.error("Failed to start chat");
        return;
      }
    }

    const messageContent = input;
    isSubmittingRef.current = true;
    setIsSending(true);
    setIsGenerating(true);
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
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      await agentApi.sendChatMessage(sessionId!, messageContent, context);
      connect();
    } catch (error) {
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      setInput(messageContent);
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
      setHistoryOpen(false);
      return session_id;
    } catch (error) {
      toast.error("Failed to create new chat");
      throw error;
    }
  };

  const deleteSession = async (id: string) => {
    try {
      await agentApi.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSessionId === id) {
        handleSetCurrentSessionId(undefined);
      }
      toast.success("Chat deleted");
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  const renameSession = async (id: string, name: string) => {
    try {
      await agentApi.renameSession(id, name);
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
      toast.success("Chat renamed");
    } catch (error) {
      toast.error("Failed to rename chat");
    }
  };

  const retryMessage = async (messageId: string) => {
    if (!currentSessionId || isSubmittingRef.current) return;
    try {
      isSubmittingRef.current = true;
      setIsSending(true);
      setIsGenerating(true);
      await agentApi.retryChatMessage(currentSessionId, messageId);
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === messageId);
        if (index === -1) return prev;
        const targetMsg = prev[index];
        const sliceIndex = targetMsg.role === "user" ? index + 1 : index;
        return prev.slice(0, sliceIndex);
      });
      connect();
    } catch (err) {
      toast.error("Failed to retry");
      setIsGenerating(false);
    } finally {
      setIsSending(false);
      isSubmittingRef.current = false;
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!currentSessionId || isSubmittingRef.current) return;
    try {
      isSubmittingRef.current = true;
      setIsSending(true);
      setIsGenerating(true);
      await agentApi.editChatMessage(currentSessionId, messageId, newContent);
      setMessages((prev) => {
        const index = prev.findIndex((m) => m.id === messageId);
        if (index === -1) return prev;
        const updatedMessages = [...prev.slice(0, index + 1)];
        updatedMessages[index] = {
          ...updatedMessages[index],
          content: newContent,
          updated_at: new Date().toISOString(),
          edited: true,
        };
        return updatedMessages;
      });
      connect();
    } catch (err) {
      toast.error("Failed to edit message");
      setIsGenerating(false);
    } finally {
      setIsSending(false);
      isSubmittingRef.current = false;
    }
  };

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

  return (
    <AgentContext.Provider
      value={{
        sessions,
        currentSessionId,
        messages,
        input,
        isSending,
        isOpen,
        isHistoryOpen,
        isLoadingSessions,
        isLoadingMessages,
        isGenerating,
        setInput,
        setOpen,
        setHistoryOpen,
        setCurrentSessionId: handleSetCurrentSessionId,
        sendMessage,
        createSession,
        deleteSession,
        renameSession,
        retryMessage,
        editMessage,
        deleteMessage,
        refreshSessions: loadSessions,
      }}
    >
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
