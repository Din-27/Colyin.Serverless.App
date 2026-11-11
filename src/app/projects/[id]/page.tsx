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
} from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateAddonModal } from "@/components/CreateAddonModal";
import { DeleteProjectButton } from "@/components/DeleteProjectButton";

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
    <div className="space-y-8">
      {/* Project Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Link href="/" className="hover:text-zinc-300">
              Projects
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-zinc-300">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            {project.name}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Network: {project.networkName}
            </span>
            <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
          <CreateAddonModal projectId={project.id} />
          <Link
            href={`/projects/${project.id}/new`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Deploy Service
          </Link>
        </div>
      </div>

      {/* Applications Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-indigo-400" />
            Application Services ({project.applications.length})
          </h2>
        </div>

        {project.applications.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
            <Server className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No applications deployed in this project yet.</p>
            <Link
              href={`/projects/${project.id}/new`}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:underline font-medium"
            >
              Deploy your first service now &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {project.applications.map((app) => {
              const latestDeploy = app.deployments[0];
              const primaryDomain = app.domains.find((d) => d.isPrimary) || app.domains[0];

              return (
                <div
                  key={app.id}
                  className="group rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 hover:border-indigo-500/50 hover:bg-zinc-900/80 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/apps/${app.id}`}
                          className="font-semibold text-white hover:text-indigo-400 transition flex items-center gap-2"
                        >
                          {app.name}
                        </Link>
                        <p className="text-xs text-zinc-500 font-mono mt-0.5">
                          Port {app.internalPort} &bull; {app.buildPack}
                        </p>
                      </div>
                      <StatusBadge status={latestDeploy?.status || "STOPPED"} />
                    </div>

                    {/* Domain / Route Access Link */}
                    {(() => {
                      const appAccessUrl = formatAccessUrl(primaryDomain?.host, app.internalPort);
                      const displayLabel = primaryDomain ? primaryDomain.host : `localhost:${app.internalPort}`;

                      return (
                        <div className="mt-4 flex items-center justify-between text-xs font-mono">
                          <a
                            href={appAccessUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 hover:underline truncate max-w-[210px]"
                            title={`Open ${appAccessUrl} in new tab`}
                          >
                            <Globe className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{displayLabel}</span>
                            <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                          </a>
                          <span className="text-[10px] font-sans font-medium">
                            {primaryDomain ? (
                              <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                                <Lock className="w-2.5 h-2.5" />
                                HTTPS
                              </span>
                            ) : (
                              <span className="text-zinc-500">Port {app.internalPort}</span>
                            )}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Resource Badges and Manage link */}
                  <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                        {app.cpuLimit} CPU
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                        {app.memoryLimitMb}MB
                      </span>
                    </div>
                    <Link
                      href={`/apps/${app.id}`}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Manage &rarr;
                    </Link>
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
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            Databases & Addons ({project.addons.length})
          </h2>
        </div>

        {project.addons.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
            <Database className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No database or cache addons provisioned yet.</p>
            <p className="text-xs text-zinc-500 mt-1">
              Add a managed PostgreSQL, Redis, RabbitMQ, or MinIO instance with one click.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {project.addons.map((addon) => (
              <Link
                key={addon.id}
                href={`/addons/${addon.id}`}
                className="group block rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 hover:border-emerald-500/50 hover:bg-zinc-900/80 transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white group-hover:text-emerald-400 transition">
                      {addon.name}
                    </h3>
                    <span className="text-xs font-mono text-zinc-500">{addon.type}</span>
                  </div>
                  <StatusBadge status={addon.status} />
                </div>

                {/* Host connection */}
                <div className="mt-4 p-2.5 rounded bg-zinc-950/80 border border-zinc-800/80 text-xs font-mono">
                  <div className="text-zinc-400 text-[11px]">Internal Host:</div>
                  <div className="text-emerald-400 truncate mt-0.5">
                    {addon.internalHost}:{addon.internalPort}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
                      {addon.publicPort ? (
                        <span className="text-amber-400">Public: :{addon.publicPort}</span>
                      ) : (
                        <span className="text-zinc-500">Private Only</span>
                      )}
                    </span>
                    {addon.type === "RABBITMQ" && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-orange-950/60 border border-orange-800/80 text-orange-400">
                        Web UI :15672
                      </span>
                    )}
                  </div>
                  <span className="text-indigo-400 font-medium text-[11px]">
                    View Credentials &rarr;
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
