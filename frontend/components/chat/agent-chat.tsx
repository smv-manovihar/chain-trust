import { useEffect, useState, useCallback } from "react";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { ChatHeader } from "./chat-header";
import { ChatMessageList } from "./chat-message-list";
import { ChatEmptyState, ChatLoadingState } from "./chat-status-states";
import { DeleteSessionDialog } from "./delete-session-dialog";
import { AgentChatInput } from "./agent-chat-input";
import { useAgent } from "@/contexts/agent-context";
import { cn } from "@/lib/utils";

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
    isLoadingMessages,
    setSearchQuery,
    setInput,
    setCurrentSessionId: handleSetCurrentSessionId,
    sendMessage,
    deleteSession,
    renameSession,
    retryMessage,
    editMessage,
    deleteMessage,
    activeMessageId,
    hasMoreSessions,
    isLoadingMoreSessions,
    loadMoreSessions,
    resetChat,
  } = useAgent();

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
        compact
          ? "rounded-xl border shadow-2xl bg-background"
          : "w-full max-w-5xl mx-auto bg-transparent pt-14 lg:pt-0",
      )}
    >
      <ChatHeader 
        sessions={sessions}
        currentSessionId={currentSessionId}
        currentSession={session}
        onSearch={setSearchQuery}
        onSessionSelect={handleSetCurrentSessionId}
        onCreateSession={resetChat}
        onRenameSession={renameSession}
        onDeleteSession={setSessionToDelete}
        hasMoreSessions={hasMoreSessions}
        isLoadingMoreSessions={isLoadingMoreSessions}
        onLoadMoreSessions={loadMoreSessions}
        onResetChat={resetChat}
        compact={compact}
      />

      <div className="flex-1 relative overflow-hidden flex flex-col">
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
              <ChatEmptyState compact={compact} />
            ) : (
              <div className="space-y-4 sm:space-y-6 flex-1">
                {isLoadingMessages && messages.length === 0 ? (
                  <ChatLoadingState />
                ) : (
                  isLoadingMessages && <ChatLoadingState isMore />
                )}

                <ChatMessageList 
                  messages={messages}
                  compact={compact}
                  activeMessageId={activeMessageId}
                  handleRetryMessage={handleRetryMessage}
                  handleEditMessage={handleEditMessage}
                  handleDeleteMessage={handleDeleteMessage}
                />

                <div className="h-16 shrink-0 pointer-events-none" aria-hidden="true" />
              </div>
            )}
          </div>
        </div>

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

      <DeleteSessionDialog 
        sessionId={sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={(id: string) => {
          deleteSession(id);
          setSessionToDelete(null);
        }}
      />
    </div>
  );
}
