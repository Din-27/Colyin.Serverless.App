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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function AddonStudioContent() {
  const { data, loading, activeTab, setActiveTab } = useAddonStudio();

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-muted-foreground" />
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      {/* shadcn UI TabsList */}
      <TabsList className="bg-muted/60 p-1 rounded-xl border border-border h-auto gap-1">
        <TabsTrigger value="credentials" className="gap-2 py-2 px-3.5">
          <Database className="w-3.5 h-3.5 text-emerald-500" />
          <span>Connection & Credentials</span>
        </TabsTrigger>

        {hasInteractiveStudio && (
          <TabsTrigger value="studio" className="gap-2 py-2 px-3.5">
            <Terminal className="w-3.5 h-3.5 text-foreground" />
            <span>Interactive Studio ({isPostgres ? "SQL" : "Redis"})</span>
          </TabsTrigger>
        )}

        <TabsTrigger value="settings" className="gap-2 py-2 px-3.5">
          <Settings className="w-3.5 h-3.5 text-amber-500" />
          <span>Configuration & Settings</span>
        </TabsTrigger>
      </TabsList>

      {/* shadcn UI TabsContent */}
      <TabsContent value="credentials">
        <AddonConnectionCard />
      </TabsContent>

      {hasInteractiveStudio && (
        <TabsContent value="studio" className="space-y-6">
          <WebSqlStudio />
          <WebRedisStudio />
        </TabsContent>
      )}

      <TabsContent value="settings">
        <AddonSettingsCard />
      </TabsContent>
    </Tabs>
  );
}

export function AddonConnectClient({ addonId }: { addonId: string }) {
  return (
    <AddonStudioProvider addonId={addonId}>
      <AddonStudioContent />
    </AddonStudioProvider>
  );
}
