import { useState, useRef, useEffect } from "react";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AgentChatInputProps {
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  isSending: boolean;
  showScrollDown?: boolean;
  scrollToBottom?: () => void;
  compact?: boolean;
}

export function AgentChatInput({
  input,
  setInput,
  sendMessage,
  isSending,
  showScrollDown,
  scrollToBottom,
  compact = false,
}: AgentChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to calculate scrollHeight correctly
      textareaRef.current.style.height = "auto";
      
      const newHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(newHeight, 200)}px`;

      // Hide scrollbar if content is within the 200px limit
      // Show it only if it exceeds the limit
      textareaRef.current.style.overflowY = newHeight > 200 ? "auto" : "hidden";
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 p-4 z-20 pointer-events-none",
        compact && "p-2",
      )}
    >
      <div className={cn(
        "mx-auto relative",
        compact ? "max-w-full" : "max-w-3xl"
      )}>
        {showScrollDown && scrollToBottom && (
          <div className="absolute -top-12 right-2 pointer-events-auto">
            <Button
              variant="secondary"
              size="icon"
              className="rounded-full shadow-lg h-9 w-9 bg-card/80 backdrop-blur-sm border hover:bg-card transition-colors"
              onClick={scrollToBottom}
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      <div
        className={cn(
          "pointer-events-auto mx-auto bg-card/60 backdrop-blur-xl border border-border/50 shadow-lg rounded-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all focus-within:ring-primary/20",
          compact ? "max-w-full p-1.5" : "max-w-3xl p-3",
        )}
      >
        <div className="relative flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your medicine..."
            className={cn(
              "resize-none pr-16 min-h-[44px] py-3 rounded-xl bg-muted/20 border-transparent focus:bg-background/50 focus:ring-1 focus:ring-primary/20 transition-all scrollbar-hide overflow-hidden",
              compact && "pr-14 py-2.5 min-h-[40px] text-xs",
            )}
          />
          <div className="absolute right-2 bottom-1.5">
            <Button
              size="icon"
              disabled={isSending || !input.trim()}
              onClick={sendMessage}
              className={cn(
                "h-8 w-8 rounded-full shadow-sm transition-all duration-200 shrink-0",
                input.trim()
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-muted text-muted-foreground opacity-50",
                compact && "h-7 w-7",
              )}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUp className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
