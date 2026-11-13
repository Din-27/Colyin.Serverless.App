"use client";

import { useState } from "react";
import {
  Trash2,
  Loader2,
  HardDrive,
  Terminal,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DockerPruneResult {
  success: boolean;
  reclaimedSpace?: string;
  builderPruneOutput?: string;
  systemPruneOutput?: string;
  error?: string;
}

export function DockerPruneButton({
  variant = "default",
  className = "",
  onSuccess,
}: {
  variant?: "default" | "compact";
  className?: string;
  onSuccess?: () => void | Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DockerPruneResult | null>(null);
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
      setResult(data);
      if (data.success && onSuccess) {
        onSuccess();
      }
    } catch {
      setResult({
        success: false,
        error: "Network error occurred while calling prune API",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setResult(null);
          setShowLogs(false);
        }
      }}
    >
      <DialogTrigger asChild>
        {variant === "compact" ? (
          <Button
            variant="outline"
            size="sm"
            className={`gap-1.5 shadow-xs cursor-pointer ${className}`}
            title="Clean Docker build cache and unused system resources"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Prune Docker</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            className={`gap-2 shadow-sm font-bold cursor-pointer ${className}`}
          >
            <Trash2 className="w-4 h-4 text-rose-500" />
            <span>Clean Docker System &amp; Build Cache</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Clean Docker System &amp; Build Cache</DialogTitle>
              <DialogDescription className="mt-1">
                Reclaim valuable VPS disk space by clearing accumulated BuildKit cache and unused Docker artifacts.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : "bg-destructive/10 border-destructive/20 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {result.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{result.reclaimedSpace || "Docker Cleanup Finished Successfully!"}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>{result.error || "Cleanup failed"}</span>
                </>
              )}
            </div>

            {result.success && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowLogs(!showLogs)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground underline font-sans cursor-pointer mt-1"
                >
                  <span>{showLogs ? "Hide execution output" : "View execution output"}</span>
                  {showLogs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showLogs && (
                  <pre className="mt-2 p-3 rounded-lg bg-black/80 border border-border text-[10px] font-mono text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
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

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setResult(null);
            }}
            disabled={loading}
          >
            {result?.success ? "Done" : "Cancel"}
          </Button>

          {!result?.success && (
            <Button
              type="button"
              variant="destructive"
              onClick={handlePrune}
              disabled={loading}
              className="gap-2"
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
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
