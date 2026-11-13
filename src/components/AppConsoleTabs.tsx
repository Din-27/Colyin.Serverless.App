"use client";

import React from "react";
import {
  Activity,
  GitCommit,
  Terminal,
  Key,
  Settings,
  RefreshCw,
  RotateCcw,
  Square,
  Play,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AppConsoleProvider,
  useAppConsole,
  TabKey,
} from "./app-console/AppConsoleContext";
import { TopAccessBanner } from "./app-console/TopAccessBanner";
import { TabOverview } from "./app-console/TabOverview";
import { TabDeployments } from "./app-console/TabDeployments";
import { TabDockerLogs } from "./app-console/TabDockerLogs";
import { TabEnvironment } from "./app-console/TabEnvironment";
import { TabDomainsSettings } from "./app-console/TabDomainsSettings";

function AppConsoleContent() {
  const {
    activeTab,
    setActiveTab,
    actionFeedback,
    setActionFeedback,
    currentAppStatus,
    actionLoading,
    handleAction,
    isDeploying,
    handleDeploy,
  } = useAppConsole();

  const tabs: Array<{ id: TabKey; label: string; icon: any }> = [
    { id: "overview", label: "Overview & Metrics", icon: Activity },
    { id: "deployments", label: "Deployments", icon: GitCommit },
    { id: "logs", label: "Docker Logs", icon: Terminal },
    { id: "env", label: "Environment Variables", icon: Key },
    { id: "settings", label: "Network & Domains", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      {/* Top Application Access Banner */}
      <TopAccessBanner />

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in ${
            actionFeedback.type === "success"
              ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
              : "border-rose-500/40 bg-rose-950/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-muted-foreground hover:text-foreground text-xs px-1 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/80 gap-3 pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap cursor-pointer",
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

        {/* Action Controls Group: Restart, Stop/Start, Redeploy */}
        <div className="flex items-center gap-2 pb-1 sm:pb-0 shrink-0">
          {currentAppStatus === "ACTIVE" ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAction("restart")}
                disabled={actionLoading !== null}
                className="gap-1.5 text-xs h-8 cursor-pointer"
                title="Restart service container"
              >
                <RotateCcw className={cn("w-3.5 h-3.5", actionLoading === "restart" && "animate-spin")} />
                <span>{actionLoading === "restart" ? "Restarting..." : "Restart"}</span>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleAction("stop")}
                disabled={actionLoading !== null}
                className="gap-1.5 text-xs h-8 cursor-pointer"
                title="Stop service container"
              >
                <Square className="w-3.5 h-3.5" />
                <span>{actionLoading === "stop" ? "Stopping..." : "Stop"}</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction("start")}
              disabled={actionLoading !== null}
              className="gap-1.5 text-xs h-8 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer"
              title="Start service container"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{actionLoading === "start" ? "Starting..." : "Start"}</span>
            </Button>
          )}

          <Button
            variant="brand"
            size="sm"
            onClick={handleDeploy}
            disabled={isDeploying || actionLoading !== null}
            className="gap-1.5 text-xs h-8 cursor-pointer"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isDeploying && "animate-spin")} />
            <span>Redeploy</span>
          </Button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === "overview" && <TabOverview />}
      {activeTab === "deployments" && <TabDeployments />}
      {activeTab === "logs" && <TabDockerLogs />}
      {activeTab === "env" && <TabEnvironment />}
      {activeTab === "settings" && <TabDomainsSettings />}
    </div>
  );
}

export function AppConsoleTabs({
  app,
  activeDeployment,
  dockerOnline = false,
}: {
  app: any;
  activeDeployment?: any;
  dockerOnline?: boolean;
}) {
  return (
    <AppConsoleProvider
      app={app}
      activeDeployment={activeDeployment}
      dockerOnline={dockerOnline}
    >
      <AppConsoleContent />
    </AppConsoleProvider>
  );
}
