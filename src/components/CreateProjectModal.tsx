"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";

export function CreateProjectModal() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setOpen(false);
      setName("");
      setDescription("");
      router.refresh();
      router.push(`/projects/${data.project.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-sm transition"
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-xl bg-zinc-900 border border-zinc-800 p-6 shadow-xl relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-semibold text-white">Create New Project</h3>
            <p className="text-xs text-zinc-400 mt-1">
              An isolated environment with its own private Docker network.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Production Store"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Brief summary of this project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500"
                />
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
