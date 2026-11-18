"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

export function CopyButton({
  text,
  label = "Copy to clipboard",
  showLabel = false,
  className = "",
}: {
  text: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <HoverCard openDelay={100} closeDelay={150}>
      <HoverCardTrigger asChild>
        <button
          onClick={handleCopy}
          type="button"
          className={cn(
            "inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground bg-muted/60 hover:bg-muted border border-border shadow-2xs transition cursor-pointer select-none",
            showLabel && "w-auto px-2.5 gap-1.5",
            className
          )}
          aria-label={label}
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          )}
          {showLabel && (
            <span className={cn("text-xs font-medium", copied ? "text-emerald-500 font-semibold" : "text-foreground")}>
              {copied ? "Copied!" : label}
            </span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="center" side="top" className="min-w-fit px-2.5 py-1 text-center">
        <span className="text-[11px] font-medium text-foreground">
          {copied ? "Copied to clipboard!" : label}
        </span>
      </HoverCardContent>
    </HoverCard>
  );
}
