"use client";

import { useState, useEffect } from "react";
import { CopyButton } from "@/components/CopyButton";
import {
  Shield,
  ShieldAlert,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Terminal,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Key,
  Layers,
  Zap,
} from "lucide-react";

export function AddonConnectClient({ addonId }: { addonId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fetchCredentials = async () => {
    try {
      const res = await fetch(`/api/addons/${addonId}/credentials`);
      const json = await res.json();
      if (json.success) {
        setData(json.addon);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchCredentials();
  }, [addonId]);

  const handleTogglePublic = async () => {
    setToggling(true);
    try {
      await fetch(`/api/addons/${addonId}/toggle-public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enable: !data?.isPublic }),
      });
      await fetchCredentials();
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
        Decrypting connection credentials...
      </div>
    );
  }

  if (!data) {
    return <div className="text-xs text-rose-400">Failed to load credentials.</div>;
  }

  const { internalConnection, externalConnection, isPublic, webManagementUiUrl } = data;

  return (
    <div className="space-y-6">
      {/* Transparency Banner */}
      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Transparent Connection & No Black-Box Access
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            You have direct, unrestricted access to this engine from your local tools (DBeaver, TablePlus, pgAdmin, RedisInsight).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePublic}
            disabled={toggling}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isPublic
                ? "bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900/60"
                : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {toggling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isPublic ? "Public Access: ON" : "Public Access: OFF"}
          </button>
        </div>
      </div>

      {/* Internal Connection Details */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-white">
            Internal Network Connection (Inside Server)
          </h4>
          <p className="text-xs text-zinc-400 mt-0.5">
            Use these credentials inside backend services running in the same project network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-zinc-500 block text-[11px]">Hostname</span>
              <span className="text-zinc-200">{internalConnection.host}</span>
            </div>
            <CopyButton text={internalConnection.host} />
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-zinc-500 block text-[11px]">Internal Port</span>
              <span className="text-zinc-200">{internalConnection.port}</span>
            </div>
            <CopyButton text={internalConnection.port.toString()} />
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-zinc-500 block text-[11px]">Username</span>
              <span className="text-zinc-200">{internalConnection.user}</span>
            </div>
            <CopyButton text={internalConnection.user} />
          </div>

          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-zinc-500 block text-[11px]">Password</span>
              <span className="text-zinc-200">
                {showPassword ? internalConnection.password : "••••••••••••••••"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-zinc-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <CopyButton text={internalConnection.password} />
            </div>
          </div>
        </div>

        {internalConnection.connectionUri && (
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs font-mono">
            <div className="truncate mr-4">
              <span className="text-zinc-500 block text-[11px]">Internal Connection URI</span>
              <span className="text-emerald-400 truncate">
                {showPassword
                  ? internalConnection.connectionUri
                  : internalConnection.connectionUri.replace(
                      internalConnection.password,
                      "••••••••"
                    )}
              </span>
            </div>
            <CopyButton text={internalConnection.connectionUri} label="Copy URI" />
          </div>
        )}
      </div>

      {/* External / Public Remote Connection */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              External / Remote Connection (DBeaver, TablePlus, Laptop)
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Direct connection credentials for your desktop client.
            </p>
          </div>
        </div>

        {isPublic && externalConnection ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Public Host</span>
                  <span className="text-zinc-200">{externalConnection.host}</span>
                </div>
                <CopyButton text={externalConnection.host} />
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block text-[11px]">Public Port</span>
                  <span className="text-amber-400 font-bold">{externalConnection.port}</span>
                </div>
                <CopyButton text={externalConnection.port.toString()} />
              </div>
            </div>

            {externalConnection.connectionUri && (() => {
              const isPostgres = data.type === "POSTGRESQL";
              const isRedis = data.type === "REDIS";
              const isRabbit = data.type === "RABBITMQ";
              const dbName = externalConnection.database || "main";
              const jdbcUrl = isPostgres
                ? `jdbc:postgresql://${externalConnection.host}:${externalConnection.port}/${dbName}?ssl=false`
                : null;

              return (
                <div className="space-y-3">
                  {jdbcUrl && (
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                      <div className="truncate mr-4">
                        <span className="text-zinc-500 block text-[11px]">DBeaver JDBC URL (PostgreSQL)</span>
                        <span className="text-emerald-400 truncate">{jdbcUrl}</span>
                      </div>
                      <CopyButton text={jdbcUrl} label="Copy DBeaver URL" />
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                    <div className="truncate mr-4">
                      <span className="text-zinc-500 block text-[11px]">
                        {isRedis
                          ? "Redis Connection URI"
                          : isRabbit
                          ? "AMQP Connection URI"
                          : "Client Connection URI"}
                      </span>
                      <span className="text-amber-400 truncate">
                        {showPassword
                          ? externalConnection.connectionUri
                          : externalConnection.connectionUri.replace(
                              externalConnection.password,
                              "••••••••"
                            )}
                      </span>
                    </div>
                    <CopyButton text={externalConnection.connectionUri} label="Copy Client URI" />
                  </div>

                    {/* RabbitMQ Management URL Row in External Connection */}
                    {isRabbit && webManagementUiUrl && (
                      <div className="p-3 rounded-lg bg-zinc-950 border border-orange-900/40 flex items-center justify-between text-xs font-mono">
                        <div className="truncate mr-4">
                          <span className="text-orange-400 font-sans font-semibold block text-[11px] flex items-center gap-1.5">
                            <Globe className="w-3.5 h-3.5 text-orange-400" />
                            RabbitMQ Web Management URL
                          </span>
                          <a
                            href={webManagementUiUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-orange-300 hover:text-orange-200 hover:underline truncate inline-flex items-center gap-1 mt-0.5"
                          >
                            <span>{webManagementUiUrl}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <CopyButton text={webManagementUiUrl} label="Copy Web URL" />
                          <a
                            href={webManagementUiUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition"
                          >
                            <span>Open UI</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400 font-bold shrink-0">
                          {isPostgres ? "DBeaver Tip:" : isRedis ? "Redis Tip:" : isRabbit ? "RabbitMQ Tip:" : "Connection Tip:"}
                        </span>
                        <span>
                          {isPostgres && "Pilih driver PostgreSQL di DBeaver. Tab SSL diatur ke disabled/uncheck."}
                          {isRedis && "Gunakan redis-cli, RedisInsight, atau client library ioredis/redis untuk terhubung langsung."}
                          {isRabbit && "Gunakan AMQP library (amqplib) untuk worker queue atau akses Web Console di bawah."}
                          {!isPostgres && !isRedis && !isRabbit && "Gunakan credential ini untuk terhubung dari aplikasi lokal atau cloud."}
                        </span>
                      </div>
                      <div className="text-zinc-500 font-mono text-[10px]">
                        {isPostgres && <>Database: <strong className="text-zinc-300">{dbName}</strong> &bull; User: <strong className="text-zinc-300">{externalConnection.user}</strong></>}
                        {isRedis && <>Port: <strong className="text-zinc-300">{externalConnection.port}</strong> &bull; Auth: <strong className="text-zinc-300">Password protected</strong></>}
                        {isRabbit && <>AMQP Port: <strong className="text-zinc-300">{externalConnection.port}</strong> &bull; Web UI: <strong className="text-orange-400">15672</strong></>}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="p-6 rounded-lg bg-zinc-950/60 border border-zinc-800 text-center text-xs text-zinc-500">
              Public access is currently disabled for this instance. Turn on the toggle switch above to allocate an external port.
            </div>
          )}
        </div>

        {/* Web SQL Studio for PostgreSQL */}
        {data.type === "POSTGRESQL" && (
          <WebSqlStudio addonId={addonId} />
        )}

        {/* Web Redis Studio & Cache Inspector for Redis */}
        {data.type === "REDIS" && (
          <WebRedisStudio addonId={addonId} />
        )}

        {/* Web GUI Launcher for RabbitMQ / MinIO */}
        {webManagementUiUrl && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Globe className="w-4 h-4 text-orange-400" />
                    RabbitMQ Web Management Console & Website
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    Port 15672
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Pantau queue message broker, laju konsumsi pesan, exchanges, dan active consumer secara visual di browser Anda.
                </p>
              </div>

              <a
                href={webManagementUiUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold shadow-sm transition shrink-0"
              >
                <span>Launch Web Console</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block text-[11px] font-sans">Website URL</span>
                  <a
                    href={webManagementUiUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-orange-400 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {webManagementUiUrl}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <CopyButton text={webManagementUiUrl} label="Copy URL" />
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 block text-[11px] font-sans">Default Web Login</span>
                  <span className="text-zinc-300 mt-0.5 block">
                    User: <strong className="text-orange-400">guest</strong> &bull; Pass: <strong className="text-orange-400">guest</strong>
                  </span>
                </div>
                <CopyButton text="guest" label="Copy User" />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

function WebSqlStudio({ addonId }: { addonId: string }) {
  const [query, setQuery] = useState("SELECT * FROM _minipaas_meta;");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunQuery = async (customSql?: string) => {
    const sqlToRun = customSql || query;
    if (!sqlToRun.trim()) return;

    setRunning(true);
    setError(null);

    try {
      const res = await fetch(`/api/addons/${addonId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlToRun }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.error || "Query execution failed");
        setResult(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute query");
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              Web SQL Studio (PostgreSQL)
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Zero Driver Required
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Query and manage your database directly inside your browser without installing DBeaver or JDBC drivers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunQuery()}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Execute Query</span>
          </button>
        </div>
      </div>

      {/* Snippet Shortcuts */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-zinc-500 text-[11px]">Quick Queries:</span>
        <button
          type="button"
          onClick={() => {
            const sql = "SELECT * FROM _minipaas_meta;";
            setQuery(sql);
            handleRunQuery(sql);
          }}
          className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] transition"
        >
          _minipaas_meta
        </button>
        <button
          type="button"
          onClick={() => {
            const sql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public';";
            setQuery(sql);
            handleRunQuery(sql);
          }}
          className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] transition"
        >
          List Tables
        </button>
        <button
          type="button"
          onClick={() => {
            const sql = "SELECT NOW() as current_time, version();";
            setQuery(sql);
            handleRunQuery(sql);
          }}
          className="px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] transition"
        >
          Check Version
        </button>
      </div>

      {/* SQL Editor Area */}
      <div>
        <textarea
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Write your SQL statement here (e.g. SELECT * FROM users;)"
          className="w-full px-3 py-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleRunQuery();
            }
          }}
        />
        <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-mono text-[10px]">Ctrl+Enter</kbd> to run</span>
          {result && (
            <span className="text-zinc-400 font-mono">
              Executed in {result.executionTimeMs}ms &bull; {result.rowCount} row(s)
            </span>
          )}
        </div>
      </div>

      {/* Query Error Notice */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-mono">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* Tabular Query Results */}
      {result && result.rows && (
        <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/80">
          {result.rows.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500">
              Query completed successfully with 0 rows returned.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider sticky top-0">
                  <tr>
                    {result.fields.map((f: string, i: number) => (
                      <th key={i} className="px-4 py-2 font-medium">
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 text-zinc-200">
                  {result.rows.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-zinc-900/60 transition">
                      {result.fields.map((f: string, cIdx: number) => {
                        const val = row[f];
                        const displayVal =
                          val === null || val === undefined
                            ? "NULL"
                            : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val);

                        return (
                          <td
                            key={cIdx}
                            className={`px-4 py-2 truncate max-w-[320px] ${
                              val === null ? "text-zinc-600 italic" : ""
                            }`}
                            title={displayVal}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WebRedisStudio({ addonId }: { addonId: string }) {
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
        // Refresh keys if it was a mutating command
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
      {/* Header & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-400" />
              Web Redis Studio & Cache Inspector
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Zero Driver Required
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage your in-memory cache, inspect stored keys, and execute raw RESP Redis commands directly in your browser.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("keys")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "keys"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            Key-Value Explorer
          </button>
          <button
            onClick={() => setActiveTab("cli")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeTab === "cli"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            CLI Console
          </button>
          <button
            onClick={fetchRedis}
            disabled={loading}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
            title="Refresh Cache"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-rose-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {redisData?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 block text-[11px]">Total Keys Stored</span>
            <span className="text-white font-bold text-base mt-0.5 block font-mono">
              {redisData.stats.totalKeys}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 block text-[11px]">Estimated Memory</span>
            <span className="text-emerald-400 font-bold text-base mt-0.5 block font-mono">
              {redisData.stats.memory}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 block text-[11px]">Redis Protocol</span>
            <span className="text-zinc-300 font-semibold text-xs mt-1 block font-mono">
              RESP v2 / Port {redisData.stats.port}
            </span>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
            <span className="text-zinc-500 block text-[11px]">Server Engine</span>
            <span className="text-rose-400 font-semibold text-xs mt-1 block font-mono">
              Redis {redisData.stats.version}
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Tab 1: Key-Value Explorer */}
      {activeTab === "keys" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search keys..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs font-mono focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Key</span>
              </button>

              <button
                onClick={handleFlushAll}
                disabled={flushing || (redisData?.keys || []).length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950/50 hover:text-rose-300 hover:border-rose-800 border border-transparent text-zinc-400 text-xs font-medium transition disabled:opacity-40"
              >
                {flushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Flush All</span>
              </button>
            </div>
          </div>

          {/* Add Key Form */}
          {showAddForm && (
            <form onSubmit={handleSaveKey} className="p-4 rounded-lg bg-zinc-950 border border-rose-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  Store New Key-Value Pair
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-zinc-500 hover:text-zinc-300 text-xs"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-zinc-400 mb-1">Key Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. session:user:42"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-zinc-400 mb-1">Value (Text or JSON)</label>
                  <input
                    type="text"
                    placeholder='e.g. {"role":"admin","active":true}'
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-mono focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingKey}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition"
                >
                  {savingKey && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Key</span>
                </button>
              </div>
            </form>
          )}

          {/* Keys Table */}
          <div className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950/80">
            {filteredKeys.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">
                {search ? "No keys matched your search filter." : "Redis cache is currently empty. Click 'Add Key' or set values via your application."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 font-medium">Key Name</th>
                      <th className="px-4 py-2 font-medium">Type</th>
                      <th className="px-4 py-2 font-medium">Value Preview</th>
                      <th className="px-4 py-2 font-medium">Size</th>
                      <th className="px-4 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850 text-zinc-200">
                    {filteredKeys.map((item: any) => {
                      const isExpanded = expandedKey === item.key;
                      return (
                        <tr key={item.key} className="hover:bg-zinc-900/60 transition">
                          <td className="px-4 py-2.5 font-bold text-rose-300">
                            {item.key}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              {item.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 max-w-[340px]">
                            <div className="flex items-center gap-2">
                              <span
                                onClick={() => setExpandedKey(isExpanded ? null : item.key)}
                                className="cursor-pointer text-zinc-300 hover:text-white truncate block max-w-[280px]"
                                title="Click to expand/view full value"
                              >
                                {item.value || <span className="text-zinc-600 italic">empty</span>}
                              </span>
                            </div>
                            {isExpanded && (
                              <div className="mt-2 p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200 whitespace-pre-wrap break-all relative">
                                <div className="absolute top-2 right-2">
                                  <CopyButton text={item.value} />
                                </div>
                                {item.value}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-400">
                            {item.size} B
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <CopyButton text={item.value} />
                              <button
                                onClick={() => handleDeleteKey(item.key)}
                                disabled={deletingKey === item.key}
                                className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition"
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
            <span className="text-zinc-500 text-[11px]">Quick Commands:</span>
            {["PING", "INFO", "KEYS *", "DBSIZE"].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setCliCmd(q);
                  handleRunCli(q);
                }}
                className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 font-mono text-[11px] transition"
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
                className="w-full pl-16 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 font-mono text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
            <button
              onClick={() => handleRunCli()}
              disabled={cliRunning}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
            >
              {cliRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Send</span>
            </button>
          </div>

          {/* Console Output Screen */}
          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs min-h-[140px] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-850 text-zinc-500 text-[11px]">
                <span>RESP Response Output</span>
                {cliExecutionMs !== null && (
                  <span className="text-zinc-400 font-mono">
                    Returned in {cliExecutionMs}ms
                  </span>
                )}
              </div>
              <pre className="text-emerald-400 whitespace-pre-wrap break-all leading-relaxed">
                {cliOutput ?? '// Output will be displayed here. Type a command and press Enter.'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
