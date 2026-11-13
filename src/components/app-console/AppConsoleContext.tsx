"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function getClientAccessUrl(host?: string | null): string {
  if (!host) return "";
  const rawWithoutProto = host.replace(/^https?:\/\//i, "");
  const cleanHost = rawWithoutProto.replace(/:\d+.*$/, "").replace(/\/.*$/, "").trim();
  if (!cleanHost) return "";

  if (cleanHost === "localhost" || cleanHost === "127.0.0.1") {
    return `http://${cleanHost}`;
  }
  return `https://${cleanHost}`;
}

export type TabKey = "overview" | "deployments" | "logs" | "env" | "settings";

interface AppConsoleContextType {
  app: any;
  activeDeployment?: any;
  dockerOnline: boolean;
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  isDeploying: boolean;
  currentDeploymentId: string | null;
  setCurrentDeploymentId: (id: string | null) => void;
  router: any;

  // Log Mode state
  logMode: "runtime" | "build";
  setLogMode: (mode: "runtime" | "build") => void;
  runtimeLogs: Array<{ text: string; stream: "stdout" | "stderr"; timestamp?: number }>;
  setRuntimeLogs: React.Dispatch<React.SetStateAction<Array<{ text: string; stream: "stdout" | "stderr"; timestamp?: number }>>>;
  logs: string[];
  setLogs: React.Dispatch<React.SetStateAction<string[]>>;
  logFilter: string;
  setLogFilter: (f: string) => void;
  autoScroll: boolean;
  setAutoScroll: (a: boolean) => void;
  isStreamingPaused: boolean;
  setIsStreamingPaused: (p: boolean) => void;
  isJustDeployed: boolean;
  setIsJustDeployed: (j: boolean) => void;
  logContainerRef: React.RefObject<HTMLDivElement | null>;

  // Power actions
  actionLoading: "restart" | "start" | "stop" | null;
  actionFeedback: { text: string; type: "success" | "error" } | null;
  setActionFeedback: (fb: { text: string; type: "success" | "error" } | null) => void;
  currentAppStatus: string;
  setCurrentAppStatus: (s: string) => void;
  handleAction: (action: "restart" | "start" | "stop") => Promise<void>;
  handleDeploy: () => Promise<void>;

  // URLs & Domains
  primaryDomain: any;
  accessUrl: string;
  localDirectUrl: string;
  isLocalhost: boolean;
  isHttps: boolean;
  showDomainHelp: boolean;
  setShowDomainHelp: (s: boolean) => void;
}

const AppConsoleContext = createContext<AppConsoleContextType | null>(null);

export function useAppConsole() {
  const context = useContext(AppConsoleContext);
  if (!context) {
    throw new Error("useAppConsole must be used within an AppConsoleProvider");
  }
  return context;
}

