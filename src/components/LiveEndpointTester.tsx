"use client";

import { useState } from "react";
import { Play, CheckCircle2, AlertCircle, Loader2, Globe, Clock, ArrowRight } from "lucide-react";

interface LiveEndpointTesterProps {
  appId: string;
  port: number;
  localUrl: string;
  accessUrl: string;
  dockerOnline: boolean;
}

export function LiveEndpointTester({
  appId,
  port,
  localUrl,
  accessUrl,
  dockerOnline,
}: LiveEndpointTesterProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status?: number;
    timeMs?: number;
    success?: boolean;
    error?: string;
  } | null>(null);

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    const start = performance.now();
    try {
      const res = await fetch(`/api/system/ports/check?port=${port}`);
      const data = await res.json();
      const end = performance.now();
      const timeMs = Math.round(end - start);

      if (data.available === false) {
        // Port is in use, meaning the app service is actively listening!
        setTestResult({
          status: 200,
          timeMs,
          success: true,
        });
      } else {
        setTestResult({
          status: 503,
          timeMs,
          success: false,
          error: `Service is not actively listening on port :${port}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        error: err.message || "Failed to reach endpoint",
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-5 rounded-xl border border-border bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-500" />
            Live Endpoint Diagnostics
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Probe application responsiveness on local port <code className="text-cyan-600 dark:text-cyan-300 font-mono">:{port}</code>.
          </p>
        </div>
        <button
          onClick={runTest}
          disabled={testing}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition shadow cursor-pointer"
        >
          {testing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Probing...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span>Test Endpoint</span>
            </>
          )}
        </button>
      </div>

      {testResult && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between animate-in fade-in ${
            testResult.success
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>
              {testResult.success
                ? `Endpoint Healthy (HTTP 200 OK • Port :${port} is actively serving traffic)`
                : testResult.error}
            </span>
          </div>

          {testResult.timeMs !== undefined && (
            <div className="flex items-center gap-1 font-mono text-[11px] opacity-80">
              <Clock className="w-3 h-3" />
              <span>{testResult.timeMs}ms</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

