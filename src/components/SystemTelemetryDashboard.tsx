"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  Cpu,
  HardDrive,
  Server,
  Layers,
  Database,
  RefreshCw,
  Play,
  Pause,
  ExternalLink,
  Shield,
  Zap,
  Clock,
  ArrowUpRight,
  Search,
  CheckCircle2,
  AlertCircle,
  Radio,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { DockerPruneButton } from "@/components/DockerPruneButton";
import { cn } from "@/lib/utils";

interface MetricPoint {
  time: string;
  cpu: number;
  memory: number;
  disk: number;
}

export function SystemTelemetryDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "cpu" | "memory" | "disk" | "services">("overview");
  const [isLive, setIsLive] = useState(true);
  const [dataHistory, setDataHistory] = useState<MetricPoint[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const maxHistoryPoints = 35;

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/system/metrics");
      const data = await res.json();
      if (data.success) {
        setCurrentMetrics(data);
        const now = new Date();
        const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

        setDataHistory((prev) => {
          const next = [
            ...prev,
            {
              time: timeLabel,
              cpu: data.metrics.cpu.percent,
              memory: data.metrics.memory.percent,
              disk: data.metrics.disk.percent,
            },
          ];
          return next.slice(-maxHistoryPoints);
        });
      }
    } catch (err) {
      console.warn("Failed to fetch telemetry metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    if (!isLive) return;

    const interval = setInterval(fetchMetrics, 1500);
    return () => clearInterval(interval);
  }, [isLive]);

  // SVG Area / Line Chart Generator
  const renderSvgChart = (
    key: "cpu" | "memory" | "disk",
    colorHex: string,
    gradientId: string,
    heightPx = 160
  ) => {
    if (dataHistory.length < 2) {
      return (
        <div className="h-40 flex items-center justify-center text-xs text-muted-foreground font-mono">
          Collecting telemetry data points...
        </div>
      );
    }

    const width = 600;
    const height = heightPx;
    const padding = 10;
    const chartHeight = height - padding * 2;
    const stepX = (width - padding * 2) / (maxHistoryPoints - 1);

    // Generate points
    const points = dataHistory.map((pt, idx) => {
      const val = pt[key];
      const x = padding + (maxHistoryPoints - dataHistory.length + idx) * stepX;
      const y = height - padding - (val / 100) * chartHeight;
      return { x, y, val };
    });

    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x},${p.y}`, "");
    const areaD = `${pathD} L ${points[points.length - 1].x},${height - padding} L ${points[0].x},${height - padding} Z`;

    const latestVal = dataHistory[dataHistory.length - 1][key];

    return (
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorHex} stopOpacity="0.45" />
              <stop offset="100%" stopColor={colorHex} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#27272a" strokeDasharray="3 3" />
          <line
            x1={padding}
            y1={height / 2}
            x2={width - padding}
            y2={height / 2}
            stroke="#27272a"
            strokeDasharray="3 3"
          />
          <line
            x1={padding}
            y1={height - padding}
            x2={width - padding}
            y2={height - padding}
            stroke="#27272a"
          />

          {/* Fill Area */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Line Path */}
          <path d={pathD} fill="none" stroke={colorHex} strokeWidth="2.5" strokeLinecap="round" />

          {/* Pulse Dot at Latest Point */}
          {points.length > 0 && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4.5"
              fill={colorHex}
              className="animate-pulse shadow-lg"
            />
          )}
        </svg>

        {/* Legend Overlay */}
        <div className="absolute top-2 right-2 text-right">
          <span className="text-2xl font-black font-mono tracking-tight" style={{ color: colorHex }}>
            {latestVal}%
          </span>
        </div>
      </div>
    );
  };

  const formatUptime = (seconds: number) => {
    if (!seconds) return "0m";
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const filteredServices = (currentMetrics?.services?.services || []).filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.framework.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Bar: Telemetry Status & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              Live System Telemetry
            </span>
            {currentMetrics?.system && (
              <span className="text-xs font-mono text-muted-foreground">
                Host: <strong className="text-foreground">{currentMetrics.system.hostname}</strong> ({currentMetrics.system.platform}-{currentMetrics.system.arch})
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-primary" />
            Overview &amp; Real-Time Monitoring
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time Task Manager metrics for server host hardware, compute quotas, and integrated Colyin services.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <DockerPruneButton variant="compact" onSuccess={fetchMetrics} />

          <button
            onClick={() => setIsLive(!isLive)}
            className={cn(
              "inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition border cursor-pointer",
              isLive
                ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-500 shadow-xs"
                : "bg-secondary text-foreground border-border hover:bg-secondary/80"
            )}
          >
            {isLive ? <Pause className="w-3.5 h-3.5 text-white" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLive ? "Live Streaming" : "Paused"}</span>
          </button>

          <button
            onClick={fetchMetrics}
            className="p-2 rounded-lg bg-secondary border border-border hover:bg-secondary/80 text-foreground transition cursor-pointer shadow-xs"
            title="Refresh Metrics Now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs: Standard Shadcn Style */}
      <div className="flex items-center gap-1.5 border-b border-border/80 pb-2 text-xs overflow-x-auto">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "cpu", label: `CPU (${currentMetrics?.metrics?.cpu?.percent ?? 0}%)`, icon: Cpu },
          { id: "memory", label: `Memory (${currentMetrics?.metrics?.memory?.percent ?? 0}%)`, icon: Zap },
          { id: "disk", label: `Storage (${currentMetrics?.metrics?.disk?.percent ?? 0}%)`, icon: HardDrive },
          { id: "services", label: `Services & Apps (${currentMetrics?.services?.services?.length ?? 0})`, icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap",
                active
                  ? "bg-secondary text-foreground font-semibold shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", active ? "text-foreground" : "text-muted-foreground")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW COMPREHENSIVE */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Card */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-500" />
                  CPU Utilization
                </span>
                <span className="font-mono text-cyan-500 font-bold">
                  {currentMetrics?.metrics?.cpu?.percent ?? 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full transition-all duration-500"
                  style={{ width: `${currentMetrics?.metrics?.cpu?.percent ?? 0}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{currentMetrics?.metrics?.cpu?.cores ?? 0} Physical Cores</span>
                <span>{currentMetrics?.metrics?.cpu?.speedMhz ?? 0} MHz</span>
              </div>
            </div>

            {/* RAM Card */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-500" />
                  Memory (RAM)
                </span>
                <span className="font-mono text-purple-500 font-bold">
                  {currentMetrics?.metrics?.memory?.percent ?? 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-purple-500 h-full transition-all duration-500"
                  style={{ width: `${currentMetrics?.metrics?.memory?.percent ?? 0}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{currentMetrics?.metrics?.memory?.usedGb ?? 0} GB used</span>
                <span>{currentMetrics?.metrics?.memory?.totalGb ?? 0} GB total</span>
              </div>
            </div>

            {/* Storage Card */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-500" />
                  Storage (Disk)
                </span>
                <span className="font-mono text-emerald-500 font-bold">
                  {currentMetrics?.metrics?.disk?.percent ?? 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${currentMetrics?.metrics?.disk?.percent ?? 0}%` }}
                />
              </div>
              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>{currentMetrics?.metrics?.disk?.usedGb ?? 0} GB used</span>
                <span>{currentMetrics?.metrics?.disk?.totalGb ?? 0} GB capacity</span>
              </div>
            </div>

            {/* Platform Uptime & Engine Card */}
            <div className="p-5 rounded-xl border border-border bg-card shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  System Uptime
                </span>
                <span className="font-mono text-amber-500 font-bold">
                  {formatUptime(currentMetrics?.system?.uptimeSec)}
                </span>
              </div>
              <div className="pt-1 text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center justify-between">
                  <span>Docker Daemon</span>
                  <span className={`font-bold ${currentMetrics?.services?.dockerOnline ? "text-emerald-500" : "text-amber-500"}`}>
                    {currentMetrics?.services?.dockerOnline ? "Online (Containerized)" : "Native Host Mode"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Workloads</span>
                  <span className="text-foreground font-mono font-semibold">
                    {currentMetrics?.services?.services?.length ?? 0} Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Moving Graphs Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-Time CPU Graph */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-500" />
                    Real-Time CPU Usage Timeline
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time moving waveform over the last 35 telemetry samples.
                  </p>
                </div>
              </div>
              {renderSvgChart("cpu", "#06b6d4", "cpuGlow", 140)}
            </div>

            {/* Real-Time Memory Graph */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-500" />
                    Real-Time RAM Memory Allocation
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Physical RAM consumption vs free memory headroom.
                  </p>
                </div>
              </div>
              {renderSvgChart("memory", "#a855f7", "memGlow", 140)}
            </div>
          </div>

          {/* Quick Active Services Snapshot */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Active Integrated Services
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Applications and database addons currently orchestrated by Colyin.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("services")}
                className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View Task Manager Table</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(currentMetrics?.services?.services || []).slice(0, 6).map((svc: any) => (
                <div
                  key={svc.id}
                  className="p-3.5 rounded-xl border border-border bg-muted/40 flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                      {svc.type === "APPLICATION" ? (
                        <Server className="w-3.5 h-3.5 text-cyan-500" />
                      ) : (
                        <Database className="w-3.5 h-3.5 text-purple-500" />
                      )}
                      <span>{svc.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      Project: <span className="text-foreground font-medium">{svc.projectName}</span> &bull; Port :{svc.port}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono">
                      Quota: {svc.cpuQuota} &bull; {svc.memoryQuota}
                    </div>
                  </div>
                  <StatusBadge status={svc.status} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CPU IN-DEPTH */}
      {activeTab === "cpu" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-cyan-500" />
                  Central Processing Unit (CPU) Telemetry
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Processor Model: <strong className="text-foreground">{currentMetrics?.metrics?.cpu?.model}</strong>
                </p>
              </div>
            </div>

            {renderSvgChart("cpu", "#06b6d4", "cpuGlowFull", 220)}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border text-xs">
              <div>
                <span className="text-muted-foreground block">Utilization</span>
                <span className="text-xl font-bold font-mono text-cyan-500">
                  {currentMetrics?.metrics?.cpu?.percent ?? 0}%
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Cores &amp; Sockets</span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {currentMetrics?.metrics?.cpu?.cores ?? 0} Cores
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Base Frequency</span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {currentMetrics?.metrics?.cpu?.speedMhz ?? 0} MHz
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Load Average (1/5/15m)</span>
                <span className="text-xs font-bold font-mono text-foreground block mt-1">
                  {(currentMetrics?.system?.loadAvg || []).map((l: number) => l.toFixed(2)).join(", ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MEMORY IN-DEPTH */}
      {activeTab === "memory" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  Random Access Memory (RAM) Telemetry
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Total System RAM: <strong className="text-foreground">{currentMetrics?.metrics?.memory?.totalGb} GB</strong>
                </p>
              </div>
            </div>

            {renderSvgChart("memory", "#a855f7", "memGlowFull", 220)}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border text-xs">
              <div>
                <span className="text-muted-foreground block">In Use</span>
                <span className="text-xl font-bold font-mono text-purple-500">
                  {currentMetrics?.metrics?.memory?.usedGb ?? 0} GB
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Free Headroom</span>
                <span className="text-xl font-bold font-mono text-emerald-500">
                  {currentMetrics?.metrics?.memory?.freeGb ?? 0} GB
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Capacity</span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {currentMetrics?.metrics?.memory?.totalGb ?? 0} GB
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Usage Ratio</span>
                <span className="text-xl font-bold font-mono text-cyan-500">
                  {currentMetrics?.metrics?.memory?.percent ?? 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DISK STORAGE IN-DEPTH */}
      {activeTab === "disk" && (
        <div className="space-y-6 animate-in fade-in">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-xs space-y-6">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-500" />
                Persistent Storage &amp; Disk Capacity
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Root Filesystem Storage where database volumes (<code className="text-emerald-500 font-mono">./data/prod.db</code>) and container layers are persisted.
              </p>
            </div>

            {/* Disk Bar Visualizer */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>Used: {currentMetrics?.metrics?.disk?.usedGb} GB</span>
                <span>Available: {currentMetrics?.metrics?.disk?.freeGb} GB</span>
              </div>
              <div className="w-full bg-muted rounded-xl h-6 overflow-hidden p-1 border border-border">
                <div
                  className="bg-emerald-500 h-full rounded-lg transition-all duration-500"
                  style={{ width: `${currentMetrics?.metrics?.disk?.percent ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono pt-1">
                <span>0 GB</span>
                <span className="font-bold text-foreground">{currentMetrics?.metrics?.disk?.totalGb} GB Total Capacity</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border text-xs">
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block">Storage Utilization</span>
                <span className="text-2xl font-bold font-mono text-emerald-500 mt-1 block">
                  {currentMetrics?.metrics?.disk?.percent ?? 0}%
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block">Available Free Disk</span>
                <span className="text-2xl font-bold font-mono text-cyan-500 mt-1 block">
                  {currentMetrics?.metrics?.disk?.freeGb ?? 0} GB
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-muted/40 border border-border">
                <span className="text-muted-foreground block">Persistent Storage Mount</span>
                <span className="text-xs font-mono text-foreground mt-2 block break-all font-medium">
                  ./data &bull; Host Bind Mount
                </span>
              </div>
            </div>

            {/* Docker Prune Maintenance Action */}
            <div className="p-4 rounded-xl border border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  Docker Build Cache &amp; System Maintenance
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Prune accumulated BuildKit layers and dangling containers to reclaim disk storage (<code className="text-emerald-500 font-mono">docker builder prune -af</code> &amp; <code className="text-cyan-500 font-mono">docker system prune -af</code>).
                </p>
              </div>
              <DockerPruneButton onSuccess={fetchMetrics} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SERVICES / TASK MANAGER TABLE */}
      {activeTab === "services" && (
        <div className="space-y-4 animate-in fade-in">
          {/* Search Filter */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter services by name, project, or type..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-input text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              Showing {filteredServices.length} of {currentMetrics?.services?.services?.length ?? 0} Services
            </span>
          </div>

          {/* Process Task Manager Table */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-foreground">
                <thead className="bg-muted text-muted-foreground text-[11px] uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="px-5 py-3.5 font-bold">Service / Workload</th>
                    <th className="px-5 py-3.5 font-bold">Type</th>
                    <th className="px-5 py-3.5 font-bold">Project</th>
                    <th className="px-5 py-3.5 font-bold">Internal Port</th>
                    <th className="px-5 py-3.5 font-bold">CPU Quota</th>
                    <th className="px-5 py-3.5 font-bold">Memory Quota</th>
                    <th className="px-5 py-3.5 font-bold">Status</th>
                    <th className="px-5 py-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-muted-foreground text-xs">
                        No active services found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((svc: any) => (
                      <tr key={svc.id} className="hover:bg-accent/40 transition">
                        <td className="px-5 py-3.5 font-medium text-foreground">
                          <div className="flex items-center gap-2">
                            {svc.type === "APPLICATION" ? (
                              <Server className="w-4 h-4 text-cyan-500 shrink-0" />
                            ) : (
                              <Database className="w-4 h-4 text-purple-500 shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold">{svc.name}</div>
                              {svc.containerId && (
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  ID: {svc.containerId.slice(0, 12)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                            {svc.framework}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground">{svc.projectName}</td>
                        <td className="px-5 py-3.5 font-mono text-cyan-500 font-semibold">:{svc.port}</td>
                        <td className="px-5 py-3.5 font-mono text-foreground">{svc.cpuQuota}</td>
                        <td className="px-5 py-3.5 font-mono text-foreground">{svc.memoryQuota}</td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={svc.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {svc.type === "APPLICATION" ? (
                              <Link
                                href={`/apps/${svc.id}`}
                                className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-semibold border border-border transition"
                              >
                                Manage
                              </Link>
                            ) : (
                              <Link
                                href={`/addons/${svc.id}`}
                                className="px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-foreground text-[11px] font-semibold border border-border transition"
                              >
                                Studio
                              </Link>
                            )}

                            {svc.url && (
                              <a
                                href={svc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded text-muted-foreground hover:text-foreground"
                                title="Open Live URL"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

