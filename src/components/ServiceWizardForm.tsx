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
  Server,
  Globe,
  Lock,
  Sparkles,
  Search,
  ExternalLink,
} from "lucide-react";

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

  // GitHub Connection State
  const [githubAccount, setGithubAccount] = useState<any>(null);
  const [checkingGithub, setCheckingGithub] = useState(true);
  const [repos, setRepos] = useState<any[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoSearch, setRepoSearch] = useState("");
  const [selectedRepoFullName, setSelectedRepoFullName] = useState("");

  // Step 1: Selected Service Specs
  const [name, setName] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [buildPack, setBuildPack] = useState("NIXPACKS");
  const [internalPort, setInternalPort] = useState(3000);
  const [domain, setDomain] = useState("");

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
      }
    } catch {}
    setLoadingRepos(false);
  };

  useEffect(() => {
    checkGithubStatus();
  }, []);

  const handleConnectGithub = async () => {
    setLoading(true);
    try {
      // Connects account in one-click
      const res = await fetch("/api/github/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "developer" }),
      });
      const data = await res.json();
      if (data.success) {
        setGithubAccount(data.account);
        await loadRepos();
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect GitHub");
    } finally {
      setLoading(false);
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

    // Suggest default port based on language
    if (repo.language === "Python") setInternalPort(8000);
    else if (repo.language === "Go") setInternalPort(8080);
    else setInternalPort(3000);
  };

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !repositoryUrl.trim()) {
      setError("Please select a repository to continue");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleFinishDeploy = async () => {
    setLoading(true);
    setError("");

    try {
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
          domain: domain.trim() || undefined,
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

  const filteredRepos = repos.filter(
    (r) =>
      r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
      r.fullName.toLowerCase().includes(repoSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 text-xs">
        {[
          { num: 1, label: "GitHub Repository" },
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

      {/* Step 1: GitHub Repository Picker */}
      {step === 1 && (
        <div className="space-y-6">
          {checkingGithub ? (
            <div className="p-12 text-center text-xs text-zinc-500">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
              Checking GitHub integration...
            </div>
          ) : !githubAccount ? (
            /* Connect GitHub State */
            <div className="p-8 rounded-xl border border-dashed border-zinc-800 bg-zinc-950 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-white">
                <GithubIcon className="w-6 h-6" />
              </div>
              <div className="max-w-sm mx-auto">
                <h3 className="text-base font-semibold text-white">
                  Connect your GitHub Account
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Connect your GitHub account once to import and deploy your repositories directly with zero configuration. No manual token or PAT needed.
                </p>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleConnectGithub}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-zinc-950 text-xs font-semibold shadow transition"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <GithubIcon className="w-4 h-4" />
                )}
                Connect GitHub Account
              </button>
            </div>
          ) : (
            /* Connected GitHub Repository Selector */
            <form onSubmit={handleNextStep1} className="space-y-5">
              {/* Account Header */}
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300">
                    <GithubIcon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-zinc-300 font-medium">
                    Connected as <strong className="text-white">@{githubAccount.username}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDisconnectGithub}
                  className="text-zinc-500 hover:text-rose-400 text-[11px]"
                >
                  Disconnect
                </button>
              </div>

              {/* Repositories Search & List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-zinc-300">
                    Select Repository to Deploy
                  </label>
                  <span className="text-[11px] text-zinc-500">{repos.length} repositories available</span>
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search your GitHub repositories..."
                    value={repoSearch}
                    onChange={(e) => setRepoSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-500 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {loadingRepos ? (
                  <div className="p-8 text-center text-xs text-zinc-500">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-400" />
                    Fetching your repositories...
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 rounded-lg border border-zinc-800/80 bg-zinc-950/60 p-2">
                    {filteredRepos.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-500">
                        No repositories matching "{repoSearch}"
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
                                : "bg-zinc-900/40 border-zinc-800/80 text-zinc-300 hover:bg-zinc-900 hover:border-zinc-700"
                            }`}
                          >
                            <div>
                              <div className="text-xs font-semibold flex items-center gap-2">
                                <span>{repo.fullName}</span>
                                {repo.isPrivate && (
                                  <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-amber-400 font-mono">
                                    Private
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">
                                {repo.description || "No description"}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-right">
                              {repo.language && (
                                <span className="text-[11px] text-zinc-400 font-mono">
                                  {repo.language}
                                </span>
                              )}
                              <span
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? "border-indigo-500 bg-indigo-600 text-white"
                                    : "border-zinc-700 bg-zinc-800"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Service Config Preview */}
              {selectedRepoFullName && (
                <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Service Name
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Branch
                      </label>
                      <input
                        type="text"
                        required
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Internal Port
                      </label>
                      <input
                        type="number"
                        required
                        value={internalPort}
                        onChange={(e) => setInternalPort(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Public Domain (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="api.domain.com"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={!selectedRepoFullName}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium"
                >
                  Continue to Resources
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Step 2: Resource Attachment */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white">
              Attach to Existing Project Resource
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select an existing database or cache service in this project to automatically inject connection credentials.
            </p>
          </div>

          <div className="space-y-2.5">
            <label
              className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
                selectedAddonId === ""
                  ? "bg-indigo-950/40 border-indigo-500 text-white"
                  : "bg-zinc-800/30 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800/60"
              }`}
            >
              <input
                type="radio"
                name="addon"
                checked={selectedAddonId === ""}
                onChange={() => setSelectedAddonId("")}
                className="mt-0.5 text-indigo-600"
              />
              <div>
                <div className="text-xs font-semibold">None (Stateless Service)</div>
                <div className="text-[11px] text-zinc-500">
                  Do not link any managed database or cache to this service.
                </div>
              </div>
            </label>

            {project.addons.map((addon: any) => (
              <label
                key={addon.id}
                className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
                  selectedAddonId === addon.id
                    ? "bg-indigo-950/40 border-indigo-500 text-white"
                    : "bg-zinc-800/30 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800/60"
                }`}
              >
                <input
                  type="radio"
                  name="addon"
                  checked={selectedAddonId === addon.id}
                  onChange={() => setSelectedAddonId(addon.id)}
                  className="mt-0.5 text-indigo-600"
                />
                <div>
                  <div className="text-xs font-semibold flex items-center gap-2">
                    {addon.name}
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                      {addon.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    Internal: {addon.internalHost}:{addon.internalPort}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
            >
              Continue to Environment
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Env Vars & Final Deploy */}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-white">Environment Variables</h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Paste your .env key-value pairs (one per line). All values are encrypted at-rest with AES-256-GCM.
            </p>
          </div>

          <textarea
            rows={6}
            placeholder={"JWT_SECRET=super-secret-key\nNODE_ENV=production"}
            value={envText}
            onChange={(e) => setEnvText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 font-mono border border-zinc-700 text-white placeholder-zinc-600 text-xs focus:outline-none focus:border-indigo-500"
          />

          <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 text-xs text-zinc-300">
            <div className="font-semibold text-white">Deployment Summary:</div>
            <div className="grid grid-cols-2 gap-2 text-zinc-400 text-[11px]">
              <div>Repository: {selectedRepoFullName}</div>
              <div>Service: {name}</div>
              <div>Branch: {branch}</div>
              <div>Port: {internalPort}</div>
              <div>Resource Attachment: {selectedAddonId ? "Connected" : "None"}</div>
              <div>Routing Domain: {domain || "Internal only"}</div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleFinishDeploy}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold shadow-md transition"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Deploy Service Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
