"use client";

import React from "react";
import { useServiceWizard } from "./ServiceWizardContext";
import {
  Globe,
  ShieldCheck,
  Lock,
  ArrowLeft,
  Server,
  Loader2,
} from "lucide-react";

export function WizardStep3Deploy() {
  const {
    name,
    autoSlugSuffix,
    wildcardDomain,
    domain,
    setDomain,
    domainMode,
    setDomainMode,
    envText,
    setEnvText,
    loading,
    setStep,
    handleFinishDeploy,
  } = useServiceWizard();

  const generatedAutoSlug = (name ? name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "app");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground">Environment Variables &amp; Launch</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Add custom environment variables (.env format). All values are encrypted at rest using AES-256-GCM.
        </p>
      </div>

      {/* Domain & Automatic HTTPS Provisioning */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-bold text-foreground">Domain &amp; Automatic HTTPS</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                SSL Active
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Every deployment automatically receives a production HTTPS domain managed by Traefik.
            </p>
          </div>

          {/* Mode Toggle Buttons */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted border border-border self-start sm:self-auto text-xs">
            <button
              type="button"
              onClick={() => setDomainMode("auto")}
              className={`px-3 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                domainMode === "auto"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Automatic (Vercel Style)
            </button>
            <button
              type="button"
              onClick={() => setDomainMode("custom")}
              className={`px-3 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                domainMode === "custom"
                  ? "bg-indigo-600 text-white shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Custom Domain
            </button>
          </div>
        </div>

        {domainMode === "auto" ? (
          <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-500" />
                Assigned Public HTTPS Domain:
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Wildcard: *.{wildcardDomain}
              </span>
            </div>
            <div className="p-2.5 rounded-md bg-background border border-emerald-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span className="truncate">
                  https://{generatedAutoSlug}-{autoSlugSuffix}.{wildcardDomain}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted border border-border font-sans font-medium">
                Auto-Provisioned
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ready immediately upon launch. Traefik automatically routes traffic and terminates TLS encryption without DNS configuration.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-foreground">
              Your Custom Domain FQDN
            </label>
            <input
              type="text"
              placeholder="e.g. app.mycompany.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="p-2.5 rounded-md bg-muted/50 border border-border text-[11px] text-muted-foreground flex items-center justify-between font-mono">
              <span>
                Endpoint:{" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  https://{domain.trim().replace(/^https?:\/\//, "") || `app-${autoSlugSuffix}.${wildcardDomain}`}
                </span>
              </span>
              <span className="text-muted-foreground text-[10px] font-sans">Point CNAME to server IP</span>
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-semibold text-foreground mb-1.5">
          Environment Variables (.env format)
        </label>
        <textarea
          rows={5}
          placeholder={`NODE_ENV=production\nAPI_KEY=secret_key_12345\nPORT=3000`}
          value={envText}
          onChange={(e) => setEnvText(e.target.value)}
          className="w-full p-3 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => setStep(2)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold cursor-pointer transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleFinishDeploy}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Launching Service...</span>
            </>
          ) : (
            <>
              <Server className="w-4 h-4" />
              <span>Deploy Service Now</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

