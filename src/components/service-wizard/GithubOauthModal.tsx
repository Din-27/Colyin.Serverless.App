"use client";

import React from "react";
import { useServiceWizard } from "./ServiceWizardContext";
import { copyToClipboard } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";

export function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function GithubOauthModal() {
  const {
    showOauthModal,
    setShowOauthModal,
    copiedCallback,
    setCopiedCallback,
    oauthClientId,
    setOauthClientId,
    oauthClientSecret,
    setOauthClientSecret,
    savingOauth,
    handleSaveAndLoginOauth,
  } = useServiceWizard();

  return (
    <Dialog open={showOauthModal} onOpenChange={setShowOauthModal}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <GithubIcon className="w-5 h-5 text-indigo-500" />
            <DialogTitle>Setup GitHub OAuth (1-Click Login)</DialogTitle>
          </div>
          <DialogDescription>
            Agar tombol <strong>Login ke GitHub</strong> dapat bekerja di server Anda, daftarkan OAuth App gratis di GitHub (hanya 1 menit, berlaku untuk seluruh server).
          </DialogDescription>
        </DialogHeader>

        <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[11px] font-medium">Authorization callback URL:</span>
            <button
              type="button"
              onClick={async () => {
                const cbUrl = `${window.location.origin}/api/github/callback`;
                await copyToClipboard(cbUrl);
                setCopiedCallback(true);
                setTimeout(() => setCopiedCallback(false), 2000);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-mono text-[11px] transition cursor-pointer"
            >
              {copiedCallback ? (
                <>
                  <Check className="w-3 h-3 text-emerald-500" />
                  <span className="text-emerald-500">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 opacity-60" />
                  <span>Salin URL</span>
                </>
              )}
            </button>
          </div>
          <div className="p-2.5 rounded bg-background border border-border font-mono text-foreground text-[11px] break-all select-all">
            {typeof window !== "undefined" ? `${window.location.origin}/api/github/callback` : "/api/github/callback"}
          </div>

          <a
            href={`https://github.com/settings/applications/new?oauth_application[name]=Colyin+PaaS&oauth_application[url]=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}&oauth_application[callback_url]=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/api/github/callback` : "")}`}
            target="_blank"
            rel="noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Form Buat OAuth App di GitHub</span>
          </a>
        </div>

        <form onSubmit={handleSaveAndLoginOauth} className="space-y-4 text-xs">
          <div className="space-y-1">
            <Label htmlFor="oauth-client-id">Client ID</Label>
            <Input
              id="oauth-client-id"
              type="text"
              required
              placeholder="e.g. Ov23li..."
              value={oauthClientId}
              onChange={(e) => setOauthClientId(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="oauth-client-secret">Client Secret</Label>
            <Input
              id="oauth-client-secret"
              type="password"
              required
              placeholder="••••••••••••••••••••••••"
              value={oauthClientSecret}
              onChange={(e) => setOauthClientSecret(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowOauthModal(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="brand"
              disabled={savingOauth}
              className="gap-2"
            >
              {savingOauth ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GithubIcon className="w-4 h-4" />
              )}
              <span>Simpan &amp; Login ke GitHub</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
