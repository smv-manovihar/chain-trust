"use client";

import { useState, useMemo, useEffect, memo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { CompositeToolThought } from "@/types/agent.types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChainOfThoughtPreviewProps {
  thoughts: CompositeToolThought[];
  isStreaming?: boolean;
  hasContent?: boolean;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  connectorClass?: string;
}

interface ChainStepProps {
  step: CompositeToolThought;
  isLast: boolean;
  connectorClass?: string;
}

/**
 * Individual step in the chain - Uses a clean dot timeline
 */
const ChainStep = memo(({ step, isLast, connectorClass }: ChainStepProps) => {
  const isThinking = step.status === "thinking";
  const isRunning = step.status === "running";
  const isFailed = step.status === "failed";
  const isCompleted = step.status === "completed";

  return (
    <div className="relative pb-1.5 animate-in fade-in slide-in-from-left-1 duration-200">
      {/* Connector line */}
      {!isLast && (
        <div
          className={cn(
            "absolute left-[11px] top-3 -bottom-4 w-px bg-border/40",
            connectorClass,
          )}
          aria-hidden
        />
      )}

      <div className="group/step flex gap-2 items-start pl-0 pr-2 rounded-lg transition-colors duration-300">
        {/* Step Dot */}
        <div className="relative z-10 shrink-0 w-6 h-6 flex items-center justify-center mt-0.5">
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-all duration-300 ease-in-out",
              isRunning
                ? "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                : isThinking
                  ? "bg-blue-500/80"
                  : isFailed
                    ? "bg-red-500"
                    : isCompleted
                      ? "bg-emerald-500"
                      : "bg-muted-foreground/30",
            )}
          />
        </div>

        {/* Message Container */}
        <div className="flex-1 min-w-0 flex items-center py-1.5">
          <span
            className={cn(
              "text-xs font-medium text-muted-foreground/75 group-hover/step:text-foreground transition-colors duration-300 line-clamp-3",
            )}
          >
            {step.message ||
              step.tool
                .split("_")
                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                .join(" ")}
          </span>
        </div>
      </div>
    </div>
  );
});

ChainStep.displayName = "ChainStep";

/**
 * Premium chain-of-thought visualization
 * Simplified to show only messages and a dot-based execution flow.
 */
export const ChainOfThoughtPreview = memo(function ChainOfThoughtPreview({
  thoughts,
  isStreaming = false,
  hasContent = false,
  expanded: controlledExpanded,
  onExpandChange,
  connectorClass,
}: ChainOfThoughtPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [internalExpanded, setInternalExpanded] = useState(
    controlledExpanded !== undefined
      ? controlledExpanded
      : isStreaming && !hasContent,
  );

  // Auto-expand while streaming with no content, collapse when content arrives
  useEffect(() => {
    if (controlledExpanded === undefined) {
      setInternalExpanded(isStreaming && !hasContent);
    }
  }, [isStreaming, hasContent, controlledExpanded]);

  const isExpanded =
    controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const toolThoughts = useMemo(() => {
    return thoughts.filter((t) => !!t.tool);
  }, [thoughts]);

  const displayedThoughts =
    isStreaming && !hasContent && !showAll
      ? toolThoughts.slice(-5)
      : toolThoughts;

  // Handle expanded state changes
  const handleExpandedChange = (value: boolean) => {
    if (controlledExpanded === undefined) {
      setInternalExpanded(value);
    }
    onExpandChange?.(value);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only return null if not mounted, or if we have no thoughts AND we aren't currently streaming/generating.
  if (!mounted || (toolThoughts.length === 0 && !isStreaming)) {
    return null;
  }

  // Initial Thinking State (No tool events received yet, and no final content streaming either)
  if (isStreaming && toolThoughts.length === 0 && !hasContent) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-300 group/thought min-w-[80px]">
        <span className="text-xs font-semibold text-muted-foreground/80 group-hover/thought:text-foreground transition-colors duration-300">
          Thinking
        </span>
        <div className="flex gap-0.5 items-center mt-1">
          <div className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce" />
        </div>
      </div>
    );
  }

  const currentStep = isStreaming
    ? toolThoughts.find((t) => t.status === "running")
    : null;
  const stepCount = toolThoughts.length;

  return (
    <div className="w-full font-sans" onClick={(e) => e.stopPropagation()}>
      <Collapsible open={isExpanded} onOpenChange={handleExpandedChange}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors duration-300 group/thought cursor-pointer focus:outline-none focus:ring-0">
                <div className="flex items-center gap-1.5 min-w-[80px]">
                  <span className="text-xs font-semibold text-muted-foreground/70 group-hover/thought:text-foreground transition-colors duration-300">
                    {isStreaming ? "Thinking" : "Thought Process"}
                  </span>
                  {isStreaming && (
                    <div className="flex gap-0.5 items-center mt-1">
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]" />
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]" />
                      <div className="w-1 h-1 rounded-full bg-muted-foreground/50 animate-bounce" />
                    </div>
                  )}
                </div>
                {toolThoughts.length > 0 && (
                  <span className="text-xs text-muted-foreground/50 tabular-nums">
                    ({stepCount} step{stepCount !== 1 ? "s" : ""})
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-muted-foreground/50 transition-transform duration-200",
                    isExpanded && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
          </div>

          {toolThoughts.length > 5 &&
            isStreaming &&
            !hasContent &&
            !showAll && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setShowAll(true);
                }}
                className="text-[10px] font-semibold text-blue-500/90 hover:text-blue-500 cursor-pointer transition-colors px-2.5 py-1 bg-blue-500/5 hover:bg-blue-500/10 rounded border border-blue-500/10 flex items-center gap-1"
              >
                View all ({toolThoughts.length})
              </button>
            )}
        </div>

        {/* Chain content */}
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <div className="pl-2 pb-2 pt-1 space-y-1">
            {displayedThoughts.map((step, idx) => (
              <div
                key={
                  step.run_id ? `${step.run_id}-${idx}` : `${step.tool}-${idx}`
                }
                className="animate-in fade-in slide-in-from-left-1 duration-200 fill-mode-both"
              >
                <ChainStep
                  step={step}
                  isLast={idx === displayedThoughts.length - 1}
                  connectorClass={connectorClass}
                />
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});
