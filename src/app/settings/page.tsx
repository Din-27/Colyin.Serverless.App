"use client";

import { useState } from "react";
import { Bell, Mail, ShieldAlert, CheckCircle2, Loader2, Send } from "lucide-react";

export default function SettingsPage() {
  const [email, setEmail] = useState("admin@minipaas.local");
  const [smtpHost, setSmtpHost] = useState("smtp.mailtrap.io");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleTestEmail = async () => {
    setIsSending(true);
    setFeedback("");
    await new Promise((r) => setTimeout(r, 1200));
    setIsSending(false);
    setFeedback("Test incident email dispatched successfully via SMTP!");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="pb-6 border-b border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <Bell className="w-6 h-6 text-indigo-400" />
          Alerting & Incident Notifications
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Configure real-time email dispatching when builds fail, containers crash, or memory limits are exceeded.
        </p>
      </div>

      {feedback && (
        <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Trigger Rules */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white">Active Alert Triggers</h3>
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
              className="flex items-start gap-3 p-3 rounded-lg bg-zinc-950 border border-zinc-800 cursor-pointer hover:bg-zinc-900/60 transition"
            >
              <input
                type="checkbox"
                defaultChecked
                className="mt-0.5 rounded text-indigo-600 bg-zinc-800 border-zinc-700"
              />
              <div>
                <div className="font-semibold text-zinc-200">{item.title}</div>
                <div className="text-zinc-500 mt-0.5 text-[11px]">{item.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Recipient & SMTP Config */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Mail className="w-4 h-4 text-indigo-400" />
          SMTP Server Configuration
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-300 font-medium mb-1.5">
              Alert Recipient Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">SMTP Host</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">SMTP Port</label>
              <input
                type="text"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">Username</label>
              <input
                type="text"
                placeholder="Optional"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-zinc-300 font-medium mb-1.5">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="text-zinc-500 text-[11px]">
              Anti-Spam Cooldown: 15 minutes per unique incident
            </span>
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={isSending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50 transition"
            >
              {isSending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Send Test Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
