import { useState, useCallback, useRef, useEffect } from "react";
import { tokenStore } from "@/lib/token-store";
import client from "@/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SSEStatus = "idle" | "streaming" | "complete" | "error";

/**
 * Parsed SSE event after envelope unwrapping.
 * Backend sends: `{ event, data, timestamp }`
 * This surfaces: `{ event, data }` (timestamp is dropped).
 */
export interface SSEEvent {
  event: string;
  data: Record<string, any>;
}

export interface UseSSEStreamOptions {
  /** URL factory — called each time a connection opens. */
  getUrl: () => string;

  /**
   * Declarative control.
   * - `true`  → auto-connect (if idle)
   * - `false` → auto-disconnect (if streaming)
   * - `undefined` → manual mode (use connect/disconnect)
   */
  enabled?: boolean;

  /**
   * Called for every parsed SSE event.
   * The `done` event is handled automatically (closes stream).
   * All other events — including `error` — are passed through here.
   */
  onEvent: (event: SSEEvent) => void;

  /** Called when stream closes normally (done event or reader end). */
  onComplete?: () => void;

  /** Called on non-abort errors. */
  onError?: (error: Error) => void;
}

export interface UseSSEStreamReturn {
  status: SSEStatus;
  connect: () => void;
  disconnect: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSSEStream({
  getUrl,
  enabled,
  onEvent,
  onComplete,
  onError,
}: UseSSEStreamOptions): UseSSEStreamReturn {
  const [status, setStatus] = useState<SSEStatus>("idle");

  // Refs to avoid stale closures
  const statusRef = useRef<SSEStatus>("idle");
  const isConnectingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  // Always keep callback refs fresh
  const onEventRef = useRef(onEvent);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const getUrlRef = useRef(getUrl);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);
  useEffect(() => {
    getUrlRef.current = getUrl;
  }, [getUrl]);

  // ---- Status helper ----
  const updateStatus = useCallback((next: SSEStatus) => {
    if (!isMountedRef.current) return;
    statusRef.current = next;
    setStatus(next);
  }, []);

  // ---- Disconnect ----
  const disconnect = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    isConnectingRef.current = false;
    if (statusRef.current !== "idle") {
      updateStatus("idle");
    }
  }, [updateStatus]);

  // ---- Connect ----
  const connect = useCallback(async () => {
    // Guard: already streaming or connecting
    if (statusRef.current === "streaming" || isConnectingRef.current) {
      return;
    }

    isConnectingRef.current = true;

    // Abort any lingering controller
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    // Small delay to allow previous abort to settle
    await new Promise((r) => setTimeout(r, 50));
    if (!isMountedRef.current) return;

    const controller = new AbortController();
    abortRef.current = controller;
    updateStatus("streaming");
    isConnectingRef.current = false;

    const processStream = async (response: Response, controller: AbortController) => {
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            try {
              const raw = JSON.parse(line.slice(6));

              // ---- System shutdown (legacy or new) ----
              if (
                raw.type === "system" &&
                raw.content?.includes("shutting down")
              ) {
                updateStatus("complete");
                onCompleteRef.current?.();
                controller.abort();
                return;
              }

              // ---- Envelope format: { event, data, timestamp } ----
              if (raw.event) {
                const sseEvent: SSEEvent = {
                  event: raw.event,
                  data: raw.data ?? {},
                };

                // Universal terminal: "done" event
                if (raw.event === "done") {
                  updateStatus("complete");
                  onCompleteRef.current?.();
                  controller.abort();
                  return;
                }

                // Pass all other events to the consumer
                onEventRef.current(sseEvent);
              }
              // ---- Legacy flat format: { type, ...payload } (fallback) ----
              else if (raw.type) {
                const { type, ...payload } = raw;

                if (type === "done") {
                  updateStatus("complete");
                  onCompleteRef.current?.();
                  controller.abort();
                  return;
                }

                onEventRef.current({ event: type, data: payload });
              }
            } catch (parseErr) {
              // Ignore parse errors from malformed chunks
            }
          }
        }

        // Reader ended normally
        if (isMountedRef.current) {
          updateStatus("complete");
          onCompleteRef.current?.();
        }
      } finally {
        reader.releaseLock();
      }
    };

    try {
      const url = getUrlRef.current();
      const token = tokenStore.getToken();
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      
      // Handle 401 Unauthorized - attempt refresh once
      if (response.status === 401) {
        try {
          // Trigger refresh through main client (handles queuing)
          await client.post('/auth/refresh');
          const newToken = tokenStore.getToken();
          
          // Retry the fetch with new token
          const retryResponse = await fetch(url, {
            signal: controller.signal,
            headers: { 
              Accept: "text/event-stream",
              ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
            },
          });
          
          if (!retryResponse.ok) {
            const errorText = await retryResponse.text();
            throw new Error(`Stream failed after refresh: ${retryResponse.status} - ${errorText}`);
          }
          
          return await processStream(retryResponse, controller);
        } catch (refreshErr) {
          throw new Error("Stream failed: Unauthorized and could not refresh token.");
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stream failed: ${response.status} - ${errorText}`);
      }

      return await processStream(response, controller);
    } catch (err: any) {
      if (err.name === "AbortError") {
      } else {
        if (isMountedRef.current) {
          updateStatus("error");
          onErrorRef.current?.(err);
        }
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [updateStatus]);

  // ---- Declarative enabled control ----
  useEffect(() => {
    if (enabled === undefined) return; // manual mode

    if (enabled && statusRef.current === "idle") {
      connect();
    } else if (!enabled && statusRef.current === "streaming") {
      disconnect();
    }
  }, [enabled, connect, disconnect]);

  // ---- Cleanup on unmount ----
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, []);

  return { status, connect, disconnect };
}
