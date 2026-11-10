import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { startContainer, stopContainer, restartContainer, getDockerDaemonStatus } from "@/lib/engine/docker";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot perform container actions" },
        { status: 403 }
      );
    }

    const { id: appId } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action; // "start" | "stop" | "restart"

    if (!["start", "stop", "restart"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Supported: start, stop, restart" },
        { status: 400 }
      );
    }

    const app = await db.application.findUnique({
      where: { id: appId },
      include: {
        deployments: {
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!app) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    const activeDeployment = app.deployments[0];
    let containerId = activeDeployment?.containerId;

    const dockerStatus = await getDockerDaemonStatus();

    // Auto-discover container if containerId is missing from deployment record
    if (!containerId && dockerStatus.online) {
      try {
        const { docker } = await import("@/lib/engine/docker");
        const list = await docker.listContainers({ all: true });
        const match = list.find((c) =>
          c.Names?.some((n) => n.includes(app.slug) || n.includes(app.id)) ||
          c.Labels?.["app-id"] === app.id
        );
        if (match) {
          containerId = match.Id;
          if (activeDeployment) {
            await db.deployment.update({
              where: { id: activeDeployment.id },
              data: { containerId: match.Id },
            });
          }
        }
      } catch (discErr) {
        console.warn("Could not auto-discover container for action:", discErr);
      }
    }

    if (dockerStatus.online && containerId) {
      try {
        if (action === "start") {
          await startContainer(containerId);
          if (activeDeployment) {
            await db.deployment.update({
              where: { id: activeDeployment.id },
              data: { status: "ACTIVE" },
            });
          }
        } else if (action === "stop") {
          await stopContainer(containerId);
          if (activeDeployment) {
            await db.deployment.update({
              where: { id: activeDeployment.id },
              data: { status: "STOPPED" },
            });
          }
        } else if (action === "restart") {
          await restartContainer(containerId);
          if (activeDeployment) {
            await db.deployment.update({
              where: { id: activeDeployment.id },
              data: { status: "ACTIVE" },
            });
          }
        }
      } catch (dockerErr: any) {
        console.error(`Container ${action} error:`, dockerErr);
        return NextResponse.json(
          { success: false, error: `Docker action failed: ${dockerErr.message}` },
          { status: 500 }
        );
      }
    } else {
      // Standalone mode simulation
      if (activeDeployment) {
        await db.deployment.update({
          where: { id: activeDeployment.id },
          data: {
            status: action === "stop" ? "STOPPED" : "ACTIVE",
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      action,
      appId,
      status: action === "stop" ? "STOPPED" : "ACTIVE",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
