"use client";

import React from "react";
import {
  Cpu,
  HardDrive,
  Globe,
  ExternalLink,
  GitCommit,
  Terminal,
  GitBranch,
  Layers,
  Info,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { HoverCard, HoverCardTrigger, HoverCardContent, InfoHoverBadge } from "@/components/ui/hover-card";
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
              <InfoHoverBadge
                icon={Cpu}
                label="CPU Quota"
                badgeText="cgroups v2"
                description="Hard core ceiling limit enforced on the Linux kernel level to prevent noisy neighbors."
              />
              <span>CPU Limit</span>
            </span>
            <span className="font-mono text-foreground font-semibold">{app.cpuLimit} Core</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: "35%" }} />
          </div>
          <div className="text-[11px] text-muted-foreground">cgroups v2 quota enforced</div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <InfoHoverBadge
                icon={HardDrive}
                label="Memory Ceiling"
                badgeText="OOM Protected"
                description="Maximum memory allocated before the container is safeguarded by the OOM killer."
              />
              <span>Memory Quota</span>
            </span>
            <span className="font-mono text-foreground font-semibold">{app.memoryLimitMb} MB</span>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full" style={{ width: "20%" }} />
          </div>
          <div className="text-[11px] text-muted-foreground">OOM protection active</div>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <InfoHoverBadge
                icon={Globe}
                label="Primary Endpoint"
                badgeText={primaryDomain ? "Ingress TLS" : "Bridge"}
                description="The entrypoint URL where incoming HTTP/HTTPS traffic is terminated and forwarded."
              />
              <span>Access Endpoint</span>
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
              className="text-xs font-mono font-bold text-foreground hover:underline flex items-center gap-1.5 truncate"
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
              <GitCommit className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-bold text-foreground">Running Release Properties</span>
            </div>
            <HoverCard>
              <HoverCardTrigger>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border cursor-help">
                  {(app as any).version || (activeDeployment as any)?.version || "v1.0.0"}
                </span>
              </HoverCardTrigger>
              <HoverCardContent className="w-56 text-xs space-y-1">
                <div className="font-semibold text-foreground">Active Release Version</div>
                <div className="text-[11px] text-muted-foreground">Immutable tag assigned to this deployed image build.</div>
              </HoverCardContent>
            </HoverCard>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Release Version</span>
                <InfoHoverBadge icon={Layers} label="Release Tag" description="Version indicator of the active container deployment." />
              </div>
              <div className="font-mono font-bold text-foreground mt-1">
                {(app as any).version || (activeDeployment as any)?.version || "v1.0.0"}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Active Commit</span>
                <InfoHoverBadge icon={GitCommit} label="Commit SHA" description="Exact Git commit hash pulled for this deployment build." />
              </div>
              <div className="font-mono font-bold text-foreground mt-1 truncate">
                {activeDeployment?.commitHash ? activeDeployment.commitHash.slice(0, 7) : "initial"}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Build Engine</span>
                <InfoHoverBadge icon={Terminal} label="Buildpack Strategy" description="Container buildpack compiler used to compile and package your application." />
              </div>
              <div className="font-mono font-bold text-foreground mt-1">
                {app.buildPack || "Nixpacks"}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 border border-border">
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Branch Ref</span>
                <InfoHoverBadge icon={GitBranch} label="Tracked Branch" description="Git repository branch configured for automated deployments." />
              </div>
              <div className="font-mono font-bold text-foreground mt-1">
                {app.branch || "main"}
              </div>
            </div>
          </div>
        </div>

        {/* Docker Logs & Container Runtime Card */}
        <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-foreground" />
              <span className="text-xs font-bold text-foreground">Docker Container &amp; Logs</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold cursor-pointer transition border border-border"
            >
              <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Open Docker Logs</span>
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <InfoHoverBadge icon={Terminal} label="Docker Container ID" description="Local Docker daemon container instance hash." />
                <span>Container ID</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-foreground">
                  {activeDeployment?.containerId ? activeDeployment.containerId.slice(0, 12) : "None (Stopped)"}
                </span>
                {activeDeployment?.containerId && (
                  <CopyButton text={activeDeployment.containerId.slice(0, 12)} label="Copy ID" />
                )}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <InfoHoverBadge icon={Info} label="CLI Command" description="Command to stream container logs directly from your host terminal." />
                  <span>Host Terminal Command</span>
                </span>
                <CopyButton
                  text={`docker logs -f ${activeDeployment?.containerId ? activeDeployment.containerId.slice(0, 12) : app.slug}`}
                  label="Copy CLI"
                />
              </div>
              <div className="font-mono text-[11px] text-foreground font-semibold truncate select-all">
                docker logs -f {activeDeployment?.containerId ? activeDeployment.containerId.slice(0, 12) : app.slug}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

