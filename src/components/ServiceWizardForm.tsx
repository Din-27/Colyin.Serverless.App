"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  Terminal,
  Database,
  Layers,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Check,
  Copy,
  KeyRound,
  Server,
  Globe,
  Lock,
  Search,
  ExternalLink,
  Star,
  Link as LinkIcon,
  User,
  Shield,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import { RuntimeSelector } from "@/components/RuntimeSelector";
import { ResourceAllocationSelector } from "@/components/ResourceAllocationSelector";
import { copyToClipboard } from "@/lib/clipboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

export function ServiceWizardForm({ project }: { project: any }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Source Mode: "github" or "direct"
  const [sourceMode, setSourceMode] = useState<"github" | "direct">("github");

  // GitHub Connection State
  const [githubAccount, setGithubAccount] = useState<any>(null);
  const [checkingGithub, setCheckingGithub] = useState(true);
  const [cliAccounts, setCliAccounts] = useState<any[]>([]);
  const [selectedCliAccount, setSelectedCliAccount] = useState<string>("");
  const [showManualForm, setShowManualForm] = useState<boolean>(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepoFullName, setSelectedRepoFullName] = useState("");
  const [repoFilter, setRepoFilter] = useState<"all" | "private" | "public">("all");

  // Connect Inputs
  const [inputUsername, setInputUsername] = useState("");
  const [inputToken, setInputToken] = useState("");
  const [showTokenInput, setShowTokenInput] = useState(true);
  const [directGitToken, setDirectGitToken] = useState("");

  // Inline Add Token state when connected without token
  const [showAddTokenForm, setShowAddTokenForm] = useState(false);
  const [inlineToken, setInlineToken] = useState("");
  const [inlineTokenLoading, setInlineTokenLoading] = useState(false);

  // GitHub OAuth States
  const [isOauthConfigured, setIsOauthConfigured] = useState(false);
  const [showOauthModal, setShowOauthModal] = useState(false);
  const [oauthClientId, setOauthClientId] = useState("");
  const [oauthClientSecret, setOauthClientSecret] = useState("");
  const [savingOauth, setSavingOauth] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState(false);

  // Step 1: Selected Service Specs
  const [name, setName] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [buildPack, setBuildPack] = useState("NIXPACKS");
  const [runtimeVersion, setRuntimeVersion] = useState("AUTO");
  const [internalPort, setInternalPort] = useState(3001);
  const [portStatus, setPortStatus] = useState<{
    checking: boolean;
    available: boolean;
    reason?: string;
    suggestedPort?: number;
  }>({ checking: false, available: true });
  const [domain, setDomain] = useState("");
  const [wildcardDomain, setWildcardDomain] = useState("127.0.0.1.sslip.io");
  const [domainMode, setDomainMode] = useState<"auto" | "custom">("auto");
  const [cpuLimit, setCpuLimit] = useState(1.0);
  const [memoryLimitMb, setMemoryLimitMb] = useState(512);
  const [resourceMode, setResourceMode] = useState<"AUTO" | "ECO" | "STANDARD" | "HIGH" | "CUSTOM">("AUTO");
  const [autoSlugSuffix] = useState(() => Math.random().toString(36).substring(2, 8));

  const checkPortAvailability = async (portToTest: number, autoApply = false) => {
    if (!portToTest || isNaN(portToTest)) return;
    setPortStatus((prev) => ({ ...prev, checking: true }));
    try {
      const res = await fetch(`/api/system/ports/check?port=${portToTest}`);
      const data = await res.json();
      if (data.success) {
        setPortStatus({
          checking: false,
          available: data.available,
          reason: data.reason,
          suggestedPort: data.suggestedPort,
        });
        if (autoApply && !data.available && data.suggestedPort) {
          setInternalPort(data.suggestedPort);
        }
      }
    } catch {
      setPortStatus((prev) => ({ ...prev, checking: false }));
    }
  };

  // Step 2: Resource Attachment
  const [selectedAddonId, setSelectedAddonId] = useState("");

  // Step 3: Env Vars
  const [envText, setEnvText] = useState("");

  // Check GitHub Connection Status
  const checkGithubStatus = async () => {
    setCheckingGithub(true);
    try {
      const res = await fetch("/api/github/account");
      const data = await res.json();
      if (typeof data.isOauthConfigured === "boolean") {
        setIsOauthConfigured(data.isOauthConfigured);
      }
      if (data.cliAccounts && data.cliAccounts.length > 0) {
        setCliAccounts(data.cliAccounts);
        const active = data.cliAccounts.find((a: any) => a.active) || data.cliAccounts[0];
        if (active) setSelectedCliAccount(active.username);
      }
      if (data.connected && data.account) {
        setGithubAccount(data.account);
        loadRepos();
      } else {
        setGithubAccount(null);
      }
    } catch {}
    setCheckingGithub(false);
  };

  const loadRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      const data = await res.json();
      if (data.success && data.repos) {
        setRepos(data.repos);
        if (typeof data.hasToken === "boolean") {
          setGithubAccount((prev: any) =>
            prev ? { ...prev, hasToken: data.hasToken } : prev
          );
        }
      } else {
        setRepos([]);
        if (data.error) setError(data.error);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load repositories from GitHub");
    }
    setLoadingRepos(false);
  };

  useEffect(() => {
    checkGithubStatus();
    checkPortAvailability(3001, true);
    fetch("/api/system/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data.settings?.WILDCARD_DOMAIN) {
          setWildcardDomain(data.settings.WILDCARD_DOMAIN);
        }
        if (data.settings?.GITHUB_CLIENT_ID) {
          setOauthClientId(data.settings.GITHUB_CLIENT_ID);
        }
        if (data.settings?.GITHUB_CLIENT_SECRET) {
          setOauthClientSecret(data.settings.GITHUB_CLIENT_SECRET);
        }
      })
      .catch(() => {});

    // Check query params for OAuth errors or callbacks
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");
      if (oauthError) {
        if (oauthError === "github_oauth_not_configured" || oauthError === "oauth_credentials_missing") {
          setShowOauthModal(true);
          setError("GitHub OAuth belum dikonfigurasi. Silakan lengkapi Client ID & Client Secret di bawah.");
        } else {
          setError(`GitHub OAuth Error: ${oauthError}`);
        }
      }
    }
  }, []);

  const handleLoginWithGithub = () => {
    if (!isOauthConfigured) {
      setShowOauthModal(true);
      return;
    }
    const redirectUrl = window.location.href;
    window.location.href = `/api/github/oauth?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSaveAndLoginOauth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oauthClientId.trim() || !oauthClientSecret.trim()) {
      setError("Client ID dan Client Secret wajib diisi");
      return;
    }

    setSavingOauth(true);
    setError("");
    try {
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "GITHUB_CLIENT_ID", value: oauthClientId.trim() }),
      });
      await fetch("/api/system/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "GITHUB_CLIENT_SECRET", value: oauthClientSecret.trim() }),
      });

      setIsOauthConfigured(true);
      const redirectUrl = window.location.href;
      window.location.href = `/api/github/oauth?redirect=${encodeURIComponent(redirectUrl)}`;
    } catch (err: any) {
      setError(err.message || "Gagal menyimpan konfigurasi GitHub OAuth");
      setSavingOauth(false);
    }
  };

  const handleConnectGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim() && !inputToken.trim()) {
      setError("Please enter your GitHub Personal Access Token or username");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/github/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: inputUsername.trim() || undefined,
          token: inputToken.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGithubAccount(data.account);
        setInputUsername("");
        setInputToken("");
        await loadRepos();
      } else {
        setError(data.error || "Failed to connect to GitHub");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to GitHub");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectWithCli = async (accountName?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/github/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ useCliAccount: accountName || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setGithubAccount(data.account);
        await loadRepos();
      } else {
        setError(data.error || "Failed to connect to GitHub");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to GitHub");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineToken.trim()) return;
    setInlineTokenLoading(true);
    setError("");
    try {
      const res = await fetch("/api/github/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inlineToken.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setGithubAccount(data.account);
        setInlineToken("");
        setShowAddTokenForm(false);
        await loadRepos();
      } else {
        setError(data.error || "Failed to update GitHub token");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update GitHub token");
    } finally {
      setInlineTokenLoading(false);
    }
  };

  const handleDisconnectGithub = async () => {
    await fetch("/api/github/account", { method: "DELETE" });
    setGithubAccount(null);
    setRepos([]);
    setSelectedRepoFullName("");
  };

  const handleSelectRepo = (repo: any) => {
    setSelectedRepoFullName(repo.fullName);
    setName(repo.name);
    setRepositoryUrl(repo.cloneUrl);
    setBranch(repo.defaultBranch || "main");

    // Suggest default port based on language and auto-check availability
    let basePort = 3000;
    if (repo.language === "Python") basePort = 8000;
    else if (repo.language === "Go") basePort = 8080;
    setInternalPort(basePort);
    checkPortAvailability(basePort, true);
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repositoryUrl.trim()) {
      setError("Please provide service name and repository URL to continue");
      return;
    }
    if (!portStatus.available) {
      setError(portStatus.reason || `Port ${internalPort} is already in use. Please select a unique, unoccupied port.`);
      return;
    }
    setError("");
    setStep(2);
  };

  const handleFinishDeploy = async () => {
    if (!portStatus.available) {
      setError(portStatus.reason || `Port ${internalPort} is already in use. Please select a unique, unoccupied port.`);
      return;
    }
    setLoading(true);
    setError("");

    try {
      const cleanSlug = (name || "app")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const generatedAutoDomain = `${cleanSlug || "app"}-${autoSlugSuffix}.${wildcardDomain}`;
      const finalDomain =
        domainMode === "custom" && domain.trim()
          ? domain.trim()
          : generatedAutoDomain;

      // 1. Create Application
      const appRes = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          name,
          repositoryUrl,
          branch,
          internalPort,
          buildPack,
          runtimeVersion,
          cpuLimit,
          memoryLimitMb,
          domain: finalDomain,
        }),
      });

      const appData = await appRes.json();
      if (!appData.success) throw new Error(appData.error);

      const appId = appData.app.id;

      // 2. Attach Env Variables
      const parsedEnvs: Array<{ key: string; value: string }> = [];

      if (selectedAddonId) {
        const attachedAddon = project.addons.find((a: any) => a.id === selectedAddonId);
        if (attachedAddon) {
          if (attachedAddon.type === "POSTGRESQL") {
            parsedEnvs.push({
              key: "DATABASE_URL",
              value: `postgresql://postgres:password@${attachedAddon.internalHost}:${attachedAddon.internalPort}/main`,
            });
          } else if (attachedAddon.type === "REDIS") {
            parsedEnvs.push({
              key: "REDIS_URL",
              value: `redis://default:password@${attachedAddon.internalHost}:${attachedAddon.internalPort}`,
            });
          } else if (attachedAddon.type === "RABBITMQ") {
            parsedEnvs.push({
              key: "RABBITMQ_URL",
              value: `amqp://root:password@${attachedAddon.internalHost}:${attachedAddon.internalPort}`,
            });
          }
        }
      }

      if (envText.trim()) {
        const lines = envText.split("\n");
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const idx = trimmed.indexOf("=");
          if (idx !== -1) {
            parsedEnvs.push({
              key: trimmed.slice(0, idx).trim(),
              value: trimmed.slice(idx + 1).trim(),
            });
          }
        }
      }

      if (sourceMode === "direct" && directGitToken.trim()) {
        parsedEnvs.push({
          key: "GIT_AUTH_TOKEN",
          value: directGitToken.trim(),
        });
      }

      if (parsedEnvs.length > 0) {
        await fetch(`/api/apps/${appId}/env`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variables: parsedEnvs }),
        });
      }

      // 3. Trigger initial deployment
      await fetch(`/api/apps/${appId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch }),
      });

      router.push(`/apps/${appId}`);
    } catch (err: any) {
      setError(err.message || "Failed to create service");
      setLoading(false);
    }
  };

  const privateCount = repos.filter((r) => r.isPrivate).length;
  const publicCount = repos.filter((r) => !r.isPrivate).length;

  const filteredRepos = repos.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(repoSearch.toLowerCase()));
    if (!matchesSearch) return false;
    if (repoFilter === "private") return r.isPrivate;
    if (repoFilter === "public") return !r.isPrivate;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 text-xs">
        {[
          { num: 1, label: "Repository Source" },
          { num: 2, label: "Attach Resources" },
          { num: 3, label: "Environment & Deploy" },
        ].map((s) => (
          <div
            key={s.num}
            className={`flex items-center gap-2 ${
              step === s.num
                ? "text-indigo-400 font-semibold"
                : step > s.num
                ? "text-emerald-400"
                : "text-zinc-600"
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                step === s.num
                  ? "border-indigo-500 bg-indigo-950/60"
                  : step > s.num
                  ? "border-emerald-500 bg-emerald-950/60"
                  : "border-zinc-800 bg-zinc-900"
              }`}
            >
              {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
            </span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Step 1: Repository Selection */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Source Tabs: GitHub Account vs Direct Git URL */}
          <div className="flex items-center gap-2 p-1 rounded-lg bg-zinc-950 border border-zinc-800 max-w-sm">
            <button
              type="button"
              onClick={() => setSourceMode("github")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs font-semibold transition ${
                sourceMode === "github"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <GithubIcon className="w-3.5 h-3.5" />
              <span>GitHub Account</span>
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("direct")}
              className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded text-xs font-semibold transition ${
                sourceMode === "direct"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Direct Git URL</span>
            </button>
          </div>

          {sourceMode === "direct" ? (
            /* Direct Git URL Form */
            <form onSubmit={handleNextStep1} className="space-y-4">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                    <span>Git Repository URL</span>
                    <span className="text-[10px] text-zinc-500 font-normal">Public or Private (.git)</span>
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://github.com/owner/repository.git"
                    value={repositoryUrl}
                    onChange={(e) => {
                      setRepositoryUrl(e.target.value);
                      if (!name) {
                        const parts = e.target.value.split("/");
                        const last = parts[parts.length - 1]?.replace(".git", "");
                        if (last) setName(last);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Supports any Git repository URL (GitHub, GitLab, Bitbucket, self-hosted).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Git Access Token / PAT (Optional for Private Repos)</span>
                    </span>
                    <span className="text-[10px] text-zinc-500 font-normal">Encrypted at rest</span>
                  </label>
                  <input
                    type="password"
                    placeholder="ghp_xxxx or personal access token (leave blank if public or connected via GitHub)"
                    value={directGitToken}
                    onChange={(e) => setDirectGitToken(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    If this repository is on GitHub and your GitHub account has an active token, it will authenticate automatically even if left blank.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Service Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="my-backend-api"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Branch
                    </label>
                    <input
                      type="text"
                      required
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="main"
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center justify-between">
                      <span>Internal Port</span>
                      <span className="text-[10px] text-zinc-500 font-normal">Must be unique &amp; unoccupied</span>
                    </label>
                    <input
                      type="number"
                      required
                      value={internalPort}
                      onChange={(e) => {
                        const p = parseInt(e.target.value, 10) || 3000;
                        setInternalPort(p);
                        checkPortAvailability(p);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                    />
                    {portStatus.checking ? (
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1">
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>Verifying port availability...</span>
                      </div>
                    ) : !portStatus.available ? (
                      <div className="mt-1.5 p-2 rounded bg-amber-950/40 border border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-amber-300">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span>{portStatus.reason || `Port ${internalPort} is already in use`}</span>
                        </div>
                        {portStatus.suggestedPort && (
                          <button
                            type="button"
                            onClick={() => {
                              setInternalPort(portStatus.suggestedPort!);
                              checkPortAvailability(portStatus.suggestedPort!);
                            }}
                            className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-[10px] border border-amber-500/40 shrink-0 self-start sm:self-auto transition"
                          >
                            Use free port :{portStatus.suggestedPort}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                        <span>Port {internalPort} is free and unique</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Buildpack Strategy
                    </label>
                    <select
                      value={buildPack}
                      onChange={(e) => setBuildPack(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                    >
                      <option value="NIXPACKS">Auto Detect (C, C++, Rust, Zig, Go, Node, Python, PHP, Java, .NET, Ruby, Bun, Deno, Static)</option>
                      <option value="DOCKERFILE">Dockerfile in Repository Root</option>
                    </select>
                  </div>
                </div>

                {buildPack === "NIXPACKS" && (
                  <div className="pt-2 border-t border-zinc-800/80">
                    <RuntimeSelector
                      value={runtimeVersion}
                      onChange={setRuntimeVersion}
                    />
                  </div>
                )}

                {/* Core & Memory Resource Quota */}
                <div className="pt-3 border-t border-zinc-800/80">
                  <ResourceAllocationSelector
                    cpuLimit={cpuLimit}
                    memoryLimitMb={memoryLimitMb}
                    onChange={(newCpu, newMem, newMode) => {
                      setCpuLimit(newCpu);
                      setMemoryLimitMb(newMem);
                      setResourceMode(newMode as any);
                    }}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                >
                  <span>Continue to Resources</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : checkingGithub ? (
            <div className="p-12 text-center text-xs text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
              Checking GitHub integration...
            </div>
          ) : !githubAccount ? (
            /* Connect GitHub State with 1-Click Login ke GitHub */
            <div className="space-y-4">
              {/* Primary 1-Click Login Card (OAuth Flow) */}
              <div className="p-6 sm:p-7 rounded-2xl border border-indigo-500/40 bg-gradient-to-b from-indigo-950/40 via-zinc-950 to-zinc-950 space-y-5 shadow-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-inner shrink-0">
                      <GithubIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-white">Login ke GitHub</h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-[10px] sm:text-[11px] text-emerald-400 font-medium">
                          <Shield className="w-3 h-3 text-emerald-400" />
                          Repositori Publik &amp; Private
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Hubungkan akun GitHub Anda secara instan untuk mendeploy seluruh repositori tanpa perlu repot membuat token manual.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Main 1-Click Login Button */}
                <button
                  type="button"
                  onClick={handleLoginWithGithub}
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white hover:bg-zinc-200 disabled:opacity-50 text-zinc-950 text-xs sm:text-sm font-bold transition shadow-lg hover:shadow-indigo-500/20 cursor-pointer"
                >
                  <GithubIcon className="w-5 h-5 text-zinc-950" />
                  <span>Login ke GitHub (1-Click OAuth)</span>
                  <ArrowRight className="w-4 h-4 text-zinc-600 ml-1" />
                </button>

                {/* If local CLI accounts detected (e.g. dev environment) */}
                {cliAccounts.length > 0 && (
                  <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-zinc-400 text-[11px]">Akun GitHub CLI Lokal Terdeteksi:</span>
                    <div className="flex items-center gap-2">
                      {cliAccounts.map((acc: any) => (
                        <button
                          key={acc.username}
                          type="button"
                          onClick={() => handleConnectWithCli(acc.username)}
                          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono transition"
                        >
                          Hubungkan @{acc.username}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom Toggle for Manual Fallback */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowManualForm(!showManualForm)}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono transition"
                  >
                    <span>{showManualForm ? "- Sembunyikan form manual" : "+ Alternatif: Hubungkan via Personal Access Token manual"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowOauthModal(true)}
                    className="text-[11px] text-zinc-500 hover:text-indigo-400 flex items-center gap-1 transition"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Konfigurasi OAuth App</span>
                  </button>
                </div>
              </div>

              {/* Optional Manual Token Form (Hidden by default, expandable as fallback) */}
              {showManualForm && (
                <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-950 space-y-4">
                  <div className="text-xs font-semibold text-zinc-300">
                    Hubungkan via Personal Access Token (Alternatif Manual)
                  </div>

                  <form onSubmit={handleConnectGithub} className="space-y-4">
                    <div className="p-3.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-indigo-300">
                        <span className="flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          Personal Access Token (with 'repo' scope)
                        </span>
                        <a
                          href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=MiniPaaS-Deployment"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-normal"
                        >
                          <span>Generate Token</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <input
                        type="password"
                        placeholder="ghp_xxxxxxxxxxxx or github_pat_xxxxxxxxxxxx"
                        value={inputToken}
                        onChange={(e) => setInputToken(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        Or GitHub Username (Public Repositories Only)
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="e.g. your-github-username"
                          value={inputUsername}
                          onChange={(e) => setInputUsername(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={loading || (!inputUsername.trim() && !inputToken.trim())}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <GithubIcon className="w-4 h-4" />
                        )}
                        <span>Connect &amp; Load Repositories</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            /* Connected GitHub Repository Selector (Real Data with Private Repo Support) */
            <form onSubmit={handleNextStep1} className="space-y-5">
              {/* Account Header */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {githubAccount.avatarUrl ? (
                      <img
                        src={githubAccount.avatarUrl}
                        alt={githubAccount.username}
                        className="w-8 h-8 rounded-full border border-zinc-700"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                        <GithubIcon className="w-4 h-4" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-white text-xs font-mono">@{githubAccount.username}</strong>
                        {githubAccount.hasToken ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800 text-[10px] text-emerald-400 font-medium">
                            <Shield className="w-3 h-3 text-emerald-400" />
                            Private &amp; Public Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-800 text-[10px] text-amber-400 font-medium">
                            <Lock className="w-3 h-3 text-amber-400" />
                            Public Repos Only
                          </span>
                        )}
                      </div>
                      <span className="text-zinc-500 text-[11px] block mt-0.5">
                        {githubAccount.hasToken
                          ? "Connected via Personal Access Token. Private repositories are accessible."
                          : "Connected without token. Add a Personal Access Token with 'repo' scope to load private repositories."}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!githubAccount.hasToken && (
                      <button
                        type="button"
                        onClick={() => setShowAddTokenForm(!showAddTokenForm)}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" />
                        <span>{showAddTokenForm ? "Cancel" : "Enable Private Repos"}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={loadRepos}
                      disabled={loadingRepos}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium transition"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={handleDisconnectGithub}
                      className="text-zinc-500 hover:text-rose-400 text-[11px] px-2 py-1 transition"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Inline Add Token Form */}
                {showAddTokenForm && !githubAccount.hasToken && (
                  <div className="pt-3 border-t border-zinc-800/80 mt-2">
                    <div className="p-3 rounded-lg bg-zinc-900 border border-indigo-500/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-300">
                          Add Personal Access Token for Private Repositories
                        </span>
                        <a
                          href="https://github.com/settings/tokens/new?scopes=repo,read:user&description=MiniPaaS-Private-Repos"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <span>Generate Token on GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Paste a classic or fine-grained GitHub token with the <code className="text-amber-300 font-mono">repo</code> scope enabled. It will be encrypted with AES-256-GCM.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="ghp_xxxxxxxxxxxx or github_pat_xxxxxxxxxxxx"
                          value={inlineToken}
                          onChange={(e) => setInlineToken(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={handleUpdateToken}
                          disabled={inlineTokenLoading || !inlineToken.trim()}
                          className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5"
                        >
                          {inlineTokenLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Save &amp; Unlock
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Repositories Search & Filters */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-zinc-200">
                      Select Repository to Deploy
                    </label>
                    <span className="text-[11px] text-zinc-500">
                      ({repos.length} total fetched)
                    </span>
                  </div>

                  {/* Filter Tabs: All, Private, Public */}
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setRepoFilter("all")}
                      className={`px-2.5 py-1 rounded transition font-medium ${
                        repoFilter === "all"
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      All ({repos.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepoFilter("private")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded transition font-medium ${
                        repoFilter === "private"
                          ? "bg-amber-950/70 border border-amber-800 text-amber-300"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Lock className="w-3 h-3 text-amber-400" />
                      <span>Private ({privateCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRepoFilter("public")}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded transition font-medium ${
                        repoFilter === "public"
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Globe className="w-3 h-3 text-zinc-400" />
                      <span>Public ({publicCount})</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder={
                      repoFilter === "private"
                        ? "Search in private repositories..."
                        : repoFilter === "public"
                        ? "Search in public repositories..."
                        : "Filter repositories by name or description..."
                    }
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {loadingRepos ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-400" />
                    Fetching repositories from GitHub API...
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2">
                    {filteredRepos.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-500 space-y-2">
                        <div>
                          {repoFilter === "private" && !githubAccount.hasToken
                            ? "No private repositories visible because your account is connected without a token."
                            : repoFilter === "private"
                            ? "No private repositories found in this GitHub account."
                            : repos.length === 0
                            ? "No repositories found for this account. You can switch to 'Direct Git URL' tab above to deploy any repository."
                            : `No repositories matching "${repoSearch}"`}
                        </div>
                        {repoFilter === "private" && !githubAccount.hasToken && (
                          <button
                            type="button"
                            onClick={() => setShowAddTokenForm(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
                          >
                            <Lock className="w-3.5 h-3.5" />
                            <span>Add Personal Access Token</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredRepos.map((repo) => {
                        const isSelected = selectedRepoFullName === repo.fullName;
                        return (
                          <button
                            key={repo.fullName}
                            type="button"
                            onClick={() => handleSelectRepo(repo)}
                            className={`w-full p-3 rounded-lg border text-left transition flex items-center justify-between ${
                              isSelected
                                ? "bg-indigo-950/50 border-indigo-500 text-white"
                                : repo.isPrivate
                                ? "bg-amber-950/10 border-amber-900/40 text-zinc-300 hover:bg-amber-950/20 hover:border-amber-700"
                                : "bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700"
                            }`}
                          >
                            <div className="pr-4">
                              <div className="text-xs font-semibold flex items-center gap-2">
                                <span>{repo.fullName}</span>
                                {repo.isPrivate && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-800/80 text-[10px] text-amber-300 font-mono">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Private</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                                {repo.description || "No description"}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-right shrink-0">
                              {repo.stars > 0 && (
                                <span className="flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  {repo.stars}
                                </span>
                              )}
                              {repo.language && (
                                <span className="text-[11px] text-zinc-400 font-mono">
                                  {repo.language}
                                </span>
                              )}
                              {isSelected && <Check className="w-4 h-4 text-indigo-400" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {selectedRepoFullName && (
                <div className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/20 space-y-4">
                  <div className="text-xs font-semibold text-indigo-300">
                    Selected Service Configuration
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        Service Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        Deploy Branch
                      </label>
                      <input
                        type="text"
                        required
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1 flex items-center justify-between">
                        <span>Internal Port</span>
                        <span className="text-[10px] text-zinc-500 font-normal">Must be unique</span>
                      </label>
                      <input
                        type="number"
                        required
                        value={internalPort}
                        onChange={(e) => {
                          const p = parseInt(e.target.value, 10) || 3000;
                          setInternalPort(p);
                          checkPortAvailability(p);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                      />
                      {portStatus.checking ? (
                        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-1">
                          <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                          <span>Verifying port availability...</span>
                        </div>
                      ) : !portStatus.available ? (
                        <div className="mt-1.5 p-2 rounded bg-amber-950/40 border border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-amber-300">
                          <div className="flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                            <span>{portStatus.reason || `Port ${internalPort} is in use`}</span>
                          </div>
                          {portStatus.suggestedPort && (
                            <button
                              type="button"
                              onClick={() => {
                                setInternalPort(portStatus.suggestedPort!);
                                checkPortAvailability(portStatus.suggestedPort!);
                              }}
                              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-[10px] border border-amber-500/40 shrink-0 self-start sm:self-auto transition"
                            >
                              Use free port :{portStatus.suggestedPort}
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                          <span>Port {internalPort} is free and unique</span>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">
                        Buildpack Protocol
                      </label>
                      <select
                        value={buildPack}
                        onChange={(e) => setBuildPack(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                      >
                        <option value="NIXPACKS">Auto Detect (C, C++, Rust, Zig, Go, Node, Python, PHP, Java, .NET, Ruby, Bun, Deno, Static)</option>
                        <option value="DOCKERFILE">Dockerfile in Root</option>
                      </select>
                    </div>
                  </div>

                  {buildPack === "NIXPACKS" && (
                    <div className="pt-2 border-t border-indigo-500/30">
                      <RuntimeSelector
                        value={runtimeVersion}
                        onChange={setRuntimeVersion}
                      />
                    </div>
                  )}

                  {/* Core & Memory Resource Quota */}
                  <div className="pt-3 border-t border-indigo-500/30">
                    <ResourceAllocationSelector
                      cpuLimit={cpuLimit}
                      memoryLimitMb={memoryLimitMb}
                      onChange={(newCpu, newMem, newMode) => {
                        setCpuLimit(newCpu);
                        setMemoryLimitMb(newMem);
                        setResourceMode(newMode as any);
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={!selectedRepoFullName}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition"
                >
                  <span>Continue to Resources</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Step 2: Attach Project Resources / Addons */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white">Attach Project Addons</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Select existing database or queue addons in project '{project.name}' to auto-inject connection credentials.
            </p>
          </div>

          <div className="space-y-3">
            <label
              onClick={() => setSelectedAddonId("")}
              className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
                selectedAddonId === ""
                  ? "bg-indigo-950/40 border-indigo-500 text-white"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border flex items-center justify-center">
                  {selectedAddonId === "" && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
                </div>
                <div>
                  <div className="text-xs font-semibold">Standalone Service (No Addons)</div>
                  <div className="text-[11px] text-zinc-500">Do not bind any internal project database</div>
                </div>
              </div>
            </label>

            {project.addons.map((addon: any) => (
              <label
                key={addon.id}
                onClick={() => setSelectedAddonId(addon.id)}
                className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition ${
                  selectedAddonId === addon.id
                    ? "bg-indigo-950/40 border-indigo-500 text-white"
                    : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full border flex items-center justify-center">
                    {selectedAddonId === addon.id && <div className="w-2 h-2 rounded-full bg-indigo-400" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold flex items-center gap-2">
                      <span>{addon.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300">
                        {addon.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 font-mono">
                      Host: {addon.internalHost}:{addon.internalPort}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
            >
              <span>Continue to Environment</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Environment Variables & Launch */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-base font-semibold text-white">Environment Variables &amp; Launch</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Add custom environment variables (.env format). All values are encrypted at rest using AES-256-GCM.
            </p>
          </div>

          {/* Domain & Automatic HTTPS Provisioning */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Domain &amp; Automatic HTTPS</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    SSL Active
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Every deployment automatically receives a production HTTPS domain managed by Traefik.
                </p>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 self-start sm:self-auto text-xs">
                <button
                  type="button"
                  onClick={() => setDomainMode("auto")}
                  className={`px-3 py-1 rounded text-[11px] font-medium transition ${
                    domainMode === "auto"
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Automatic (Vercel Style)
                </button>
                <button
                  type="button"
                  onClick={() => setDomainMode("custom")}
                  className={`px-3 py-1 rounded text-[11px] font-medium transition ${
                    domainMode === "custom"
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Custom Domain
                </button>
              </div>
            </div>

            {domainMode === "auto" ? (
              <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-300 flex items-center gap-1.5">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    Assigned Public HTTPS Domain:
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Wildcard: *.{wildcardDomain}
                  </span>
                </div>
                <div className="p-2.5 rounded-md bg-zinc-900 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs font-bold text-emerald-400">
                    <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span className="truncate">
                      https://{(name ? name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") : "app")}-{autoSlugSuffix}.{wildcardDomain}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 font-sans font-medium">
                    Auto-Provisioned
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Ready immediately upon launch. Traefik automatically routes traffic and terminates TLS encryption without DNS configuration.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-zinc-300">
                  Your Custom Domain FQDN
                </label>
                <input
                  type="text"
                  placeholder="e.g. app.mycompany.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <div className="p-2.5 rounded-md bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between font-mono">
                  <span>
                    Endpoint:{" "}
                    <span className="text-emerald-400 font-bold">
                      https://{domain.trim().replace(/^https?:\/\//, "") || `app-${autoSlugSuffix}.${wildcardDomain}`}
                    </span>
                  </span>
                  <span className="text-zinc-500 text-[10px] font-sans">Point CNAME to server IP</span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Environment Variables (.env format)
            </label>
            <textarea
              rows={5}
              placeholder={`NODE_ENV=production\nAPI_KEY=secret_key_12345\nPORT=3000`}
              value={envText}
              onChange={(e) => setEnvText(e.target.value)}
              className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleFinishDeploy}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow transition"
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
      )}

      {/* GitHub OAuth Configuration Modal */}
      <Dialog open={showOauthModal} onOpenChange={setShowOauthModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <GithubIcon className="w-5 h-5 text-indigo-500" />
              <DialogTitle>Setup GitHub OAuth (1-Click Login)</DialogTitle>
            </div>
            <DialogDescription>
              Agar tombol <strong>Login ke GitHub</strong> dapat bekerja di server Anda, daftarkan OAuth App gratis di GitHub (hanya 1 menit, berlaku untuk seluruh server).
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-muted/60 border border-border space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">Authorization callback URL:</span>
              <button
                type="button"
                onClick={async () => {
                  const cbUrl = `${window.location.origin}/api/github/callback`;
                  await copyToClipboard(cbUrl);
                  setCopiedCallback(true);
                  setTimeout(() => setCopiedCallback(false), 2000);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-secondary hover:bg-secondary/80 text-foreground font-mono text-[11px] transition cursor-pointer"
              >
                {copiedCallback ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-500">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 opacity-60" />
                    <span>Salin URL</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2.5 rounded bg-background border border-border font-mono text-foreground text-[11px] break-all select-all">
              {typeof window !== "undefined" ? `${window.location.origin}/api/github/callback` : "/api/github/callback"}
            </div>

            <a
              href={`https://github.com/settings/applications/new?oauth_application[name]=Colyin+PaaS&oauth_application[url]=${encodeURIComponent(typeof window !== "undefined" ? window.location.origin : "")}&oauth_application[callback_url]=${encodeURIComponent(typeof window !== "undefined" ? `${window.location.origin}/api/github/callback` : "")}`}
              target="_blank"
              rel="noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka Form Buat OAuth App di GitHub</span>
            </a>
          </div>

          <form onSubmit={handleSaveAndLoginOauth} className="space-y-4 text-xs">
            <div className="space-y-1">
              <Label htmlFor="oauth-client-id">Client ID</Label>
              <Input
                id="oauth-client-id"
                type="text"
                required
                placeholder="e.g. Ov23li..."
                value={oauthClientId}
                onChange={(e) => setOauthClientId(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="oauth-client-secret">Client Secret</Label>
              <Input
                id="oauth-client-secret"
                type="password"
                required
                placeholder="••••••••••••••••••••••••"
                value={oauthClientSecret}
                onChange={(e) => setOauthClientSecret(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowOauthModal(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="brand"
                disabled={savingOauth}
                className="gap-2"
              >
                {savingOauth ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GithubIcon className="w-4 h-4" />
                )}
                <span>Simpan &amp; Login ke GitHub</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
