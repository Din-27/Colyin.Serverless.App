"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
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

export function DeleteAppButton({
  appId,
  appName,
  projectId,
}: {
  appId: string;
  appName: string;
  projectId: string;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setOpen(false);
        router.push(`/projects/${projectId}`);
        router.refresh();
      } else {
        setError(data.error || "Failed to delete application");
      }
    } catch {
      setError("Network error while trying to delete application");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-xs gap-1.5 cursor-pointer"
          title="Delete this application service"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Service</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md border-destructive/30">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle>Delete Application</DialogTitle>
              <DialogDescription className="mt-1">
                This action is permanent and cannot be undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <p className="text-xs text-muted-foreground leading-relaxed pt-1">
          Are you sure you want to permanently delete{" "}
          <strong className="text-foreground">{appName}</strong>? Its container will be stopped and removed, build cache cleared, and ingress routes detached.
        </p>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="gap-2"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{loading ? "Deleting..." : "Delete Service"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
