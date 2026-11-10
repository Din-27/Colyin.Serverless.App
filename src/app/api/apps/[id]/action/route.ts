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
    const containerId = activeDeployment?.containerId;

    const dockerStatus = await getDockerDaemonStatus();

    if (dockerStatus.online && containerId) {
      try {
        if (action === "start") {
          await startContainer(containerId);
          await db.deployment.update({
            where: { id: activeDeployment.id },
            data: { status: "ACTIVE" },
          });
        } else if (action === "stop") {
          await stopContainer(containerId);
          await db.deployment.update({
            where: { id: activeDeployment.id },
            data: { status: "STOPPED" },
          });
        } else if (action === "restart") {
          await restartContainer(containerId);
          await db.deployment.update({
            where: { id: activeDeployment.id },
            data: { status: "ACTIVE" },
          });
        }
      } catch (dockerErr: any) {
        console.error(`Container ${action} error:`, dockerErr);
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
