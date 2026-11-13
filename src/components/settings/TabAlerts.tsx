"use client";

import React from "react";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { useSettings } from "./SettingsContext";

export function TabAlerts() {
  const {
    alertEmail,
    setAlertEmail,
    smtpHost,
    setSmtpHost,
    smtpPort,
    setSmtpPort,
    smtpUser,
    setSmtpUser,
    smtpPass,
    setSmtpPass,
    isSendingAlert,
    alertFeedback,
    handleTestEmail,
  } = useSettings();

  return (
    <div className="space-y-6">
      {alertFeedback && (
        <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {alertFeedback}
        </div>
      )}

      {/* Trigger Rules */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Active Alert Triggers</h3>
        <div className="space-y-3 text-xs">
          {[
            {
              id: "deploy-failed",
              title: "Deployment Build Failed",
              desc: "Sends immediately when code compilation, git clone, or image generation errors occur.",
            },
            {
              id: "crash-loop",
              title: "Container Crash (Exit Code > 0)",
              desc: "Fires when an active container terminates unexpectedly.",
            },
            {
              id: "healthcheck",
              title: "Healthcheck Failure (HTTP 502 / Timeout)",
              desc: "Dispatches if the application does not reply within 60 seconds of promotion.",
            },
            {
              id: "oom",
              title: "Out-of-Memory (OOM Killed)",
              desc: "Fires when cgroups v2 kills a container exceeding memory quotas.",
            },
          ].map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border cursor-pointer hover:bg-muted/70 transition"
            >
              <input
                type="checkbox"
                defaultChecked
                className="mt-0.5 rounded text-primary bg-background border-input"
              />
              <div>
                <div className="font-semibold text-foreground">{item.title}</div>
                <div className="text-muted-foreground mt-0.5 text-[11px]">{item.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Recipient & SMTP Config */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-6 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-500" />
          SMTP Server Configuration
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-foreground font-medium mb-1.5">
              Alert Recipient Email
            </label>
            <input
              type="email"
              placeholder="alerts@yourdomain.com"
              value={alertEmail}
              onChange={(e) => setAlertEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground font-medium mb-1.5">SMTP Host</label>
              <input
                type="text"
                placeholder="smtp.mailgun.org or smtp.sendgrid.net"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-foreground font-medium mb-1.5">SMTP Port</label>
              <input
                type="text"
                placeholder="587"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-foreground font-medium mb-1.5">Username</label>
              <input
                type="text"
                placeholder="Optional"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-foreground font-medium mb-1.5">Password</label>
              <input
                type="password"
                placeholder="Optional"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={isSendingAlert}
              onClick={handleTestEmail}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              {isSendingAlert ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Mail className="w-3.5 h-3.5" />
              )}
              Send Test Alert
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

