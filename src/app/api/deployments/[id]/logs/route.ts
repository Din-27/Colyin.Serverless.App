import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { globalDeploymentEvents } from "@/app/api/apps/[id]/deploy/route";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: deploymentId } = await params;

  const deployment = await db.deployment.findUnique({
    where: { id: deploymentId },
  });

  if (!deployment) {
    return new Response("Deployment not found", { status: 404 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // Send initial event
  writer.write(
    encoder.encode(`event: init\ndata: ${JSON.stringify({ deploymentId, status: deployment.status })}\n\n`)
  );

  // Send existing historical logs if any
  if (deployment.buildLogs) {
    const lines = deployment.buildLogs.split("\n").filter(Boolean);
    for (const line of lines) {
      writer.write(
        encoder.encode(`event: log\ndata: ${JSON.stringify({ deploymentId, chunk: line, stream: "stdout" })}\n\n`)
      );
    }
  }

  // If already finished, close
  if (deployment.status === "ACTIVE" || deployment.status === "FAILED") {
    writer.write(
      encoder.encode(`event: complete\ndata: ${JSON.stringify({ status: deployment.status })}\n\n`)
    );
    writer.close();
    return new Response(responseStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Listen for live events
  const onLog = (payload: { deploymentId: string; chunk: string; stream: string }) => {
    if (payload.deploymentId === deploymentId) {
      writer.write(
        encoder.encode(`event: log\ndata: ${JSON.stringify(payload)}\n\n`)
      );
    }
  };

  const onComplete = (payload: { deploymentId: string; status: string }) => {
    if (payload.deploymentId === deploymentId) {
      writer.write(
        encoder.encode(`event: complete\ndata: ${JSON.stringify(payload)}\n\n`)
      );
      cleanup();
    }
  };

  const cleanup = () => {
    globalDeploymentEvents.off("log", onLog);
    globalDeploymentEvents.off("complete", onComplete);
    try {
      writer.close();
    } catch {}
  };

  globalDeploymentEvents.on("log", onLog);
  globalDeploymentEvents.on("complete", onComplete);

  req.signal.addEventListener("abort", () => {
    cleanup();
  });

  return new Response(responseStream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
