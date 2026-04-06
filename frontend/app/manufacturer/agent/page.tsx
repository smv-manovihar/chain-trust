"use client";

import { AgentChat } from "@/components/chat/agent-chat";
import { useSearchParams, usePathname } from "next/navigation";

export default function ManufacturerAgentPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sessionId = searchParams.get("session") || undefined;

  // Build situational context
  const currentContext = {
    route: pathname,
    params: Object.fromEntries(searchParams.entries()),
  };

  return (
    <div className="h-full">
      <div className="h-full w-full max-w-5xl mx-auto">
        <AgentChat
          initialSessionId={sessionId}
          currentContext={currentContext}
        />
      </div>
    </div>
  );
}
