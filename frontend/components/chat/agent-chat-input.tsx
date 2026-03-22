import { useState, useRef, useEffect } from "react";
import { ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AgentChatInputProps {
  input: string;
  setInput: (value: string) => void;
  sendMessage: () => void;
  isSending: boolean;
  showScrollDown?: boolean;
  scrollToBottom?: () => void;
  compact?: boolean;
  isNewSession?: boolean;
}

export function AgentChatInput({
  input,
  setInput,
  sendMessage,
  isSending,
  showScrollDown,
  scrollToBottom,
  compact = false,
  isNewSession = false,
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
  
  // Auto-focus on initial mount and new sessions
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isNewSession]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      className={cn(
        "absolute bottom-2 md:bottom-0 left-0 right-0 px-2 pt-2 pb-0 sm:p-4 z-20 pointer-events-none",
        compact && "px-2 pt-2 pb-1 sm:p-2",
      )}
    >
      <div className={cn(
        "mx-auto relative",
        compact ? "max-w-full" : "max-w-3xl"
      )}>
        {showScrollDown && scrollToBottom && (
          <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 pointer-events-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full shadow-lg h-8 w-8 sm:h-9 sm:w-9 bg-card/80 backdrop-blur-sm border hover:bg-card transition-colors"
                  onClick={scrollToBottom}
                >
                  <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Scroll to Latest</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      <div
        className={cn(
          "pointer-events-auto mx-auto bg-card/70 backdrop-blur-2xl border border-border/40 shadow-xl rounded-2xl sm:rounded-3xl ring-1 ring-black/5 dark:ring-white/10 transition-all focus-within:ring-primary/20",
          compact ? "max-w-full p-1" : "max-w-3xl p-2 sm:p-3",
        )}
      >
        <div className="relative flex items-end gap-1.5 sm:gap-2">
          <Textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            className={cn(
              "resize-none pr-12 sm:pr-16 min-h-[40px] sm:min-h-[44px] py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-muted/20 border-transparent focus:bg-background/50 focus:ring-1 focus:ring-primary/20 transition-all text-[13px] sm:text-sm",
              compact && "pr-10 py-2 min-h-[36px] text-[11px]",
            )}
          />
          <div className="absolute right-1.5 bottom-1.2 sm:right-2 sm:bottom-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  disabled={isSending || !input.trim()}
                  onClick={sendMessage}
                  className={cn(
                    "h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-sm transition-all duration-200 shrink-0",
                    input.trim()
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-muted text-muted-foreground opacity-50",
                    compact && "h-6 w-6",
                  )}
                >
                  {isSending ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
                  ) : (
                    <ArrowUp className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4 sm:h-5 sm:w-5")} />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send Message</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
