import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import http from "http";

function checkHttp(urlStr: string, timeoutMs = 3000): Promise<{ ok: boolean; status?: number; data?: string; error?: string }> {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const req = http.get(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          timeout: timeoutMs,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            resolve({
              ok: (res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400) || res.statusCode === 403,
              status: res.statusCode,
              data: body,
            });
          });
        }
      );

      req.on("timeout", () => {
        req.destroy();
        resolve({ ok: false, error: "Connection timed out" });
      });

      req.on("error", (err) => {
        resolve({ ok: false, error: err.message });
      });
    } catch (err: any) {
      resolve({ ok: false, error: err.message });
    }
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: addonId } = await params;
    const addon = await db.addon.findUnique({
      where: { id: addonId },
    });

    if (!addon) {
      return NextResponse.json({ success: false, error: "Addon not found" }, { status: 404 });
    }

    if (addon.type !== "MINIO") {
      return NextResponse.json({ success: false, error: "This endpoint only tests MinIO addons" }, { status: 400 });
    }

    // Try endpoints in order:
    // 1. Localhost public port (if allocated)
    // 2. Default local port 9000
    // 3. Docker internal host:9000
    const candidateUrls: string[] = [];
    if (addon.publicPort) {
      candidateUrls.push(`http://127.0.0.1:${addon.publicPort}/minio/health/live`);
    }
    candidateUrls.push("http://127.0.0.1:9000/minio/health/live");
    candidateUrls.push(`http://${addon.internalHost}:9000/minio/health/live`);

    let lastResult: { ok: boolean; status?: number; error?: string } = { ok: false, error: "No endpoint probed" };
    let connectedUrl = "";

    for (const url of candidateUrls) {
      const res = await checkHttp(url, 2500);
      if (res.ok) {
        lastResult = res;
        connectedUrl = url;
        break;
      }
      lastResult = res;
    }

    const latency = Date.now() - startTime;

    if (lastResult.ok) {
      return NextResponse.json({
        success: true,
        online: true,
        latencyMs: latency,
        statusCode: lastResult.status,
        probedUrl: connectedUrl,
        message: "MinIO S3 service is active and responding to health check.",
      });
    }

    return NextResponse.json({
      success: false,
      online: false,
      latencyMs: latency,
      error: lastResult.error || `HTTP Status ${lastResult.status}`,
      message: "Could not reach MinIO S3 API. Ensure the Docker container is running.",
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      online: false,
      error: err.message,
    }, { status: 500 });
  }
}