export function AppConsoleProvider({
  app,
  activeDeployment,
  dockerOnline = false,
  children,
}: {
  app: any;
  activeDeployment?: any;
  dockerOnline?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentDeploymentId, setCurrentDeploymentId] = useState<string | null>(
    activeDeployment?.id || null
  );

  const [logMode, setLogMode] = useState<"runtime" | "build">("runtime");
  const [runtimeLogs, setRuntimeLogs] = useState<
    Array<{ text: string; stream: "stdout" | "stderr"; timestamp?: number }>
  >([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [logFilter, setLogFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [isStreamingPaused, setIsStreamingPaused] = useState(false);
  const [isJustDeployed, setIsJustDeployed] = useState(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const [actionLoading, setActionLoading] = useState<"restart" | "start" | "stop" | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [currentAppStatus, setCurrentAppStatus] = useState<string>(activeDeployment?.status || "STOPPED");

  const primaryDomain = app.domains?.find((d: any) => d.isPrimary) || app.domains?.[0];
  const accessUrl = primaryDomain
    ? getClientAccessUrl(primaryDomain.host)
    : `http://localhost:${app.internalPort}`;
  const localDirectUrl = `http://localhost:${app.internalPort}`;
  const isLocalhost = !primaryDomain;
  const isHttps = accessUrl.startsWith("https://");
  const [showDomainHelp, setShowDomainHelp] = useState(false);

  const handleAction = async (action: "restart" | "start" | "stop") => {
    setActionLoading(action);
    setActionFeedback(null);
    try {
      const res = await fetch(`/api/apps/${app.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        const nextStatus = data.status || (action === "stop" ? "STOPPED" : "ACTIVE");
        setCurrentAppStatus(nextStatus);
        setActionFeedback({
          text: `Service '${app.name}' successfully ${action === "restart" ? "restarted" : action + "ed"}!`,
          type: "success",
        });

        const timeStr = new Date().toLocaleTimeString();
        setRuntimeLogs((prev) => [
          ...prev,
          {
            text: `[SYSTEM ${timeStr}] Action '${action.toUpperCase()}' dispatched by user. Container status: ${nextStatus}`,
            stream: "stdout",
            timestamp: Date.now(),
          },
        ]);
        router.refresh();
      } else {
        setActionFeedback({
          text: data.error || `Failed to ${action} service.`,
          type: "error",
        });
      }
    } catch (err: any) {
      setActionFeedback({
        text: err?.message || `Failed to ${action} service.`,
        type: "error",
      });
    } finally {
      setActionLoading(null);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
    setIsJustDeployed(false);
    try {
      const res = await fetch(`/api/apps/${app.id}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: app.branch }),
      });
      const data = await res.json();
      if (data.success && data.deploymentId) {
        setLogs(["[Deployment Initialized] Connecting to live build pipeline..."]);
        setCurrentDeploymentId(data.deploymentId);
        setLogMode("build");
        setActiveTab("logs");
        router.refresh();
      }
    } catch (err) {
      console.error("Deploy failed:", err);
    } finally {
      setIsDeploying(false);
    }
  };

  // Runtime Logs Streaming (SSE)
  useEffect(() => {
    if (activeTab !== "logs" || logMode !== "runtime") return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/apps/${app.id}/logs?tail=200`);

      eventSource.addEventListener("init", (e: any) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.status) setCurrentAppStatus(payload.status);
        } catch { }
      });

      eventSource.addEventListener("log", (e: any) => {
        if (isStreamingPaused) return;
        try {
          const payload = JSON.parse(e.data);
          setRuntimeLogs((prev) => {
            const next = [...prev, payload];
            if (next.length > 1000) return next.slice(-1000);
            return next;
          });
        } catch { }
      });

      eventSource.addEventListener("complete", () => {
        // Stream completed
      });

      eventSource.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch (err) {
      console.error("Runtime log connection error:", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [activeTab, logMode, app.id, isStreamingPaused]);

  // Build Logs Streaming (SSE)
  useEffect(() => {
    const targetDeployId = currentDeploymentId || activeDeployment?.id;
    if (activeTab !== "logs" || logMode !== "build" || !targetDeployId) return;

    setLogs([]);
    const eventSource = new EventSource(`/api/deployments/${targetDeployId}/logs`);

    eventSource.addEventListener("log", (e) => {
      try {
        const payload = JSON.parse(e.data);
        setLogs((prev) => [...prev, payload.chunk]);
      } catch { }
    });

    eventSource.addEventListener("complete", (e: any) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload?.status === "ACTIVE") {
          setIsJustDeployed(true);
          setCurrentAppStatus("ACTIVE");
        }
      } catch { }
      router.refresh();
      eventSource.close();
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [activeTab, logMode, currentDeploymentId, activeDeployment?.id, router]);

  // Auto scroll terminal to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, runtimeLogs, autoScroll, logMode]);

  return (
    <AppConsoleContext.Provider
      value={{
        app,
        activeDeployment,
        dockerOnline,
        activeTab,
        setActiveTab,
        isDeploying,
        currentDeploymentId,
        setCurrentDeploymentId,
        router,
        logMode,
        setLogMode,
        runtimeLogs,
        setRuntimeLogs,
        logs,
        setLogs,
        logFilter,
        setLogFilter,
        autoScroll,
        setAutoScroll,
        isStreamingPaused,
        setIsStreamingPaused,
        isJustDeployed,
        setIsJustDeployed,
        logContainerRef,
        actionLoading,
        actionFeedback,
        setActionFeedback,
        currentAppStatus,
        setCurrentAppStatus,
        handleAction,
        handleDeploy,
        primaryDomain,
        accessUrl,
        localDirectUrl,
        isLocalhost,
        isHttps,
        showDomainHelp,
        setShowDomainHelp,
      }}
    >
      {children}
    </AppConsoleContext.Provider>
  );
}
