"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { useAppConsole } from "./AppConsoleContext";

export function TabEnvironment() {
  const { app } = useAppConsole();
  const appId = app.id;

  const [envs, setEnvs] = useState<Array<{ id: string; key: string; value: string }>>([]);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const loadEnvs = async () => {
    try {
      const res = await fetch(`/api/apps/${appId}/env`);
      const data = await res.json();
      if (data.success) {
        setEnvs(data.variables);
      }
    } catch { }
    setLoading(false);
  };

  useEffect(() => {
    loadEnvs();
  }, [appId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    await fetch(`/api/apps/${appId}/env`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variables: [{ key: newKey.trim(), value: newVal }],
      }),
    });

    setNewKey("");
    setNewVal("");
    loadEnvs();
  };

  const handleDelete = async (key: string) => {
    await fetch(`/api/apps/${appId}/env`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    loadEnvs();
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Environment Variables</h3>
        <p className="text-xs text-muted-foreground mt-1">
          All secrets are encrypted at rest using AES-256-GCM. Decrypted only inside container memory.
        </p>
      </div>

      {/* Add New Var Form */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="KEY (e.g. DATABASE_URL)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <input
          type="text"
          placeholder="VALUE"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
        >
          Add Variable
        </button>
      </form>

      {/* Env Vars Table */}
      <div className="divide-y divide-border rounded-lg border border-border overflow-hidden bg-card">
        {envs.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No environment variables configured.
          </div>
        ) : (
          envs.map((env) => {
            const isRevealed = !!showValues[env.id];
            return (
              <div
                key={env.id}
                className="p-3 flex items-center justify-between text-xs font-mono hover:bg-accent/40"
              >
                <div className="w-1/3 font-semibold text-foreground truncate">{env.key}</div>
                <div className="flex-1 text-muted-foreground truncate px-4">
                  {isRevealed ? env.value : "••••••••••••••••••••"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setShowValues((prev) => ({ ...prev, [env.id]: !prev[env.id] }))
                    }
                    className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title={isRevealed ? "Hide secret" : "Reveal secret"}
                  >
                    {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <CopyButton text={env.value} label="Copy" />
                  <button
                    onClick={() => handleDelete(env.key)}
                    className="p-1 text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                    title="Delete variable"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
