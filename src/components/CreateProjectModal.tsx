"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      <Button
        variant="brand"
        onClick={() => setOpen(true)}
        className="gap-2 shadow-xs cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>New Project</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md rounded-xl bg-card border border-border p-6 shadow-xl relative animate-zoom-in">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-secondary text-foreground">
                <FolderPlus className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Create Project
                </h3>
                <p className="text-xs text-muted-foreground">
                  An isolated environment with its own private Docker network.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Project Name
                </label>
                <Input
                  required
                  placeholder="e.g. Production Stacks, Acme Client"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Description <span className="text-muted-foreground">(Optional)</span>
                </label>
                <Input
                  placeholder="Briefly describe what this project contains..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="brand"
                  disabled={loading || !name.trim()}
                  className="gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? "Creating..." : "Create Project"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
