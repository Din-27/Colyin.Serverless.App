"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatAccessUrl } from "@/lib/engine/domains";
import {
  Server,
  Database,
  Plus,
  Globe,
  HardDrive,
  Cpu,
  Layers,
  ExternalLink,
  ChevronRight,
  Lock,
  LayoutGrid,
  List,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateAddonModal } from "@/components/CreateAddonModal";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { cn } from "@/lib/utils";

interface ApplicationDomain {
  id: string;
  host: string;
  isPrimary: boolean;
  sslEnabled: boolean;
}

interface ApplicationDeployment {
  id: string;
  status: string;
  startedAt: string | Date;
  version?: string | null;
}

interface ApplicationItem {
  id: string;
  name: string;
  slug: string;
  buildPack: string;
  internalPort: number;
  cpuLimit: number;
  memoryLimitMb: number;
  version?: string | null;
  domains: ApplicationDomain[];
  deployments: ApplicationDeployment[];
}

interface AddonItem {
  id: string;
  name: string;
  type: string;
  status: string;
  internalHost: string;
  internalPort: number;
  publicPort?: number | null;
  volumeName?: string | null;
}

interface ProjectData {
  id: string;
  name: string;
  description?: string | null;
  networkName: string;
  createdAt: string | Date;
  applications: ApplicationItem[];
  addons: AddonItem[];
}

