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
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { ColyinLogo } from "@/components/ColyinLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
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
        }
      })
      .catch(() => {});
  }, [router]);

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
