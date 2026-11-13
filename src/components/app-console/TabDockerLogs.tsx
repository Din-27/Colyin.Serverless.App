"use client";

import React from "react";
import {
  Terminal,
  GitCommit,
  CheckCircle2,
  ExternalLink,
  Search,
  Trash2,
  Download,
  RotateCcw,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { useAppConsole } from "./AppConsoleContext";

export function TabDockerLogs() {
  const {
    app,
    activeDeployment,
    isJustDeployed,
    accessUrl,
    logMode,
    setLogMode,
    runtimeLogs,
    setRuntimeLogs,
    logs,
    setLogs,
    logFilter,
    setLogFilter,
    autoScroll,
    setAutoScroll,
    isStreamingPaused,
    setIsStreamingPaused,
    logContainerRef,
    currentDeploymentId,
    handleAction,
    actionLoading,
  } = useAppConsole();

  return (
    <div className="space-y-4">
      {/* Post-deploy Access Notification Card */}
      {(activeDeployment?.status === "ACTIVE" || isJustDeployed) && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <span>Deployment Complete &amp; Running!</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              </div>
              <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                Live endpoint:{" "}
                <a
                  href={accessUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground font-bold underline hover:text-emerald-500"
                >
                  {accessUrl}
                </a>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <CopyButton text={accessUrl} label="Copy Link" />
            <a
              href={accessUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Application</span>
            </a>
          </div>
        </div>
      )}

      {/* Log Stream Mode Switcher Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-1.5 bg-secondary p-1 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setLogMode("runtime")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              logMode === "runtime"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Docker Logs (Container stdout/stderr)</span>
          </button>

          <button
            type="button"
            onClick={() => setLogMode("build")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              logMode === "build"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Build Logs (CI/CD History)</span>
          </button>
        </div>

        {/* Quick Restart in Log Streamer */}
        <div className="flex items-center gap-2">
          {logMode === "runtime" && activeDeployment?.containerId && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-secondary border border-border text-[11px] font-mono">
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">CLI:</span>
              <span className="text-foreground">docker logs -f {activeDeployment.containerId.slice(0, 12)}</span>
              <CopyButton text={`docker logs -f ${activeDeployment.containerId.slice(0, 12)}`} label="Copy" />
            </div>
          )}
          <button
            type="button"
            onClick={() => handleAction("restart")}
            disabled={actionLoading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-accent text-foreground text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="Restart container without leaving logs"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${actionLoading === "restart" ? "animate-spin text-emerald-500" : "text-muted-foreground"}`} />
            <span>{actionLoading === "restart" ? "Restarting..." : "Restart Service"}</span>
          </button>
        </div>
      </div>

      {/* Terminal Console Card */}
      <div className="rounded-xl border border-border bg-black overflow-hidden shadow-2xl">
        {/* Terminal Toolbar */}
        <div className="px-4 py-2.5 bg-card border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-mono text-foreground font-bold">
              <Terminal className="w-3.5 h-3.5 text-cyan-500" />
              {logMode === "runtime" ? "Docker Logs (Container stdout/stderr)" : "Build Output Stream"}
            </span>

            {logMode === "runtime" ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {isStreamingPaused ? "PAUSED" : "LIVE STREAM"}
              </span>
            ) : (
              <span className="text-muted-foreground text-[11px] font-mono">
                Deployment: {(currentDeploymentId || activeDeployment?.id)?.slice(-8) || "None"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Search / Filter */}
            <div className="flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={logFilter}
                onChange={(e) => setLogFilter(e.target.value)}
                className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 w-32 sm:w-48"
              />
            </div>

            {/* Auto-scroll */}
            <label className="flex items-center gap-1.5 text-zinc-400 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded text-cyan-500 bg-zinc-800 border-zinc-700"
              />
              <span>Auto-scroll</span>
            </label>

            {/* Pause/Resume for Runtime */}
            {logMode === "runtime" && (
              <button
                type="button"
                onClick={() => setIsStreamingPaused(!isStreamingPaused)}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition cursor-pointer"
                title={isStreamingPaused ? "Resume streaming" : "Pause streaming"}
              >
                {isStreamingPaused ? "Resume" : "Pause"}
              </button>
            )}

            {/* Clear Button */}
            <button
              type="button"
              onClick={() => {
                if (logMode === "runtime") setRuntimeLogs([]);
                else setLogs([]);
              }}
              className="p-1 rounded text-zinc-400 hover:text-rose-400 transition cursor-pointer"
              title="Clear console view"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            {/* Download Log */}
            <button
              type="button"
              onClick={() => {
                const content =
                  logMode === "runtime"
                    ? runtimeLogs.map((l) => l.text).join("\n")
                    : logs.join("\n");
                const blob = new Blob([content], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${app.slug}_${logMode}_${Date.now()}.log`;
                a.click();
              }}
              className="p-1 rounded text-zinc-400 hover:text-white transition cursor-pointer"
              title="Download full log file"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Screen View */}
        <div
          ref={logContainerRef}
          className="p-4 font-mono text-xs text-zinc-300 h-[28rem] overflow-y-auto space-y-1 bg-black/95 select-text border-t border-border"
        >
          {logMode === "runtime" ? (
            runtimeLogs.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Terminal className="w-8 h-8 text-zinc-700 mx-auto animate-pulse" />
                <p className="text-zinc-500 font-sans text-xs">
                  Connected to container output stream. Waiting for incoming stdout/stderr events...
                </p>
                <p className="text-zinc-600 font-mono text-[11px]">
                  Any console.log(), HTTP request routing, or errors will appear here in real time.
                </p>
              </div>
            ) : (
              runtimeLogs
                .filter((l) => !logFilter || l.text.toLowerCase().includes(logFilter.toLowerCase()))
                .map((item, idx) => {
                  const line = item.text;
                  const isError =
                    item.stream === "stderr" ||
                    line.includes("ERROR") ||
                    line.includes("ERR") ||
                    line.includes("Exception") ||
                    line.includes("failed");
                  const isWarn = line.includes("WARN") || line.includes("WARNING");
                  const isHttp =
                    line.includes("GET ") ||
                    line.includes("POST ") ||
                    line.includes("PUT ") ||
                    line.includes("DELETE ") ||
                    line.includes("HTTP/");
                  const isSystem = line.startsWith("[SYSTEM");

                  return (
                    <div
                      key={idx}
                      className={`leading-relaxed whitespace-pre-wrap break-all ${
                        isError
                          ? "text-rose-400 bg-rose-950/20 px-1 rounded"
                          : isWarn
                          ? "text-amber-400"
                          : isHttp
                          ? "text-cyan-300"
                          : isSystem
                          ? "text-indigo-400 font-bold"
                          : "text-zinc-300"
                      }`}
                    >
                      {line}
                    </div>
                  );
                })
            )
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-600 italic">
              No build output available for this deployment. Click &apos;Redeploy&apos; to trigger a build.
            </div>
          ) : (
            logs
              .filter((l) => !logFilter || l.toLowerCase().includes(logFilter.toLowerCase()))
              .map((line, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed whitespace-pre-wrap break-all ${
                    line.includes("ERROR") || line.includes("ERR")
                      ? "text-rose-400"
                      : line.includes("WARNING")
                      ? "text-amber-400"
                      : line.includes("Simulated")
                      ? "text-indigo-400"
                      : "text-zinc-300"
                  }`}
                >
                  {line}
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
