import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProjectsCanvas } from "@/components/ProjectsCanvas";

export const dynamic = "force-dynamic";

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
  try {
    const userCount = await db.user.count();
    if (userCount === 0) {
      redirect("/setup");
    }
  } catch (err: any) {
    // If NEXT_REDIRECT was thrown by redirect(), let it bubble up
    if (err?.digest?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    // If the database table does not exist yet (fresh install / first run), go to /setup
    redirect("/setup");
  }

  // Otherwise, redirect to the normal login page
  redirect("/login");
}