export function ProjectDetailView({
  project,
}: {
  project: ProjectData;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Persist view preference in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("project-detail-view-mode");
      if (saved === "grid" || saved === "list") {
        setViewMode(saved);
      }
    } catch {}
  }, []);

  const handleSetViewMode = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("project-detail-view-mode", mode);
    } catch {}
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Project Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
            <Link href="/" className="hover:text-foreground transition-colors">
              Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-foreground font-medium">{project.name}</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {project.name}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="font-mono text-[11px] gap-1.5 bg-secondary/40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Network: {project.networkName}</span>
            </Badge>
            <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle Button */}
          <div className="flex items-center gap-1 bg-secondary/80 p-1 rounded-lg border border-border mr-1">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleSetViewMode("grid")}
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5 cursor-pointer",
                viewMode === "grid"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleSetViewMode("list")}
              className={cn(
                "h-7 px-2.5 text-xs gap-1.5 cursor-pointer",
                viewMode === "list"
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </Button>
          </div>

          <DeleteProjectButton projectId={project.id} projectName={project.name} />
          <CreateAddonModal projectId={project.id} />
          <Button asChild variant="brand" className="gap-2 shadow-xs cursor-pointer">
            <Link href={`/projects/${project.id}/new`}>
              <Plus className="w-4 h-4" />
              <span>Deploy Service</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Applications Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Server className="w-4 h-4 text-foreground" />
            <span>Applications ({project.applications.length})</span>
          </h2>
        </div>

        {project.applications.length === 0 ? (
          <Card className="border-dashed p-8 text-center bg-card/40">
            <Server className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No applications deployed yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Deploy your Git repository or Docker image directly into this private network.
            </p>
            <div className="mt-4">
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href={`/projects/${project.id}/new`}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deploy Service</span>
                </Link>
              </Button>
            </div>
          </Card>
        ) : viewMode === "grid" ? (
          /* GRID VIEW - Applications */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {project.applications.map((app) => {
              const latestDeploy = app.deployments[0];
              const primaryDomain = app.domains.find((d) => d.isPrimary) || app.domains[0];
              const appAccessUrl = formatAccessUrl(primaryDomain?.host, app.internalPort);
              const displayLabel = primaryDomain ? primaryDomain.host : `localhost:${app.internalPort}`;

              return (
                <Card
                  key={app.id}
                  className="hover:-translate-y-0.5 hover:shadow-md hover:border-foreground/30 transition-all duration-200 flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/apps/${app.id}`}
                          className="font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {app.name}
                        </Link>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5">
                          Port {app.internalPort} &bull; {app.buildPack}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <StatusBadge status={latestDeploy?.status || "STOPPED"} />
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border">
                          {app.version || latestDeploy?.version || "v1.0.0"}
                        </span>
                      </div>
                    </div>

                    {/* Domain / Route Access Link */}
                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <a
                        href={appAccessUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-foreground hover:underline truncate max-w-[210px]"
                        title={`Open ${appAccessUrl} in new tab`}
                      >
                        <Globe className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{displayLabel}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                      </a>
                      <span className="text-[10px] font-sans font-medium">
                        {primaryDomain ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                            <Lock className="w-2.5 h-2.5" />
                            HTTPS
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Port {app.internalPort}</span>
                        )}
                      </span>
                    </div>
                  </CardHeader>

                  <CardFooter className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <HoverCard openDelay={150}>
                        <HoverCardTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help hover:text-foreground transition-colors">
                            <Cpu className="w-3.5 h-3.5 text-primary" />
                            <span>{app.cpuLimit} CPU</span>
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-52 text-xs space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-primary" />
                            <span>CPU Core Quota</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {app.cpuLimit} dedicated virtual CPU cores allocated.
                          </div>
                        </HoverCardContent>
                      </HoverCard>

                      <HoverCard openDelay={150}>
                        <HoverCardTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help hover:text-foreground transition-colors">
                            <HardDrive className="w-3.5 h-3.5 text-primary" />
                            <span>{app.memoryLimitMb}MB</span>
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-52 text-xs space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-primary" />
                            <span>RAM Ceiling</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {app.memoryLimitMb} MB maximum memory ceiling with OOM protection.
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <Link
                      href={`/apps/${app.id}`}
                      className="text-xs font-medium text-foreground hover:underline flex items-center gap-1"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW - Applications */
          <div className="space-y-3">
            {project.applications.map((app) => {
              const latestDeploy = app.deployments[0];
              const primaryDomain = app.domains.find((d) => d.isPrimary) || app.domains[0];
              const appAccessUrl = formatAccessUrl(primaryDomain?.host, app.internalPort);
              const displayLabel = primaryDomain ? primaryDomain.host : `localhost:${app.internalPort}`;

              return (
                <div
                  key={app.id}
                  className="rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/30 hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="shrink-0">
                      <StatusBadge status={latestDeploy?.status || "STOPPED"} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/apps/${app.id}`}
                          className="font-semibold text-sm text-foreground hover:text-primary transition-colors truncate"
                        >
                          {app.name}
                        </Link>
                        <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border shrink-0">
                          {app.version || latestDeploy?.version || "v1.0.0"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                        <span>Port {app.internalPort}</span>
                        <span>&bull;</span>
                        <span className="capitalize">{app.buildPack}</span>
                      </div>
                    </div>
                  </div>

                  {/* Domain & Mesh link */}
                  <div className="flex items-center gap-2 text-xs font-mono min-w-0 md:max-w-xs">
                    <a
                      href={appAccessUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-foreground hover:underline truncate"
                      title={`Open ${appAccessUrl} in new tab`}
                    >
                      <Globe className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{displayLabel}</span>
                      <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                    </a>
                  </div>

                  {/* Resource Badges & Action */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <HoverCard openDelay={150}>
                        <HoverCardTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help hover:text-foreground transition-colors px-2 py-1 rounded bg-muted/40 border border-border">
                            <Cpu className="w-3 h-3 text-primary" />
                            <span>{app.cpuLimit} CPU</span>
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-52 text-xs space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-primary" />
                            <span>CPU Core Quota</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {app.cpuLimit} dedicated virtual CPU cores allocated.
                          </div>
                        </HoverCardContent>
                      </HoverCard>

                      <HoverCard openDelay={150}>
                        <HoverCardTrigger asChild>
                          <span className="flex items-center gap-1 cursor-help hover:text-foreground transition-colors px-2 py-1 rounded bg-muted/40 border border-border">
                            <HardDrive className="w-3 h-3 text-primary" />
                            <span>{app.memoryLimitMb}MB</span>
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-52 text-xs space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <HardDrive className="w-3.5 h-3.5 text-primary" />
                            <span>RAM Ceiling</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {app.memoryLimitMb} MB maximum memory ceiling with OOM protection.
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>

                    <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                      <Link href={`/apps/${app.id}`}>
                        <span>Manage</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Addons & Managed Databases Section */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>Databases & Addons ({project.addons.length})</span>
          </h2>
        </div>

        {project.addons.length === 0 ? (
          <Card className="border-dashed p-8 text-center bg-card/40">
            <Database className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
            <p className="text-sm font-medium text-foreground">No database addons provisioned yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Add a managed PostgreSQL, Redis, RabbitMQ, or MinIO instance with one click.
            </p>
          </Card>
        ) : viewMode === "grid" ? (
          /* GRID VIEW - Addons */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {project.addons.map((addon) => (
              <Card
                key={addon.id}
                className="hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        href={`/addons/${addon.id}`}
                        className="font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        {addon.name}
                      </Link>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        Port {addon.internalPort} &bull; {addon.type}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <StatusBadge status={addon.status} />
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        {addon.type}
                      </span>
                    </div>
                  </div>

                  {/* Internal Connection & Public Access Row */}
                  <div className="mt-3 flex items-center justify-between text-xs font-mono">
                    <Link
                      href={`/addons/${addon.id}`}
                      className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 hover:underline truncate max-w-[210px]"
                      title={`Internal Host: ${addon.internalHost}:${addon.internalPort}`}
                    >
                      <Database className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{addon.internalHost}:{addon.internalPort}</span>
                    </Link>
                    <span className="text-[10px] font-sans font-medium">
                      {addon.publicPort ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono font-semibold">
                          <Globe className="w-2.5 h-2.5" />
                          :{addon.publicPort}
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Private
                        </span>
                      )}
                    </span>
                  </div>
                </CardHeader>

                <CardFooter className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 truncate max-w-[160px]" title={addon.volumeName || "Volume"}>
                      <HardDrive className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{addon.volumeName || "Volume"}</span>
                    </span>
                  </div>
                  <Link
                    href={`/addons/${addon.id}`}
                    className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Manage</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          /* LIST VIEW - Addons */
          <div className="space-y-3">
            {project.addons.map((addon) => (
              <div
                key={addon.id}
                className="rounded-xl border border-border bg-card p-4 transition-all hover:border-emerald-500/40 hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="shrink-0">
                    <StatusBadge status={addon.status} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/addons/${addon.id}`}
                        className="font-semibold text-sm text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                      >
                        {addon.name}
                      </Link>
                      <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                        {addon.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                      <span>Port {addon.internalPort}</span>
                      <span>&bull;</span>
                      <span className="text-foreground/80">{addon.internalHost}</span>
                    </div>
                  </div>
                </div>

                {/* Storage & Public/Private Port */}
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1 text-muted-foreground truncate max-w-[180px]" title={addon.volumeName || "Volume"}>
                    <HardDrive className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{addon.volumeName || "Volume"}</span>
                  </span>
                  <span className="text-[11px] font-sans">
                    {addon.publicPort ? (
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono font-semibold">
                        <Globe className="w-2.5 h-2.5" />
                        :{addon.publicPort}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Private
                      </span>
                    )}
                  </span>
                </div>

                {/* Action */}
                <div className="flex items-center justify-end">
                  <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 border-border">
                    <Link href={`/addons/${addon.id}`}>
                      <span>Manage</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
