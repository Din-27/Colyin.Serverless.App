"use client";

import React from "react";
import {
  Cpu,
  HardDrive,
  Globe,
  ExternalLink,
  GitCommit,
  Terminal,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { useAppConsole } from "./AppConsoleContext";

export function TabOverview() {
  const {
    app,
    activeDeployment,
    accessUrl,
    isHttps,
    primaryDomain,
    setActiveTab,
  } = useAppConsole();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <Cpu className="w-4 h-4 text-indigo-500" />
              CPU Limit
            </span>
            <span className="font-mono text-foreground font-semibold">{app.cpuLimit} Core</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: "35%" }} />
          </div>
          <div className="text-[11px] text-muted-foreground">cgroups v2 quota enforced</div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <HardDrive className="w-4 h-4 text-emerald-500" />
              Memory Quota
            </span>
            <span className="font-mono text-foreground font-semibold">{app.memoryLimitMb} MB</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: "20%" }} />
          </div>
          <div className="text-[11px] text-muted-foreground">OOM protection active</div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <Globe className="w-4 h-4 text-amber-500" />
              Access Endpoint
            </span>
            {!isHttps && (
              <span className="font-mono text-foreground bg-muted px-2 py-0.5 rounded border border-border text-[11px] font-semibold">
                Port {app.internalPort}
              </span>
            )}
          </div>
          <div>
            <a
              href={accessUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline flex items-center gap-1.5 truncate"
              title={`Open ${accessUrl}`}
            >
              <span className="truncate">{accessUrl}</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
            </a>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
            <span className="font-semibold text-foreground">
              {primaryDomain ? (isHttps ? "Secure HTTPS (Let's Encrypt)" : "Auto TLS (Let's Encrypt)") : "Local container bridge"}
            </span>
            <CopyButton text={accessUrl} label="Copy Link" />
          </div>
        </div>
      </div>

      {/* Running Version & Docker Container Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Version & Deployment Properties Card */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold text-foreground">Running Release Properties</span>
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
              {(app as any).version || (activeDeployment as any)?.version || "v1.0.0"}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
              <div className="text-[11px] text-muted-foreground">Release Version</div>
              <div className="font-mono font-bold text-foreground mt-0.5">
                {(app as any).version || (activeDeployment as any)?.version || "v1.0.0"}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
              <div className="text-[11px] text-muted-foreground">Active Commit</div>
              <div className="font-mono font-bold text-foreground mt-0.5 truncate">
                {activeDeployment?.commitHash ? activeDeployment.commitHash.slice(0, 7) : "initial"}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
              <div className="text-[11px] text-muted-foreground">Buildpack Engine</div>
              <div className="font-mono font-bold text-foreground mt-0.5">
                {app.buildPack || "Nixpacks"}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
              <div className="text-[11px] text-muted-foreground">Branch Ref</div>
              <div className="font-mono font-bold text-foreground mt-0.5">
                {app.branch || "main"}
              </div>
            </div>
          </div>
        </div>

        {/* Docker Logs & Container Runtime Card */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-500" />
              <span className="text-xs font-bold text-foreground">Docker Container &amp; Logs</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold cursor-pointer transition border border-border"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-500" />
              <span>Open Docker Logs</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 border border-border">
              <span className="text-muted-foreground">Container ID:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground">
                  {activeDeployment?.containerId ? activeDeployment.containerId.slice(0, 12) : "None (Stopped)"}
                </span>
                {activeDeployment?.containerId && (
                  <CopyButton text={activeDeployment.containerId.slice(0, 12)} label="Copy ID" />
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/50 border border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Host Terminal Command:</span>
                <CopyButton
                  text={`docker logs -f ${activeDeployment?.containerId ? activeDeployment.containerId.slice(0, 12) : app.slug}`}
                  label="Copy CLI"
                />
              </div>
              <div className="font-mono text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold truncate select-all">
                docker logs -f {activeDeployment?.containerId ? activeDeployment.containerId.slice(0, 12) : app.slug}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
