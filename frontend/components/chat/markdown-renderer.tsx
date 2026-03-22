"use client";

import { code } from "@streamdown/code";
import { type ClassValue, clsx } from "clsx";
import Image from "next/image";
import { useMemo } from "react";
import { Streamdown } from "streamdown";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind classes with conflict resolution.
 * Args:
 * - inputs (ClassValue[]): Array of class values to merge.
 * Returns:
 * - string: The merged class string.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

// Type definitions for component props to replace 'any' using standard React types

// Pre-defined base component overrides to ensure stable references and avoid re-creation on every render.
const BASE_COMPONENTS = {
  h1: ({ children }: React.ComponentPropsWithoutRef<"h1">) => (
    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-6 sm:mt-8 mb-3 sm:mb-4 border-b pb-2 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }: React.ComponentPropsWithoutRef<"h2">) => (
    <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mt-6 sm:mt-8 mb-3 sm:mb-4 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: React.ComponentPropsWithoutRef<"h3">) => (
    <h3 className="text-lg sm:text-xl font-semibold tracking-tight mt-5 sm:mt-6 mb-2 sm:mb-3 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }: React.ComponentPropsWithoutRef<"div">) => (
    <div className="mb-2 sm:mb-4 leading-relaxed sm:leading-7 text-pretty first:mt-0">{children}</div>
  ),
  strong: ({ children }: React.ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  blockquote: ({ children }: React.ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote className="border-l-4 border-primary pl-4 italic my-4 sm:my-6 text-muted-foreground bg-muted/30 py-2 pr-4 rounded-r-sm first:mt-0">
      {children}
    </blockquote>
  ),
  ul: ({ children }: React.ComponentPropsWithoutRef<"ul">) => (
    <ul className="my-4 sm:my-6 ml-6 list-disc [&>li]:mt-1 sm:[&>li]:mt-2">{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<"ol">) => (
    <ol className="my-4 sm:my-6 ml-6 list-decimal [&>li]:mt-1 sm:[&>li]:mt-2" {...props}>
      {children}
    </ol>
  ),
  li: ({ children }: React.ComponentPropsWithoutRef<"li">) => (
    <li className="text-foreground/90">{children}</li>
  ),
  img: ({ src, alt }: React.ComponentPropsWithoutRef<"img">) => {
    const imageSrc = typeof src === "string" ? src : "";
    if (!imageSrc) return null;
    return (
      <Image
        src={imageSrc}
        alt={alt ?? ""}
        width={800}
        height={600}
        className="rounded-lg border bg-muted shadow-sm my-6 max-w-full h-auto"
        unoptimized
      />
    );
  },
  table: ({ children }: React.ComponentPropsWithoutRef<"table">) => (
    <div className="my-6 w-full overflow-y-auto border">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: React.ComponentPropsWithoutRef<"thead">) => (
    <thead className="bg-muted/50 border-b text-left font-medium">
      {children}
    </thead>
  ),
  tr: ({ children }: React.ComponentPropsWithoutRef<"tr">) => (
    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
      {children}
    </tr>
  ),
  th: ({ children }: React.ComponentPropsWithoutRef<"th">) => (
    <th className="h-10 px-4 align-middle text-muted-foreground [&:has([role=checkbox])]:pr-0 font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: React.ComponentPropsWithoutRef<"td">) => (
    <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
      {children}
    </td>
  ),
  a: ({ href, children, ...props }: React.ComponentPropsWithoutRef<"a">) => {
    return (
      <a
        href={href}
        className="font-medium text-primary underline underline-offset-4"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },
};

// A streaming-ready Markdown renderer handling incomplete blocks, code highlighting, and custom components.
export function MarkdownRenderer({
  content,
  className,
  isStreaming = false,
}: MarkdownRendererProps) {
  // Memoized Values
  const memoContent = useMemo(() => {
    const sanitizedBase = content ?? "";
    if (typeof window === "undefined") {
      return sanitizedBase;
    }

    // Lazy load isomorphic-dompurify on client only to avoid server prerendering issues
    const DOMPurify = require("isomorphic-dompurify");
    return DOMPurify.sanitize(sanitizedBase, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "b",
        "i",
        "em",
        "strong",
        "a",
        "img",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "code",
        "pre",
        "span",
        "div",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel"],
    });
  }, [content]);

  const components = useMemo(() => BASE_COMPONENTS as any, []);

  // JSX Return Statement
  return (
    <div
      className={cn(
        "text-foreground max-w-none [&>*:first-child]:mt-0 [&_pre]:whitespace-pre-wrap [&_pre]:wrap-break-word [&_code]:whitespace-pre-wrap [&_code]:wrap-break-word",
        className,
      )}
    >
      <Streamdown
        plugins={{ code }}
        components={components}
        mode={isStreaming ? "streaming" : "static"}
        caret={isStreaming ? "block" : undefined}
      >
        {memoContent}
      </Streamdown>
    </div>
  );
}
