"use client";

import { AgentChat } from "@/components/chat/agent-chat";
import { useSearchParams, usePathname } from "next/navigation";

export default function CustomerAgentPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const sessionId = searchParams.get("session") || undefined;

  // Build situational context
  const currentContext = {
    route: pathname,
    params: Object.fromEntries(searchParams.entries()),
  };

  return (
    <div className="h-[calc(100vh-100px)] -m-4 lg:-m-8">
      <AgentChat initialSessionId={sessionId} currentContext={currentContext} />
    </div>
  );
}
