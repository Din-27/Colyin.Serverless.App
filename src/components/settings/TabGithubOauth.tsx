"use client";

import React from "react";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { useSettings } from "./SettingsContext";

export function TabGithubOauth() {
  const {
    githubClientId,
    setGithubClientId,
    githubClientSecret,
    setGithubClientSecret,
    oauthSaved,
    handleSaveOauth,
  } = useSettings();

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-indigo-500" />
          GitHub OAuth App Credentials
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Configure OAuth credentials to enable zero-token 1-click GitHub authorization for your developers.
        </p>
      </div>

      {oauthSaved && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          GitHub OAuth settings updated!
        </div>
      )}

      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
        <span className="font-semibold text-foreground block">
          Authorization Callback URL to register on GitHub:
        </span>
        <div className="p-2.5 rounded bg-background border border-border flex items-center justify-between font-mono text-foreground">
          <span>http://localhost:3000/api/github/callback</span>
          <CopyButton text="http://localhost:3000/api/github/callback" label="Copy" />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Register this URL in your GitHub Developer Settings &gt; OAuth Apps.
        </p>
      </div>

      <form onSubmit={handleSaveOauth} className="space-y-4 text-xs">
        <div>
          <label className="block text-foreground font-semibold mb-1">
            GitHub Client ID
          </label>
          <input
            type="text"
            placeholder="Ov23li..."
            value={githubClientId}
            onChange={(e) => setGithubClientId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-foreground font-semibold mb-1">
            GitHub Client Secret
          </label>
          <input
            type="password"
            placeholder="••••••••••••••••••••••••"
            value={githubClientSecret}
            onChange={(e) => setGithubClientSecret(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Save OAuth Credentials
          </button>
        </div>
      </form>
    </div>
  );
}

