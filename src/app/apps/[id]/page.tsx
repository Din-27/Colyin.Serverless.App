import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDockerDaemonStatus } from "@/lib/engine/docker";
import { formatAccessUrl } from "@/lib/engine/domains";
import { AppConsoleTabs } from "@/components/AppConsoleTabs";
import Link from "next/link";
import { ChevronRight, Server, Globe, ExternalLink, Lock } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteAppButton } from "@/components/DeleteAppButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id: appId } = await params;

  const app = await db.application.findUnique({
    where: { id: appId },
    include: {
      project: true,
      domains: true,
      deployments: {
        orderBy: { startedAt: "desc" },
        take: 15,
      },
      envVariables: true,
    },
  });

  if (!app) notFound();

  const dockerStatus = await getDockerDaemonStatus();
  const activeDeployment = app.deployments.find((d) => d.id === app.activeDeployId) || app.deployments[0];
  const primaryDomain = app.domains.find((d) => d.isPrimary) || app.domains[0];
  const accessUrl = formatAccessUrl(primaryDomain?.host, app.internalPort);
  const localDirectUrl = `http://localhost:${app.internalPort}`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <Link href="/" className="hover:text-foreground transition-colors">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <Link href={`/projects/${app.project.id}`} className="hover:text-foreground transition-colors">
            {app.project.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-foreground font-medium">{app.name}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground">
              <Server className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{app.name}</h1>
                <StatusBadge status={activeDeployment?.status || "STOPPED"} />
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                <span className="truncate max-w-xs">{app.repositoryUrl}</span>
                <span>&bull;</span>
                <span>Branch: {app.branch}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <Link href={`/apps/${app.id}/preview`}>
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>Simulator</span>
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="gap-2 font-mono text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 shadow-xs">
              <a
                href={accessUrl}
                target="_blank"
                rel="noreferrer"
                title={`Open ${accessUrl} in new tab`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{primaryDomain ? primaryDomain.host : `localhost:${app.internalPort}`}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            </Button>
            <DeleteAppButton appId={app.id} appName={app.name} projectId={app.project.id} />
          </div>
        </div>
      </div>

      {/* Main Tabbed Console */}
      <AppConsoleTabs
        app={app}
        activeDeployment={activeDeployment}
        accessUrl={accessUrl}
        localDirectUrl={localDirectUrl}
        dockerOnline={dockerStatus.online}
      />
    </div>
  );
}
