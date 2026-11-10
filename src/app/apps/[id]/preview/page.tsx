import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDockerDaemonStatus } from "@/lib/engine/docker";
import { validatePort } from "@/lib/engine/ports";
import Link from "next/link";
import {
  ChevronRight,
  Globe,
  Lock,
  Server,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Terminal,
  Cpu,
  Layers,
  ArrowLeft,
  Info,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { StatusBadge } from "@/components/StatusBadge";
import { LiveEndpointTester } from "@/components/LiveEndpointTester";

export default async function AppPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: appId } = await params;

  const app = await db.application.findUnique({
    where: { id: appId },
    include: {
      project: true,
      domains: true,
      deployments: {
        orderBy: { startedAt: "desc" },
        take: 5,
      },
      envVariables: true,
    },
  });

  if (!app) notFound();

  const primaryDomain = app.domains.find((d) => d.isPrimary) || app.domains[0];
  const accessUrl = primaryDomain
    ? (primaryDomain.host.startsWith("http") ? primaryDomain.host : `https://${primaryDomain.host}`)
    : `http://localhost:${app.internalPort}`;
  const localDirectUrl = `http://localhost:${app.internalPort}`;

  const dockerStatus = await getDockerDaemonStatus();
  const latestDeploy = app.deployments.find((d) => d.id === app.activeDeployId) || app.deployments[0];
  const isPortOccupied = !(await validatePort(app.internalPort, { excludeAppId: app.id })).available;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <Link href="/" className="hover:text-zinc-300">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/projects/${app.project.id}`} className="hover:text-zinc-300">
            {app.project.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/apps/${app.id}`} className="hover:text-zinc-300">
            {app.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-300 font-medium">Ingress &amp; Preview Simulator</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3.5">
            <Link
              href={`/apps/${app.id}`}
              className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              title="Back to Console"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>{app.name}</span>
                  <span className="text-xs font-mono text-zinc-400 font-normal">
                    (:{app.internalPort})
                  </span>
                </h1>
                <StatusBadge status={latestDeploy?.status || "STOPPED"} />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Ingress routing diagnostics, port verification, and simulation sandbox
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={localDirectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Local Port (: {app.internalPort})</span>
            </a>
            <Link
              href={`/apps/${app.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition cursor-pointer"
            >
              <Server className="w-3.5 h-3.5" />
              <span>App Console</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Active Ingress Proxy Card */}
      <div className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-zinc-950 to-zinc-950 shadow-xl space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
            <Globe className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-emerald-200">
                Native Ingress Reverse Proxy Active
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Ports 80 &amp; 443 Live
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Domain <span className="font-mono text-emerald-300">{primaryDomain?.host}</span> kini aktif dirouting otomatis melalui Ingress Reverse Proxy ke internal port <span className="font-mono text-zinc-200">:{app.internalPort}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Network & Ingress Routing Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Ingress & Live Endpoint Tester */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ingress Card */}
          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-bold text-white">Ingress &amp; Domain Topology</h2>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">
                SSL: {primaryDomain?.sslEnabled ? "Active (TLS)" : "Disabled"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                    Assigned Public Ingress
                  </div>
                  <div className="text-xs font-mono font-bold text-indigo-300 mt-0.5">
                    {accessUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={accessUrl} label="Copy Ingress" />
                  <a
                    href={accessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                    title="Open Public Ingress URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                    Direct Local Host Port
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-0.5">
                    {localDirectUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={localDirectUrl} label="Copy Local URL" />
                  <a
                    href={localDirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-950/70 text-emerald-300 text-xs font-medium transition"
                  >
                    <span>Open Port</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <div>
                  <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                    Internal Mesh Address (Docker Network)
                  </div>
                  <div className="text-xs font-mono text-zinc-300 mt-0.5">
                    http://{app.slug}:{app.internalPort}
                  </div>
                </div>
                <CopyButton text={`http://${app.slug}:${app.internalPort}`} label="Copy Mesh" />
              </div>
            </div>
          </div>

          {/* Real-time Endpoint Tester Component */}
          <LiveEndpointTester
            appId={app.id}
            port={app.internalPort}
            localUrl={localDirectUrl}
            accessUrl={accessUrl}
            dockerOnline={dockerStatus.online}
          />
        </div>

        {/* Right 1 Col: Diagnostics & Deployment Metadata */}
        <div className="space-y-6">
          {/* Runtime & Host Health */}
          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              <span>Runtime Environment</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <span className="text-zinc-400">Docker Daemon</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    dockerStatus.online
                      ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800"
                      : "bg-amber-950/80 text-amber-300 border border-amber-800"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      dockerStatus.online ? "bg-emerald-400" : "bg-amber-400"
                    }`}
                  />
                  {dockerStatus.online ? "Online (Connected)" : "Simulated Local Mode"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <span className="text-zinc-400">Local Port Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isPortOccupied
                      ? "bg-indigo-950 text-indigo-300 border border-indigo-800"
                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                  }`}
                >
                  {isPortOccupied ? `Listening (: ${app.internalPort})` : `Idle (: ${app.internalPort})`}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <span className="text-zinc-400">Target Framework</span>
                <span className="font-mono text-zinc-200">{app.buildPack || "Nixpacks Auto"}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <span className="text-zinc-400">Memory Allocation</span>
                <span className="font-mono text-zinc-200">{app.memoryLimitMb} MB</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80">
                <span className="text-zinc-400">CPU Shares</span>
                <span className="font-mono text-zinc-200">{app.cpuLimit} Core(s)</span>
              </div>
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 backdrop-blur space-y-3">
            <h3 className="text-xs font-bold text-zinc-200 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              <span>Testing Guide</span>
            </h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Untuk menguji aplikasi Anda secara lokal tanpa Docker, buka terminal di folder project Anda dan jalankan dev server pada port <span className="font-mono text-zinc-300">:{app.internalPort}</span>:
            </p>
            <div className="p-2.5 rounded bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-emerald-400 flex items-center justify-between">
              <code>npm run dev -- -p {app.internalPort}</code>
              <CopyButton text={`npm run dev -- -p ${app.internalPort}`} label="Copy" />
            </div>
            <p className="text-[11px] text-zinc-500">
              Setelah dev server berjalan, Anda dapat me-refresh port check di atas atau membuka <span className="font-mono text-zinc-400">{localDirectUrl}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
