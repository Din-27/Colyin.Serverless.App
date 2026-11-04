"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Server, Layers, Bell } from "lucide-react";

export function Navbar() {
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/system/status")
      .then((res) => res.json())
      .then((data) => {
        setOnline(!!data?.status?.online);
      })
      .catch(() => setOnline(false));
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600/30 transition">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base tracking-tight">MiniPaaS</span>
              <span className="text-xs text-zinc-500 block leading-none">Serverless Engine</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-md transition"
            >
              <Layers className="w-4 h-4 text-zinc-400" />
              Projects
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-md transition"
            >
              <Bell className="w-4 h-4 text-zinc-400" />
              Notifications
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                online === null
                  ? "bg-zinc-500"
                  : online
                  ? "bg-emerald-400 animate-pulse"
                  : "bg-amber-400"
              }`}
            />
            <span className="text-zinc-300 font-medium">
              {online === null
                ? "Connecting..."
                : online
                ? "Docker Engine Online"
                : "Local Standalone Mode"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
