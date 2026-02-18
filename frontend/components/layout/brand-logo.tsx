import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  withText?: boolean;
}

export function BrandLogo({
  className,
  size = "md",
  withText = true,
}: BrandLogoProps) {
  const sizes = {
    sm: {
      container: "h-8 w-8 rounded-lg",
      text: "text-sm",
      gap: "gap-2",
      title: "text-lg",
    },
    md: {
      container: "h-10 w-10 rounded-xl",
      text: "text-lg",
      gap: "gap-3",
      title: "text-xl",
    },
    lg: {
      container: "h-12 w-12 rounded-xl",
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
    >
      <div
        className={cn(
          "flex items-center justify-center bg-primary text-primary-foreground shadow-md transition-transform group-hover:scale-105",
          currentSize.container,
        )}
      >
        <span className={cn("font-bold", currentSize.text)}>C</span>
      </div>
      {withText && (
        <span
          className={cn(
            "font-bold tracking-tight text-foreground group-hover:text-primary transition-colors",
            currentSize.title,
          )}
        >
          ChainTrust
        </span>
      )}
    </Link>
  );
}
