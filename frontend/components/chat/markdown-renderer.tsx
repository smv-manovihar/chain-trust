"use client";

import { code } from "@streamdown/code";
import { type ClassValue, clsx } from "clsx";
import Image from "next/image";
import React, { useMemo } from "react";
import { Streamdown } from "streamdown";
import { twMerge } from "tailwind-merge";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAgent } from "@/contexts/agent-context";

/**
 * Merges Tailwind classes with conflict resolution.
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

const BASE_COMPONENTS = (onAction?: () => void) => ({
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
  p: ({ children }: React.ComponentPropsWithoutRef<"p">) => (
    <p className="mb-2 sm:mb-4 leading-relaxed sm:leading-7 first:mt-0">
      {renderContentWithActions(children, onAction)}
    </p>
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
    <ul className="my-4 sm:my-6 ml-6 list-disc [&>li]:mt-1 sm:[&>li]:mt-2">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }: React.ComponentPropsWithoutRef<"ol">) => (
    <ol
      className="my-4 sm:my-6 ml-6 list-decimal [&>li]:mt-1 sm:[&>li]:mt-2"
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children }: React.ComponentPropsWithoutRef<"li">) => (
    <li className="text-foreground/90">
      {renderContentWithActions(children, onAction)}
    </li>
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
      {renderContentWithActions(children, onAction)}
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
});

/**
 * Recursive function to parse [action:TYPE|key:val] inside text nodes.
 */
const renderContentWithActions = (
  node: React.ReactNode,
  onAction?: () => void,
): React.ReactNode => {
  if (typeof node !== "string") {
    if (Array.isArray(node)) {
      return node.map((n, i) => (
        <React.Fragment key={i}>
          {renderContentWithActions(n, onAction)}
        </React.Fragment>
      ));
    }
    if (React.isValidElement(node) && (node.props as any).children) {
      return React.cloneElement(
        node as React.ReactElement,
        {},
        renderContentWithActions((node.props as any).children, onAction),
      );
    }
    return node;
  }

  const regex = /\[action:\s*(\w+)\s*(?:\|\s*([^\]]+))?\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(node)) !== null) {
    if (match.index > lastIndex) {
      parts.push(node.substring(lastIndex, match.index));
    }

    const type = match[1];
    const metaRaw = match[2];
    const meta: Record<string, string> = {};
    if (metaRaw) {
      metaRaw.split("|").forEach((seg) => {
        const [k, v] = seg.split(":");
        if (k && v) meta[k.trim()] = v.trim();
      });
    }

    if (type === "navigate" && meta.href) {
      parts.push(
        <span
          key={match.index}
          className="inline-flex items-center gap-2 mx-1.5 align-baseline whitespace-nowrap"
        >
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-[10px] font-bold gap-1.5 border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary rounded-full transition-all shadow-sm"
            asChild
            onClick={() => onAction?.()}
          >
            <Link href={meta.href}>
              {meta.label || "Continue"}
              <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </span>,
      );
    } else {
      parts.push(match[0]);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < node.length) {
    parts.push(node.substring(lastIndex));
  }

  return parts.length > 0 ? parts : node;
};


// A streaming-ready Markdown renderer handling incomplete blocks, code highlighting, and custom components.
export function MarkdownRenderer({
  content,
  className,
  isStreaming = false,
}: MarkdownRendererProps) {
  const { setOpen } = useAgent();
  const components = useMemo(() => BASE_COMPONENTS(() => setOpen(true)) as any, [setOpen]);

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
        {content}
      </Streamdown>
    </div>
  );
}
