import { memo, useState, useRef, useEffect } from "react";
import { Loader2, Sparkles, Pencil, Trash2, Check, X, RotateCcw } from "lucide-react";

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
}

const AgentChatMessageBase = ({
  message,
  onEdit,
  onDelete,
  onRetry,
  compact = false,
}: AgentChatMessageProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content || "");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSaveEdit = () => {
    if (editValue.trim() !== (message.content || "")) {
      onEdit?.(message.id, editValue);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditValue(message.content || "");
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "flex w-full mb-3 px-1",
        message.role === "user" ? "justify-end" : "justify-start",
        compact && "mb-1"
      )}
    >
      {message.role === "assistant" ? (
        <div className={cn(
          "flex w-full gap-3 px-1 group/assistant",
          !compact && "max-w-4xl px-2 gap-4"
        )}>
          <div className={cn(
            "shrink-0 rounded-xl bg-card border text-primary flex items-center justify-center shadow-sm mt-1",
            compact ? "w-6 h-6 rounded-lg" : "w-8 h-8"
          )}>
            <Sparkles className={compact ? "w-3 h-3" : "w-4 h-4"} />
          </div>

          <div className="flex flex-col flex-1 min-w-0 mt-0.5">
            {message.thoughts && message.thoughts.length > 0 && (
              <ChainOfThoughtPreview
                thoughts={message.thoughts.map((t: any) => ({
                  tool: t.tool,
                  message: t.message || `Running ${t.tool}...`,
                  status: t.status === "completed" ? "completed" : "running",
                  result: t.result,
                  input: t.input
                }))}
                isStreaming={message.status === "generating"}
                hasContent={!!message.content}
              />
            )}
            <div className={cn(
              "text-foreground/90 w-full animate-in fade-in duration-300 relative",
              compact ? "text-xs py-1" : "text-sm py-2"
            )}>
              <div className="relative">
                <MarkdownRenderer content={message.content || ""} />
                {message.status === "generating" && message.content && (
                  <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-primary/50 animate-pulse align-middle rounded-full" />
                )}
              </div>
              {message.status === "generating" && !message.content && (
                <div className="flex items-center gap-2 text-muted-foreground text-[10px] mt-1 animate-pulse">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Thinking...</span>
                </div>
              )}
            </div>
            {message.content && message.status !== 'generating' && !compact && (
              <div className="flex items-center gap-1 opacity-0 group-hover/assistant:opacity-100 transition-opacity">
                <CopyButton
                  value={message.content}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                />
                {onRetry && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => onRetry(message.id)}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={cn(
          "flex flex-col items-end group/message",
          compact ? "max-w-[90%] min-w-[120px]" : "max-w-[85%] min-w-[200px]"
        )}>
          {isEditing ? (
            <div className="w-full bg-card border border-border shadow-sm rounded-xl p-3 relative">
              <Textarea
                ref={textareaRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
                className="resize-none bg-muted/30 border-transparent focus:border-ring focus:bg-background p-2 pb-10 text-sm leading-relaxed rounded-lg min-h-[80px]"
              />
              <div className="absolute bottom-4 right-4 flex items-center gap-2">
                <Button size="icon" variant="outline" onClick={handleCancelEdit} className="h-7 w-7">
                  <X className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" onClick={handleSaveEdit} className="h-7 w-7">
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="w-full flex flex-col items-end gap-1">
              <div className={cn(
                "px-4 py-2 rounded-2xl bg-primary text-primary-foreground shadow-sm rounded-tr-none text-sm leading-relaxed whitespace-pre-wrap border border-primary/20",
                compact && "px-3 py-1.5 text-xs"
              )}>
                {message.content}
              </div>
              {!compact && (
                <div className="flex items-center gap-1 opacity-0 group-hover/message:opacity-100 transition-opacity">
                  <CopyButton
                    value={message.content}
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete?.(message.id);
                setShowDeleteDialog(false);
              }}
              className="bg-destructive"
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
