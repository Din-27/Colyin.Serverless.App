import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AppConsoleTabs } from "@/components/AppConsoleTabs";
import Link from "next/link";
import { ChevronRight, Server, Globe, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default async function ApplicationDetailPage({
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
        take: 15,
      },
      envVariables: true,
    },
  });

  if (!app) notFound();

  const activeDeployment = app.deployments.find((d) => d.id === app.activeDeployId) || app.deployments[0];
  const primaryDomain = app.domains.find((d) => d.isPrimary) || app.domains[0];

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
          <Link href="/" className="hover:text-zinc-300">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/projects/${app.project.id}`} className="hover:text-zinc-300">
            {app.project.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-300">{app.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-indigo-950/60 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white">{app.name}</h1>
                <StatusBadge status={activeDeployment?.status || "STOPPED"} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 font-mono">
                <span>{app.repositoryUrl}</span>
                <span>&bull;</span>
                <span>Branch: {app.branch}</span>
              </div>
            </div>
          </div>

          {primaryDomain && (
            <a
              href={`https://${primaryDomain.host}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/30 text-indigo-300 text-xs font-mono hover:bg-indigo-950/60 transition"
            >
              <Globe className="w-3.5 h-3.5 text-indigo-400" />
              <span>https://{primaryDomain.host}</span>
              <ExternalLink className="w-3 h-3 opacity-70" />
            </a>
          )}
        </div>
      </div>

      {/* Tabbed Console Component */}
      <AppConsoleTabs app={app} activeDeployment={activeDeployment} />
    </div>
  );
}
