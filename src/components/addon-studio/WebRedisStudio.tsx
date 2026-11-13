"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Terminal,
  RefreshCw,
  Search,
  Plus,
  Trash2,
  Loader2,
  Key,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { useAddonStudio } from "./AddonStudioContext";

export function WebRedisStudio() {
  const { addonId, data } = useAddonStudio();
  const [redisData, setRedisData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"keys" | "cli">("keys");
  const [search, setSearch] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // Add Key Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [flushing, setFlushing] = useState(false);

  // CLI state
  const [cliCmd, setCliCmd] = useState("PING");
  const [cliRunning, setCliRunning] = useState(false);
  const [cliOutput, setCliOutput] = useState<string | null>(null);
  const [cliExecutionMs, setCliExecutionMs] = useState<number | null>(null);

  if (data?.type !== "REDIS") return null;

  const fetchRedis = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/addons/${addonId}/redis`);
      const json = await res.json();
      if (json.success) {
        setRedisData(json);
      } else {
        setError(json.error || "Failed to connect to Redis instance.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to communicate with Redis.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedis();
  }, [addonId]);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    setSavingKey(true);
    try {
      const res = await fetch(`/api/addons/${addonId}/redis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", key: newKey.trim(), value: newValue }),
      });
      const json = await res.json();
      if (json.success) {
        setNewKey("");
        setNewValue("");
        setShowAddForm(false);
        await fetchRedis();
      } else {
        alert(json.error || "Failed to set key");
      }
    } catch (err: any) {
      alert(err.message || "Failed to set key");
    } finally {
      setSavingKey(false);
    }
  };

  const handleDeleteKey = async (key: string) => {
    if (!confirm(`Delete key "${key}" from Redis?`)) return;

    setDeletingKey(key);
    try {
      const res = await fetch(`/api/addons/${addonId}/redis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", key }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchRedis();
      } else {
        alert(json.error || "Failed to delete key");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete key");
    } finally {
      setDeletingKey(null);
    }
  };

  const handleFlushAll = async () => {
    if (!confirm("Are you sure you want to FLUSH ALL keys from this Redis instance? This will clear all cached data.")) {
      return;
    }

    setFlushing(true);
    try {
      const res = await fetch(`/api/addons/${addonId}/redis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flush" }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchRedis();
      } else {
        alert(json.error || "Failed to flush keys");
      }
    } catch (err: any) {
      alert(err.message || "Failed to flush keys");
    } finally {
      setFlushing(false);
    }
  };

  const handleRunCli = async (customCmd?: string) => {
    const cmdToRun = customCmd || cliCmd;
    if (!cmdToRun.trim()) return;

    setCliRunning(true);
    setCliOutput(null);
    const start = performance.now();

    try {
      const res = await fetch(`/api/addons/${addonId}/redis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "command", command: cmdToRun }),
      });
      const json = await res.json();
      const duration = Math.round(performance.now() - start);
      setCliExecutionMs(duration);

      if (json.success) {
        setCliOutput(
          typeof json.parsed === "object"
            ? JSON.stringify(json.parsed, null, 2)
            : String(json.parsed ?? json.raw)
        );
        const upper = cmdToRun.trim().toUpperCase();
        if (upper.startsWith("SET") || upper.startsWith("DEL") || upper.startsWith("FLUSH")) {
          fetchRedis();
        }
      } else {
        setCliOutput(`Error: ${json.error || "Command execution failed"}`);
      }
    } catch (err: any) {
      setCliOutput(`Network Error: ${err.message}`);
    } finally {
      setCliRunning(false);
    }
  };

  const filteredKeys = (redisData?.keys || []).filter((k: any) =>
    k.key.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              Web Redis Studio &amp; Cache Inspector
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
              Zero Driver Required
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your in-memory cache, inspect stored keys, and execute raw RESP Redis commands directly in your browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("keys")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === "keys"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            Key-Value Explorer
          </button>
          <button
            onClick={() => setActiveTab("cli")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              activeTab === "cli"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            CLI Console
          </button>
          <button
            onClick={fetchRedis}
            disabled={loading}
            className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground transition cursor-pointer"
            title="Refresh Cache"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-rose-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {redisData?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <span className="text-muted-foreground block text-[11px]">Total Keys Stored</span>
            <span className="text-foreground font-bold text-base mt-0.5 block font-mono">
              {redisData.stats.totalKeys}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <span className="text-muted-foreground block text-[11px]">Estimated Memory</span>
            <span className="text-emerald-500 font-bold text-base mt-0.5 block font-mono">
              {redisData.stats.memory}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <span className="text-muted-foreground block text-[11px]">Redis Protocol</span>
            <span className="text-foreground font-semibold text-xs mt-1 block font-mono">
              RESP v2 / Port {redisData.stats.port}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <span className="text-muted-foreground block text-[11px]">Server Engine</span>
            <span className="text-rose-500 font-semibold text-xs mt-1 block font-mono">
              Redis {redisData.stats.version}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs">
          {error}
        </div>
      )}

      {/* Tab 1: Key-Value Explorer */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search keys..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Key</span>
              </button>

              <button
                onClick={handleFlushAll}
                disabled={flushing || (redisData?.keys || []).length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/20 border border-border text-foreground text-xs font-medium transition disabled:opacity-40 cursor-pointer"
              >
                {flushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Flush All</span>
              </button>
            </div>
          </div>

          {/* Add Key Form */}
          {showAddForm && (
            <form onSubmit={handleSaveKey} className="p-4 rounded-lg bg-card border border-rose-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-500 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Store New Key-Value Pair
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-muted-foreground hover:text-foreground text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-muted-foreground mb-1">Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. session:user:42"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-muted-foreground mb-1">Value (Text or JSON)</label>
                  <input
                    type="text"
                    placeholder='e.g. {"role":"admin","active":true}'
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-background border border-input text-foreground text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingKey}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition cursor-pointer"
                >
                  {savingKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Key</span>
                </button>
              </div>
            </form>
          )}

          {/* Keys Table */}
          <div className="border border-border rounded-lg overflow-hidden bg-card">
            {filteredKeys.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {search ? "No keys matched your search filter." : "Redis cache is currently empty. Click 'Add Key' or set values via your application."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-muted border-b border-border text-muted-foreground text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 font-medium">Key Name</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Value Preview</th>
                      <th className="px-4 py-2 font-medium">Size</th>
                      <th className="px-4 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-foreground">
                    {filteredKeys.map((item: any) => {
                      const isExpanded = expandedKey === item.key;
                      return (
                        <tr key={item.key} className="hover:bg-accent/40 transition">
                          <td className="px-4 py-2.5 font-bold text-rose-500">
                            {item.key}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 max-w-[340px]">
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                                className="cursor-pointer text-foreground hover:underline truncate block max-w-[280px]"
                                title="Click to expand/view full value"
                              >
                                {item.value || <span className="text-muted-foreground italic">empty</span>}
                              </span>
                            </div>
                            {isExpanded && (
                              <div className="mt-2 p-2.5 rounded bg-muted/40 border border-border text-[11px] text-foreground whitespace-pre-wrap break-all relative">
                                <div className="absolute top-2 right-2">
                                  <CopyButton text={item.value} />
                                </div>
                                {item.value}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-muted-foreground">
                            {item.size} B
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <CopyButton text={item.value} />
                              <button
                                onClick={() => handleDeleteKey(item.key)}
                                disabled={deletingKey === item.key}
                                className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded transition cursor-pointer"
                                title="Delete key"
                              >
                                {deletingKey === item.key ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Interactive Redis CLI Console */}
      {activeTab === "cli" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground text-[11px]">Quick Commands:</span>
            {["PING", "INFO", "KEYS *", "DBSIZE"].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setCliCmd(q);
                  handleRunCli(q);
                }}
                className="px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground font-mono text-[11px] transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-rose-500 font-mono text-xs font-bold">redis&gt;</span>
              <input
                type="text"
                value={cliCmd}
                onChange={(e) => setCliCmd(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleRunCli();
                  }
                }}
                placeholder="Type a Redis command (e.g. GET user, SET greeting hello, PING)"
                className="w-full pl-16 pr-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <button
              onClick={() => handleRunCli()}
              disabled={cliRunning}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              {cliRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Send</span>
            </button>
          </div>

          {/* Console Output Screen */}
          <div className="p-4 rounded-lg bg-card border border-border font-mono text-xs min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-muted-foreground text-[11px]">
                <span>RESP Response Output</span>
                {cliExecutionMs !== null && (
                  <span className="text-muted-foreground font-mono">
                    Returned in {cliExecutionMs}ms
                  </span>
                )}
              </div>
              <pre className="text-emerald-500 dark:text-emerald-400 whitespace-pre-wrap break-all leading-relaxed font-mono">
                {cliOutput ?? '// Output will be displayed here. Type a command and press Enter.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

