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
      "border border-border/80 bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-xs",
    destructive:
      "border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/60",
    outline:
      "border border-border bg-background text-foreground shadow-xs",
    success:
      "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60",
    warning:
      "border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-800/60",
    brand:
      "border border-indigo-200 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-800/60",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
        variants[variant || "default"],
        className
      )}
      {...props}
    />
  );
}
