"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme, Theme } from "@/components/ThemeProvider";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({
  variant = "dropdown",
  className = "",
}: {
  variant?: "dropdown" | "segmented" | "button";
  className?: string;
}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="w-8 h-8 rounded-lg bg-secondary border border-border opacity-50" />
    );
  }

  // Variant: Segmented Control
  if (variant === "segmented") {
    const options: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
      { value: "light", label: "Light", icon: Sun },
      { value: "dark", label: "Dark", icon: Moon },
      { value: "system", label: "System", icon: Monitor },
    ];

    return (
      <div
        className={cn(
          "inline-flex items-center p-1 rounded-xl bg-secondary border border-border gap-1 text-xs",
          className
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition cursor-pointer",
                isSelected
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Variant: Quick Toggle Button
  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        title={`Current: ${theme} theme. Click to toggle.`}
        className={cn(
          "p-2 rounded-lg border border-border bg-background hover:bg-secondary text-foreground transition cursor-pointer",
          className
        )}
      >
        {resolvedTheme === "dark" ? (
          <Moon className="w-4 h-4 text-indigo-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>
    );
  }

  // Default: Dropdown Menu
  return (
    <div ref={menuRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title="Toggle Theme"
        className="flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground transition cursor-pointer shadow-xs"
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? (
          <Moon className="w-4 h-4 text-indigo-400" />
        ) : (
          <Sun className="w-4 h-4 text-amber-500" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-34 rounded-xl border border-border bg-popover text-popover-foreground p-1 shadow-lg z-50 text-xs space-y-0.5 animate-zoom-in">
          <button
            type="button"
            onClick={() => {
              setTheme("light");
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer",
              theme === "light"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Light</span>
            </div>
            {theme === "light" && <Check className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme("dark");
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer",
              theme === "dark"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>Dark</span>
            </div>
            {theme === "dark" && <Check className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme("system");
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition cursor-pointer",
              theme === "system"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <div className="flex items-center gap-2">
              <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
              <span>System</span>
            </div>
            {theme === "system" && <Check className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
