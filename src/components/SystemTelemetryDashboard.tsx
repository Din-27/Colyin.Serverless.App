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
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

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
        <div className="h-40 flex items-center justify-center text-xs text-zinc-500 font-mono">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/80 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping" />
              Live System Telemetry
            </span>
            {currentMetrics?.system && (
              <span className="text-xs font-mono text-zinc-400">
                Host: <strong className="text-white">{currentMetrics.system.hostname}</strong> ({currentMetrics.system.platform}-{currentMetrics.system.arch})
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-[#00F0FF]" />
            Overview &amp; Real-Time Monitoring
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time Task Manager metrics for server host hardware, compute quotas, and integrated Colyin services.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition border cursor-pointer ${
              isLive
                ? "bg-emerald-950/60 border-emerald-800 text-emerald-300 hover:bg-emerald-950"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {isLive ? <Pause className="w-3.5 h-3.5 text-emerald-400" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLive ? "Live Streaming" : "Paused"}</span>
          </button>

          <button
            onClick={fetchMetrics}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition cursor-pointer"
            title="Refresh Metrics Now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs: Task Manager Style */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
            activeTab === "overview"
              ? "bg-[#0284C7] text-white shadow-md shadow-cyan-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("cpu")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
            activeTab === "cpu"
              ? "bg-[#0284C7] text-white shadow-md shadow-cyan-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>CPU ({currentMetrics?.metrics?.cpu?.percent ?? 0}%)</span>
        </button>

        <button
          onClick={() => setActiveTab("memory")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
            activeTab === "memory"
              ? "bg-[#0284C7] text-white shadow-md shadow-cyan-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Memory ({currentMetrics?.metrics?.memory?.percent ?? 0}%)</span>
        </button>

        <button
          onClick={() => setActiveTab("disk")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
            activeTab === "disk"
              ? "bg-[#0284C7] text-white shadow-md shadow-cyan-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Storage ({currentMetrics?.metrics?.disk?.percent ?? 0}%)</span>
        </button>

        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition cursor-pointer ${
            activeTab === "services"
              ? "bg-[#0284C7] text-white shadow-md shadow-cyan-500/20"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Services &amp; Apps ({currentMetrics?.services?.services?.length ?? 0})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW COMPREHENSIVE */}
      {activeTab === "overview" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CPU Card */}
            <div className="p-5 rounded-xl border border-cyan-500/20 bg-[#0F172A]/70 backdrop-blur space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#00F0FF]" />
                  CPU Utilization
                </span>
                <span className="font-mono text-[#00F0FF] font-bold">
                  {currentMetrics?.metrics?.cpu?.percent ?? 0}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#0284C7] to-[#00F0FF] h-full transition-all duration-500"
                  style={{ width: `${currentMetrics?.metrics?.cpu?.percent ?? 0}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>{currentMetrics?.metrics?.cpu?.cores ?? 0} Physical Cores</span>
                <span>{currentMetrics?.metrics?.cpu?.speedMhz ?? 0} MHz</span>
              </div>
            </div>

            {/* RAM Card */}
            <div className="p-5 rounded-xl border border-purple-500/20 bg-[#0F172A]/70 backdrop-blur space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Memory (RAM)
                </span>
                <span className="font-mono text-purple-400 font-bold">
                  {currentMetrics?.metrics?.memory?.percent ?? 0}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-600 to-violet-400 h-full transition-all duration-500"
                  style={{ width: `${currentMetrics?.metrics?.memory?.percent ?? 0}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>{currentMetrics?.metrics?.memory?.usedGb ?? 0} GB used</span>
                <span>{currentMetrics?.metrics?.memory?.totalGb ?? 0} GB total</span>
              </div>
            </div>

            {/* Storage Card */}
            <div className="p-5 rounded-xl border border-emerald-500/20 bg-[#0F172A]/70 backdrop-blur space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Storage (Disk)
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {currentMetrics?.metrics?.disk?.percent ?? 0}%
                </span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full transition-all duration-500"
                  style={{ width: `${currentMetrics?.metrics?.disk?.percent ?? 0}%` }}
                />
              </div>
              <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                <span>{currentMetrics?.metrics?.disk?.usedGb ?? 0} GB used</span>
                <span>{currentMetrics?.metrics?.disk?.totalGb ?? 0} GB capacity</span>
              </div>
            </div>

            {/* Platform Uptime & Engine Card */}
            <div className="p-5 rounded-xl border border-slate-800 bg-[#0F172A]/70 backdrop-blur space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  System Uptime
                </span>
                <span className="font-mono text-amber-400 font-bold">
                  {formatUptime(currentMetrics?.system?.uptimeSec)}
                </span>
              </div>
              <div className="pt-1 text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Docker Daemon</span>
                  <span className={`font-bold ${currentMetrics?.services?.dockerOnline ? "text-emerald-400" : "text-amber-400"}`}>
                    {currentMetrics?.services?.dockerOnline ? "Online (Containerized)" : "Native Host Mode"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Workloads</span>
                  <span className="text-white font-mono font-semibold">
                    {currentMetrics?.services?.services?.length ?? 0} Active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Real-time Moving Graphs Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Real-Time CPU Graph */}
            <div className="p-6 rounded-2xl border border-cyan-500/25 bg-[#0F172A]/70 backdrop-blur space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-[#00F0FF]" />
                    Real-Time CPU Usage Timeline
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Real-time moving waveform over the last 35 telemetry samples.
                  </p>
                </div>
              </div>
              {renderSvgChart("cpu", "#00F0FF", "cpuGlow", 140)}
            </div>

            {/* Real-Time Memory Graph */}
            <div className="p-6 rounded-2xl border border-purple-500/25 bg-[#0F172A]/70 backdrop-blur space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-purple-400" />
                    Real-Time RAM Memory Allocation
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Physical RAM consumption vs free memory headroom.
                  </p>
                </div>
              </div>
              {renderSvgChart("memory", "#A855F7", "memGlow", 140)}
            </div>
          </div>

          {/* Quick Active Services Snapshot */}
          <div className="p-6 rounded-2xl border border-zinc-800 bg-[#0F172A]/50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#00F0FF]" />
                  Active Integrated Services
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Applications and database addons currently orchestrated by Colyin.
                </p>
              </div>
              <button
                onClick={() => setActiveTab("services")}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
              >
                <span>View Task Manager Table</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(currentMetrics?.services?.services || []).slice(0, 6).map((svc: any) => (
                <div
                  key={svc.id}
                  className="p-3.5 rounded-xl border border-zinc-800 bg-[#0B0F19] flex items-start justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                      {svc.type === "APPLICATION" ? (
                        <Server className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <Database className="w-3.5 h-3.5 text-purple-400" />
                      )}
                      <span>{svc.name}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 font-mono">
                      Project: <span className="text-zinc-300">{svc.projectName}</span> &bull; Port :{svc.port}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
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
          <div className="p-6 rounded-2xl border border-cyan-500/30 bg-[#0F172A]/70 backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#00F0FF]" />
                  Central Processing Unit (CPU) Telemetry
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Processor Model: <strong className="text-white">{currentMetrics?.metrics?.cpu?.model}</strong>
                </p>
              </div>
            </div>

            {renderSvgChart("cpu", "#00F0FF", "cpuGlowFull", 220)}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-400 block">Utilization</span>
                <span className="text-xl font-bold font-mono text-cyan-400">
                  {currentMetrics?.metrics?.cpu?.percent ?? 0}%
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Cores &amp; Sockets</span>
                <span className="text-xl font-bold font-mono text-white">
                  {currentMetrics?.metrics?.cpu?.cores ?? 0} Cores
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Base Frequency</span>
                <span className="text-xl font-bold font-mono text-white">
                  {currentMetrics?.metrics?.cpu?.speedMhz ?? 0} MHz
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Load Average (1/5/15m)</span>
                <span className="text-xs font-bold font-mono text-zinc-300 block mt-1">
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
          <div className="p-6 rounded-2xl border border-purple-500/30 bg-[#0F172A]/70 backdrop-blur space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-400" />
                  Random Access Memory (RAM) Telemetry
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Total System RAM: <strong className="text-white">{currentMetrics?.metrics?.memory?.totalGb} GB</strong>
                </p>
              </div>
            </div>

            {renderSvgChart("memory", "#A855F7", "memGlowFull", 220)}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-400 block">In Use</span>
                <span className="text-xl font-bold font-mono text-purple-400">
                  {currentMetrics?.metrics?.memory?.usedGb ?? 0} GB
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Free Headroom</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  {currentMetrics?.metrics?.memory?.freeGb ?? 0} GB
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Capacity</span>
                <span className="text-xl font-bold font-mono text-white">
                  {currentMetrics?.metrics?.memory?.totalGb ?? 0} GB
                </span>
              </div>
              <div>
                <span className="text-zinc-400 block">Usage Ratio</span>
                <span className="text-xl font-bold font-mono text-cyan-400">
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
          <div className="p-6 rounded-2xl border border-emerald-500/30 bg-[#0F172A]/70 backdrop-blur space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-400" />
                Persistent Storage &amp; Disk Capacity
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Root Filesystem Storage where database volumes (<code className="text-emerald-300 font-mono">./data/prod.db</code>) and container layers are persisted.
              </p>
            </div>

            {/* Disk Bar Visualizer */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-300 font-mono">
                <span>Used: {currentMetrics?.metrics?.disk?.usedGb} GB</span>
                <span>Available: {currentMetrics?.metrics?.disk?.freeGb} GB</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-xl h-6 overflow-hidden p-1 border border-zinc-700">
                <div
                  className="bg-gradient-to-r from-emerald-600 via-teal-500 to-[#00F0FF] h-full rounded-lg transition-all duration-500"
                  style={{ width: `${currentMetrics?.metrics?.disk?.percent ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-zinc-500 font-mono pt-1">
                <span>0 GB</span>
                <span className="font-bold text-white">{currentMetrics?.metrics?.disk?.totalGb} GB Total Capacity</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-zinc-800 text-xs">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400 block">Storage Utilization</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                  {currentMetrics?.metrics?.disk?.percent ?? 0}%
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400 block">Available Free Disk</span>
                <span className="text-2xl font-bold font-mono text-cyan-400 mt-1 block">
                  {currentMetrics?.metrics?.disk?.freeGb ?? 0} GB
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-zinc-400 block">Persistent Storage Mount</span>
                <span className="text-xs font-mono text-zinc-200 mt-2 block break-all">
                  ./data &bull; Host Bind Mount
                </span>
              </div>
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
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter services by name, project, or type..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#0F172A] border border-zinc-800 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
            <span className="text-xs text-zinc-400 font-mono shrink-0">
              Showing {filteredServices.length} of {currentMetrics?.services?.services?.length ?? 0} Services
            </span>
          </div>

          {/* Process Task Manager Table */}
          <div className="rounded-2xl border border-zinc-800 bg-[#0F172A]/70 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#0B0F19] text-zinc-400 text-[11px] uppercase tracking-wider border-b border-zinc-800">
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
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-zinc-500 text-xs">
                        No active services found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((svc: any) => (
                      <tr key={svc.id} className="hover:bg-zinc-800/40 transition">
                        <td className="px-5 py-3.5 font-medium text-white">
                          <div className="flex items-center gap-2">
                            {svc.type === "APPLICATION" ? (
                              <Server className="w-4 h-4 text-cyan-400 shrink-0" />
                            ) : (
                              <Database className="w-4 h-4 text-purple-400 shrink-0" />
                            )}
                            <div>
                              <div className="font-semibold">{svc.name}</div>
                              {svc.containerId && (
                                <div className="text-[10px] text-zinc-500 font-mono">
                                  ID: {svc.containerId.slice(0, 12)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-mono text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {svc.framework}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-300">{svc.projectName}</td>
                        <td className="px-5 py-3.5 font-mono text-cyan-400">:{svc.port}</td>
                        <td className="px-5 py-3.5 font-mono text-zinc-300">{svc.cpuQuota}</td>
                        <td className="px-5 py-3.5 font-mono text-zinc-300">{svc.memoryQuota}</td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={svc.status} />
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            {svc.type === "APPLICATION" ? (
                              <Link
                                href={`/apps/${svc.id}`}
                                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-semibold transition"
                              >
                                Manage
                              </Link>
                            ) : (
                              <Link
                                href={`/addons/${svc.id}`}
                                className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-[11px] font-semibold transition"
                              >
                                Studio
                              </Link>
                            )}

                            {svc.url && (
                              <a
                                href={svc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded text-zinc-400 hover:text-white"
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
