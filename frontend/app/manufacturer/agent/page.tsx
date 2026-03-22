"use client";

import { AgentChat } from "@/components/chat/agent-chat";
import { useSearchParams, usePathname } from "next/navigation";

export default function ManufacturerAgentPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sessionId = searchParams.get("s") || undefined;

  // Build situational context
  const currentContext = {
    route: pathname,
    params: Object.fromEntries(searchParams.entries()),
  };

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.16)-theme(spacing.16))]">
      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto">
        <AgentChat
          initialSessionId={sessionId}
          currentContext={currentContext}
        />
      </div>
    </div>
  );
}
