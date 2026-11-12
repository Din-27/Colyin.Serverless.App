"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Lock,
  Mail,
  Loader2,
  KeyRound,
  ArrowLeft,
  Sparkles,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { ColyinLogo } from "@/components/ColyinLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { copyToClipboard } from "@/lib/clipboard";
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
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProduction, setIsProduction] = useState(false);
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

          if (count === 1 && data.initialMasterCredentials) {
            setInitialMasterCreds(data.initialMasterCredentials);
          } else {
            setInitialMasterCreds(null);
          }
        }
      })
      .catch(() => {});
  }, [router]);

  const handleCopy = async (text: string, field: string) => {
    await copyToClipboard(text);
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
      if (!data.success) {
        setError(data.error || "Authentication failed. Please verify credentials.");
      } else {
        window.location.href = "/";
      }
    } catch {
      setError("Network error. Unable to reach server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-md w-full space-y-6">
        {/* Top Navigation & Settings */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="font-mono text-[10px]">
              {isProduction ? "Production" : "Development"}
            </Badge>
            <ThemeToggle />
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-1">
            <ColyinLogo size={42} showText={false} animated={true} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Sign In to Colyin
          </h2>
          <p className="text-xs text-muted-foreground">
            Self-Hosted Serverless Engine & Ingress Controller
          </p>
        </div>

        {/* First-Time Master Credentials Notice */}
        {initialMasterCreds && (
          <Card className="border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm animate-zoom-in">
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Initial Admin Credentials
                </span>
                <Badge variant="brand" className="text-[10px]">VPS Master</Badge>
              </div>
              <CardDescription className="text-xs">
                Generated upon initial deployment. Also saved to <code className="font-mono text-foreground font-semibold">colyin-credentials.txt</code> on your host.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-2 pt-0 pb-3">
              <div className="p-2.5 rounded-lg bg-background border border-border text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[11px]">Email:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground font-semibold">{initialMasterCreds.email}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(initialMasterCreds.email, "email")}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Email"
                    >
                      {copiedField === "email" ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/60">
                  <span className="text-muted-foreground text-[11px]">Password:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {showPassword ? initialMasterCreds.password : "••••••••••••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(initialMasterCreds.password, "password")}
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Copy Password"
                    >
                      {copiedField === "password" ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="brand"
                  size="sm"
                  onClick={() => {
                    setEmail(initialMasterCreds.email);
                    setPassword(initialMasterCreds.password);
                  }}
                  className="flex-1 gap-1.5 text-xs h-8"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Auto-Fill</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDismissInitialNotice}
                  className="text-xs h-8"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Login Card */}
        <Card className="shadow-lg border-border">
          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Mail className="w-4 h-4" />
                  </div>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@colyin.local or user@example.com"
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="pl-9"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="brand"
                disabled={loading || !email || !password}
                className="w-full gap-2 mt-2 h-10"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
