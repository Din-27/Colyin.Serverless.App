"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface PortStatus {
  checking: boolean;
  available: boolean;
  reason?: string;
  suggestedPort?: number;
}

interface ServiceWizardContextType {
  project: any;
  step: number;
  setStep: (step: number) => void;
  loading: boolean;
  setLoading: (l: boolean) => void;
  error: string;
  setError: (e: string) => void;

  // Source Mode
  sourceMode: "github" | "direct";
  setSourceMode: (m: "github" | "direct") => void;

  // GitHub Connection State
  githubAccount: any;
  setGithubAccount: React.Dispatch<React.SetStateAction<any>>;
  checkingGithub: boolean;
  cliAccounts: any[];
  selectedCliAccount: string;
  setSelectedCliAccount: (s: string) => void;
  showManualForm: boolean;
  setShowManualForm: (b: boolean) => void;
  repos: any[];
  loadingRepos: boolean;
  repoSearch: string;
  setRepoSearch: (s: string) => void;
  selectedRepoFullName: string;
  setSelectedRepoFullName: (s: string) => void;
  repoFilter: "all" | "private" | "public";
  setRepoFilter: (f: "all" | "private" | "public") => void;

  // Connect Inputs
  inputUsername: string;
  setInputUsername: (s: string) => void;
  inputToken: string;
  setInputToken: (s: string) => void;
  showTokenInput: boolean;
  setShowTokenInput: (b: boolean) => void;
  directGitToken: string;
  setDirectGitToken: (s: string) => void;

  // Inline Add Token state
  showAddTokenForm: boolean;
  setShowAddTokenForm: (b: boolean) => void;
  inlineToken: string;
  setInlineToken: (s: string) => void;
  inlineTokenLoading: boolean;

  // GitHub OAuth States
  isOauthConfigured: boolean;
  showOauthModal: boolean;
  setShowOauthModal: (b: boolean) => void;
  oauthClientId: string;
  setOauthClientId: (s: string) => void;
  oauthClientSecret: string;
  setOauthClientSecret: (s: string) => void;
  savingOauth: boolean;
  copiedCallback: boolean;
  setCopiedCallback: (b: boolean) => void;

  // Step 1 Specs
  name: string;
  setName: (s: string) => void;
  repositoryUrl: string;
  setRepositoryUrl: (s: string) => void;
  branch: string;
  setBranch: (s: string) => void;
  buildPack: string;
  setBuildPack: (s: string) => void;
  runtimeVersion: string;
  setRuntimeVersion: (s: string) => void;
  internalPort: number;
  setInternalPort: (p: number) => void;
  portStatus: PortStatus;
  domain: string;
  setDomain: (s: string) => void;
  wildcardDomain: string;
  domainMode: "auto" | "custom";
  setDomainMode: (m: "auto" | "custom") => void;
  cpuLimit: number;
  setCpuLimit: (n: number) => void;
  memoryLimitMb: number;
  setMemoryLimitMb: (n: number) => void;
  resourceMode: "AUTO" | "ECO" | "STANDARD" | "HIGH" | "CUSTOM";
  setResourceMode: (m: "AUTO" | "ECO" | "STANDARD" | "HIGH" | "CUSTOM") => void;
  autoSlugSuffix: string;

  // Step 2 & 3
  selectedAddonId: string;
  setSelectedAddonId: (id: string) => void;
  envText: string;
  setEnvText: (t: string) => void;

  // Actions
  checkPortAvailability: (portToTest: number, autoApply?: boolean) => Promise<void>;
  checkGithubStatus: () => Promise<void>;
  loadRepos: () => Promise<void>;
  handleLoginWithGithub: () => void;
  handleSaveAndLoginOauth: (e: React.FormEvent) => Promise<void>;
  handleConnectGithub: (e: React.FormEvent) => Promise<void>;
  handleConnectWithCli: (accountName?: string) => Promise<void>;
  handleUpdateToken: (e: React.FormEvent) => Promise<void>;
  handleDisconnectGithub: () => Promise<void>;
  handleSelectRepo: (repo: any) => void;
  handleNextStep1: (e: React.FormEvent) => void;
  handleFinishDeploy: () => Promise<void>;
}

