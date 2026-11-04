import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { AddonConnectClient } from "@/components/AddonConnectClient";
import Link from "next/link";
import { ChevronRight, Database, Layers, Network, HardDrive, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export default async function AddonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: addonId } = await params;

  const addon = await db.addon.findUnique({
    where: { id: addonId },
    include: {
      project: true,
    },
  });

  if (!addon) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1.5">
          <Link href="/" className="hover:text-zinc-300">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/projects/${addon.project.id}`} className="hover:text-zinc-300">
            {addon.project.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-zinc-300">{addon.name}</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white">{addon.name}</h1>
                <StatusBadge status={addon.status} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400 font-mono">
                <span className="text-emerald-400 font-semibold">{addon.type}</span>
                <span>&bull;</span>
                <span>Volume: {addon.volumeName}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Transparency & Credentials Client Component */}
      <AddonConnectClient addonId={addon.id} />
    </div>
  );
}
