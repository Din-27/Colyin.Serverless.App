"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Database,
  Plus,
  X,
  Loader2,
  Layers,
  Network,
  HardDrive,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ADDON_TYPES = [
  {
    type: "POSTGRESQL",
    name: "PostgreSQL 16",
    desc: "ACID-compliant relational database",
    defaultPort: 5432,
    badgeColor: "text-blue-500",
  },
  {
    type: "REDIS",
    name: "Redis 7",
    desc: "In-memory key-value cache & message broker",
    defaultPort: 6379,
    badgeColor: "text-rose-500",
  },
  {
    type: "MYSQL",
    name: "MySQL 8",
    desc: "Popular relational database system",
    defaultPort: 3306,
    badgeColor: "text-amber-500",
  },
  {
    type: "RABBITMQ",
    name: "RabbitMQ",
    desc: "AMQP message broker with management UI",
    defaultPort: 5672,
    badgeColor: "text-orange-500",
  },
  {
    type: "MINIO",
    name: "MinIO S3",
    desc: "High-performance S3 compatible object storage",
    defaultPort: 9000,
    badgeColor: "text-emerald-500",
  },
];

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
      <Button
        variant="outline"
        onClick={() => handleOpen("POSTGRESQL", "")}
        className="gap-2 shadow-xs cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Add Database</span>
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-xl bg-card border border-border p-6 shadow-xl relative animate-zoom-in">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Provision Database Addon
                </h3>
                <p className="text-xs text-muted-foreground">
                  Deploy an isolated database service attached to this project mesh.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Service Selection Grid */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">
                  Select Engine Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ADDON_TYPES.map((item) => {
                    const isSelected = type === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => {
                          setType(item.type);
                          if (!name || ADDON_TYPES.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
                            setName(`${item.type.toLowerCase()}-db`);
                          }
                        }}
                        className={cn(
                          "flex items-start gap-2.5 p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer",
                          isSelected
                            ? "border-primary bg-secondary/80 ring-1 ring-primary/20"
                            : "border-border hover:border-muted-foreground/30 hover:bg-secondary/40"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground">
                              {item.name}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instance Name Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-foreground">
                  Instance Name / Hostname
                </label>
                <Input
                  required
                  placeholder="e.g. users-postgres, session-redis"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-[11px] text-muted-foreground">
                  Will be accessible by other containers in this project as <code className="font-mono text-foreground font-medium">{name || "instance-name"}</code>.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-border/60">
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
                  <span>{loading ? "Provisioning..." : "Provision Addon"}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
