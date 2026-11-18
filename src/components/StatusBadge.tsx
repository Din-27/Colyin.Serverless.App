"use client";

import { CheckCircle2, CircleSlash, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

export function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  const normalized = (status || "STOPPED").toUpperCase();

  const getStatusDetails = () => {
    switch (normalized) {
      case "ACTIVE":
      case "RUNNING":
        return {
          title: "Service Active & Healthy",
          description: "The container is online, healthy, and answering traffic through the reverse proxy.",
        };
      case "BUILDING":
      case "DEPLOYING":
      case "QUEUED":
        return {
          title: "Build & Rollout In Progress",
          description: "Nixpacks/Dockerfile build pipeline is compiling source code and assembling Docker image layers.",
        };
      case "FAILED":
      case "CRASHED":
        return {
          title: "Container Failed / Exited",
          description: "The container exited with an error. Review the Docker Logs tab for the stack trace.",
        };
      default:
        return {
          title: "Service Stopped",
          description: "Container process is stopped. Click the Start or Redeploy button to boot it.",
        };
    }
  };

  const details = getStatusDetails();

  const renderBadge = () => {
    if (normalized === "ACTIVE" || normalized === "RUNNING") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs transition-colors cursor-help",
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
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/20 shadow-2xs transition-colors cursor-help",
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
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 shadow-2xs transition-colors cursor-help",
            className
          )}
        >
          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
          <span>{normalized}</span>
        </span>
      );
    }

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border shadow-2xs transition-colors cursor-help",
          className
        )}
      >
        <CircleSlash className="w-3.5 h-3.5 text-muted-foreground" />
        <span>{normalized}</span>
      </span>
    );
  };

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        {renderBadge()}
      </HoverCardTrigger>
      <HoverCardContent className="w-60 text-xs space-y-1">
        <div className="font-semibold text-foreground flex items-center gap-1.5">
          <span>{details.title}</span>
        </div>
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          {details.description}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
