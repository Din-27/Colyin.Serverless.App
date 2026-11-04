"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";

export function AppConsoleTabs({
  app,
  activeDeployment,
}: {
  app: any;
  activeDeployment?: any;
}) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "deployments" | "logs" | "env" | "settings"
  >("overview");
  const [isDeploying, setIsDeploying] = useState(false);
  const router = useRouter();

  // Log streaming state
  const [logs, setLogs] = useState<string[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Trigger manual deployment
  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      const res = await fetch(`/api/apps/${app.id}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: app.branch }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveTab("logs");
        router.refresh();
      }
    } catch (err) {
      console.error("Deploy failed:", err);
    } finally {
      setIsDeploying(false);
    }
  };

  // SSE Log Streaming connection
  useEffect(() => {
    if (activeTab !== "logs" || !activeDeployment?.id) return;

    setLogs([]);
    const eventSource = new EventSource(`/api/deployments/${activeDeployment.id}/logs`);

    eventSource.addEventListener("log", (e) => {
      try {
        const payload = JSON.parse(e.data);
        setLogs((prev) => [...prev, payload.chunk]);
      } catch {}
    });

    eventSource.addEventListener("complete", () => {
      router.refresh();
      eventSource.close();
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [activeTab, activeDeployment?.id, router]);

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center justify-between border-b border-zinc-800">
        <div className="flex items-center gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Metrics", icon: Activity },
            { id: "deployments", label: "Deployments", icon: GitCommit },
            { id: "logs", label: "Live Logs", icon: Terminal },
            { id: "env", label: "Environment Variables", icon: Key },
            { id: "settings", label: "Settings & Networking", icon: Settings },
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

        <button
          onClick={handleDeploy}
          disabled={isDeploying}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isDeploying ? "animate-spin" : ""}`} />
          Redeploy
        </button>
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
                <HardDrive className="w-4 h-4 text-indigo-400" />
                Memory Quota
              </span>
              <span className="font-mono text-zinc-300">{app.memoryLimitMb} MB</span>
            </div>
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: "24%" }} />
            </div>
            <div className="text-[11px] text-zinc-500">OOM Killer protection enabled</div>
          </div>

          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-400" />
                Port & Routing
              </span>
              <span className="font-mono text-zinc-300">:{app.internalPort}</span>
            </div>
            <div className="text-xs text-zinc-300 font-mono truncate">
              {app.domains[0]?.host || "Internal private mesh only"}
            </div>
            <div className="text-[11px] text-zinc-500">Traefik v3 reverse proxy attached</div>
          </div>
        </div>
      )}

      {/* Tab 2: Deployments */}
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

      {/* Tab 3: Live Logs Terminal */}
      {activeTab === "logs" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
          {/* Terminal Toolbar */}
          <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-zinc-300">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Console Stream
              </span>
              <span className="text-zinc-500 text-[11px]">
                Deployment: {activeDeployment?.id?.slice(-8) || "None"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter logs..."
                  value={logFilter}
                  onChange={(e) => setLogFilter(e.target.value)}
                  className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-1.5 text-zinc-400 text-xs cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded text-indigo-600 bg-zinc-800 border-zinc-700"
                />
                Auto-scroll
              </label>

              <button
                onClick={() => {
                  const blob = new Blob([logs.join("\n")], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `deployment-${activeDeployment?.id || "logs"}.log`;
                  a.click();
                }}
                className="flex items-center gap-1 text-zinc-400 hover:text-white"
                title="Download full log file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <div
            ref={logContainerRef}
            className="p-4 h-[420px] overflow-y-auto font-mono text-xs text-zinc-300 space-y-1 select-text"
          >
            {logs.length === 0 ? (
              <div className="text-zinc-600 text-center py-16">
                Waiting for incoming log stream...
              </div>
            ) : (
              logs
                .filter((l) => l.toLowerCase().includes(logFilter.toLowerCase()))
                .map((line, idx) => (
                  <div
                    key={idx}
                    className={`leading-relaxed ${
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
      )}

      {/* Tab 4: Environment Variables */}
      {activeTab === "env" && <EnvVarsManager appId={app.id} />}

      {/* Tab 5: Settings & Networking */}
      {activeTab === "settings" && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white">Networking & Domains</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Configure public domain routes managed by Traefik with automatic Let's Encrypt SSL.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="text-xs font-medium text-zinc-300">Bound Public Domains</div>
            {app.domains.length === 0 ? (
              <p className="text-xs text-zinc-500">No public domains bound yet.</p>
            ) : (
              <div className="space-y-2">
                {app.domains.map((d: any) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between p-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono"
                  >
                    <span className="text-indigo-300 font-semibold">{d.host}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      SSL Active
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
