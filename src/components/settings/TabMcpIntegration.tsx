"use client";

import React from "react";
import { Sparkles, Globe, Bot } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

export function TabMcpIntegration() {
  const tools = [
    {
      name: "colyin_list_projects",
      desc: "Melihat semua project, network, dan database addons yang ada di cluster.",
    },
    {
      name: "colyin_list_applications",
      desc: "Melihat daftar aplikasi, status running/stopped, domain, port, dan versinya.",
    },
    {
      name: "colyin_get_application",
      desc: "Mendapatkan spesifikasi lengkap aplikasi, CPU/RAM, dan variabel env keys.",
    },
    {
      name: "colyin_get_docker_logs",
      desc: "Membaca stdout/stderr log container docker terkini untuk debugging real-time.",
    },
    {
      name: "colyin_deploy_application",
      desc: "Memicu build & deploy otomatis dari Git repository ke versi rilis baru.",
    },
    {
      name: "colyin_restart_application",
      desc: "Merestart container aplikasi secara aman tanpa rebuild.",
    },
    {
      name: "colyin_stop_application",
      desc: "Menghentikan container aplikasi yang sedang berjalan.",
    },
    {
      name: "colyin_docker_prune",
      desc: "Membersihkan builder cache atau unused container images untuk menghemat disk.",
    },
    {
      name: "colyin_get_system_telemetry",
      desc: "Mengambil metrik server VPS (CPU load, RAM usage, status Docker daemon).",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>AI Agent &amp; Model Context Protocol (MCP)</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Active &bull; Protocol v2024-11-05
              </span>
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Hubungkan asisten AI seperti Claude Desktop, Antigravity, Cursor, dan Cline untuk memantau status server, membaca logs docker, dan men-deploy aplikasi secara otonom.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono text-muted-foreground">HTTP &amp; Stdio Protocol</span>
          </div>
        </div>

        {/* MCP HTTP Endpoint Card */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>HTTP JSON-RPC 2.0 MCP Endpoint:</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
              Ready
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-background border border-border font-mono text-foreground flex items-center justify-between gap-2 shadow-xs">
            <span className="truncate select-all font-semibold text-xs">
              {typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp"}
            </span>
            <CopyButton
              text={typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp"}
              label="Salin URL"
            />
          </div>
        </div>

        {/* Quick Config Snippets for AI Clients */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-indigo-500" />
              <span>Konfigurasi Claude Desktop / Cursor (claude_desktop_config.json)</span>
            </label>
            <CopyButton
              text={`{\n  "mcpServers": {\n    "colyin": {\n      "command": "node",\n      "args": ["/opt/colyin/scripts/mcp-server.js"],\n      "env": {\n        "DATABASE_URL": "file:/opt/colyin/data/prod.db"\n      }\n    }\n  }\n}`}
              label="Salin Config JSON"
            />
          </div>

          <pre className="p-4 rounded-xl bg-black border border-border font-mono text-xs text-zinc-300 overflow-x-auto leading-relaxed select-all">
{`{
  "mcpServers": {
    "colyin": {
      "command": "node",
      "args": ["/opt/colyin/scripts/mcp-server.js"],
      "env": {
        "DATABASE_URL": "file:/opt/colyin/data/prod.db"
      }
    }
  }
}`}
          </pre>
          <p className="text-[11px] text-muted-foreground">
            Simpan snippet di atas ke file config Claude Desktop (<code className="font-mono text-foreground">~/Library/Application Support/Claude/claude_desktop_config.json</code> di Mac atau <code className="font-mono text-foreground">%APPDATA%\Claude\claude_desktop_config.json</code> di Windows).
          </p>
        </div>

        {/* Supported MCP Tools Matrix */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-foreground">
            9 Tools AI yang Tersedia untuk Colyin:
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {tools.map((tool) => (
              <div key={tool.name} className="p-3.5 rounded-xl border border-border bg-card space-y-1.5 shadow-xs">
                <div className="font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[11px] truncate">
                  {tool.name}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

