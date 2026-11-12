import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { ServiceWizardForm } from "@/components/ServiceWizardForm";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          Projects
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
        <Link href={`/projects/${project.id}`} className="hover:text-foreground transition-colors">
          {project.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
        <span className="text-foreground font-medium">New Service</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Deploy New Application Service
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your Git repository, attach project databases, and launch an isolated container.
        </p>
      </div>

      <Card className="shadow-xs border-border">
        <CardContent className="p-6">
          <ServiceWizardForm project={project} />
        </CardContent>
      </Card>
    </div>
  );
}
