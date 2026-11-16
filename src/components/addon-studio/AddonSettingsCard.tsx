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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
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
      setShowDeleteModal(false);
      if (data.projectId) {
        router.push(`/projects/${data.projectId}`);
      } else {
        router.push("/");
      }
    } else {
      setFeedback({ type: "error", message: res.error || "Failed to delete addon." });
      setDeleting(false);
      setShowDeleteModal(false);
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

      {/* 1. General Configuration Card */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings className="w-4 h-4 text-emerald-500" />
              General Configuration
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize the name, external port, and authentication credentials of this addon.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveGeneral} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Addon Name */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Addon Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g. Production PostgreSQL"
              />
            </div>

            {/* Custom Public Port */}
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center justify-between">
                <span>Public Port</span>
                <span className="text-[10px] text-muted-foreground">Range: 1024 - 65535</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1024"
                  max="65535"
                  value={publicPort}
                  onChange={(e) => setPublicPort(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Kosongkan jika ingin Private Only"
                />
                <Globe className="w-3.5 h-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Port host eksternal untuk koneksi laptop/DBeaver. Kosongkan untuk private-only.
              </p>
            </div>
          </div>

          {/* Change Password */}
          <div className="pt-2 border-t border-border">
            <label className="block text-xs font-medium text-foreground mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                Change Password (Optional)
              </span>
              <button
                type="button"
                onClick={generateRandomPassword}
                className="text-[10px] text-indigo-500 hover:text-indigo-400 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Dices className="w-3 h-3" />
                Generate Secure Password
              </button>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Biarkan kosong jika tidak ingin mengubah password"
                className="w-full pr-10 pl-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Catatan: Mengubah password akan me-redeploy container dengan kredensial baru.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>

      {/* 2. Service Controls Card */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-500" />
              Instance Controls
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage the runtime state of this database instance.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-muted/30 border border-border">
          <div>
            <div className="text-xs font-semibold text-foreground">Restart Database Service</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Restarts the Docker container. Volume and stored data will remain intact.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRestart}
            disabled={restarting}
            className="px-3.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 border border-border text-foreground text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${restarting ? "animate-spin" : ""}`} />
            <span>{restarting ? "Restarting..." : "Restart Instance"}</span>
          </button>
        </div>
      </div>

      {/* 3. Danger Zone Card */}
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-4">
          <div>
            <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Danger Zone
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete this database addon and its persistent volume.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-background/60 border border-rose-500/20">
          <div>
            <div className="text-xs font-semibold text-foreground">Delete Database Addon</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Once deleted, all data in volume <code className="font-mono text-foreground font-semibold">{data.volumeName}</code> will be purged and cannot be recovered.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmText("");
              setShowDeleteModal(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Addon</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Hapus Addon Database?</h4>
                <p className="text-xs text-muted-foreground">Tindakan ini permanen dan tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Anda akan menghapus database <strong className="text-foreground">{data.name}</strong> ({data.type}).
              Seluruh container, credentials, dan data volume akan dihapus permanen dari server.
            </p>

            <div className="space-y-2 pt-1">
              <label className="block text-[11px] text-muted-foreground">
                Ketik nama addon <span className="font-mono font-bold text-foreground">&quot;{data.name}&quot;</span> untuk konfirmasi:
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={data.name}
                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-rose-500"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-3.5 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText.trim() !== data.name}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{deleting ? "Menghapus..." : "Konfirmasi Hapus"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