const ServiceWizardContext = createContext<ServiceWizardContextType | null>(null);

export function useServiceWizard() {
  const context = useContext(ServiceWizardContext);
  if (!context) {
    throw new Error("useServiceWizard must be used within a ServiceWizardProvider");
  }
  return context;
}

export function ServiceWizardProvider({
  project,
  children,
}: {
  project: any;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // Inline Add Token state
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
  const [portStatus, setPortStatus] = useState<PortStatus>({
    checking: false,
    available: true,
  });
  const [domain, setDomain] = useState("");
  const [wildcardDomain, setWildcardDomain] = useState("127.0.0.1.sslip.io");
  const [domainMode, setDomainMode] = useState<"auto" | "custom">("auto");
  const [cpuLimit, setCpuLimit] = useState(1.0);
  const [memoryLimitMb, setMemoryLimitMb] = useState(512);
  const [resourceMode, setResourceMode] = useState<"AUTO" | "ECO" | "STANDARD" | "HIGH" | "CUSTOM">("AUTO");
  const [autoSlugSuffix] = useState(() => Math.random().toString(36).substring(2, 8));

  // Step 2 & 3
  const [selectedAddonId, setSelectedAddonId] = useState("");
  const [envText, setEnvText] = useState("");

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

      // 3. Trigger Deploy
      await fetch(`/api/apps/${appId}/deploy`, { method: "POST" });
      router.push(`/apps/${appId}`);
    } catch (err: any) {
      setError(err.message || "Failed to launch service");
      setLoading(false);
    }
  };

  return (
    <ServiceWizardContext.Provider
      value={{
        project,
        step,
        setStep,
        loading,
        setLoading,
        error,
        setError,
        sourceMode,
        setSourceMode,
        githubAccount,
        setGithubAccount,
        checkingGithub,
        cliAccounts,
        selectedCliAccount,
        setSelectedCliAccount,
        showManualForm,
        setShowManualForm,
        repos,
        loadingRepos,
        repoSearch,
        setRepoSearch,
        selectedRepoFullName,
        setSelectedRepoFullName,
        repoFilter,
        setRepoFilter,
        inputUsername,
        setInputUsername,
        inputToken,
        setInputToken,
        showTokenInput,
        setShowTokenInput,
        directGitToken,
        setDirectGitToken,
        showAddTokenForm,
        setShowAddTokenForm,
        inlineToken,
        setInlineToken,
        inlineTokenLoading,
        isOauthConfigured,
        showOauthModal,
        setShowOauthModal,
        oauthClientId,
        setOauthClientId,
        oauthClientSecret,
        setOauthClientSecret,
        savingOauth,
        copiedCallback,
        setCopiedCallback,
        name,
        setName,
        repositoryUrl,
        setRepositoryUrl,
        branch,
        setBranch,
        buildPack,
        setBuildPack,
        runtimeVersion,
        setRuntimeVersion,
        internalPort,
        setInternalPort,
        portStatus,
        domain,
        setDomain,
        wildcardDomain,
        domainMode,
        setDomainMode,
        cpuLimit,
        setCpuLimit,
        memoryLimitMb,
        setMemoryLimitMb,
        resourceMode,
        setResourceMode,
        autoSlugSuffix,
        selectedAddonId,
        setSelectedAddonId,
        envText,
        setEnvText,
        checkPortAvailability,
        checkGithubStatus,
        loadRepos,
        handleLoginWithGithub,
        handleSaveAndLoginOauth,
        handleConnectGithub,
        handleConnectWithCli,
        handleUpdateToken,
        handleDisconnectGithub,
        handleSelectRepo,
        handleNextStep1,
        handleFinishDeploy,
      }}
    >
      {children}
    </ServiceWizardContext.Provider>
  );
}
