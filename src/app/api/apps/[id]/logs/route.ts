import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { docker, getDockerDaemonStatus, parseDockerLogChunk } from "@/lib/engine/docker";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { id: appId } = await params;
    const { searchParams } = new URL(req.url);
    const tailParam = parseInt(searchParams.get("tail") || "150", 10);
    const tail = isNaN(tailParam) || tailParam <= 0 ? 150 : Math.min(tailParam, 1000);

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
      return new Response("Application not found", { status: 404 });
    }

    const activeDeployment = app.deployments[0];
    let containerId = activeDeployment?.containerId;

    const dockerStatus = await getDockerDaemonStatus();

    // If containerId is missing from deployment, try to discover by container name or label
    if (!containerId && dockerStatus.online) {
      try {
        const containers = await docker.listContainers({ all: true });
        const found = containers.find(
          (c) =>
            c.Names?.some((n) => n.includes(app.slug) || n.includes(app.id)) ||
            c.Labels?.["app-id"] === app.id
        );
        if (found) {
          containerId = found.Id;
        }
      } catch (e) {
        console.warn("Could not discover container by name:", e);
      }
    }

    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const writeEvent = async (event: string, data: any) => {
      try {
        await writer.write(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      } catch {}
    };

    // Initial event
    await writeEvent("init", {
      appId: app.id,
      appName: app.name,
      containerId: containerId || null,
      status: activeDeployment?.status || "STOPPED",
      dockerOnline: dockerStatus.online,
    });

    // If Docker is offline or no container exists yet
    if (!dockerStatus.online || !containerId) {
      const now = new Date().toISOString();
      if (!dockerStatus.online) {
        await writeEvent("log", {
          text: `[${now}] [SYSTEM] Docker daemon is currently offline (Local Standalone Mode active).`,
          stream: "stdout",
        });
        await writeEvent("log", {
          text: `[${now}] [SYSTEM] Service is routed directly via internal proxy on port :${app.internalPort}`,
          stream: "stdout",
        });
      } else {
        await writeEvent("log", {
          text: `[${now}] [SYSTEM] No active container detected for ${app.name}. Click 'Deploy' or 'Restart' to launch service.`,
          stream: "stderr",
        });
      }

      await writeEvent("status", { status: "IDLE" });
      try {
        await writer.close();
      } catch {}

      return new Response(responseStream.readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    // Attach to Docker container log stream
    let logStream: any = null;

    const cleanup = () => {
      try {
        if (logStream && typeof logStream.destroy === "function") {
          logStream.destroy();
        }
      } catch {}
      try {
        writer.close();
      } catch {}
    };

    req.signal.addEventListener("abort", () => {
      cleanup();
    });

    try {
      const container = docker.getContainer(containerId);
      logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });

      logStream.on("data", async (chunk: Buffer) => {
        try {
          const parsed = parseDockerLogChunk(chunk);
          for (const item of parsed) {
            const rawLines = item.text.split("\n");
            for (const line of rawLines) {
              if (line.trim().length > 0) {
                await writeEvent("log", {
                  text: line,
                  stream: item.stream,
                  timestamp: Date.now(),
                });
              }
            }
          }
        } catch (err) {
          console.error("Error processing docker log stream chunk:", err);
        }
      });

      logStream.on("error", async (err: any) => {
        await writeEvent("error", { message: err?.message || "Container stream error" });
        cleanup();
      });

      logStream.on("end", async () => {
        await writeEvent("complete", { message: "Container stream closed" });
        cleanup();
      });
    } catch (err: any) {
      await writeEvent("log", {
        text: `[ERROR] Failed to attach to container logs (${containerId.slice(0, 12)}): ${err.message}`,
        stream: "stderr",
      });
      cleanup();
    }

    return new Response(responseStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
