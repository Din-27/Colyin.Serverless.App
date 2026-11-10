"use client";

import { useState, useEffect } from "react";
import { Cpu, HardDrive, Sparkles, Sliders, Zap } from "lucide-react";

interface ResourceAllocationSelectorProps {
  cpuLimit: number;
  memoryLimitMb: number;
  onChange: (cpu: number, memoryMb: number, mode: string) => void;
  initialMode?: "AUTO" | "ECO" | "STANDARD" | "HIGH" | "CUSTOM";
}

export function ResourceAllocationSelector({
  cpuLimit,
  memoryLimitMb,
  onChange,
  initialMode = "AUTO",
}: ResourceAllocationSelectorProps) {
  const [mode, setMode] = useState<"AUTO" | "ECO" | "STANDARD" | "HIGH" | "CUSTOM">(initialMode);
  const [customCpu, setCustomCpu] = useState(cpuLimit || 1.0);
  const [customMem, setCustomMem] = useState(memoryLimitMb || 512);

  const presets = [
    {
      id: "AUTO",
      label: "Auto (Smart Allocation)",
      desc: "Automatically tunes CPU & RAM according to framework workload",
      cpu: 1.0,
      mem: 512,
      badge: "Recommended",
      icon: Sparkles,
      color: "text-[#00F0FF]",
    },
    {
      id: "ECO",
      label: "Eco",
      desc: "Micro-services, static sites, small webhook bots",
      cpu: 0.5,
      mem: 256,
      badge: "0.5 vCPU • 256 MB",
      icon: Zap,
      color: "text-emerald-400",
    },
    {
      id: "STANDARD",
      label: "Standard",
      desc: "General web applications (Next.js, Node, Go, Python)",
      cpu: 1.0,
      mem: 512,
      badge: "1.0 vCPU • 512 MB",
      icon: Cpu,
      color: "text-indigo-400",
    },
    {
      id: "HIGH",
      label: "High Performance",
      desc: "High traffic APIs, heavy workloads, microservices",
      cpu: 2.0,
      mem: 2048,
      badge: "2.0 vCPU • 2 GB",
      icon: HardDrive,
      color: "text-amber-400",
    },
    {
      id: "CUSTOM",
      label: "Custom",
      desc: "Manually specify custom CPU cores and memory MB limits",
      cpu: customCpu,
      mem: customMem,
      badge: "Custom Limits",
      icon: Sliders,
      color: "text-purple-400",
    },
  ];

  const handleSelectMode = (presetId: "AUTO" | "ECO" | "STANDARD" | "HIGH" | "CUSTOM") => {
    setMode(presetId);
    const target = presets.find((p) => p.id === presetId);
    if (presetId === "CUSTOM") {
      onChange(customCpu, customMem, "CUSTOM");
    } else if (target) {
      onChange(target.cpu, target.mem, presetId);
    }
  };

  const handleCustomChange = (newCpu: number, newMem: number) => {
    setCustomCpu(newCpu);
    setCustomMem(newMem);
    onChange(newCpu, newMem, "CUSTOM");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-zinc-300">
          Core &amp; Memory Resource Allocation
        </label>
        <span className="text-[11px] font-mono text-cyan-400">
          Active: {cpuLimit} Core{cpuLimit > 1 ? "s" : ""} • {memoryLimitMb} MB RAM
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {presets.map((preset) => {
          const Icon = preset.icon;
          const isSelected = mode === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectMode(preset.id as any)}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-2 cursor-pointer ${
                isSelected
                  ? "bg-cyan-950/30 border-cyan-500/60 shadow-lg shadow-cyan-500/10"
                  : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-start justify-between w-full">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${preset.color}`} />
                  <span className="text-xs font-bold text-white">{preset.label}</span>
                </div>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {preset.badge}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-tight">
                {preset.desc}
              </p>
            </button>
          );
        })}
      </div>

      {mode === "CUSTOM" && (
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 animate-in fade-in">
          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Custom CPU Allocation (Cores)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="32"
              value={customCpu}
              onChange={(e) => handleCustomChange(parseFloat(e.target.value) || 1.0, customMem)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="e.g. 1.5"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              cgroups v2 NanoCpus quota limit.
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-zinc-300 mb-1">
              Custom Memory Allocation (MB)
            </label>
            <input
              type="number"
              step="64"
              min="128"
              max="65536"
              value={customMem}
              onChange={(e) => handleCustomChange(customCpu, parseInt(e.target.value, 10) || 512)}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
              placeholder="e.g. 1024"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Hard RAM ceiling limit before container OOM.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

