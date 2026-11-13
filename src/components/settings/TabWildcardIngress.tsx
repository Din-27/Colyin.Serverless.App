"use client";

import React from "react";
import {
  Globe,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Check,
  Loader2,
} from "lucide-react";
import { useSettings } from "./SettingsContext";

export function TabWildcardIngress() {
  const {
    wildcardDomain,
    setWildcardDomain,
    wildcardSaved,
    savingWildcard,
    wildcardFeedback,
    handleSaveWildcard,
  } = useSettings();

  const presets = [
    {
      domain: "127.0.0.1.sslip.io",
      label: "sslip.io (Localhost)",
      desc: "Resolves all subdomains to 127.0.0.1",
    },
    {
      domain: "traefik.me",
      label: "traefik.me (Localhost)",
      desc: "Built-in Traefik localhost wildcard DNS",
    },
    {
      domain: "apps.yourdomain.com",
      label: "Custom Domain",
      desc: "Wildcard A record pointing to VPS IP",
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-500" />
          <h3 className="text-base font-semibold text-foreground">
            Wildcard Ingress &amp; Automatic HTTPS Domains
          </h3>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Zero-Config TLS
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Configure the root wildcard domain used to auto-generate public HTTPS subdomains for every deployed service, exactly like Vercel (<span className="font-mono text-foreground font-medium">*.vercel.app</span>) and Railway (<span className="font-mono text-foreground font-medium">*.up.railway.app</span>).
        </p>
      </div>

      {wildcardFeedback && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
            wildcardSaved
              ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500"
              : "bg-rose-500/10 border border-rose-500/20 text-rose-500"
          }`}
        >
          {wildcardSaved ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <Shield className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{wildcardFeedback}</span>
        </div>
      )}

      {/* Live Preview Card */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            Automatic Application Domain Structure:
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">Traefik Dynamic Routing</span>
        </div>

        <div className="p-3 rounded-lg bg-background border border-border font-mono text-emerald-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-xs truncate">
            <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
            <span className="truncate">https://[app-name]-[rand6].{wildcardDomain}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-sans font-semibold shrink-0">
            HTTPS Port 443 + HTTP Redirect
          </span>
        </div>

        <p className="text-[11px] text-muted-foreground">
          With <span className="font-mono text-primary font-medium">127.0.0.1.sslip.io</span> or <span className="font-mono text-primary font-medium">traefik.me</span>, every subdomain automatically resolves to your local server IP worldwide without editing hosts files.
        </p>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-foreground">
          Quick DNS Presets
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {presets.map((p) => (
            <button
              key={p.domain}
              type="button"
              onClick={() => setWildcardDomain(p.domain)}
              className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                wildcardDomain === p.domain
                  ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary/40"
                  : "bg-card border-border text-foreground hover:bg-accent/50"
              }`}
            >
              <div className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>{p.label}</span>
                {wildcardDomain === p.domain && (
                  <Check className="w-3.5 h-3.5 text-primary" />
                )}
              </div>
              <div className="font-mono text-[11px] text-primary mt-1 truncate">
                *.{p.domain}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSaveWildcard} className="space-y-4 text-xs pt-2">
        <div>
          <label className="block text-foreground font-semibold mb-1">
            Root Wildcard Domain
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 127.0.0.1.sslip.io or apps.yourdomain.com"
            value={wildcardDomain}
            onChange={(e) => setWildcardDomain(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            If using a public server, configure a wildcard DNS record <span className="font-mono text-foreground">*.{wildcardDomain}</span> pointing to your server's public IP address.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
          <span className="font-semibold text-foreground block">
            TLS / HTTPS Security Protocol:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Automatic TLS Let's Encrypt Certificate</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Automatic Port 80 HTTP-to-HTTPS Redirection</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingWildcard}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            {savingWildcard ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Save Ingress Configuration
          </button>
        </div>
      </form>
    </div>
  );
}

