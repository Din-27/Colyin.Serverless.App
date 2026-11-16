"use client";

import React from "react";
import { Loader2, Database, Terminal, Settings } from "lucide-react";
import {
  AddonStudioProvider,
  useAddonStudio,
} from "./addon-studio/AddonStudioContext";
import { AddonConnectionCard } from "./addon-studio/AddonConnectionCard";
import { WebSqlStudio } from "./addon-studio/WebSqlStudio";
import { WebRedisStudio } from "./addon-studio/WebRedisStudio";
import { AddonSettingsCard } from "./addon-studio/AddonSettingsCard";

function AddonStudioContent() {
  const { data, loading, activeTab, setActiveTab } = useAddonStudio();

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
        Loading addon configuration...
      </div>
    );
  }

  if (!data) {
    return <div className="text-xs text-rose-400">Failed to load addon data.</div>;
  }

  const isPostgres = data.type === "POSTGRESQL";
  const isRedis = data.type === "REDIS";
  const hasInteractiveStudio = isPostgres || isRedis;

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 border-b border-border pb-px overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("credentials")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px shrink-0 ${
            activeTab === "credentials"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Connection & Credentials</span>
        </button>

        {hasInteractiveStudio && (
          <button
            type="button"
            onClick={() => setActiveTab("studio")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px shrink-0 ${
              activeTab === "studio"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Interactive Studio ({isPostgres ? "SQL" : "Redis"})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 -mb-px shrink-0 ${
            activeTab === "settings"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Configuration & Settings</span>
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "credentials" && <AddonConnectionCard />}

      {activeTab === "studio" && (
        <div className="space-y-6">
          <WebSqlStudio />
          <WebRedisStudio />
        </div>
      )}

      {activeTab === "settings" && <AddonSettingsCard />}
    </div>
  );
}

export function AddonConnectClient({ addonId }: { addonId: string }) {
  return (
    <AddonStudioProvider addonId={addonId}>
      <AddonStudioContent />
    </AddonStudioProvider>
  );
}
