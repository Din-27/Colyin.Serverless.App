"use client";

import { useState } from "react";
import { Trash2, Loader2, CheckCircle2, AlertCircle, Terminal, HardDrive, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DockerPruneButtonProps {
  onSuccess?: () => void;
  variant?: "primary" | "secondary" | "danger" | "compact";
  className?: string;
}

export function DockerPruneButton({
  onSuccess,
  variant = "primary",
  className = "",
}: DockerPruneButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    reclaimedSpace?: string;
    builderPruneOutput?: string;
    systemPruneOutput?: string;
    error?: string;
  } | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const handlePrune = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/system/prune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setResult({
          success: false,
          error: data.error || "Failed to execute Docker prune.",
        });
      } else {
        setResult({
          success: true,
          message: data.message,
          reclaimedSpace: data.result?.reclaimedSpace,
          builderPruneOutput: data.result?.builderPruneOutput,
          systemPruneOutput: data.result?.systemPruneOutput,
        });
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || "Network error occurred while pruning Docker.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {variant === "compact" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer select-none ${className}`}
          title="Clean Docker build cache and unused system resources"
        >
          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
          <span>Prune Docker</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 text-xs font-bold shadow-md transition cursor-pointer select-none ${className}`}
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Clean Docker System &amp; Build Cache</span>
        </button>
      )}

      {/* Confirmation & Execution Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                <HardDrive className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">
                  Clean Docker System &amp; Build Cache
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Reclaim valuable VPS disk space by clearing accumulated BuildKit cache and unused Docker artifacts.
                </p>
              </div>
            </div>

            {/* Explanatory command list */}
            <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Terminal className="w-3.5 h-3.5 shrink-0" />
                <span>docker builder prune -af</span>
              </div>
              <div className="flex items-center gap-2 text-sky-600 dark:text-cyan-400">
                <Terminal className="w-3.5 h-3.5 shrink-0" />
                <span>docker system prune -af</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-sans pt-1">
                &bull; Deletes dangling images, stopped builder containers, and build cache layers.
                <br />
                &bull; Active running containers and persistent database volumes (SQLite/PostgreSQL) are safely preserved.
              </p>
            </div>

            {/* Execution Result Feedback */}
            {result && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  result.success
                    ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300"
                    : "bg-rose-950/40 border-rose-800/80 text-rose-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold">
                  {result.success ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>{result.reclaimedSpace || "Docker Cleanup Finished Successfully!"}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span>{result.error || "Cleanup failed"}</span>
                    </>
                  )}
                </div>

                {result.success && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowLogs(!showLogs)}
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white underline font-sans cursor-pointer mt-1"
                    >
                      <span>{showLogs ? "Hide execution output" : "View execution output"}</span>
                      {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {showLogs && (
                      <pre className="mt-2 p-3 rounded-lg bg-black/80 border border-zinc-800 text-[10px] font-mono text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {result.builderPruneOutput && (
                          <>
                            <span className="text-emerald-400 font-bold"># docker builder prune -af</span>
                            {"\n"}
                            {result.builderPruneOutput}
                            {"\n\n"}
                          </>
                        )}
                        {result.systemPruneOutput && (
                          <>
                            <span className="text-cyan-400 font-bold"># docker system prune -af</span>
                            {"\n"}
                            {result.systemPruneOutput}
                          </>
                        )}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setResult(null);
                }}
                disabled={loading}
                className="px-4 py-2 rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground text-foreground text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {result?.success ? "Done" : "Cancel"}
              </button>

              {!result?.success && (
                <button
                  type="button"
                  onClick={handlePrune}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Pruning Docker...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Run Prune Now</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

