import { CheckCircle2, CircleSlash, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const normalized = (status || "STOPPED").toUpperCase();

  if (normalized === "ACTIVE" || normalized === "RUNNING") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60 shadow-xs transition-colors",
          className
        )}
      >
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
        </span>
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>{normalized}</span>
      </span>
    );
  }

  if (normalized === "BUILDING" || normalized === "DEPLOYING" || normalized === "QUEUED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200/90 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800/60 shadow-xs transition-colors",
          className
        )}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400" />
        <span>{normalized}</span>
      </span>
    );
  }

  if (normalized === "FAILED" || normalized === "CRASHED") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/90 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60 shadow-xs transition-colors",
          className
        )}
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        <span>{normalized}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground border border-border shadow-xs transition-colors",
        className
      )}
    >
      <CircleSlash className="w-3.5 h-3.5 text-muted-foreground" />
      <span>{normalized}</span>
    </span>
  );
}
