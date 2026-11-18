"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownMenuContextType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType | undefined>(undefined);

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div ref={menuRef} className="relative inline-block text-left">
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ className, children, asChild = false, onClick, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);
  if (!context) throw new Error("DropdownMenuTrigger must be inside DropdownMenu");

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    context.setOpen((prev) => !prev);
  };

  return (
    <button
      ref={ref}
      type="button"
      onClick={handleClick}
      aria-haspopup="true"
      aria-expanded={context.open}
      className={cn("inline-flex items-center justify-center cursor-pointer", className)}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export function DropdownMenuContent({
  children,
  align = "end",
  side = "bottom",
  className = "",
}: {
  children: React.ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
  className?: string;
}) {
  const context = React.useContext(DropdownMenuContext);
  if (!context || !context.open) return null;

  const alignClasses = {
    start: "left-0",
    center: "left-1/2 -translate-x-1/2",
    end: "right-0",
  }[align];

  const sideClasses = {
    top: "bottom-full mb-1.5",
    bottom: "top-full mt-1.5",
  }[side];

  return (
    <div
      role="menu"
      tabIndex={-1}
      className={cn(
        "absolute z-50 min-w-48 rounded-xl border border-border bg-popover text-popover-foreground p-1.5 shadow-lg outline-none select-none",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        sideClasses,
        alignClasses,
        className
      )}
    >
      {children}
    </div>
  );
}

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    disabled?: boolean;
    inset?: boolean;
    variant?: "default" | "destructive";
  }
>(({ className, disabled, inset, variant = "default", onClick, children, ...props }, ref) => {
  const context = React.useContext(DropdownMenuContext);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    onClick?.(e);
    context?.setOpen(false);
  };

  return (
    <div
      ref={ref}
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none transition-colors",
        variant === "destructive"
          ? "text-destructive hover:bg-destructive/10 focus:bg-destructive/10"
          : "text-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        disabled && "pointer-events-none opacity-50",
        inset && "pl-8",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

export function DropdownMenuLabel({
  children,
  className = "",
  inset,
}: {
  children: React.ReactNode;
  className?: string;
  inset?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-2.5 py-1.5 text-xs font-semibold text-foreground",
        inset && "pl-8",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DropdownMenuSeparator({ className = "" }: { className?: string }) {
  return <div className={cn("-mx-1.5 my-1 h-px bg-border", className)} role="separator" />;
}

export function DropdownMenuGroup({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-0.5", className)}>{children}</div>;
}

export function DropdownMenuShortcut({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn("ml-auto text-[10px] tracking-widest text-muted-foreground font-mono", className)}
    >
      {children}
    </span>
  );
}
