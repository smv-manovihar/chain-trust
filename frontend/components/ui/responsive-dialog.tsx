"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface BaseProps {
  children: React.ReactNode;
}

interface RootProps extends BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface TriggerProps extends BaseProps {
  asChild?: boolean;
  className?: string;
}

interface ContentProps extends BaseProps {
  className?: string;
  ref?: React.Ref<any>;
}

const ResponsiveDialog = ({ children, ...props }: RootProps) => {
  const isMobile = useIsMobile();
  const ResponsiveRoot = isMobile ? Drawer : Dialog;

  return <ResponsiveRoot {...props}>{children}</ResponsiveRoot>;
};

const ResponsiveDialogTrigger = ({ children, ...props }: TriggerProps) => {
  const isMobile = useIsMobile();
  const ResponsiveTrigger = isMobile ? DrawerTrigger : DialogTrigger;

  return <ResponsiveTrigger {...props}>{children}</ResponsiveTrigger>;
};

const ResponsiveDialogClose = ({ children, ...props }: TriggerProps) => {
  const isMobile = useIsMobile();
  const ResponsiveClose = isMobile ? DrawerClose : DialogClose;

  return <ResponsiveClose {...props}>{children}</ResponsiveClose>;
};

const ResponsiveDialogContent = ({
  children,
  className,
  ref,
  ...props
}: ContentProps) => {
  const isMobile = useIsMobile();
  const ResponsiveContent = isMobile ? DrawerContent : DialogContent;

  return (
    <ResponsiveContent
      ref={ref}
      aria-describedby={undefined}
      onOpenAutoFocus={(e) => e.preventDefault()}
      className={cn(
        isMobile ? "max-h-[96dvh] flex flex-col" : "max-h-[90vh] flex flex-col sm:rounded-[2rem]",
        className
      )}
      {...props}
    >
      {isMobile ? <DrawerDescription className="hidden" /> : <DialogDescription className="hidden" />}
      {children}
    </ResponsiveContent>
  );
};

const ResponsiveDialogBody = ({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div 
      className={cn(
        "flex-1 overflow-y-auto px-6 py-4", 
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
};

const ResponsiveDialogHeader = ({
  children,
  className,
  ...props
}: ContentProps) => {
  const isMobile = useIsMobile();
  const ResponsiveHeader = isMobile ? DrawerHeader : DialogHeader;

  return (
    <ResponsiveHeader 
      className={cn(
        !isMobile && "pr-12", 
        className
      )} 
      {...props}
    >
      {children}
    </ResponsiveHeader>
  );
};

const ResponsiveDialogFooter = ({
  children,
  className,
  ...props
}: ContentProps) => {
  const isMobile = useIsMobile();
  const ResponsiveFooter = isMobile ? DrawerFooter : DialogFooter;

  return (
    <ResponsiveFooter className={className} {...props}>
      {children}
    </ResponsiveFooter>
  );
};

const ResponsiveDialogTitle = ({
  children,
  className,
  ref,
  ...props
}: ContentProps) => {
  const isMobile = useIsMobile();
  const ResponsiveTitle = isMobile ? DrawerTitle : DialogTitle;

  return (
    <ResponsiveTitle ref={ref} className={className} {...props}>
      {children}
    </ResponsiveTitle>
  );
};

const ResponsiveDialogDescription = ({
  children,
  className,
  ref,
  ...props
}: ContentProps) => {
  const isMobile = useIsMobile();
  const ResponsiveDescription = isMobile
    ? DrawerDescription
    : DialogDescription;

  return (
    <ResponsiveDescription ref={ref} className={className} {...props}>
      {children}
    </ResponsiveDescription>
  );
};

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogClose,
  ResponsiveDialogContent,
  ResponsiveDialogBody,
  ResponsiveDialogHeader,
  ResponsiveDialogFooter,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
};
