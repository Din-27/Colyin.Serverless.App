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

            {externalConnection.connectionUri && (
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs font-mono">
                <div className="truncate mr-4">
                  <span className="text-zinc-500 block text-[11px]">Public Connection URI</span>
                  <span className="text-amber-400 truncate">
                    {showPassword
                      ? externalConnection.connectionUri
                      : externalConnection.connectionUri.replace(
                          externalConnection.password,
                          "••••••••"
                        )}
                  </span>
                </div>
                <CopyButton text={externalConnection.connectionUri} label="Copy Remote URI" />
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 rounded-lg bg-zinc-950/60 border border-zinc-800 text-center text-xs text-zinc-500">
            Public access is currently disabled for this instance. Turn on the toggle switch above to allocate an external port.
          </div>
        )}
      </div>

      {/* Web GUI Launcher */}
      {webManagementUiUrl && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">Built-in Web Management Console</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Access the official web management interface directly in your browser.
            </p>
          </div>
          <a
            href={webManagementUiUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
          >
            Launch Web Console
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
