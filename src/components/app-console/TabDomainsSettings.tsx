"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Loader2,
  Plus,
  Trash2,
  Play,
  Square,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Radio,
  Sliders,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { CopyButton } from "@/components/CopyButton";
import { DeleteAppButton } from "@/components/DeleteAppButton";
import { RuntimeSelector } from "@/components/RuntimeSelector";
import { ResourceAllocationSelector } from "@/components/ResourceAllocationSelector";
import { getClientAccessUrl } from "./AppConsoleContext";
import { useAppConsole } from "./AppConsoleContext";

export function TabDomainsSettings() {
  const { app, activeDeployment } = useAppConsole();
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
      <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-foreground">Container State:</div>
          <StatusBadge status={containerStatus} />
          {activeDeployment?.containerId && (
            <span className="text-[11px] font-mono text-muted-foreground">
              ID: {activeDeployment.containerId.slice(0, 12)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleContainerAction("start")}
            disabled={containerActionLoading !== null || containerStatus === "ACTIVE"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition cursor-pointer"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold transition cursor-pointer"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold transition cursor-pointer"
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
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            Public Domain Routes &amp; SSL Certificates
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Traefik v3 dynamically manages ingress routing, SNI termination, and automatic Let's Encrypt SSL certificates.
          </p>
        </div>

        {domainError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
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
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={domainLoading || !newDomain.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition cursor-pointer"
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
        <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
          {domains.length === 0 ? (
            <div className="p-6 text-center text-xs space-y-3">
              <p className="text-muted-foreground">
                No custom domains bound. Assign an automatic HTTPS wildcard domain for instant public access.
              </p>
              <button
                type="button"
                onClick={handleGenerateAutoDomain}
                disabled={domainLoading}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold shadow-xs transition cursor-pointer"
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
                      href={getClientAccessUrl(dom.host)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-foreground hover:text-indigo-500 flex items-center gap-1.5"
                    >
                      <span>{dom.host?.replace(/:\d+.*$/, "")}</span>
                      <ExternalLink className="w-3 h-3 opacity-60" />
                    </a>
                    <CopyButton text={getClientAccessUrl(dom.host)} label="Copy" />
                    {dom.isPrimary && (
                      <span className="px-1.5 py-0.2 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-sans font-semibold">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      SSL Enabled
                    </span>
                    <span>&bull;</span>
                    <span
                      className={`font-semibold ${
                        dom.certificateStatus === "ISSUED"
                          ? "text-emerald-500"
                          : "text-amber-500"
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary border border-border hover:bg-secondary/80 text-foreground text-xs font-medium transition cursor-pointer"
                  >
                    {dnsVerifyingId === dom.id ? (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                    ) : (
                      <Radio className="w-3 h-3 text-indigo-500" />
                    )}
                    <span>Check DNS</span>
                  </button>

                  <button
                    onClick={() => handleDeleteDomain(dom.id)}
                    title="Remove domain"
                    className="p-1.5 rounded text-muted-foreground hover:text-rose-500 transition cursor-pointer"
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
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            Network Configuration &amp; cgroups Quotas
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Tune internal container ports, isolated bridge networks, and CPU/memory limits.
          </p>
        </div>

        {settingsFeedback && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            {settingsFeedback}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          {/* Project Network Info Banner */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border flex items-center justify-between font-mono">
            <div>
              <span className="text-muted-foreground text-[11px] block">Project Network Mesh:</span>
              <span className="text-foreground font-semibold">{app.project?.networkName}</span>
            </div>
            <div className="text-right">
              <span className="text-muted-foreground text-[11px] block">Internal DNS Alias:</span>
              <span className="text-indigo-500 font-semibold">http://{app.slug}:{internalPort}</span>
            </div>
          </div>

          {/* Compiler & Runtime Version */}
          <div className="p-4 rounded-xl border border-border bg-muted/20">
            <RuntimeSelector
              value={runtimeVersion}
              onChange={setRuntimeVersion}
              label="Compiler & Runtime Version Engine"
              helperText="Coolify Serverless dynamically resolves base container images for universal languages (C, C++, Rust, Zig, Go, Node, Python, PHP, Java, .NET, Ruby, Bun, Deno)."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground font-semibold mb-1 flex items-center justify-between">
                <span>Internal Listening Port</span>
                <span className="text-[10px] text-muted-foreground font-normal">Must be unique &amp; unoccupied</span>
              </label>
              <input
                type="number"
                value={internalPort}
                onChange={(e) => {
                  const p = parseInt(e.target.value, 10) || 3000;
                  setInternalPort(p);
                  checkPortAvailability(p);
                }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {portStatus.checking ? (
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                  <span>Checking port uniqueness...</span>
                </div>
              ) : !portStatus.available ? (
                <div className="mt-1.5 p-2 rounded bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-amber-500">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                    <span>{portStatus.reason || `Port ${internalPort} is already in use`}</span>
                  </div>
                  {portStatus.suggestedPort && (
                    <button
                      type="button"
                      onClick={() => {
                        setInternalPort(portStatus.suggestedPort!);
                        checkPortAvailability(portStatus.suggestedPort!);
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 font-bold text-[10px] border border-amber-500/40 shrink-0 self-start sm:self-auto transition cursor-pointer"
                    >
                      Use free port :{portStatus.suggestedPort}
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-500 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                  <span>Port {internalPort} is free and unique</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">
                Port where your app server listens inside the container (e.g. 3000, 8080, 5000).
              </p>
            </div>

            <div>
              <label className="block text-foreground font-semibold mb-1">
                Restart Policy
              </label>
              <select
                value={restartPolicy}
                onChange={(e) => setRestartPolicy(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="unless-stopped">unless-stopped (Recommended)</option>
                <option value="always">always</option>
                <option value="on-failure">on-failure</option>
                <option value="no">no</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-xs cursor-pointer"
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
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-destructive">Danger Zone</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Permanently destroy this application service, stop its container, and wipe all deployments and variables.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-destructive/20">
          <div>
            <div className="text-xs font-semibold text-foreground">Delete {app.name}</div>
            <div className="text-[11px] text-muted-foreground">
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

