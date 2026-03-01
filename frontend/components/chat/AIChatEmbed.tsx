import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Bot, User, Stethoscope } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
}

interface AIChatEmbedProps {
  productContext: any;
  currentPage: string;
}

export function AIChatEmbed({ productContext, currentPage }: AIChatEmbedProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      role: "assistant",
      content:
        "Hello! I am the ChainTrust AI Medical Assistant. I can help you understand this medication, side effects, or check its authenticity details.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create session on load
  useEffect(() => {
    async function initSession() {
      try {
        const res = await fetch("http://localhost:8000/api/chat/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: "anonymous" }), // Or real user ID
        });
        const data = await res.json();
        if (data.session_id) setSessionId(data.session_id);
      } catch (err) {
        console.error("Failed to initialize AI session:", err);
      }
    }
    initSession();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch("http://localhost:8000/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMsg.content,
          current_page: currentPage,
          product_context: productContext,
        }),
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") continue;

            try {
              const dataObj = JSON.parse(dataStr);
              if (dataObj.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, content: m.content + dataObj.content }
                      : m,
                  ),
                );
              }
            } catch (e) {
              console.error("JSON parse error:", dataStr);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "system",
          content: "Error connecting to AI service.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex flex-col h-[500px] border border-border mt-8">
      <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-accent" />
        <h3 className="font-semibold text-foreground">ChainTrust Medical AI</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(
          (m) =>
            m.role !== "system" && (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div
                  className={`p-3 rounded-lg max-w-[80%] text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                  }`}
                >
                  {m.content ||
                    (m.role === "assistant" &&
                    isLoading &&
                    m.id === messages[messages.length - 1].id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null)}
                </div>

                {m.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ),
        )}
        {messages
          .filter((m) => m.role === "system")
          .map((m) => (
            <div key={m.id} className="text-xs text-center text-red-500 my-2">
              {m.content}
            </div>
          ))}
        <div ref={endOfMessagesRef} />
      </div>

      <div className="p-4 border-t border-border bg-muted/10">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Ask about dosage, side effects..."
            disabled={isLoading || !sessionId}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !sessionId || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
