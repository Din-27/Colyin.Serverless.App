"use client";

import React, { useState } from "react";
import { Terminal, Loader2 } from "lucide-react";
import { useAddonStudio } from "./AddonStudioContext";

export function WebSqlStudio() {
  const { addonId, data } = useAddonStudio();
  const [query, setQuery] = useState("SELECT * FROM _minipaas_meta;");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (data?.type !== "POSTGRESQL") return null;

  const handleRunQuery = async (customSql?: string) => {
    const sqlToRun = customSql || query;
    if (!sqlToRun.trim()) return;

    setRunning(true);
    setError(null);

    try {
      const res = await fetch(`/api/addons/${addonId}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: sqlToRun }),
      });
      const resData = await res.json();
      if (resData.success) {
        setResult(resData);
      } else {
        setError(resData.error || "Query execution failed");
        setResult(null);
      }
    } catch (err: any) {
      setError(err.message || "Failed to execute query");
      setResult(null);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-500" />
              Web SQL Studio (PostgreSQL)
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              Zero Driver Required
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Query and manage your database directly inside your browser without installing DBeaver or JDBC drivers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleRunQuery()}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Execute Query</span>
          </button>
        </div>
      </div>

      {/* Snippet Shortcuts */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground text-[11px]">Quick Queries:</span>
        <button
          type="button"
          onClick={() => {
            const sql = "SELECT * FROM _minipaas_meta;";
            setQuery(sql);
            handleRunQuery(sql);
          }}
          className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground font-mono text-[11px] transition cursor-pointer"
        >
          _minipaas_meta
        </button>
        <button
          type="button"
          onClick={() => {
            const sql = "SELECT table_name FROM information_schema.tables WHERE table_schema='public';";
            setQuery(sql);
            handleRunQuery(sql);
          }}
          className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground font-mono text-[11px] transition cursor-pointer"
        >
          List Tables
        </button>
        <button
          type="button"
          onClick={() => {
            const sql = "SELECT NOW() as current_time, version();";
            setQuery(sql);
            handleRunQuery(sql);
          }}
          className="px-2 py-1 rounded bg-secondary hover:bg-secondary/80 border border-border text-foreground font-mono text-[11px] transition cursor-pointer"
        >
          Check Version
        </button>
      </div>

      {/* SQL Editor Area */}
      <div>
        <textarea
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Write your SQL statement here (e.g. SELECT * FROM users;)"
          className="w-full px-3 py-2.5 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring leading-relaxed resize-y"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              handleRunQuery();
            }
          }}
        />
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+Enter</kbd> to run</span>
          {result && (
            <span className="text-muted-foreground font-mono">
              Executed in {result.executionTimeMs}ms &bull; {result.rowCount} row(s)
            </span>
          )}
        </div>
      </div>

      {/* Query Error Notice */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-mono">
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* Tabular Query Results */}
      {result && result.rows && (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          {result.rows.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Query completed successfully with 0 rows returned.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-muted border-b border-border text-muted-foreground text-[11px] uppercase tracking-wider sticky top-0">
                  <tr>
                    {result.fields.map((f: string, i: number) => (
                      <th key={i} className="px-4 py-2 font-medium">
                        {f}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {result.rows.map((row: any, rIdx: number) => (
                    <tr key={rIdx} className="hover:bg-accent/40 transition">
                      {result.fields.map((f: string, cIdx: number) => {
                        const val = row[f];
                        const displayVal =
                          val === null || val === undefined
                            ? "NULL"
                            : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val);

                        return (
                          <td
                            key={cIdx}
                            className={`px-4 py-2 truncate max-w-[320px] ${
                              val === null ? "text-muted-foreground italic" : ""
                            }`}
                            title={displayVal}
                          >
                            {displayVal}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
