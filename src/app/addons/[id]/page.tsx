import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddonConnectClient } from "@/components/AddonConnectClient";
import Link from "next/link";
import { ChevronRight, Database } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

export default async function AddonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id: addonId } = await params;

  const addon = await db.addon.findUnique({
    where: { id: addonId },
    include: {
      project: true,
    },
  });

  if (!addon) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Breadcrumb Header */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
          <Link href="/" className="hover:text-foreground transition-colors">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <Link href={`/projects/${addon.project.id}`} className="hover:text-foreground transition-colors">
            {addon.project.name}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
          <span className="text-foreground font-medium">{addon.name}</span>
        </nav>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-border/80">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{addon.name}</h1>
                <StatusBadge status={addon.status} />
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{addon.type}</span>
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
