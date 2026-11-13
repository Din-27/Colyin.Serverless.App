"use client";

import React from "react";
import {
  Bell,
  Shield,
  Users,
  KeyRound,
  ExternalLink,
  Palette,
  Globe,
  Coffee,
  HardDrive,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SettingsProvider,
  useSettings,
  SettingsTabKey,
} from "@/components/settings/SettingsContext";
import { TabUsersRbac } from "@/components/settings/TabUsersRbac";
import { TabAlerts } from "@/components/settings/TabAlerts";
import { TabGithubOauth } from "@/components/settings/TabGithubOauth";
import { TabWildcardIngress } from "@/components/settings/TabWildcardIngress";
import { TabMcpIntegration } from "@/components/settings/TabMcpIntegration";
import { TabMaintenance } from "@/components/settings/TabMaintenance";
import { TabAppearance } from "@/components/settings/TabAppearance";

function SettingsContent() {
  const { activeTab, setActiveTab } = useSettings();

  const tabs: Array<{ id: SettingsTabKey; label: string; icon: any }> = [
    { id: "rbac", label: "Team & Users", icon: Users },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "oauth", label: "GitHub OAuth", icon: KeyRound },
    { id: "ingress", label: "Domain & SSL", icon: Globe },
    { id: "mcp", label: "AI & MCP Integration", icon: Sparkles },
    { id: "maintenance", label: "Maintenance & Database", icon: HardDrive },
    { id: "appearance", label: "Appearance", icon: Palette },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="pb-6 border-b border-border/80">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <Shield className="w-6 h-6 text-indigo-500" />
          <span>Settings</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage team access, alerting, and integrations.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-border/80 pb-2 text-xs overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-secondary text-foreground font-semibold shadow-xs border border-border/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", isActive ? "text-foreground" : "text-muted-foreground")} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === "rbac" && <TabUsersRbac />}
      {activeTab === "alerts" && <TabAlerts />}
      {activeTab === "oauth" && <TabGithubOauth />}
      {activeTab === "ingress" && <TabWildcardIngress />}
      {activeTab === "mcp" && <TabMcpIntegration />}
      {activeTab === "maintenance" && <TabMaintenance />}
      {activeTab === "appearance" && <TabAppearance />}

      {/* Support & Trakter Developer Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs mt-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Suka dengan Colyin? Trakter Developer</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Dukung pengembangan berkelanjutan platform Colyin via SociaBuzz Tribe.
            </p>
          </div>
        </div>
        <a
          href="https://sociabuzz.com/herdin27/tribe"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs shrink-0 cursor-pointer"
        >
          <Coffee className="w-4 h-4" />
          <span>Trakter di SociaBuzz</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <SettingsProvider>
      <SettingsContent />
    </SettingsProvider>
  );
}
