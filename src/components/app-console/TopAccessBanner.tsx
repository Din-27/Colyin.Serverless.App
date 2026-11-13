"use client";

import React from "react";
import { Globe, ExternalLink, RotateCcw } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
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
    <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 backdrop-blur flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-in fade-in">
      <div className="flex items-start sm:items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
          <Globe className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-foreground">Application is Live &amp; Reachable</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-600/80 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
            {isJustDeployed && (
              <span className="text-[10px] text-emerald-800 dark:text-emerald-200 font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-500/50 shadow-xs">
                Just Deployed!
              </span>
            )}
          </div>

          {/* Endpoint URLs */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs">
            {primaryDomain && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-foreground bg-muted border border-border px-2 py-0.5 rounded shadow-xs">
                  Domain:
                </span>
                <a
                  href={accessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 hover:underline flex items-center gap-1"
                >
                  <span>{accessUrl}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <CopyButton text={accessUrl} label="Copy Link" />
              </div>
            )}

            {!isHttps && (
              <>
                <div className="flex items-center gap-1.5 border-l border-border pl-3">
                  <span className="text-[11px] text-muted-foreground font-medium">Local Port:</span>
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

                <span className="text-[11px] text-muted-foreground font-mono hidden xl:inline border-l border-border pl-3">
                  Mesh: http://{app.slug}:{app.internalPort}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
        <a
          href={accessUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open Application</span>
        </a>

        {!isHttps && (
          <a
            href={localDirectUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent text-foreground text-xs font-medium transition cursor-pointer"
            title="Open direct local port"
          >
            <span>Port :{app.internalPort}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Quick Restart Action on Banner */}
        <button
          type="button"
          onClick={() => handleAction("restart")}
          disabled={actionLoading !== null}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent text-foreground text-xs font-semibold transition cursor-pointer disabled:opacity-50"
          title="Restart service container"
        >
          <RotateCcw className={`w-3.5 h-3.5 ${actionLoading === "restart" ? "animate-spin text-emerald-500" : "text-muted-foreground"}`} />
          <span>{actionLoading === "restart" ? "Restarting..." : "Restart"}</span>
        </button>

        {isLocalhost && !isHttps && (
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background hover:bg-accent text-foreground text-xs font-medium transition cursor-pointer"
            title="Configure custom domain"
          >
            <span>Add Domain</span>
          </button>
        )}
      </div>
    </div>
  );
}
