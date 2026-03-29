import { memo, useState, useRef, useEffect } from "react";
import {
  Loader2,
  Sparkles,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

import { cn } from "@/lib/utils";
import { MarkdownRenderer } from "./markdown-renderer";
import { ChainOfThoughtPreview } from "./chain-of-thought-preview";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/ui/copy-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AgentMessage } from "@/types/agent.types";

interface AgentChatMessageProps {
  message: AgentMessage;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onRetry?: (messageId: string) => void;
  compact?: boolean;
  isGenerating?: boolean;
}

/**
 * Sanitizes message content for the 'Copy' feature.
 * Strips [action:...] tags and replaces them with their labels or empty strings.
 */
const sanitizeForCopy = (content: string): string => {
  if (!content) return "";
  return content
    .replace(/\[action:\s*\w+\s*\|\s*[^\]]*label:([^\]|]+)[^\]]*\]/g, "$1")
    .replace(/\[action:\s*\w+\s*(?:\|[^\]]+)?\]/g, "");
};

const AgentChatMessageBase = ({
  message,
  onEdit,
  onDelete,
  onRetry,
  compact = false,
  isGenerating = false,
}: AgentChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (isMobile) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
      hoverTimeoutRef.current = null;
    }, 200);
  };

  useEffect(() => {
    if (!isEditing) {
      setEditValue(message.content || "");
    }
  }, [message.content, isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      const length = textarea.value.length;
      textarea.setSelectionRange(length, length);
      textarea.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [editValue, isEditing]);

  const handleSaveEdit = async () => {
    if (editValue.trim() !== (message.content || "")) {
      setIsSaving(true);
      try {
        await onEdit?.(message.id, editValue);
        setIsEditing(false);
      } catch (err) {
        // Error is handled in context
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditValue(message.content || "");
    setIsEditing(false);
  };

  return (
    <div
      onClick={() => setIsHovered(!isHovered)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-role={message.role}
      className={cn(
        "flex w-full mb-3 px-1 transition-all duration-300 rounded-2xl group scroll-mt-20 sm:scroll-mt-24",
        "animate-in fade-in slide-in-from-bottom-2 duration-300 ease-out",
        message.role === "user" ? "justify-end" : "justify-start",
        compact && "mb-1",
      )}
    >
      {message.role === "assistant" ? (
        <div
          className={cn(
            "flex w-full gap-2 sm:gap-3 px-1.5 py-1 rounded-2xl group/assistant transition-colors duration-300",
            !compact && "max-w-4xl px-2 sm:px-3 gap-3 sm:gap-4",
          )}
        >
          <div
            className={cn(
              "shrink-0 rounded-xl border flex items-center justify-center shadow-sm mt-1 transition-all duration-300 relative",
              message.status === "error"
                ? "bg-destructive/10 border-destructive/20 text-destructive"
                : "bg-card border-border text-primary",
              compact
                ? "w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                : "w-7 h-7 sm:w-8 sm:h-8 rounded-full",
              message.status === "generating" && "border-primary/50",
            )}
          >
            {message.status === "generating" && isGenerating && (
              <div className="absolute inset-[-1px] rounded-full border-t-2 border-primary/40 animate-spin" />
            )}
            <Sparkles
              className={cn(
                "transition-all duration-300",
                compact ? "w-3 h-3" : "w-3.5 h-3.5",
                message.status === "generating" &&
                  isGenerating &&
                  "text-primary animate-pulse",
              )}
            />
          </div>

          <div
            className={cn(
              "flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out",
              !compact && "mt-0.5",
            )}
          >
            {((message.thoughts && message.thoughts.length > 0) ||
              isGenerating) && (
              <div className="transition-all duration-300 ease-in-out origin-top border-b border-dashed border-border/20 mt-1 -mb-2">
                <ChainOfThoughtPreview
                  thoughts={(message.thoughts || []).map((t: any) => ({
                    ...t,
                    message: t.message || `Running ${t.tool}...`,
                  }))}
                  isStreaming={message.status === "generating" && isGenerating}
                  hasContent={!!message.content}
                />
              </div>
            )}
            <div
              className={cn(
                "w-full animate-in fade-in duration-300 relative",
                message.status === "error"
                  ? "text-destructive font-medium bg-destructive/5 rounded-xl px-3 py-2 border border-destructive/10"
                  : "text-foreground/90",
                compact ? "text-[11px] sm:text-xs py-1" : "text-sm",
              )}
            >
              <div className="text-[13px] sm:text-sm leading-relaxed overflow-x-auto">
                <MarkdownRenderer
                  content={message.content || ""}
                  isStreaming={message.status === "generating"}
                />
              </div>
            </div>
            {message.content && message.status !== "generating" && (
              <div className="flex items-center gap-1 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CopyButton
                      value={sanitizeForCopy(message.content || "")}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Copy Message</TooltipContent>
                </Tooltip>
                {onRetry && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={
                          message.status === "error" ? "secondary" : "ghost"
                        }
                        size={message.status === "error" ? "sm" : "icon"}
                        className={cn(
                          "text-muted-foreground hover:text-primary transition-all duration-300",
                          message.status === "error"
                            ? "h-9 w-auto px-4 gap-2 text-primary bg-primary/10 hover:bg-primary/20 border-primary/20 shadow-sm"
                            : "h-7 w-7 sm:h-8 sm:w-8",
                        )}
                        onClick={() => onRetry(message.id)}
                      >
                        <RotateCcw
                          className={cn(
                            "shrink-0",
                            message.status === "error"
                              ? "w-4 h-4"
                              : "w-3.5 h-3.5",
                          )}
                        />
                        {message.status === "error" && (
                          <span className="text-xs font-semibold whitespace-nowrap">
                            Retry
                          </span>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Regenerate Response</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col items-end group/message relative",
            compact
              ? "max-w-[95%] min-w-[100px]"
              : isEditing
                ? "w-full sm:max-w-[85%] min-w-0 sm:min-w-[400px]"
                : "max-w-[90%] sm:max-w-[85%] min-w-[150px] sm:min-w-[200px]",
          )}
        >
          {isEditing ? (
            <div className="w-full bg-background/50 border border-border/40 rounded-xl overflow-hidden focus-within:border-primary/40 transition-all animate-in zoom-in-95 duration-200 relative z-20">
              <div className="p-0 border-0 flex flex-col">
                <Textarea
                  ref={textareaRef}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEdit();
                    } else if (e.key === "Escape") {
                      handleCancelEdit();
                    }
                  }}
                  className="resize-none bg-transparent !border-0 !border-none rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 p-3 sm:p-4 text-[13px] sm:text-sm leading-relaxed min-h-[80px] sm:min-h-[100px] shadow-none"
                  placeholder="Edit your message..."
                />
              </div>
              <div className="flex items-center justify-end gap-1.5 p-2 pt-0 border-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEdit}
                  className="h-8 px-3 text-xs font-medium hover:bg-muted/50 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="h-8 px-3 sm:px-4 text-xs font-semibold rounded-xl"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin sm:mr-1.5" />
                  ) : (
                    <Check className="w-3.5 h-3.5 sm:mr-1.5" />
                  )}
                  <span className="hidden sm:inline">
                    {isSaving ? "Saving Changes..." : "Save Changes"}
                  </span>
                  <span className="sm:hidden">
                    {isSaving ? "Saving" : "Save"}
                  </span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-end relative">
              <div
                className={cn(
                  "px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-primary text-primary-foreground shadow-sm rounded-tr-none text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap border border-primary/20 relative z-10",
                  compact && "px-2.5 py-1 text-[11px] sm:text-xs",
                )}
              >
                {message.content}
              </div>

              {/* Floating Action Buttons */}
              <div
                className={cn(
                  "absolute top-full right-0 mt-1.5 pt-1.5 flex items-center gap-1 p-0.5 rounded-lg border bg-background/95 backdrop-blur-sm shadow-md z-20 transition-all duration-300 ease-in-out",
                  isHovered
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 -translate-y-2 pointer-events-none",
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <CopyButton
                      value={sanitizeForCopy(message.content || "")}
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 text-foreground/70 hover:text-foreground transition-all duration-300"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Copy Message</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isGenerating}
                      onClick={() => setIsEditing(true)}
                    >
                      <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Message</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8 text-foreground/70 hover:text-destructive transition-all duration-300"
                      disabled={isGenerating}
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete Message</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(message.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const AgentChatMessage = memo(AgentChatMessageBase);
