import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "destructive"
    | "outline"
    | "success"
    | "warning"
    | "brand";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default:
      "border-transparent bg-primary text-primary-foreground shadow-xs",
    secondary:
      "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive:
      "border-transparent bg-destructive/15 text-destructive border border-destructive/20",
    outline: "text-foreground border border-border",
    success:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 dark:border-emerald-500/30",
    warning:
      "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400 dark:border-amber-500/30",
    brand:
      "border-indigo-500/20 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 dark:border-indigo-500/30",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
        variants[variant || "default"],
        className
      )}
      {...props}
    />
  );
}

