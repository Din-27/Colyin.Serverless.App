"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Globe,
  User,
  Mail,
  Lock,
  RefreshCw,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { ColyinLogo } from "@/components/ColyinLogo";
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
          adminEmail,
          adminName,
          adminPassword,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Setup failed");
      }

      setSuccess("Platform initialization successful! Redirecting to dashboard...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to initialize setup");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 flex flex-col justify-center items-center animate-fade-in">
      <div className="w-full max-w-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-2">
            <ColyinLogo size={48} showText={true} />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Server Setup &amp; Initialization
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
            Configure your environment secrets and create the master administrator account.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Wizard Form */}
        <Card className="shadow-lg border-border">
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Section 1: Ingress & Network */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/80 text-sm font-semibold text-foreground">
                  <Globe className="w-4 h-4 text-indigo-500" />
                  <span>1. Network &amp; Public Domains</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Server Public IP</label>
                    <Input
                      type="text"
                      required
                      value={publicIp}
                      onChange={(e) => setPublicIp(e.target.value)}
                      placeholder="e.g. 103.123.45.67 or 127.0.0.1"
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Wildcard Subdomain Root</label>
                    <Input
                      type="text"
                      required
                      value={wildcardDomain}
                      onChange={(e) => setWildcardDomain(e.target.value)}
                      placeholder="e.g. 127.0.0.1.sslip.io"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Cryptographic Secrets */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-border/80">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Shield className="w-4 h-4 text-indigo-500" />
                    <span>2. Encryption &amp; Security Secrets</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    Auto-Generated 256-bit
                  </Badge>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="font-medium text-foreground">
                        Master Encryption Key (AES-256-GCM)
                      </label>
                      <button
                        type="button"
                        onClick={() => setEncryptionMasterKey(generateRandomHex(64))}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Regenerate</span>
                      </button>
                    </div>
                    <Input
                      type="text"
                      required
                      value={encryptionMasterKey}
                      onChange={(e) => setEncryptionMasterKey(e.target.value)}
                      className="font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Master Admin Account */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/80 text-sm font-semibold text-foreground">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>3. Administrator Account</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Admin Name</label>
                    <Input
                      type="text"
                      required
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. System Administrator"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">Admin Email</label>
                    <Input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@colyin.local"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="font-medium text-foreground">Admin Password</label>
                      <button
                        type="button"
                        onClick={() => setAdminPassword(generatePassword())}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Generate Secure</span>
                      </button>
                    </div>
                    <Input
                      type="text"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="font-mono text-xs"
                      placeholder="Minimum 8 characters"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                variant="brand"
                disabled={submitting}
                className="w-full gap-2 mt-4 h-11"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Configuring Cluster...</span>
                  </>
                ) : (
                  <>
                    <span>Initialize Platform &amp; Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
