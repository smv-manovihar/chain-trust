"use client";

import { memo } from "react";
import { AgentChatMessage } from "./agent-chat-message";
import { AgentMessage } from "@/types/agent.types";

interface ChatMessageListProps {
  messages: AgentMessage[];
  compact?: boolean;
  activeMessageId?: string;
  handleRetryMessage: (id: string) => void;
  handleEditMessage: (id: string, content: string) => void;
  handleDeleteMessage: (id: string) => void;
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  compact,
  activeMessageId,
  handleRetryMessage,
  handleEditMessage,
  handleDeleteMessage,
}: ChatMessageListProps) {
  return (
    <>
      {messages.map((msg: AgentMessage) => (
        <AgentChatMessage
          key={msg.id}
          message={msg}
          compact={compact}
          onRetry={handleRetryMessage}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          isGenerating={activeMessageId === msg.id}
        />
      ))}
    </>
  );
});
