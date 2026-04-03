"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

// 1. Create a Context to share the open state between the Root and the Trigger
const TooltipContext = React.createContext<{
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
} | null>(null);

// 2. Wrap the Root component to control Radix's state automatically
const Tooltip = ({
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen }}>
      {/* onOpenChange lets Radix continue to handle desktop hover natively */}
      <TooltipPrimitive.Root
        open={isOpen}
        onOpenChange={setIsOpen}
        {...props}
      />
    </TooltipContext.Provider>
  );
};

// 3. Update the Trigger to use our Context on mobile
const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(
  (
    {
      className,
      onTouchStart,
      onTouchEnd,
      onTouchCancel,
      onContextMenu,
      style,
      ...props
    },
    ref,
  ) => {
    const context = React.useContext(TooltipContext);
    const timerRef = React.useRef<NodeJS.Timeout | null>(null);

    const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>) => {
      timerRef.current = setTimeout(() => {
        context?.setIsOpen(true);
      }, 500); // 500ms long press threshold

      if (onTouchStart) onTouchStart(e);
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (onTouchEnd) onTouchEnd(e);
    };

    return (
      <TooltipPrimitive.Trigger
        ref={ref}
        className={cn("select-none", className)} // Prevents text highlighting
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd} // Catches if the finger slides off the button
        onContextMenu={(e) => {
          e.preventDefault(); // Blocks the iOS system menu
          context?.setIsOpen(true); // Failsafe to ensure tooltip opens
          if (onContextMenu) onContextMenu(e);
        }}
        style={{
          WebkitTouchCallout: "none", // Natively prevents the iOS magnifying glass/callout
          ...style,
        }}
        {...props}
      />
    );
  },
);
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      collisionPadding={10}
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        "max-w-[calc(100vw-32px)] break-words",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
