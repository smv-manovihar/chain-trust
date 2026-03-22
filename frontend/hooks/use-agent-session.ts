import {
  useState,
  useEffect,
  useRef,
  useCallback,
  Dispatch,
  SetStateAction,
} from "react";
import { agentApi } from "@/api/agent.api";
import type { AgentSession, AgentSSEEvent } from "@/types/agent.types";
import { useSSEStream, SSEEvent } from "@/hooks/use-sse-stream";

interface UseAgentSessionProps {
  sessionId: string;
  onChatEvent?: (event: AgentSSEEvent) => void;
}

interface UseAgentSessionReturn {
  session: AgentSession | null;
  isLoading: boolean;
  error: Error | null;
  isNotFound: boolean;
  isGenerating: boolean;
  refetch: () => Promise<void>;
  connect: () => void;
  disconnect: () => void;
  connectionStatus: "connected" | "disconnected";
  setSession: Dispatch<SetStateAction<AgentSession | null>>;
}

/**
 * Manages agent chat session state with SSE streaming for real-time updates.
 */
export const useAgentSession = ({
  sessionId,
  onChatEvent,
}: UseAgentSessionProps): UseAgentSessionReturn => {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const sessionRef = useRef<AgentSession | null>(null);
  const onChatEventRef = useRef(onChatEvent);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId || sessionId === "undefined") {
      setIsNotFound(true);
      setIsLoading(false);
      return;
    }

    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (!sessionRef.current) setIsLoading(true);

      const sessions = await agentApi.listSessions(controller.signal);
      const currentSession = sessions.find(s => s.id === sessionId);
      
      if (!currentSession) {
        setIsNotFound(true);
        return;
      }

      setSession(currentSession);
      setError(null);
      setIsNotFound(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      
      if (err.status === 404) {
        setIsNotFound(true);
      } else if (!sessionRef.current) {
        setError(err as Error);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsLoading(false);
      }
    }
  }, [sessionId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleSSEEvent = useCallback((sseEvent: SSEEvent) => {
    const { event, data } = sseEvent;

    const agentEvent: AgentSSEEvent = {
      type: event as any,
      ...data,
    };

    switch (event) {
      case "error":
        setIsGenerating(false);
        break;

      case "name_updated":
        if (data.name) {
          setSession((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              name: data.name,
              updated_at: data.updated_at || new Date().toISOString(),
            };
          });
        }
        break;

      case "chat_start":
        setIsGenerating(true);
        break;

      case "chat_done":
        setIsGenerating(false);
        break;

      case "partial_response":
        if (data.status === "generating") {
          setIsGenerating(true);
        }
        break;
    }

    onChatEventRef.current?.(agentEvent);
  }, []);

  const {
    status: streamStatus,
    connect,
    disconnect,
  } = useSSEStream({
    getUrl: () => agentApi.getStreamUrl(sessionId),
    onEvent: handleSSEEvent,
    onComplete: () => {
      setIsGenerating(false);
    },
  });

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    onChatEventRef.current = onChatEvent;
  }, [onChatEvent]);

  useEffect(() => {
    fetchSession();
  }, [sessionId, fetchSession]);

  return {
    session,
    isLoading,
    error,
    isNotFound,
    isGenerating,
    refetch: fetchSession,
    connect,
    disconnect,
    connectionStatus:
      streamStatus === "streaming" ? "connected" : "disconnected",
    setSession,
  };
};
