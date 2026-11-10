import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectsCanvas } from "@/components/ProjectsCanvas";

export default async function Page() {
  const user = await getSessionUser();

  // 1. If user is authenticated, directly render the projects canvas!
  if (user) {
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
      <ProjectsCanvas
        projects={projects}
        user={{ id: user.userId, email: user.email, name: user.name, role: user.role }}
      />
    );
  }

  // 2. Unauthenticated visitor:
  // If zero users exist on this server, take them to the Initial Setup Wizard
  const userCount = await db.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }

  // Otherwise, redirect to the normal login page
  redirect("/login");
}
