"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  KeyRound,
  Globe,
  User,
  Mail,
  Lock,
  RefreshCw,
  CheckCircle2,
  Loader2,
  Server,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { ColyinLogo } from "@/components/ColyinLogo";

export default function SetupWizardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form Fields
  const [publicIp, setPublicIp] = useState("127.0.0.1");
  const [wildcardDomain, setWildcardDomain] = useState("127.0.0.1.sslip.io");
  const [encryptionMasterKey, setEncryptionMasterKey] = useState("");
  const [authSecret, setAuthSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [adminName, setAdminName] = useState("Master Administrator");
  const [adminEmail, setAdminEmail] = useState("admin@colyin.local");
  const [adminPassword, setAdminPassword] = useState("");

  const generateRandomHex = (length: number) => {
    const chars = "0123456789abcdef";
    let res = "";
    for (let i = 0; i < length; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    return res;
  };

  const generatePassword = () => {
    return `Colyin-${generateRandomHex(8)}-${generateRandomHex(4)}`;
  };

  useEffect(() => {
    fetch("/api/setup")
      .then((res) => res.json())
      .then((data) => {
        if (data.isConfigured) {
          router.replace("/");
        } else if (data.defaults) {
          setPublicIp(data.defaults.publicIp);
          setWildcardDomain(data.defaults.wildcardDomain);
          setEncryptionMasterKey(data.defaults.encryptionMasterKey);
          setAuthSecret(data.defaults.authSecret);
          setWebhookSecret(data.defaults.webhookSecret);
          setAdminEmail(data.defaults.adminEmail);
          setAdminName(data.defaults.adminName);
          setAdminPassword(data.defaults.adminPassword);
        }
      })
      .catch((err) => {
        setError("Failed to load setup configuration: " + err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicIp,
          wildcardDomain,
          encryptionMasterKey,
          authSecret,
          webhookSecret,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Setup failed.");
      }

      setSuccess("Configuration saved! Launching dashboard...");
      setTimeout(() => {
        router.replace("/");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-white">
        <Loader2 className="w-8 h-8 text-[#00F0FF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 py-12 px-4 sm:px-6 flex flex-col justify-center items-center">
      <div className="w-full max-w-2xl space-y-8">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <ColyinLogo size={56} showText={true} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Server Setup &amp; Initialization
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Please review or customize your environment secrets and create the master administrator account to launch your PaaS cluster.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Wizard Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-cyan-500/20 bg-[#0F172A]/80 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-2xl shadow-cyan-500/10"
        >
          {/* Section 1: Ingress & Network */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/15 text-sm font-bold text-white">
              <Globe className="w-4 h-4 text-[#00F0FF]" />
              <span>1. Network &amp; Public Domains</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  Server Public IP
                </label>
                <input
                  type="text"
                  required
                  value={publicIp}
                  onChange={(e) => setPublicIp(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#00F0FF]"
                  placeholder="e.g. 103.123.45.67 or 127.0.0.1"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  Wildcard Subdomain Root
                </label>
                <input
                  type="text"
                  required
                  value={wildcardDomain}
                  onChange={(e) => setWildcardDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#00F0FF]"
                  placeholder="e.g. 127.0.0.1.sslip.io or apps.mydomain.com"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Cryptographic Secrets */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/15">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Shield className="w-4 h-4 text-[#00F0FF]" />
                <span>2. Encryption &amp; Security Secrets</span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                Auto-Generated 256-bit
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-slate-300">
                    Master Encryption Key (AES-256-GCM)
                  </label>
                  <button
                    type="button"
                    onClick={() => setEncryptionMasterKey(generateRandomHex(64))}
                    className="text-[11px] text-[#00F0FF] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={encryptionMasterKey}
                  onChange={(e) => setEncryptionMasterKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-slate-300">
                    JWT Session Token Secret
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthSecret(generateRandomHex(64))}
                    className="text-[11px] text-[#00F0FF] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={authSecret}
                  onChange={(e) => setAuthSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-medium text-slate-300">
                    GitHub Webhook Secret
                  </label>
                  <button
                    type="button"
                    onClick={() => setWebhookSecret(generateRandomHex(48))}
                    className="text-[11px] text-[#00F0FF] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Regenerate
                  </button>
                </div>
                <input
                  type="text"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono text-[11px] focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Administrator Credentials */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-cyan-500/15 text-sm font-bold text-white">
              <User className="w-4 h-4 text-[#00F0FF]" />
              <span>3. Initial Master Administrator</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  Admin Name
                </label>
                <input
                  type="text"
                  required
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-white text-xs focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
            </div>

            <div className="text-xs">
              <div className="flex justify-between items-center mb-1.5">
                <label className="font-medium text-slate-300">
                  Admin Password
                </label>
                <button
                  type="button"
                  onClick={() => setAdminPassword(generatePassword())}
                  className="text-[11px] text-[#00F0FF] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Generate Strong Password
                </button>
              </div>
              <input
                type="text"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0B0F19] border border-slate-700 text-emerald-400 font-mono text-xs font-semibold focus:outline-none focus:border-[#00F0FF]"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                This password will also be automatically saved to <code className="text-amber-300 font-mono">colyin-credentials.txt</code> on the server.
              </p>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#1D4ED8] hover:from-[#00F0FF] hover:to-[#0284C7] hover:text-[#0B0F19] text-white font-bold text-sm shadow-xl shadow-cyan-500/25 border border-cyan-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Configuration &amp; Initializing...</span>
                </>
              ) : (
                <>
                  <span>Save Configuration &amp; Launch Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
