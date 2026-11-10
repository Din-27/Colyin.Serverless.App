import http from "http";
import https from "https";
import fs from "fs";
import path from "path";
import { db } from "@/lib/db";

let isProxyStarted = false;
let httpProxyServer: http.Server | null = null;
let httpsProxyServer: https.Server | null = null;

/**
 * Resolves the target internal port for a given hostname.
 */
async function resolveTargetPort(hostname: string): Promise<number> {
  const cleanHost = (hostname || "").toLowerCase().replace(/:\d+$/, "").trim();

  // Root platform console
  if (
    cleanHost === "127.0.0.1" ||
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1.sslip.io"
  ) {
    return 3000;
  }

  try {
    // 1. Look up domain in database
    const domain = await db.domain.findFirst({
      where: { host: cleanHost },
      include: { application: true },
    });

    if (domain?.application?.internalPort) {
      return domain.application.internalPort;
    }

    // 2. Fallback: match by app slug prefix (e.g. cms-snd-xxxx.127.0.0.1.sslip.io -> cms-snd)
    const slugPrefix = cleanHost.split(".")[0]?.replace(/-[a-f0-9]{6}$/, "");
    if (slugPrefix) {
      const app = await db.application.findFirst({
        where: { slug: slugPrefix },
      });
      if (app?.internalPort) {
        return app.internalPort;
      }
    }
  } catch (err) {
    console.error("[NativeProxy] Error resolving target host:", err);
  }

  // Fallback to Coolify console
  return 3000;
}

/**
 * Handles proxying an incoming HTTP/HTTPS request to the target local port.
 */
function handleProxyRequest(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  isHttps: boolean
) {
  const rawHost = req.headers.host || "localhost";

  resolveTargetPort(rawHost).then((targetPort) => {
    const options: http.RequestOptions = {
      hostname: "127.0.0.1",
      port: targetPort,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        "x-forwarded-for": req.socket.remoteAddress || "127.0.0.1",
        "x-forwarded-proto": isHttps ? "https" : "http",
        "x-forwarded-host": rawHost,
      },
    };

    const proxyReq = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      res.writeHead(502, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`
        <!DOCTYPE html>
        <html>
          <head><title>502 Bad Gateway - Coolify Native Proxy</title></head>
          <body style="font-family:sans-serif; background:#09090b; color:#fafafa; padding:40px; text-align:center;">
            <h1 style="color:#f43f5e;">502 Bad Gateway</h1>
            <p>Target service on port <strong>:${targetPort}</strong> is not responding.</p>
            <p style="color:#71717a; font-size:12px;">Host: ${rawHost}</p>
          </body>
        </html>
      `);
    });

    req.pipe(proxyReq);
  });
}

/**
 * Handles WebSocket proxying.
 */
function handleProxyUpgrade(
  req: http.IncomingMessage,
  socket: any,
  head: Buffer
) {
  const rawHost = req.headers.host || "localhost";

  resolveTargetPort(rawHost).then((targetPort) => {
    const net = require("net");
    const proxySocket = net.connect(targetPort, "127.0.0.1", () => {
      proxySocket.write(head);
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n` +
          `Upgrade: websocket\r\n` +
          `Connection: Upgrade\r\n\r\n`
      );
      proxySocket.pipe(socket);
      socket.pipe(proxySocket);
    });

    proxySocket.on("error", () => {
      socket.destroy();
    });
  });
}

/**
 * Ensures the native reverse proxy is running on port 80 & 443.
 */
export function ensureNativeProxyRunning(): void {
  if (isProxyStarted) return;
  isProxyStarted = true;

  // 1. Start HTTP Proxy on Port 80
  try {
    httpProxyServer = http.createServer((req, res) => {
      handleProxyRequest(req, res, false);
    });

    httpProxyServer.on("upgrade", handleProxyUpgrade);

    httpProxyServer.listen(80, "0.0.0.0", () => {
      console.log("[NativeProxy] HTTP Reverse Proxy LIVE on port 80");
    });

    httpProxyServer.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn("[NativeProxy] Port 80 already in use, skipping port 80 proxy.");
      } else {
        console.error("[NativeProxy] HTTP Proxy error:", err);
      }
    });
  } catch (err) {
    console.warn("[NativeProxy] Failed to bind HTTP port 80:", err);
  }

  // 2. Start HTTPS Proxy on Port 443 if cert files exist
  try {
    const certPath = path.join(process.cwd(), "cert.pem");
    const keyPath = path.join(process.cwd(), "key.pem");

    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      const sslOptions = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      };

      httpsProxyServer = https.createServer(sslOptions, (req, res) => {
        handleProxyRequest(req, res, true);
      });

      httpsProxyServer.on("upgrade", handleProxyUpgrade);

      httpsProxyServer.listen(443, "0.0.0.0", () => {
        console.log("[NativeProxy] HTTPS Reverse Proxy LIVE on port 443 (SSL Active)");
      });

      httpsProxyServer.on("error", (err: any) => {
        if (err.code === "EADDRINUSE") {
          console.warn("[NativeProxy] Port 443 already in use, skipping port 443 proxy.");
        } else {
          console.error("[NativeProxy] HTTPS Proxy error:", err);
        }
      });
    }
  } catch (err) {
    console.warn("[NativeProxy] Failed to bind HTTPS port 443:", err);
  }
}
