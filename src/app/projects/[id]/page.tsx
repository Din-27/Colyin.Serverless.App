import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { formatAccessUrl } from "@/lib/engine/domains";
import { db } from "@/lib/db";
import { getDockerDaemonStatus } from "@/lib/engine/docker";
import {
  Server,
  Database,
  Plus,
  Globe,
  HardDrive,
  Cpu,
  Layers,
  Network,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Lock,
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

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id: projectId } = await params;

  const [project, dockerStatus] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      include: {
        applications: {
          include: {
            domains: true,
            deployments: {
              take: 1,
              orderBy: { startedAt: "desc" },
            },
          },
        },
        addons: true,
      },
    }),
    getDockerDaemonStatus(),
  ]);

  if (!project) notFound();

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

        <div className="flex items-center gap-2.5">
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
            <Server className="w-4 h-4 text-indigo-500" />
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {project.applications.map((app: any) => {
              const latestDeploy = app.deployments[0];
              const primaryDomain = app.domains.find((d: any) => d.isPrimary) || app.domains[0];
              const appAccessUrl = formatAccessUrl(primaryDomain?.host, app.internalPort);
              const displayLabel = primaryDomain ? primaryDomain.host : `localhost:${app.internalPort}`;

              return (
                <Card
                  key={app.id}
                  className="hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all duration-200 flex flex-col justify-between"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          href={`/apps/${app.id}`}
                          className="font-semibold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
                          {(app as any).version || (latestDeploy as any)?.version || "v1.0.0"}
                        </span>
                      </div>
                    </div>

                    {/* Domain / Route Access Link */}
                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <a
                        href={appAccessUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline truncate max-w-[210px]"
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
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                        {app.cpuLimit} CPU
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
                        {app.memoryLimitMb}MB
                      </span>
                    </div>
                    <Link
                      href={`/apps/${app.id}`}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </CardFooter>
                </Card>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {project.addons.map((addon: any) => (
              <Link
                key={addon.id}
                href={`/addons/${addon.id}`}
                className="group block transition-all focus:outline-none"
              >
                <Card className="hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-500/40 dark:hover:border-emerald-500/40 transition-all duration-200 flex flex-col justify-between">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {addon.name}
                        </CardTitle>
                        <span className="text-xs font-mono text-muted-foreground">{addon.type}</span>
                      </div>
                      <StatusBadge status={addon.status} />
                    </div>

                    {/* Host connection */}
                    <div className="mt-3 p-2.5 rounded-lg bg-secondary/60 border border-border/80 text-xs font-mono">
                      <div className="text-muted-foreground text-[11px]">Internal Host:</div>
                      <div className="text-emerald-600 dark:text-emerald-400 truncate mt-0.5 font-semibold">
                        {addon.internalHost}:{addon.internalPort}
                      </div>
                    </div>
                  </CardHeader>

                  <CardFooter className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                        {addon.publicPort ? (
                          <span className="text-amber-600 dark:text-amber-400 font-mono">
                            :{addon.publicPort}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Private Only</span>
                        )}
                      </span>
                    </div>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                      <span>Credentials</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
