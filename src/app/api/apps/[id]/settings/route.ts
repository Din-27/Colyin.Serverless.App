import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { validatePort } from "@/lib/engine/ports";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appId } = await params;
    const app = await db.application.findUnique({
      where: { id: appId },
      include: { project: true },
    });

    if (!app) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        id: app.id,
        name: app.name,
        slug: app.slug,
        internalPort: app.internalPort,
        cpuLimit: app.cpuLimit,
        memoryLimitMb: app.memoryLimitMb,
        restartPolicy: app.restartPolicy,
        branch: app.branch,
        buildPack: app.buildPack,
        runtimeVersion: app.runtimeVersion || "AUTO",
        dockerfilePath: app.dockerfilePath,
        buildCommand: app.buildCommand,
        startCommand: app.startCommand,
        projectNetwork: app.project.networkName,
        internalDns: `http://${app.slug}:${app.internalPort}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot modify app settings" },
        { status: 403 }
      );
    }

    const { id: appId } = await params;
    const body = await req.json().catch(() => ({}));

    const dataToUpdate: any = {};
    if (body.internalPort !== undefined) {
      const portCandidate = parseInt(body.internalPort, 10);
      const portCheck = await validatePort(portCandidate, { excludeAppId: appId });
      if (!portCheck.available) {
        return NextResponse.json(
          {
            success: false,
            error: portCheck.reason,
            suggestedPort: portCheck.suggestedPort,
          },
          { status: 400 }
        );
      }
      dataToUpdate.internalPort = portCandidate;
    }
    if (body.cpuLimit !== undefined) {
      dataToUpdate.cpuLimit = parseFloat(body.cpuLimit);
    }
    if (body.memoryLimitMb !== undefined) {
      dataToUpdate.memoryLimitMb = parseInt(body.memoryLimitMb, 10);
    }
    if (body.restartPolicy) {
      dataToUpdate.restartPolicy = body.restartPolicy;
    }
    if (body.branch) {
      dataToUpdate.branch = body.branch;
    }
    if (body.buildCommand !== undefined) {
      dataToUpdate.buildCommand = body.buildCommand;
    }
    if (body.startCommand !== undefined) {
      dataToUpdate.startCommand = body.startCommand;
    }
    if (body.dockerfilePath !== undefined) {
      dataToUpdate.dockerfilePath = body.dockerfilePath;
    }
    if (body.runtimeVersion !== undefined) {
      dataToUpdate.runtimeVersion = body.runtimeVersion?.trim() || "AUTO";
    }

    const updated = await db.application.update({
      where: { id: appId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, application: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
