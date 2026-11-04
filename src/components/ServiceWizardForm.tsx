"use client";

import { useState } from "react";
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
} from "lucide-react";

export function ServiceWizardForm({ project }: { project: any }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Source
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

  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !repositoryUrl) {
      setError("Service Name and Git Repository URL are required");
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

      // If user selected an attached addon, generate connection string
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

      // Parse user manual env text (KEY=VALUE)
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

  return (
    <div className="space-y-6">
      {/* Step Indicators */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800 text-xs">
        {[
          { num: 1, label: "Source & Runtime" },
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

      {/* Step 1: Source */}
      {step === 1 && (
        <form onSubmit={handleNextStep1} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Service Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. backend-api"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Git Repository URL
            </label>
            <input
              type="text"
              required
              placeholder="https://github.com/username/my-backend.git"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Branch
              </label>
              <input
                type="text"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Internal Port
              </label>
              <input
                type="number"
                required
                value={internalPort}
                onChange={(e) => setInternalPort(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Build Method
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setBuildPack("NIXPACKS")}
                className={`p-3 rounded-lg border text-left transition ${
                  buildPack === "NIXPACKS"
                    ? "bg-indigo-950/40 border-indigo-500 text-white"
                    : "bg-zinc-800/40 border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="text-xs font-semibold">Nixpacks (Auto-detect)</div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Automatically detects Node, Python, Go, Rust without Dockerfile.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBuildPack("DOCKERFILE")}
                className={`p-3 rounded-lg border text-left transition ${
                  buildPack === "DOCKERFILE"
                    ? "bg-indigo-950/40 border-indigo-500 text-white"
                    : "bg-zinc-800/40 border-zinc-700 text-zinc-400"
                }`}
              >
                <div className="text-xs font-semibold">Custom Dockerfile</div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Builds using the Dockerfile in your repo root.
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Public Domain (Optional)
            </label>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="api.yourdomain.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
            >
              Continue to Resources
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
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
              <div>Service: {name}</div>
              <div>Branch: {branch}</div>
              <div>Buildpack: {buildPack}</div>
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
