"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, Plus, X, Loader2, Layers, Network, HardDrive } from "lucide-react";

export function CreateAddonModal({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("POSTGRESQL");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleOpen = (addonType: string, defaultName: string) => {
    setType(addonType);
    setName(defaultName);
    setError("");
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/addons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, name, type }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setOpen(false);
      router.refresh();
      router.push(`/addons/${data.addon.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to provision addon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => handleOpen("POSTGRESQL", "")}
        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-sm font-medium border border-zinc-700 transition"
      >
        <Plus className="w-4 h-4" />
        Add Database / Service
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              One-Click Service Provisioning
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Deploy an isolated managed instance with persistent volume and internal DNS discovery.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              {/* Addon Type Selector */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-2">
                  Select Engine Type
                </label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {[
                    { id: "POSTGRESQL", label: "PostgreSQL", icon: Database },
                    { id: "REDIS", label: "Redis", icon: Layers },
                    { id: "RABBITMQ", label: "RabbitMQ", icon: Network },
                    { id: "MINIO", label: "MinIO S3", icon: HardDrive },
                  ].map((item) => {
                    const Icon = item.icon;
                    const selected = type === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setType(item.id);
                          setName(`${item.id.toLowerCase()}-instance`);
                        }}
                        className={`p-3 rounded-lg border text-left transition flex flex-col gap-1.5 ${
                          selected
                            ? "bg-indigo-950/50 border-indigo-500 text-white"
                            : "bg-zinc-800/40 border-zinc-700/60 text-zinc-400 hover:bg-zinc-800"
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${selected ? "text-indigo-400" : "text-zinc-500"}`} />
                        <span className="text-xs font-semibold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Instance Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. main-db, redis-cache, or rabbitmq-queue"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 space-y-1">
                <div>• Automatic persistent volume created</div>
                <div>• Secure password generated & encrypted with AES-256-GCM</div>
                <div>• Accessible by all apps in project network</div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Provision Instance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
