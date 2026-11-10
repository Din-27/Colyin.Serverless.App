"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  Loader2,
  Server,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";
import { ColyinLogo } from "@/components/ColyinLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProduction, setIsProduction] = useState(false);
  const [userCount, setUserCount] = useState<number | null>(null);
  const [initialMasterCreds, setInitialMasterCreds] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          router.replace("/");
        } else if (data.needsSetup) {
          router.replace("/setup");
        } else {
          setIsProduction(!!data.isProduction);
          const count = typeof data.userCount === "number" ? data.userCount : 1;
          setUserCount(count);

          // If there is strictly only 1 user (the master admin) and initial credentials haven't been dismissed:
          if (count === 1 && data.initialMasterCredentials) {
            setInitialMasterCreds(data.initialMasterCredentials);
          } else {
            setInitialMasterCreds(null);
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDismissInitialNotice = async () => {
    setInitialMasterCreds(null);
    try {
      await fetch("/api/auth/dismiss-credentials", { method: "POST" });
    } catch {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Login failed. Please check your credentials.");
      } else {
        // Dismiss master credentials notice automatically upon successful login
        if (initialMasterCreds) {
          fetch("/api/auth/dismiss-credentials", { method: "POST" }).catch(() => {});
        }
        window.location.href = "/";
      }
    } catch {
      setError("Network error. Unable to reach server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Top Back Navigation Link */}
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-white transition group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-zinc-500">
              {isProduction ? "Production Mode" : "Development Mode"}
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center mb-3">
            <ColyinLogo size={58} showText={false} animated={true} />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Colyin Console
          </h2>
          <p className="mt-2 text-xs text-zinc-400">
            Role-Based Access Control (RBAC) • Enterprise Serverless Engine
          </p>
        </div>

        {/* FIRST-TIME INSTALLATION: UNIQUE MASTER CREDENTIALS BANNER */}
        {/* ONLY visible on first web access when strictly 1 user exists */}
        {initialMasterCreds && (
          <div className="rounded-2xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/70 via-zinc-900 to-zinc-950 p-5 space-y-3.5 shadow-2xl backdrop-blur-md relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  First-Time Setup: Master Admin Credentials
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/60 font-semibold">
                Unique VPS Key
              </span>
            </div>

            <p className="text-[11px] text-zinc-300 leading-relaxed">
              A unique master admin password was generated for this server installation. It is also permanently saved to <code className="font-mono text-indigo-300 px-1 py-0.5 bg-black/50 border border-zinc-800 rounded">colyin-credentials.txt</code> on your VPS.
            </p>

            <div className="space-y-2 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-[11px]">Email:</span>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 font-semibold">{initialMasterCreds.email}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(initialMasterCreds.email, "email")}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                    title="Copy Email"
                  >
                    {copiedField === "email" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                <span className="text-zinc-500 text-[11px]">Password:</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold tracking-wide">
                    {showPassword ? initialMasterCreds.password : "••••••••••••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(initialMasterCreds.password, "password")}
                    className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
                    title="Copy Password"
                  >
                    {copiedField === "password" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEmail(initialMasterCreds.email);
                  setPassword(initialMasterCreds.password);
                }}
                className="flex-1 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Auto-Fill Credentials</span>
              </button>
              <button
                type="button"
                onClick={handleDismissInitialNotice}
                className="py-2 px-3 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
                title="Dismiss and hide this notice"
              >
                Dismiss Notice
              </button>
            </div>
          </div>
        )}

        {/* Main Login Card */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-7 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/80 flex items-center gap-3 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Admin / Collaborator Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@colyin.local or user@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-lg bg-zinc-950/80 border border-zinc-700/80 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Sign In to Controller</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
