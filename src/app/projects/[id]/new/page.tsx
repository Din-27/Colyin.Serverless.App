import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ServiceWizardForm } from "@/components/ServiceWizardForm";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";

export default async function NewServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      addons: true,
    },
  });

  if (!project) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-300">
          Projects
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/projects/${project.id}`} className="hover:text-zinc-300">
          {project.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-zinc-300">New Service</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Deploy New Application Service
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Connect your Git repository, attach project databases, and launch an isolated container.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
        <ServiceWizardForm project={project} />
      </div>
    </div>
  );
}
