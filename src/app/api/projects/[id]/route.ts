import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { removeContainer, removeNetwork } from "@/lib/engine/docker";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        applications: true,
        addons: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, project });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot delete projects" },
        { status: 403 }
      );
    }

    const { id: projectId } = await params;

    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        applications: {
          include: {
            deployments: {
              select: { containerId: true },
            },
          },
        },
        addons: {
          select: { containerId: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    // 1. Remove all application containers
    for (const app of project.applications) {
      for (const dep of app.deployments) {
        if (dep.containerId) {
          await removeContainer(dep.containerId);
        }
      }
    }

    // 2. Remove all addon containers
    for (const addon of project.addons) {
      if (addon.containerId) {
        await removeContainer(addon.containerId);
      }
    }

    // 3. Remove isolated Docker network
    if (project.networkName) {
      await removeNetwork(project.networkName);
    }

    // 4. Delete project from DB (cascades to applications, addons, deployments, env vars, domains)
    await db.project.delete({
      where: { id: projectId },
    });

    return NextResponse.json({
      success: true,
      message: `Project '${project.name}' and all associated services deleted successfully`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
