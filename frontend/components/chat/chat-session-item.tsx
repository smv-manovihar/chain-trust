"use client";

import { useState } from "react";
import { 
  MessageSquare, Pencil, Trash2, Check, X 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDistanceToNow } from "date-fns";
import { ChatSession } from "@/api/agent.api";
import { cn } from "@/lib/utils";

interface ChatSessionItemProps {
  session: ChatSession;
  isActive: boolean;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => void;
  isMobile?: boolean;
}

export function ChatSessionItem({
  session,
  isActive,
  onSelect,
  onRename,
  onDelete,
  isMobile = false,
}: ChatSessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(session.name);

  const handleRename = async (e?: React.MouseEvent | React.KeyboardEvent) => {
    e?.stopPropagation();
    if (!editName.trim() || editName === session.name) {
      setIsEditing(false);
      return;
    }
    await onRename(session.id, editName);
    setIsEditing(false);
  };

  const startEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(session.name);
    setIsEditing(true);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative flex items-center p-2 sm:p-2.5 rounded-2xl transition-all duration-200 cursor-pointer border border-transparent mb-1 overflow-hidden",
        isActive
          ? "bg-primary/10 text-primary border-primary/20 shadow-sm"
          : "hover:bg-muted/40 hover:border-border/30",
        isMobile && "p-3 sm:p-3.5 rounded-3xl"
      )}
      onClick={() => onSelect(session.id)}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
            isActive ? "bg-primary/20" : "bg-muted",
            isMobile && "w-10 h-10 rounded-xl"
          )}
        >
          <MessageSquare className={cn("w-4 h-4 opacity-70", isMobile && "w-5 h-5")} />
        </div>
        
        {isEditing ? (
          <Input
            autoFocus
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === "Enter" && handleRename(e)}
            className="flex-1 min-w-0 h-7 text-[11px] sm:text-xs px-1.5 py-0 bg-background rounded-md"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex flex-col min-w-0 flex-1">
            <span className={cn(
              "text-xs sm:text-sm font-semibold truncate group-hover:text-primary transition-colors",
              isMobile && "text-sm font-bold"
            )}>
              {session.name || "New Chat"}
            </span>
            <span className={cn("text-[10px] sm:text-[11px] opacity-60", isMobile && "text-xs")}>
              {formatDistanceToNow(new Date(session.updated_at), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}
      </div>

      <div
        className={cn(
          "absolute right-2 top-1/2 -translate-y-1/2 flex items-center p-0.5 rounded-xl bg-background/90 backdrop-blur-md shadow-sm border border-border/40 z-10 transition-opacity gap-0.5",
          isEditing ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          isMobile && "opacity-100 p-1 rounded-2xl"
        )}
      >
        {isEditing ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-primary hover:bg-primary/10 transition-all shrink-0"
              onMouseDown={(e) => {
                e.preventDefault();
                handleRename();
              }}
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-muted-foreground hover:bg-muted transition-all shrink-0"
              onClick={cancelEditing}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full hover:bg-background shadow-sm border border-transparent hover:border-border/50 transition-all shrink-0"
                    onClick={startEditing}
                  >
                    <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rename Chat</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Chat</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
    </div>
  );
}

// Helper to handle TooltipProvider requirement if not wrapped globally
import { TooltipProvider } from "@/components/ui/tooltip";
