"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAppConsole } from "./AppConsoleContext";

export function TabDeployments() {
  const {
    app,
    accessUrl,
    setCurrentDeploymentId,
    setLogMode,
    setActiveTab,
  } = useAppConsole();

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      <div className="p-4 border-b border-border text-xs font-semibold text-foreground">
        Deployment History ({app.deployments?.length || 0})
      </div>

      <div className="divide-y divide-border">
        {app.deployments?.map((dep: any) => (
          <div
            key={dep.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-accent/40 transition"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold text-foreground">
                  {dep.commitHash || "manual"}
                </span>
                <span className="text-muted-foreground">&bull;</span>
                <span className="text-muted-foreground">{dep.branch}</span>
                <StatusBadge status={dep.status} />
              </div>
              <div className="text-muted-foreground text-[11px] mt-1">
                {dep.commitMessage || "Deployment"} &bull;{" "}
                {new Date(dep.startedAt).toLocaleString()}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {dep.status === "ACTIVE" && (
                <a
                  href={accessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                  title={`Open ${accessUrl}`}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Access App</span>
                </a>
              )}
              <button
                onClick={() => {
                  setCurrentDeploymentId(dep.id);
                  setLogMode("build");
                  setActiveTab("logs");
                }}
                className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-medium cursor-pointer"
              >
                View Logs
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
