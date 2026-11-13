"use client";

import React from "react";
import {
  Database,
  Loader2,
  Archive,
  Download,
  CheckCircle2,
  HardDrive,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import { DockerPruneButton } from "@/components/DockerPruneButton";
import { useSettings } from "./SettingsContext";

export function TabMaintenance() {
  const {
    dbBackupStats,
    dbBackupsList,
    creatingBackup,
    backupMessage,
    handleCreateStoredBackup,
  } = useSettings();

  return (
    <div className="space-y-6">
      {/* Section A: Core Database Backup & Recovery */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              Core Platform Database Backup &amp; Recovery
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Download atomic snapshots of the Colyin SQLite database (<code className="text-emerald-500 font-mono">prod.db</code>) containing all applications, deployments, domains, settings, and users.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleCreateStoredBackup}
              disabled={creatingBackup}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              title="Create a timestamped backup in ./data/backups"
            >
              {creatingBackup ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
              ) : (
                <Archive className="w-3.5 h-3.5 text-indigo-500" />
              )}
              <span>{creatingBackup ? "Backing up..." : "Create Snapshot"}</span>
            </button>

            <a
              href="/api/system/backup?download=1"
              download
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              title="Download instantaneous database copy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Backup (.db)</span>
            </a>
          </div>
        </div>

        {backupMessage && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{backupMessage}</span>
          </div>
        )}

        {/* Database Metadata Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
            <span className="text-[11px] text-muted-foreground block">Database File Size</span>
            <span className="text-base font-bold text-emerald-500 block">
              {dbBackupStats?.sizeFormatted || "Loading..."}
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">
              {dbBackupStats?.filePath || "data/prod.db"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
            <span className="text-[11px] text-muted-foreground block">Active Record Counts</span>
            <span className="text-sm font-semibold text-foreground block truncate">
              {dbBackupStats?.counts
                ? `${dbBackupStats.counts.applications} Apps • ${dbBackupStats.counts.deployments} Deploys`
                : "Counting..."}
            </span>
            <span className="text-[10px] text-muted-foreground block truncate">
              {dbBackupStats?.counts
                ? `${dbBackupStats.counts.addons} Addons • ${dbBackupStats.counts.domains} Domains • ${dbBackupStats.counts.users} Users`
                : "..."}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-1">
            <span className="text-[11px] text-muted-foreground block">Backup Engine Mechanism</span>
            <span className="text-sm font-semibold text-indigo-500 block">
              Atomic SQLite VACUUM
            </span>
            <span className="text-[10px] text-muted-foreground block">
              Zero locks • Safe against active writes
            </span>
          </div>
        </div>

        {/* Stored Snapshots History */}
        {dbBackupsList.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className="text-xs font-semibold text-foreground block">
              Stored Snapshots in <code className="text-muted-foreground font-mono">./data/backups/</code> ({dbBackupsList.length})
            </span>
            <div className="divide-y divide-border rounded-lg border border-border bg-card overflow-hidden text-xs">
              {dbBackupsList.slice(0, 5).map((b) => (
                <div key={b.filename} className="p-3 flex items-center justify-between font-mono gap-3">
                  <div className="truncate">
                    <span className="text-foreground font-semibold block truncate">{b.filename}</span>
                    <span className="text-[10px] text-muted-foreground block">
                      Size: {b.sizeFormatted} &bull; Created: {new Date(b.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <a
                    href="/api/system/backup?download=1"
                    download
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary border border-border hover:bg-secondary/80 text-foreground transition cursor-pointer text-xs shrink-0"
                  >
                    <Download className="w-3 h-3 text-emerald-500" />
                    <span>Download</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section B: Docker System & Build Cache Maintenance */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-rose-500" />
            Docker System &amp; Build Cache Maintenance
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Prune unused Docker resources and BuildKit layers to prevent disk exhaustion on your VPS host.
          </p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-semibold text-foreground block">Automated Disk Reclaim</span>
              <span className="text-xs text-muted-foreground block max-w-xl">
                Executes <code className="text-emerald-500 font-mono">docker builder prune -af</code> to remove build cache and <code className="text-cyan-500 font-mono">docker system prune -af</code> to remove dangling images and stopped builder containers.
              </span>
            </div>

            <DockerPruneButton />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-border text-xs text-foreground">
            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
              <div className="flex items-center gap-2 font-mono text-emerald-500 font-semibold">
                <Terminal className="w-3.5 h-3.5" />
                <span>docker builder prune -af</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cleans intermediate BuildKit caching layers created during container compilation and Next.js / Node / Python builds.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
              <div className="flex items-center gap-2 font-mono text-cyan-500 font-semibold">
                <Terminal className="w-3.5 h-3.5" />
                <span>docker system prune -af</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Cleans untagged / dangling Docker images, stopped build runners, and unattached bridge networks.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              <strong>Safe Execution Guarantee:</strong> Database volumes (SQLite/PostgreSQL) and currently running production application containers are never removed.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
