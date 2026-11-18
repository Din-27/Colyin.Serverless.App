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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
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

  const tabs: Array<{ id: TabKey; label: string; icon: any; description: string }> = [
    { id: "overview", label: "Overview", icon: Activity, description: "System telemetry, CPU & memory limits, and runtime access endpoints." },
    { id: "deployments", label: "Deployments", icon: GitCommit, description: "Rollout history, Git commit hashes, and automated build pipelines." },
    { id: "logs", label: "Docker Logs", icon: Terminal, description: "Live streaming container output, build events, and stderr diagnostics." },
    { id: "env", label: "Environment", icon: Key, description: "Encrypted environment variables and application secrets injected at runtime." },
    { id: "settings", label: "Network & Domains", icon: Settings, description: "Traefik ingress routes, SSL certificates, and cgroups resource limits." },
  ];

  return (
    <div className="space-y-6">
      {/* Top Application Access Banner */}
      <TopAccessBanner />

      {/* Action Feedback Banner with Theme Adaptive Colors */}
      {actionFeedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in shadow-2xs ${
            actionFeedback.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
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

      {/* Tab Navigation & Action Controls with shadcn UI Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as TabKey)} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/80 gap-3 pb-3">
          <TabsList className="bg-muted/60 p-1 rounded-xl border border-border h-auto gap-1 overflow-x-auto max-w-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <HoverCard key={tab.id} openDelay={250}>
                  <HoverCardTrigger asChild>
                    <TabsTrigger
                      value={tab.id}
                      className="gap-2 py-1.5 px-3 text-xs"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </TabsTrigger>
                  </HoverCardTrigger>
                  <HoverCardContent side="top" className="w-60 text-xs space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span>{tab.label}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-relaxed">
                      {tab.description}
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            })}
          </TabsList>

          {/* Action Controls Group: Restart, Stop/Start, Redeploy with Info Hover Cards */}
          <div className="flex items-center gap-2 pb-1 sm:pb-0 shrink-0">
            {currentAppStatus === "ACTIVE" ? (
              <>
                <HoverCard>
                  <HoverCardTrigger>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction("restart")}
                      disabled={actionLoading !== null}
                      className="gap-1.5 text-xs h-8 cursor-pointer shadow-xs"
                    >
                      <RotateCcw className={cn("w-3.5 h-3.5", actionLoading === "restart" && "animate-spin")} />
                      <span>{actionLoading === "restart" ? "Restarting..." : "Restart"}</span>
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="top" className="w-56 text-xs space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-primary" />
                      <span>Restart Container</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Restarts the container service cleanly without removing stored data.
                    </div>
                  </HoverCardContent>
                </HoverCard>

                <HoverCard>
                  <HoverCardTrigger>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleAction("stop")}
                      disabled={actionLoading !== null}
                      className="gap-1.5 text-xs h-8 cursor-pointer shadow-xs"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>{actionLoading === "stop" ? "Stopping..." : "Stop"}</span>
                    </Button>
                  </HoverCardTrigger>
                  <HoverCardContent side="top" className="w-56 text-xs space-y-1">
                    <div className="font-semibold text-destructive flex items-center gap-1.5">
                      <Square className="w-3.5 h-3.5" />
                      <span>Stop Container</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Stops the container process and releases allocated CPU &amp; RAM quotas.
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </>
            ) : (
              <HoverCard>
                <HoverCardTrigger>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction("start")}
                    disabled={actionLoading !== null}
                    className="gap-1.5 text-xs h-8 border-border bg-card hover:bg-accent text-foreground cursor-pointer shadow-xs"
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{actionLoading === "start" ? "Starting..." : "Start"}</span>
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent side="top" className="w-56 text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Start Container</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Boots up the existing application container image.
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}

            <HoverCard>
              <HoverCardTrigger>
                <Button
                  variant="brand"
                  size="sm"
                  onClick={handleDeploy}
                  disabled={isDeploying || actionLoading !== null}
                  className="gap-1.5 text-xs h-8 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isDeploying && "animate-spin")} />
                  <span>Redeploy</span>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent side="top" align="end" className="w-64 text-xs space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 text-primary" />
                  <span>Trigger Redeployment</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Pulls the newest commit, builds image using Nixpacks or Dockerfile, and swaps container seamlessly.
                </div>
              </HoverCardContent>
            </HoverCard>
          </div>
        </div>

        {/* Tab Panels */}
        <TabsContent value="overview">
          <TabOverview />
        </TabsContent>
        <TabsContent value="deployments">
          <TabDeployments />
        </TabsContent>
        <TabsContent value="logs">
          <TabDockerLogs />
        </TabsContent>
        <TabsContent value="env">
          <TabEnvironment />
        </TabsContent>
        <TabsContent value="settings">
          <TabDomainsSettings />
        </TabsContent>
      </Tabs>
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
