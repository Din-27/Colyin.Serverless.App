import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getDockerDaemonStatus } from "@/lib/engine/docker";
import { validatePort } from "@/lib/engine/ports";
import { formatAccessUrl } from "@/lib/engine/domains";
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

export const dynamic = "force-dynamic";

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

  const primaryDomain = app.domains.find((d: any) => d.isPrimary) || app.domains[0];
  const accessUrl = formatAccessUrl(primaryDomain?.host, app.internalPort);
  const localDirectUrl = `http://localhost:${app.internalPort}`;

  const dockerStatus = await getDockerDaemonStatus();
  const latestDeploy = app.deployments.find((d: any) => d.id === app.activeDeployId) || app.deployments[0];
  const isPortOccupied = !(await validatePort(app.internalPort, { excludeAppId: app.id })).available;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Top Breadcrumb */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
          <Link href="/" className="hover:text-foreground transition-colors">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <Link href={`/projects/${app.project.id}`} className="hover:text-foreground transition-colors">
            {app.project.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <Link href={`/apps/${app.id}`} className="hover:text-foreground transition-colors">
            {app.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-foreground font-medium">Simulator</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
          <div className="flex items-center gap-3.5">
            <Link
              href={`/apps/${app.id}`}
              className="p-2 rounded-lg bg-secondary border border-border hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              title="Back to Console"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <span>{app.name}</span>
                  <span className="text-xs font-mono text-muted-foreground font-normal">
                    (:{app.internalPort})
                  </span>
                </h1>
                <StatusBadge status={latestDeploy?.status || "STOPPED"} />
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ingress routing diagnostics, port verification, and simulation sandbox
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href={localDirectUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Local Port (: {app.internalPort})</span>
            </a>
            <Link
              href={`/apps/${app.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium transition cursor-pointer"
            >
              <Server className="w-3.5 h-3.5" />
              <span>App Console</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Active Ingress Proxy Card */}
      <div className="p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card to-card shadow-sm space-y-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 mt-0.5">
            <Globe className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground">
                Native Ingress Reverse Proxy Active
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                Ports 80 &amp; 443 Live
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Domain <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{primaryDomain?.host}</span> kini aktif dirouting otomatis melalui Ingress Reverse Proxy ke internal port <span className="font-mono text-foreground font-semibold">:{app.internalPort}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Network & Ingress Routing Status Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Ingress & Live Endpoint Tester */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ingress Card */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-bold text-foreground">Ingress &amp; Domain Topology</h2>
              </div>
              <span className="text-[11px] font-mono text-muted-foreground">
                SSL: {primaryDomain?.sslEnabled ? "Active (TLS)" : "Disabled"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-background border border-border">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Assigned Public Ingress
                  </div>
                  <div className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {accessUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={accessUrl} label="Copy Ingress" />
                  <a
                    href={accessUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition"
                    title="Open Public Ingress URL"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-background border border-border">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Direct Local Host Port
                  </div>
                  <div className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {localDirectUrl}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={localDirectUrl} label="Copy Local URL" />
                  <a
                    href={localDirectUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs font-medium transition cursor-pointer"
                  >
                    <span>Open Port</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-background border border-border">
                <div>
                  <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Internal Mesh Address (Docker Network)
                  </div>
                  <div className="text-xs font-mono text-foreground mt-0.5">
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
          <div className="p-5 rounded-xl border border-border bg-card space-y-4">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-500" />
              <span>Runtime Environment</span>
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground">Docker Daemon</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    dockerStatus.online
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      dockerStatus.online ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {dockerStatus.online ? "Online (Connected)" : "Simulated Local Mode"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground">Local Port Status</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    isPortOccupied
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {isPortOccupied ? `Listening (: ${app.internalPort})` : `Idle (: ${app.internalPort})`}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground">Target Framework</span>
                <span className="font-mono text-foreground font-medium">{app.buildPack || "Nixpacks Auto"}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground">Memory Allocation</span>
                <span className="font-mono text-foreground font-medium">{app.memoryLimitMb} MB</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border">
                <span className="text-muted-foreground">CPU Shares</span>
                <span className="font-mono text-foreground font-medium">{app.cpuLimit} Core(s)</span>
              </div>
            </div>
          </div>

          {/* Quick Help Card */}
          <div className="p-5 rounded-xl border border-border bg-card space-y-3">
            <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              <span>Testing Guide</span>
            </h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Untuk menguji aplikasi Anda secara lokal tanpa Docker, buka terminal di folder project Anda dan jalankan dev server pada port <span className="font-mono text-foreground font-medium">:{app.internalPort}</span>:
            </p>
            <div className="p-2.5 rounded bg-background border border-border font-mono text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
              <code>npm run dev -- -p {app.internalPort}</code>
              <CopyButton text={`npm run dev -- -p ${app.internalPort}`} label="Copy" />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Setelah dev server berjalan, Anda dapat me-refresh port check di atas atau membuka <span className="font-mono text-muted-foreground">{localDirectUrl}</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
