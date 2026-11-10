import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { removeContainer } from "@/lib/engine/docker";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appId } = await params;
    const app = await db.application.findUnique({
      where: { id: appId },
      include: {
        project: true,
        domains: true,
        deployments: {
          orderBy: { startedAt: "desc" },
          take: 5,
        },
      },
    });

    if (!app) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, application: app });
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
        { success: false, error: "Unauthorized: Viewers cannot delete applications" },
        { status: 403 }
      );
    }

    const { id: appId } = await params;

    const app = await db.application.findUnique({
      where: { id: appId },
      include: {
        deployments: {
          select: { containerId: true },
        },
      },
    });

    if (!app) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // Stop and remove all containers associated with this app
    for (const dep of app.deployments) {
      if (dep.containerId) {
        await removeContainer(dep.containerId);
      }
    }

    // Delete application from database (cascades to deployments, env, domains, volumes)
    await db.application.delete({
      where: { id: appId },
    });

    return NextResponse.json({
      success: true,
      message: `Application '${app.name}' and all associated resources deleted successfully`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
