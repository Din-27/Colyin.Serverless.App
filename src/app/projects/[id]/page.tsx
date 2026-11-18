import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectDetailView } from "@/components/ProjectDetailView";

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

  const project = await db.project.findUnique({
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
  });

  if (!project) notFound();

  return <ProjectDetailView project={project as any} />;
}
