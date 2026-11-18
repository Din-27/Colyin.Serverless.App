"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  RefreshCw,
  Trash2,
  Save,
  KeyRound,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Dices,
  Globe,
} from "lucide-react";
import { useAddonStudio } from "./AddonStudioContext";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export function AddonSettingsCard() {
  const router = useRouter();
  const { data, handleUpdateSettings, handleRestartAddon, handleDeleteAddon } = useAddonStudio();

  const [name, setName] = useState(data?.name || "");
  const [publicPort, setPublicPort] = useState(data?.publicPort ? String(data.publicPort) : "");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  if (!data) return null;

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload: { name?: string; publicPort?: number | null; password?: string } = {};

    if (name.trim() && name.trim() !== data.name) {
      payload.name = name.trim();
    }

    if (publicPort.trim()) {
      const portNum = parseInt(publicPort.trim(), 10);
      if (!isNaN(portNum) && portNum !== data.publicPort) {
        payload.publicPort = portNum;
      }
    } else if (data.publicPort !== null) {
      payload.publicPort = null;
    }

    if (newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        setFeedback({ type: "error", message: "Password must be at least 6 characters long." });
        setSaving(false);
        return;
      }
      payload.password = newPassword.trim();
    }

    if (Object.keys(payload).length === 0) {
      setFeedback({ type: "error", message: "No changes detected to update." });
      setSaving(false);
      return;
    }

    const res = await handleUpdateSettings(payload);
    if (res.success) {
      setFeedback({ type: "success", message: "Addon configuration updated successfully!" });
      setNewPassword("");
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to update configuration." });
    }
    setSaving(false);
  };

  const handleRestart = async () => {
    setRestarting(true);
    setFeedback(null);
    const res = await handleRestartAddon();
    if (res.success) {
      setFeedback({ type: "success", message: "Addon container restarted successfully!" });
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to restart container." });
    }
    setRestarting(false);
  };

  const handleDelete = async () => {
    if (deleteConfirmText.trim() !== data.name) {
      return;
    }
    setDeleting(true);
    const res = await handleDeleteAddon();
    if (res.success) {
      setShowDeleteDialog(false);
      if (data.projectId) {
        router.push(`/projects/${data.projectId}`);
      } else {
        router.push("/");
      }
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to delete addon." });
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pwd = "";
    for (let i = 0; i < 16; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pwd);
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[11px] underline hover:opacity-80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. General Configuration Card (shadcn UI Card) */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-500" />
            General Configuration
          </CardTitle>
          <CardDescription className="text-xs">
            Customize the name, external port, and authentication credentials of this addon.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSaveGeneral}>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Addon Name */}
              <div className="space-y-1.5">
                <Label htmlFor="addon-name" className="text-xs">
                  Addon Display Name
                </Label>
                <Input
                  id="addon-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Production PostgreSQL"
                />
              </div>

              {/* Custom Public Port */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="addon-port" className="text-xs">
                    Public Port
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Range: 1024 - 65535</span>
                </div>
                <div className="relative">
                  <Input
                    id="addon-port"
                    type="number"
                    min="1024"
                    max="65535"
                    value={publicPort}
                    onChange={(e) => setPublicPort(e.target.value)}
                    className="pl-8 font-mono"
                    placeholder="Kosongkan jika ingin Private Only"
                  />
                  <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Port host eksternal untuk koneksi laptop/DBeaver. Kosongkan untuk private-only.
                </p>
              </div>
            </div>

            {/* Change Password */}
            <div className="pt-3 border-t border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="addon-password" className="text-xs flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  Change Password (Optional)
                </Label>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Dices className="w-3 h-3" />
                  Generate Secure Password
                </button>
              </div>
              <div className="relative">
                <Input
                  id="addon-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Biarkan kosong jika tidak ingin mengubah password"
                  className="pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Catatan: Mengubah password akan me-redeploy container dengan kredensial baru.
              </p>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end pt-2 border-t border-border">
            <Button type="submit" disabled={saving} size="sm" className="gap-2">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* 2. Service Controls Card (shadcn UI Card) */}
      <Card>
        <CardHeader className="border-b border-border pb-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            Instance Controls
          </CardTitle>
          <CardDescription className="text-xs">
            Manage the runtime state of this database instance.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border">
            <div>
              <div className="text-xs font-semibold text-foreground">Restart Database Service</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Restarts the Docker container. Volume and stored data will remain intact.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRestart}
              disabled={restarting}
              className="gap-1.5 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${restarting ? "animate-spin" : ""}`} />
              <span>{restarting ? "Restarting..." : "Restart Instance"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Danger Zone Card (shadcn UI Card with Rose Styling) */}
      <Card className="border-rose-500/30 bg-rose-500/5">
        <CardHeader className="border-b border-rose-500/20 pb-4">
          <CardTitle className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-xs">
            Permanently delete this database addon and its persistent volume.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background/60 border border-rose-500/20">
            <div>
              <div className="text-xs font-semibold text-foreground">Delete Database Addon</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Once deleted, all data in volume <code className="font-mono text-foreground font-semibold">{data.volumeName}</code> will be purged and cannot be recovered.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteConfirmText("");
                setShowDeleteDialog(true);
              }}
              className="gap-1.5 shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Addon</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal using shadcn UI Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader className="gap-2">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-sm font-bold text-foreground">Hapus Addon Database?</DialogTitle>
                <DialogDescription className="text-xs">Tindakan ini permanen dan tidak dapat dibatalkan.</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-muted-foreground">
            <p className="leading-relaxed">
              Anda akan menghapus database <strong className="text-foreground">{data.name}</strong> ({data.type}).
              Seluruh container, credentials, dan data volume akan dihapus permanen dari server.
            </p>

            <div className="space-y-2 pt-1">
              <Label htmlFor="confirm-delete-input" className="text-[11px] text-muted-foreground">
                Ketik nama addon <span className="font-mono font-bold text-foreground">&quot;{data.name}&quot;</span> untuk konfirmasi:
              </Label>
              <Input
                id="confirm-delete-input"
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={data.name}
                className="font-mono"
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm" disabled={deleting}>
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting || deleteConfirmText.trim() !== data.name}
              className="gap-1.5"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              <span>{deleting ? "Menghapus..." : "Konfirmasi Hapus"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
