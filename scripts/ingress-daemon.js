const http = require("http");
const https = require("https");
const net = require("net");
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function resolveTargetPort(rawHost) {
  const cleanHost = (rawHost || "").toLowerCase().replace(/:\d+$/, "").trim();

  // Root platform console (Coolify)
  if (
    cleanHost === "127.0.0.1" ||
    cleanHost === "localhost" ||
    cleanHost === "127.0.0.1.sslip.io"
  ) {
    return 3000;
  }

  try {
    const domain = await prisma.domain.findFirst({
      where: { host: cleanHost },
      include: { application: true },
    });

    if (domain?.application?.internalPort) {
      return domain.application.internalPort;
    }

    const slug = cleanHost.split(".")[0]?.replace(/-[a-f0-9]{6}$/, "");
    if (slug) {
      const app = await prisma.application.findFirst({
        where: { slug },
      });
      if (app?.internalPort) {
        return app.internalPort;
      }
    }
  } catch (err) {
    console.error("[IngressDaemon] Lookup error:", err.message);
  }

  return 3000;
}

function proxyRequest(req, res, isHttps) {
  const rawHost = req.headers.host || "localhost";

  resolveTargetPort(rawHost).then((targetPort) => {
    const options = {
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
          <head><title>502 Bad Gateway - Coolify Native Ingress</title></head>
          <body style="font-family:sans-serif; background:#09090b; color:#fafafa; padding:40px; text-align:center;">
            <h1 style="color:#f43f5e; margin-bottom:8px;">502 Bad Gateway</h1>
            <p>Target service on port <strong>:${targetPort}</strong> is not running or starting up.</p>
            <p style="color:#71717a; font-size:12px;">Host Header: ${rawHost}</p>
          </body>
        </html>
      `);
    });

    req.pipe(proxyReq);
  });
}

function proxyUpgrade(req, socket, head) {
  const rawHost = req.headers.host || "localhost";

  resolveTargetPort(rawHost).then((targetPort) => {
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

// 1. HTTP Server on Port 80
const httpServer = http.createServer((req, res) => {
  proxyRequest(req, res, false);
});
httpServer.on("upgrade", proxyUpgrade);
httpServer.listen(80, "0.0.0.0", () => {
  console.log(">> Coolify Native Ingress listening on HTTP port 80");
});
httpServer.on("error", (err) => {
  console.warn(">> HTTP port 80 notice:", err.message);
});

// 2. HTTPS Server on Port 443
const certPath = path.join(__dirname, "..", "cert.pem");
const keyPath = path.join(__dirname, "..", "key.pem");

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const httpsServer = https.createServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    },
    (req, res) => {
      proxyRequest(req, res, true);
    }
  );
  httpsServer.on("upgrade", proxyUpgrade);
  httpsServer.listen(443, "0.0.0.0", () => {
    console.log(">> Coolify Native Ingress listening on HTTPS port 443 (SSL Active)");
  });
  httpsServer.on("error", (err) => {
    console.warn(">> HTTPS port 443 notice:", err.message);
  });
} else {
  console.warn(">> cert.pem / key.pem not found, HTTPS 443 not started.");
}
