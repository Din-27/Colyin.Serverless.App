import Link from "next/link";
import { db } from "@/lib/db";
import { Layers, Plus, Server, Database, ArrowRight, FolderKanban } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateProjectModal } from "@/components/CreateProjectModal";

export default async function DashboardPage() {
  const projects = await db.project.findMany({
    include: {
      applications: {
        include: {
          domains: true,
        },
      },
      addons: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-indigo-400" />
            Projects Canvas
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage your self-hosted isolated project environments and multi-service clusters.
          </p>
        </div>
        <CreateProjectModal />
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-zinc-300">No projects created yet</h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
            Get started by creating your first project environment to group applications and databases together.
          </p>
          <div className="mt-6">
            <CreateProjectModal />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group block rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 hover:border-indigo-500/50 hover:bg-zinc-900/80 transition relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition flex items-center gap-2">
                    {project.name}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                    {project.description || "No description provided."}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition" />
              </div>

              {/* Network Mesh Tag */}
              <div className="mt-4 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-800/60 text-xs text-zinc-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {project.networkName}
              </div>

              {/* Service Counts Footer */}
              <div className="mt-6 pt-4 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-zinc-500" />
                    {project.applications.length} Apps
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-zinc-500" />
                    {project.addons.length} Addons
                  </span>
                </div>
                <span className="text-zinc-500 text-[11px]">
                  {new Date(project.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
