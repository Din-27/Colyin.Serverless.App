"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  GitCommit,
  Terminal,
  Key,
  Settings,
  RefreshCw,
  Cpu,
  HardDrive,
  Globe,
  Loader2,
  Download,
  Search,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Network,
  Radio,
  Sliders,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  ShieldAlert,
  Zap,
  Pause,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { DeleteAppButton } from "@/components/DeleteAppButton";
import { RuntimeSelector } from "@/components/RuntimeSelector";
import { ResourceAllocationSelector } from "@/components/ResourceAllocationSelector";

export function AppConsoleTabs({
  app,
  activeDeployment,
  dockerOnline = false,
}: {
  app: any;
  activeDeployment?: any;
  dockerOnline?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "deployments" | "logs" | "env" | "settings"
  >("overview");
  const [isDeploying, setIsDeploying] = useState(false);
  const router = useRouter();

  // Log Mode state: "runtime" (live container stream) vs "build" (CI/CD build logs)
  const [logMode, setLogMode] = useState<"runtime" | "build">("runtime");
  const [runtimeLogs, setRuntimeLogs] = useState<
    Array<{ text: string; stream: "stdout" | "stderr"; timestamp?: number }>
  >([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isStreamingPaused, setIsStreamingPaused] = useState(false);
  const [isJustDeployed, setIsJustDeployed] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Power actions state (restart, stop, start)
  const [actionLoading, setActionLoading] = useState<"restart" | "start" | "stop" | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [currentAppStatus, setCurrentAppStatus] = useState<string>(activeDeployment?.status || "STOPPED");

  const primaryDomain = app.domains?.find((d: any) => d.isPrimary) || app.domains?.[0];
  const defaultProto = typeof window !== "undefined" && window.location.protocol ? window.location.protocol : "http:";
  const accessUrl = primaryDomain
    ? (primaryDomain.host.startsWith("http") ? primaryDomain.host : `${defaultProto}//${primaryDomain.host}`)
    : `http://localhost:${app.internalPort}`;
  const localDirectUrl = `http://localhost:${app.internalPort}`;
  const isLocalhost = !primaryDomain;
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  // Handle service restart, start, stop
  const handleAction = async (action: "restart" | "start" | "stop") => {
    setActionLoading(action);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/apps/${app.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        const nextStatus = data.status || (action === "stop" ? "STOPPED" : "ACTIVE");
        setCurrentAppStatus(nextStatus);
        setActionFeedback({
          text: `Service '${app.name}' successfully ${action === "restart" ? "restarted" : action + "ed"}!`,
          type: "success",
        });

        const timeStr = new Date().toLocaleTimeString();
        setRuntimeLogs((prev) => [
          ...prev,
          {
            text: `[SYSTEM ${timeStr}] Action '${action.toUpperCase()}' dispatched by user. Container status: ${nextStatus}`,
            stream: "stdout",
            timestamp: Date.now(),
          },
        ]);
        router.refresh();
      } else {
        setActionFeedback({
          text: data.error || `Failed to ${action} service.`,
          type: "error",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        text: err?.message || `Failed to ${action} service.`,
        type: "error",
      });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Trigger manual deployment
  const handleDeploy = async () => {
    setIsDeploying(true);
    setIsJustDeployed(false);
    try {
      const res = await fetch(`/api/apps/${app.id}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: app.branch }),
      });
      const data = await res.json();
      if (data.success) {
        setLogMode("build");
        setActiveTab("logs");
        router.refresh();
      }
    } catch (err) {
      console.error("Deploy failed:", err);
    } finally {
      setIsDeploying(false);
    }
  };

  // Runtime Logs Streaming (SSE)
  useEffect(() => {
    if (activeTab !== "logs" || logMode !== "runtime") return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/apps/${app.id}/logs?tail=200`);

      eventSource.addEventListener("init", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.status) setCurrentAppStatus(payload.status);
        } catch {}
      });

      eventSource.addEventListener("log", (e: any) => {
        if (isStreamingPaused) return;
        try {
          const payload = JSON.parse(e.data);
          setRuntimeLogs((prev) => {
            const next = [...prev, payload];
            if (next.length > 1000) return next.slice(-1000);
            return next;
          });
        } catch {}
      });

      eventSource.addEventListener("complete", () => {
        // Stream completed
      });

      eventSource.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch (err) {
      console.error("Runtime log connection error:", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [activeTab, logMode, app.id, isStreamingPaused]);

  // Build Logs Streaming (SSE)
  useEffect(() => {
    if (activeTab !== "logs" || logMode !== "build" || !activeDeployment?.id) return;

    setLogs([]);
    const eventSource = new EventSource(`/api/deployments/${activeDeployment.id}/logs`);

    eventSource.addEventListener("log", (e) => {
      try {
        const payload = JSON.parse(e.data);
        setLogs((prev) => [...prev, payload.chunk]);
      } catch {}
    });

    eventSource.addEventListener("complete", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.status === "ACTIVE") {
          setIsJustDeployed(true);
          setCurrentAppStatus("ACTIVE");
        }
      } catch {}
      router.refresh();
      eventSource.close();
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [activeTab, logMode, activeDeployment?.id, router]);

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, runtimeLogs, autoScroll, logMode]);

  return (
    <div className="space-y-6">
      {/* Top Application Access Banner (Visible when active) */}
      {(activeDeployment?.status === "ACTIVE" || isJustDeployed) && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 backdrop-blur flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white">Application is Live &amp; Reachable</span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-400 border border-emerald-700/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
                {isJustDeployed && (
                  <span className="text-[10px] text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/30">
                    Just Deployed!
                  </span>
                )}
              </div>

              {/* Endpoint URLs */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs">
                {primaryDomain && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-zinc-400 font-medium">Domain:</span>
                    <a
                      href={accessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono font-bold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
                    >
                      <span>{accessUrl}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <CopyButton text={accessUrl} label="Copy Link" />
                  </div>
                )}

                <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-3">
                  <span className="text-[11px] text-zinc-400 font-medium">Local Port:</span>
                  <a
                    href={localDirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-zinc-300 hover:text-white hover:underline flex items-center gap-1"
                  >
                    <span>:{app.internalPort}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                  <CopyButton text={localDirectUrl} label="Copy" />
                </div>

                <span className="text-[11px] text-zinc-500 font-mono hidden xl:inline border-l border-zinc-800 pl-3">
                  Mesh: http://{app.slug}:{app.internalPort}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <a
              href={accessUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Application</span>
            </a>

            <a
              href={localDirectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition cursor-pointer"
              title="Open direct local port"
            >
              <span>Port :{app.internalPort}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            {/* Quick Restart Action on Banner */}
            <button
              type="button"
              onClick={() => handleAction("restart")}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-[#00F0FF] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Restart service container"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${actionLoading === "restart" ? "animate-spin text-[#00F0FF]" : "text-cyan-400"}`} />
              <span>{actionLoading === "restart" ? "Restarting..." : "Restart"}</span>
            </button>

            {isLocalhost && (
              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition cursor-pointer"
                title="Configure custom domain"
              >
                <span>Add Domain</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            actionFeedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-zinc-500 hover:text-white text-xs px-1"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 gap-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Metrics", icon: Activity },
            { id: "deployments", label: "Deployments", icon: GitCommit },
            { id: "logs", label: "Live Logs", icon: Terminal },
            { id: "env", label: "Environment Variables", icon: Key },
            { id: "settings", label: "Network & Domains", icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                  active
                    ? "border-indigo-500 text-white font-semibold"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-indigo-400" : "text-zinc-500"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Action Controls Group: Restart, Stop/Start, Redeploy */}
        <div className="flex items-center gap-2 pb-2 sm:pb-0 shrink-0">
          {currentAppStatus === "ACTIVE" ? (
            <>
              <button
                type="button"
                onClick={() => handleAction("restart")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 text-[#00F0FF] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                title="Restart service container"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${actionLoading === "restart" ? "animate-spin" : "text-cyan-400"}`} />
                <span>{actionLoading === "restart" ? "Restarting..." : "Restart"}</span>
              </button>
              <button
                type="button"
                onClick={() => handleAction("stop")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-800/60 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                title="Stop service container"
              >
                <Square className="w-3.5 h-3.5 text-rose-400" />
                <span>{actionLoading === "stop" ? "Stopping..." : "Stop"}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleAction("start")}
              disabled={actionLoading !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-700/60 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Start service container"
            >
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>{actionLoading === "start" ? "Starting..." : "Start"}</span>
            </button>
          )}

          <button
            onClick={handleDeploy}
            disabled={isDeploying || actionLoading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isDeploying ? "animate-spin" : ""}`} />
            Redeploy
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-indigo-400" />
                CPU Limit
              </span>
              <span className="font-mono text-zinc-300">{app.cpuLimit} Core</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: "35%" }} />
            </div>
            <div className="text-[11px] text-zinc-500">cgroups v2 quota enforced</div>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                Memory Quota
              </span>
              <span className="font-mono text-zinc-300">{app.memoryLimitMb} MB</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: "20%" }} />
            </div>
            <div className="text-[11px] text-zinc-500">OOM protection active</div>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-amber-400" />
                Access Endpoint
              </span>
              <span className="font-mono text-zinc-300">Port {app.internalPort}</span>
            </div>
            <div>
              <a
                href={accessUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5 truncate"
                title={`Open ${accessUrl}`}
              >
                <span className="truncate">{accessUrl}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </a>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
              <span>{primaryDomain ? "Auto TLS (Let's Encrypt)" : "Local container bridge"}</span>
              <CopyButton text={accessUrl} label="Copy Link" />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Deployments History */}
      {activeTab === "deployments" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="p-4 border-b border-zinc-800 text-xs font-semibold text-zinc-300">
            Deployment History ({app.deployments.length})
          </div>

          <div className="divide-y divide-zinc-800/80">
            {app.deployments.map((dep: any) => (
              <div
                key={dep.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-zinc-900/60 transition"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-white">
                      {dep.commitHash || "manual"}
                    </span>
                    <span className="text-zinc-500">&bull;</span>
                    <span className="text-zinc-400">{dep.branch}</span>
                    <StatusBadge status={dep.status} />
                  </div>
                  <div className="text-zinc-500 text-[11px] mt-1">
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
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 hover:bg-emerald-900/60 text-xs font-semibold transition"
                      title={`Open ${accessUrl}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Access App</span>
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setActiveTab("logs");
                    }}
                    className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium"
                  >
                    View Logs
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Live Logs Terminal (Runtime + Build) */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Post-deploy Access Notification Card */}
          {(activeDeployment?.status === "ACTIVE" || isJustDeployed) && (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-semibold text-emerald-300 flex items-center gap-2">
                    <span>Deployment Complete &amp; Running!</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-[11px] text-zinc-300 font-mono mt-0.5">
                    Live endpoint:{" "}
                    <a
                      href={accessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-white font-bold underline hover:text-emerald-300"
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60">
            <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
              <button
                type="button"
                onClick={() => setLogMode("runtime")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  logMode === "runtime"
                    ? "bg-cyan-500/20 text-[#00F0FF] border border-cyan-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Runtime Logs (Live Container Stream)</span>
              </button>

              <button
                type="button"
                onClick={() => setLogMode("build")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  logMode === "build"
                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>Build Logs (CI/CD History)</span>
              </button>
            </div>

            {/* Quick Restart in Log Streamer */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleAction("restart")}
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/40 hover:bg-cyan-900/50 text-[#00F0FF] text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                title="Restart container without leaving logs"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${actionLoading === "restart" ? "animate-spin" : "text-cyan-400"}`} />
                <span>{actionLoading === "restart" ? "Restarting..." : "Restart Service"}</span>
              </button>
            </div>
          </div>

          {/* Terminal Console Card */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
            {/* Terminal Toolbar */}
            <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 font-mono text-zinc-300 font-bold">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  {logMode === "runtime" ? "Container stdout/stderr" : "Build Output Stream"}
                </span>

                {logMode === "runtime" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {isStreamingPaused ? "PAUSED" : "LIVE STREAM"}
                  </span>
                ) : (
                  <span className="text-zinc-500 text-[11px] font-mono">
                    Deployment: {activeDeployment?.id?.slice(-8) || "None"}
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
                    className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
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
                  className="p-1 rounded text-zinc-400 hover:text-rose-400 transition"
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
                  className="p-1 rounded text-zinc-400 hover:text-white transition"
                  title="Download full log file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Terminal Screen View */}
            <div
              ref={logContainerRef}
              className="p-4 font-mono text-xs text-zinc-300 h-[28rem] overflow-y-auto space-y-1 bg-black/95 select-text border-t border-zinc-900"
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
      )}

      {/* Tab 4: Environment Variables */}
      {activeTab === "env" && <EnvVarsManager appId={app.id} />}

      {/* Tab 5: Settings, Networking & Domains */}
      {activeTab === "settings" && (
        <SettingsAndNetworkingTab app={app} activeDeployment={activeDeployment} />
      )}
    </div>
  );
}

function SettingsAndNetworkingTab({
  app,
  activeDeployment,
}: {
  app: any;
  activeDeployment?: any;
}) {
  const router = useRouter();

  // Container Controls State
  const [containerActionLoading, setContainerActionLoading] = useState<string | null>(null);
  const [containerStatus, setContainerStatus] = useState(
    activeDeployment?.status || "STOPPED"
  );

  // Domains State
  const [domains, setDomains] = useState<any[]>(app.domains || []);
  const [newDomain, setNewDomain] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [dnsVerifyingId, setDnsVerifyingId] = useState<string | null>(null);

  // Network & Quotas Settings State
  const [internalPort, setInternalPort] = useState(app.internalPort || 3000);
  const [portStatus, setPortStatus] = useState<{
    checking: boolean;
    available: boolean;
    reason?: string;
    suggestedPort?: number;
  }>({ checking: false, available: true });
  const [runtimeVersion, setRuntimeVersion] = useState(app.runtimeVersion || "AUTO");
  const [cpuLimit, setCpuLimit] = useState(app.cpuLimit || 1.0);
  const [memoryLimitMb, setMemoryLimitMb] = useState(app.memoryLimitMb || 512);
  const [restartPolicy, setRestartPolicy] = useState(app.restartPolicy || "unless-stopped");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState("");

  const checkPortAvailability = async (portToTest: number) => {
    if (!portToTest || isNaN(portToTest)) return;
    setPortStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch(`/api/system/ports/check?port=${portToTest}&appId=${app.id}`);
      const data = await res.json();
      if (data.success) {
        setPortStatus({
          checking: false,
          available: data.available,
          reason: data.reason,
          suggestedPort: data.suggestedPort,
        });
      }
    } catch {
      setPortStatus((prev) => ({ ...prev, checking: false }));
    }
  };

  useEffect(() => {
    checkPortAvailability(app.internalPort || 3000);
  }, [app.internalPort]);

  const handleContainerAction = async (action: "start" | "stop" | "restart") => {
    setContainerActionLoading(action);
    try {
      const res = await fetch(`/api/apps/${app.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setContainerStatus(data.status);
        router.refresh();
      }
    } catch (err) {
      console.error("Container action failed:", err);
    } finally {
      setContainerActionLoading(null);
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    setDomainLoading(true);
    setDomainError("");
    try {
      const res = await fetch(`/api/apps/${app.id}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: newDomain.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setDomains((prev) => [...prev, data.domain]);
        setNewDomain("");
        router.refresh();
      } else {
        setDomainError(data.error || "Failed to add domain");
      }
    } catch (err: any) {
      setDomainError(err.message || "Failed to add domain");
    } finally {
      setDomainLoading(false);
    }
  };

  const handleGenerateAutoDomain = async () => {
    setDomainLoading(true);
    setDomainError("");
    try {
      const settingsRes = await fetch("/api/system/settings");
      const settingsData = await settingsRes.json();
      const baseDomain = settingsData.settings?.WILDCARD_DOMAIN || "127.0.0.1.sslip.io";
      const rand = Math.random().toString(36).substring(2, 8);
      const autoHost = `${app.slug}-${rand}.${baseDomain}`;

      const res = await fetch(`/api/apps/${app.id}/domains`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host: autoHost, isPrimary: true }),
      });
      const data = await res.json();
      if (data.success) {
        setDomains((prev) => [...prev, data.domain]);
        router.refresh();
      } else {
        setDomainError(data.error || "Failed to generate auto domain");
      }
    } catch (err: any) {
      setDomainError(err.message || "Failed to generate auto domain");
    } finally {
      setDomainLoading(false);
    }
  };

  const handleDeleteDomain = async (domainId: string) => {
    try {
      await fetch(`/api/apps/${app.id}/domains/${domainId}`, { method: "DELETE" });
      setDomains((prev) => prev.filter((d) => d.id !== domainId));
      router.refresh();
    } catch (err) {
      console.error("Delete domain failed:", err);
    }
  };

  const handleVerifyDns = async (domainId: string) => {
    setDnsVerifyingId(domainId);
    try {
      const res = await fetch(`/api/apps/${app.id}/domains/${domainId}/verify`);
      const data = await res.json();
      if (data.success && data.domain) {
        setDomains((prev) =>
          prev.map((d) => (d.id === domainId ? data.domain : d))
        );
      }
    } catch (err) {
      console.error("DNS verification failed:", err);
    } finally {
      setDnsVerifyingId(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsFeedback("");

    try {
      const res = await fetch(`/api/apps/${app.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internalPort,
          runtimeVersion,
          cpuLimit,
          memoryLimitMb,
          restartPolicy,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSettingsFeedback("Network and resource configuration saved successfully!");
        router.refresh();
      }
    } catch {
      setSettingsFeedback("Failed to update settings.");
    } finally {
      setSettingsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Container Power Actions Bar */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-zinc-300">Container State:</div>
          <StatusBadge status={containerStatus} />
          {activeDeployment?.containerId && (
            <span className="text-[11px] font-mono text-zinc-500">
              ID: {activeDeployment.containerId.slice(0, 12)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleContainerAction("start")}
            disabled={containerActionLoading !== null || containerStatus === "ACTIVE"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition"
          >
            {containerActionLoading === "start" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            <span>Start</span>
          </button>

          <button
            onClick={() => handleContainerAction("stop")}
            disabled={containerActionLoading !== null || containerStatus === "STOPPED"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold transition"
          >
            {containerActionLoading === "stop" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
            <span>Stop</span>
          </button>

          <button
            onClick={() => handleContainerAction("restart")}
            disabled={containerActionLoading !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition"
          >
            {containerActionLoading === "restart" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* 2. Public Domains & SSL Management */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-400" />
            Public Domain Routes &amp; SSL Certificates
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Traefik v3 dynamically manages ingress routing, SNI termination, and automatic Let's Encrypt SSL certificates.
          </p>
        </div>

        {domainError && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {domainError}
          </div>
        )}

        {/* Add Domain Form */}
        <form onSubmit={handleAddDomain} className="flex gap-2">
          <input
            type="text"
            placeholder="api.yourdomain.com"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={domainLoading || !newDomain.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
          >
            {domainLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Add Domain
          </button>
        </form>

        {/* Domains List */}
        <div className="divide-y divide-zinc-800/80 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden">
          {domains.length === 0 ? (
            <div className="p-6 text-center text-xs space-y-3">
              <p className="text-zinc-500">
                No custom domains bound. Assign an automatic HTTPS wildcard domain for instant public access.
              </p>
              <button
                type="button"
                onClick={handleGenerateAutoDomain}
                disabled={domainLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold shadow transition"
              >
                {domainLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Generate Automatic HTTPS Domain</span>
              </button>
            </div>
          ) : (
            domains.map((dom) => (
              <div
                key={dom.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <a
                      href={`https://${dom.host}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-white hover:text-indigo-400 flex items-center gap-1.5"
                    >
                      <span>{dom.host}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                    {dom.isPrimary && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 text-[10px] font-sans font-semibold">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      SSL Enabled
                    </span>
                    <span>&bull;</span>
                    <span
                      className={`font-semibold ${
                        dom.certificateStatus === "ISSUED"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }`}
                    >
                      Cert: {dom.certificateStatus}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerifyDns(dom.id)}
                    disabled={dnsVerifyingId === dom.id}
                    title="Check DNS A/CNAME record resolution"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition"
                  >
                    {dnsVerifyingId === dom.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                    ) : (
                      <Radio className="w-3 h-3 text-indigo-400" />
                    )}
                    <span>Check DNS</span>
                  </button>

                  <button
                    onClick={() => handleDeleteDomain(dom.id)}
                    title="Remove domain"
                    className="p-1.5 rounded text-zinc-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 3. Network Mesh & Resource Settings */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            Network Configuration &amp; cgroups Quotas
          </h3>
          <p className="text-xs text-zinc-400 mt-1">
            Tune internal container ports, isolated bridge networks, and CPU/memory limits.
          </p>
        </div>

        {settingsFeedback && (
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {settingsFeedback}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          {/* Project Network Info Banner */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between font-mono">
            <div>
              <span className="text-zinc-500 text-[11px] block">Project Network Mesh:</span>
              <span className="text-zinc-300 font-semibold">{app.project.networkName}</span>
            </div>
            <div className="text-right">
              <span className="text-zinc-500 text-[11px] block">Internal DNS Alias:</span>
              <span className="text-indigo-400 font-semibold">http://{app.slug}:{internalPort}</span>
            </div>
          </div>

          {/* Compiler & Runtime Version */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80">
            <RuntimeSelector
              value={runtimeVersion}
              onChange={setRuntimeVersion}
              label="Compiler & Runtime Version Engine"
              helperText="Coolify Serverless dynamically resolves base container images for universal languages (C, C++, Rust, Zig, Go, Node, Python, PHP, Java, .NET, Ruby, Bun, Deno)."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1 flex items-center justify-between">
                <span>Internal Listening Port</span>
                <span className="text-[10px] text-zinc-500 font-normal">Must be unique &amp; unoccupied</span>
              </label>
              <input
                type="number"
                value={internalPort}
                onChange={(e) => {
                  const p = parseInt(e.target.value, 10) || 3000;
                  setInternalPort(p);
                  checkPortAvailability(p);
                }}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
              {portStatus.checking ? (
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                  <span>Checking port uniqueness...</span>
                </div>
              ) : !portStatus.available ? (
                <div className="mt-1.5 p-2 rounded bg-amber-950/40 border border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>{portStatus.reason || `Port ${internalPort} is already in use`}</span>
                  </div>
                  {portStatus.suggestedPort && (
                    <button
                      type="button"
                      onClick={() => {
                        setInternalPort(portStatus.suggestedPort!);
                        checkPortAvailability(portStatus.suggestedPort!);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-[10px] border border-amber-500/40 shrink-0 self-start sm:self-auto transition"
                    >
                      Use free port :{portStatus.suggestedPort}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                  <span>Port {internalPort} is free and unique</span>
                </div>
              )}
              <p className="text-[10px] text-zinc-500 mt-1">
                Port where your app server listens inside the container (e.g. 3000, 8080, 5000).
              </p>
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Restart Policy
              </label>
              <select
                value={restartPolicy}
                onChange={(e) => setRestartPolicy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="unless-stopped">unless-stopped (Recommended)</option>
                <option value="always">always</option>
                <option value="on-failure">on-failure</option>
                <option value="no">no</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800">
            <ResourceAllocationSelector
              cpuLimit={cpuLimit}
              memoryLimitMb={memoryLimitMb}
              onChange={(newCpu, newMem) => {
                setCpuLimit(newCpu);
                setMemoryLimitMb(newMem);
              }}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={settingsLoading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow"
            >
              {settingsLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Save Configuration
            </button>
          </div>
        </form>
      </div>

      {/* 4. Danger Zone: Delete Application */}
      <div className="rounded-xl border border-rose-900/60 bg-rose-950/10 p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-rose-400">Danger Zone</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Permanently destroy this application service, stop its container, and wipe all deployments and variables.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-rose-900/30">
          <div>
            <div className="text-xs font-semibold text-white">Delete {app.name}</div>
            <div className="text-[11px] text-zinc-500">
              Irreversible action. Cannot be recovered once confirmed.
            </div>
          </div>
          <DeleteAppButton
            appId={app.id}
            appName={app.name}
            projectId={app.project?.id || app.projectId}
          />
        </div>
      </div>
    </div>
  );
}

function EnvVarsManager({ appId }: { appId: string }) {
  const [envs, setEnvs] = useState<Array<{ id: string; key: string; value: string }>>([]);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const loadEnvs = async () => {
    try {
      const res = await fetch(`/api/apps/${appId}/env`);
      const data = await res.json();
      if (data.success) {
        setEnvs(data.variables);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    loadEnvs();
  }, [appId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    await fetch(`/api/apps/${appId}/env`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variables: [{ key: newKey.trim(), value: newVal }],
      }),
    });

    setNewKey("");
    setNewVal("");
    loadEnvs();
  };

  const handleDelete = async (key: string) => {
    await fetch(`/api/apps/${appId}/env`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    loadEnvs();
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-white">Environment Variables</h3>
        <p className="text-xs text-zinc-400 mt-1">
          All secrets are encrypted at rest using AES-256-GCM. Decrypted only inside container memory.
        </p>
      </div>

      {/* Add New Var Form */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="KEY (e.g. DATABASE_URL)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          placeholder="VALUE"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
        >
          Add Variable
        </button>
      </form>

      {/* Env Vars Table */}
      <div className="divide-y divide-zinc-800/80 rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950">
        {envs.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-500">
            No environment variables configured.
          </div>
        ) : (
          envs.map((env) => {
            const isRevealed = !!showValues[env.id];
            return (
              <div
                key={env.id}
                className="p-3 flex items-center justify-between text-xs font-mono hover:bg-zinc-900/40"
              >
                <div className="w-1/3 font-semibold text-zinc-300 truncate">{env.key}</div>
                <div className="flex-1 text-zinc-400 truncate px-4">
                  {isRevealed ? env.value : "••••••••••••••••••••"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setShowValues((prev) => ({ ...prev, [env.id]: !prev[env.id] }))
                    }
                    className="p-1 text-zinc-500 hover:text-white"
                    title={isRevealed ? "Hide secret" : "Reveal secret"}
                  >
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <CopyButton text={env.value} label="Copy" />
                  <button
                    onClick={() => handleDelete(env.key)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition"
                    title="Delete variable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
