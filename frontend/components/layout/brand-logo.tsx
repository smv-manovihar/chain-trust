import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  textClassName?: string;
  onClick?: () => void;
}

export function BrandLogo({
  className,
  size = "md",
  withText = true,
  textClassName,
  onClick,
}: BrandLogoProps) {
  const sizes = {
    sm: {
      container: "h-8 w-8 rounded-full",
      text: "text-sm",
      gap: "gap-2",
      title: "text-lg",
    },
    md: {
      container: "h-10 w-10 rounded-full",
      text: "text-lg",
      gap: "gap-3",
      title: "text-xl",
    },
    lg: {
      container: "h-12 w-12 rounded-full",
      text: "text-xl",
      gap: "gap-3",
      title: "text-2xl",
    },
  };

  const currentSize = sizes[size];

  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center group",
        currentSize.gap,
        className,
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "flex items-center justify-center bg-background p-0.5 shadow-sm transition-transform group-hover:scale-105 border border-border/50 overflow-hidden",
          currentSize.container,
        )}
      >
        <img 
          src="/chain-trust.png" 
          alt="ChainTrust" 
          className="h-full w-full object-cover rounded-full"
        />
      </div>
      {withText && (
        <span
          className={cn(
            "font-bold tracking-tight text-foreground group-hover:text-primary transition-colors",
            currentSize.title,
            textClassName
          )}
        >
          ChainTrust
        </span>
      )}
    </Link>
  );
}
