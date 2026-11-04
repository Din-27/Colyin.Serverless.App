import { CheckCircle2, CircleSlash, AlertTriangle, Activity, RefreshCw } from "lucide-react";

export function StatusBadge({ status }: { status: string }) {
  const normalized = (status || "STOPPED").toUpperCase();

  if (normalized === "ACTIVE" || normalized === "RUNNING") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <CheckCircle2 className="w-3.5 h-3.5" />
        {normalized}
      </span>
    );
  }

  if (normalized === "BUILDING" || normalized === "DEPLOYING" || normalized === "QUEUED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-950/70 text-blue-400 border border-blue-800/60">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        {normalized}
      </span>
    );
  }

  if (normalized === "FAILED" || normalized === "CRASHED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-950/70 text-rose-400 border border-rose-800/60">
        <AlertTriangle className="w-3.5 h-3.5" />
        {normalized}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800">
      <CircleSlash className="w-3.5 h-3.5" />
      {normalized}
    </span>
  );
}
