"use client";

import React from "react";
import { Globe, ExternalLink, RotateCcw, Radio, Network } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { InfoHoverBadge, HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { useAppConsole } from "./AppConsoleContext";

export function TopAccessBanner() {
  const {
    app,
    activeDeployment,
    isJustDeployed,
    primaryDomain,
    accessUrl,
    localDirectUrl,
    isHttps,
    isLocalhost,
    handleAction,
    actionLoading,
    setActiveTab,
  } = useAppConsole();

  if (activeDeployment?.status !== "ACTIVE" && !isJustDeployed) {
    return null;
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-in fade-in">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <Globe className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground">Application is Live &amp; Reachable</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
            {isJustDeployed && (
              <span className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 rounded-full bg-secondary border border-border shadow-xs">
                Just Deployed!
              </span>
            )}
          </div>

          {/* Clean Endpoint URLs with Info Hover Cards */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-xs">
            {primaryDomain && (
              <div className="flex items-center gap-1.5">
                <InfoHoverBadge
                  icon={Globe}
                  label="Public Ingress Route"
                  badgeText={isHttps ? "HTTPS" : "HTTP"}
                  description="Traefik v3 reverse proxy routing traffic from the public Internet with automatic SSL encryption."
                />
                <a
                  href={accessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-foreground hover:underline flex items-center gap-1"
                >
                  <span>{accessUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
                <CopyButton text={accessUrl} label="Copy Link" />
              </div>
            )}

            {!isHttps && (
              <>
                <div className="flex items-center gap-1.5 border-l border-border pl-3">
                  <InfoHoverBadge
                    icon={Radio}
                    label="Direct Container Port"
                    badgeText="Host Port"
                    description={`Direct host port :${app.internalPort} mapped to the internal application container listener.`}
                  />
                  <a
                    href={localDirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-foreground hover:underline flex items-center gap-1"
                  >
                    <span>:{app.internalPort}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                  <CopyButton text={localDirectUrl} label="Copy" />
                </div>

                <div className="hidden xl:flex items-center gap-1.5 border-l border-border pl-3">
                  <InfoHoverBadge
                    icon={Network}
                    label="Docker Mesh DNS"
                    badgeText="Project Network"
                    description={`Private Docker network hostname http://${app.slug}:${app.internalPort} accessible by other services in this project.`}
                  />
                  <span className="text-[11px] text-muted-foreground font-mono">
                    http://{app.slug}:{app.internalPort}
                  </span>
                  <CopyButton text={`http://${app.slug}:${app.internalPort}`} label="Copy" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Clean Icons with Info Hover Cards */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <HoverCard openDelay={150}>
          <HoverCardTrigger asChild>
            <a
              href={accessUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition cursor-pointer"
              aria-label="Open Application"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </HoverCardTrigger>
          <HoverCardContent className="w-52 text-xs space-y-1">
            <div className="font-semibold text-foreground">Open Application</div>
            <div className="text-[11px] text-muted-foreground truncate">{accessUrl}</div>
          </HoverCardContent>
        </HoverCard>

        {!isHttps && (
          <HoverCard openDelay={150}>
            <HoverCardTrigger asChild>
              <a
                href={localDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition cursor-pointer shadow-xs"
                aria-label={`Open direct port :${app.internalPort}`}
              >
                <Radio className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </a>
            </HoverCardTrigger>
            <HoverCardContent className="w-52 text-xs space-y-1">
              <div className="font-semibold text-foreground">Direct Local Port</div>
              <div className="text-[11px] text-muted-foreground font-mono">http://localhost:{app.internalPort}</div>
            </HoverCardContent>
          </HoverCard>
        )}

        {/* Quick Restart Action */}
        <HoverCard openDelay={150}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              onClick={() => handleAction("restart")}
              disabled={actionLoading !== null}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition cursor-pointer disabled:opacity-50 shadow-xs"
              aria-label="Restart service container"
            >
              <RotateCcw className={`w-4 h-4 ${actionLoading === "restart" ? "animate-spin text-primary" : "text-muted-foreground hover:text-foreground"}`} />
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-48 text-xs space-y-1">
            <div className="font-semibold text-foreground">Restart Service</div>
            <div className="text-[11px] text-muted-foreground">Trigger a zero-downtime container restart.</div>
          </HoverCardContent>
        </HoverCard>

        {isLocalhost && !isHttps && (
          <HoverCard openDelay={150}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition cursor-pointer shadow-xs"
                aria-label="Configure custom domain"
              >
                <Globe className="w-4 h-4 text-muted-foreground hover:text-foreground" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-52 text-xs space-y-1">
              <div className="font-semibold text-foreground">Custom Domains</div>
              <div className="text-[11px] text-muted-foreground">Add a custom public domain or Traefik wildcard ingress route.</div>
            </HoverCardContent>
          </HoverCard>
        )}
      </div>
    </div>
  );
}

