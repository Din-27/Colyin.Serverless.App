import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AddonConnectClient } from "@/components/AddonConnectClient";
import Link from "next/link";
import { ChevronRight, Database, FolderKanban, Globe, Lock } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
            <div className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground">
              <Database className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{addon.name}</h1>
                <StatusBadge status={addon.status} />
                <Badge variant="outline" className="font-mono text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  {addon.type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground font-mono">
                <span className="truncate">{addon.internalHost}:{addon.internalPort}</span>
                <span>&bull;</span>
                <span>Volume: {addon.volumeName}</span>
                {addon.publicPort && (
                  <>
                    <span>&bull;</span>
                    <span className="text-amber-600 dark:text-amber-400 font-mono font-medium">
                      Public Port: {addon.publicPort}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm" className="gap-1.5 shadow-xs">
              <Link href={`/projects/${addon.project.id}`}>
                <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Project</span>
              </Link>
            </Button>
            {addon.publicPort ? (
              <Button asChild variant="outline" size="sm" className="gap-2 font-mono text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 shadow-xs">
                <a href="#credentials" title={`Public external port ${addon.publicPort}`}>
                  <Globe className="w-3.5 h-3.5" />
                  <span>:{addon.publicPort}</span>
                </a>
              </Button>
            ) : (
              <Badge variant="outline" className="font-mono text-xs gap-1.5 bg-secondary text-muted-foreground border-border py-1.5 px-2.5">
                <Lock className="w-3 h-3" />
                <span>Private Only</span>
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Transparency & Credentials Client Component */}
      <AddonConnectClient addonId={addon.id} />
    </div>
  );
}
