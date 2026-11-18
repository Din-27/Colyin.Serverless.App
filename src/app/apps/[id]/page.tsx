import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getDockerDaemonStatus } from "@/lib/engine/docker";
import { formatAccessUrl } from "@/lib/engine/domains";
import { AppConsoleTabs } from "@/components/AppConsoleTabs";
import Link from "next/link";
import { ChevronRight, Server, Globe, ExternalLink, Lock, GitBranch, GitCommit } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteAppButton } from "@/components/DeleteAppButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

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
  const activeDeployment = app.deployments.find((d: any) => d.id === app.activeDeployId) || app.deployments[0];
  const primaryDomain = app.domains.find((d: any) => d.isPrimary) || app.domains[0];
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
            <div className="w-10 h-10 rounded-xl bg-muted/60 border border-border flex items-center justify-center text-foreground shadow-2xs">
              <Server className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{app.name}</h1>
                <StatusBadge status={activeDeployment?.status || "STOPPED"} />
                <HoverCard>
                  <HoverCardTrigger>
                    <Badge variant="outline" className="font-mono text-xs font-semibold bg-muted text-foreground border-border cursor-help shadow-2xs">
                      {(app as any).version || (activeDeployment as any)?.version || "v1.0.0"}
                    </Badge>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-56 text-xs space-y-1">
                    <div className="font-semibold text-foreground">Current Active Release</div>
                    <div className="text-[11px] text-muted-foreground">Version tracking tag for this container rollout.</div>
                  </HoverCardContent>
                </HoverCard>
              </div>

              {/* Clean metadata labels with Info Hover Cards */}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground font-mono flex-wrap">
                <span className="truncate max-w-xs text-foreground/80">{app.repositoryUrl}</span>
                <span>&bull;</span>
                <HoverCard>
                  <HoverCardTrigger>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border cursor-help transition-colors shadow-2xs">
                      <GitBranch className="w-3.5 h-3.5" />
                    </span>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-60 text-xs space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5 text-primary" />
                      <span>Tracked Branch</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Deployments are pulled from branch <code className="font-mono text-foreground font-semibold bg-muted px-1 py-0.5 rounded">{app.branch}</code>.
                    </div>
                  </HoverCardContent>
                </HoverCard>

                {activeDeployment?.commitHash && (
                  <>
                    <span>&bull;</span>
                    <HoverCard>
                      <HoverCardTrigger>
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border border-border cursor-help transition-colors shadow-2xs">
                          <GitCommit className="w-3.5 h-3.5" />
                        </span>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-64 text-xs space-y-1">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <GitCommit className="w-3.5 h-3.5 text-primary" />
                          <span>Active Commit SHA</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono break-all bg-muted p-1 rounded">
                          {activeDeployment.commitHash}
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button asChild variant="outline" size="icon" className="h-8 w-8 shadow-xs border-border bg-card hover:bg-accent text-foreground">
                  <Link href={`/apps/${app.id}/preview`} aria-label="Interactive Simulator">
                    <Globe className="w-4 h-4 text-foreground" />
                  </Link>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-60 text-xs space-y-1">
                <div className="font-semibold text-foreground">Interactive Simulator</div>
                <div className="text-[11px] text-muted-foreground">Preview routing topology, direct port proxy, and curl commands.</div>
              </HoverCardContent>
            </HoverCard>

            <HoverCard>
              <HoverCardTrigger>
                <Button asChild variant="outline" size="sm" className="gap-2 font-mono text-xs border-border bg-card hover:bg-accent text-foreground shadow-xs">
                  <a
                    href={accessUrl}
                    target="_blank"
                    rel="noreferrer"
                    title={`Open ${accessUrl} in new tab`}
                  >
                    <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{primaryDomain ? primaryDomain.host : `localhost:${app.internalPort}`}</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-64 text-xs space-y-1">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                  <span>Live Endpoint Access</span>
                </div>
                <div className="text-[11px] text-muted-foreground">Launch the active web application endpoint in a new browser tab.</div>
              </HoverCardContent>
            </HoverCard>

            <DeleteAppButton appId={app.id} appName={app.name} projectId={app.project.id} />
          </div>
        </div>
      </div>

      {/* Main Tabbed Console */}
      <AppConsoleTabs
        app={app}
        activeDeployment={activeDeployment}
        dockerOnline={dockerStatus.online}
      />
    </div>
  );
}
