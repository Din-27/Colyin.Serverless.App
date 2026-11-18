"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface HoverCardContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const HoverCardContext = React.createContext<HoverCardContextType | undefined>(undefined);

export function HoverCard({
  children,
  openDelay = 150,
  closeDelay = 200,
  className = "",
}: {
  children: React.ReactNode;
  openDelay?: number;
  closeDelay?: number;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const openTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const closeTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      setOpen(true);
    }, openDelay);
  };

  const handleMouseLeave = () => {
    if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
    }, closeDelay);
  };

  React.useEffect(() => {
    return () => {
      if (openTimeoutRef.current) clearTimeout(openTimeoutRef.current);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  return (
    <HoverCardContext.Provider value={{ open, setOpen }}>
      <div
        className={cn("relative", className || "inline-flex items-center")}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>
    </HoverCardContext.Provider>
  );
}

export function HoverCardTrigger({
  children,
  className = "",
  asChild = false,
}: {
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}) {
  return (
    <div className={cn("cursor-help", className || "inline-flex items-center")}>
      {children}
    </div>
  );
}

export function HoverCardContent({
  children,
  align = "center",
  side = "bottom",
  className = "",
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  className?: string;
}) {
  const context = React.useContext(HoverCardContext);
  if (!context || !context.open) return null;

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  }[align];

  const sideClasses = {
    top: "bottom-full mb-2",
    bottom: "top-full mt-2",
  }[side];

  return (
    <div
      role="tooltip"
      className={cn(
        "absolute z-50 min-w-56 max-w-xs rounded-xl border border-border bg-popover text-popover-foreground p-3.5 shadow-lg outline-none select-none",
        "animate-in fade-in-0 zoom-in-95 duration-150",
        sideClasses,
        alignClasses,
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Convenient all-in-one Icon Label with Info Hover Card.
 * Replaces noisy text labels with a clean icon badge that reveals rich info on hover.
 */
export function InfoHoverBadge({
  icon: Icon,
  label,
  description,
  badgeText,
  align = "center",
  side = "bottom",
  className = "",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  badgeText?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  className?: string;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger>
        <span
          className={cn(
            "inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border transition-colors shadow-2xs",
            className
          )}
          aria-label={label}
        >
          <Icon className="w-3.5 h-3.5 shrink-0" />
        </span>
      </HoverCardTrigger>
      <HoverCardContent align={align} side={side} className="w-64 text-xs space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-primary" />
            <span>{label}</span>
          </span>
          {badgeText && (
            <span className="px-1.5 py-0.2 rounded bg-muted text-muted-foreground text-[10px] font-mono border border-border">
              {badgeText}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
