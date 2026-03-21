"use client";

import { forwardRef, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CopyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  className?: string;
  iconClassName?: string;
  showText?: boolean;
  copyText?: string;
  copiedText?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export const CopyButton = forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      value,
      className,
      iconClassName,
      showText = false,
      copyText = "Copy",
      copiedText = "Copied",
      variant = "ghost",
      size = "icon",
      ...props
    },
    ref,
  ) => {
    const [hasCopied, setHasCopied] = useState(false);

    useEffect(() => {
      if (hasCopied) {
        const timeout = setTimeout(() => {
          setHasCopied(false);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }, [hasCopied]);

    const onCopy = async () => {
      try {
        await navigator.clipboard.writeText(value);
        setHasCopied(true);
      } catch (error) {
        // Error is logged by browser API
      }
    };

    return (
      <Button
        ref={ref}
        size={showText && size === "icon" ? "sm" : size}
        variant={variant}
        className={cn(
          "relative z-10 transition-all gap-2",
          !showText && "h-8 w-8",
          className,
        )}
        {...props}
        onClick={(e) => {
          e.stopPropagation();
          onCopy();
          props.onClick?.(e);
        }}
      >
        {hasCopied ? (
          <Check className={cn("h-4 w-4 text-emerald-500", iconClassName)} />
        ) : (
          <Copy
            className={cn("h-4 w-4 text-muted-foreground", iconClassName)}
          />
        )}
        {showText && (
          <span className="text-xs font-medium">
            {hasCopied ? copiedText : copyText}
          </span>
        )}
        {!showText && <span className="sr-only">{copyText}</span>}
      </Button>
    );
  },
);
CopyButton.displayName = "CopyButton";
