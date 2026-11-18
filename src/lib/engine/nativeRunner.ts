import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import http from "http";

export interface NativeRunningProcess {
  pid: number;
  child: ChildProcess;
  appId: string;
  appSlug: string;
  port: number;
  startedAt: Date;
}

// Global registry of real running application processes
const activeProcesses = new Map<string, NativeRunningProcess>();

/**
 * Ensures previous process for this application or occupying this port is terminated.
 */
export async function stopNativeService(appId: string): Promise<void> {
  const existing = activeProcesses.get(appId);
  if (existing) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(existing.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        existing.child.kill("SIGKILL");
      }
    } catch {}
    activeProcesses.delete(appId);
  }
}

const STATIC_SERVER_CODE = `const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT, 10) || 8080;
const PROJECT_ROOT = process.cwd();

// Auto-detect web root if an output/dist directory exists
let webRoot = PROJECT_ROOT;
for (const dir of ["dist", "build", "out", "public"]) {
  const c = path.join(PROJECT_ROOT, dir);
  if (fs.existsSync(c) && fs.statSync(c).isDirectory()) {
    if (fs.existsSync(path.join(c, "index.html")) || fs.existsSync(path.join(c, "index.htm"))) {
      webRoot = c;
      break;
    }
  }
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".wasm": "application/wasm",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".map": "application/json; charset=utf-8",
};

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  let decodedUrl = "/";
  try {
    const parsed = new URL(req.url || "/", "http://localhost:" + PORT);
    decodedUrl = decodeURIComponent(parsed.pathname);
  } catch {
    decodedUrl = "/";
  }

  const safePath = path.normalize(decodedUrl).replace(/^(\\.\\.[\\/\\\\])+/, "");
  let filePath = path.join(webRoot, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    if (fs.existsSync(path.join(filePath, "index.html"))) {
      filePath = path.join(filePath, "index.html");
    } else if (fs.existsSync(path.join(filePath, "index.htm"))) {
      filePath = path.join(filePath, "index.htm");
    }
  }

  // SPA fallback: if requested file does not exist, serve index.html
  if (!fs.existsSync(filePath)) {
    const rootIndex = path.join(webRoot, "index.html");
    const rootHtm = path.join(webRoot, "index.htm");
    if (fs.existsSync(rootIndex)) {
      filePath = rootIndex;
    } else if (fs.existsSync(rootHtm)) {
      filePath = rootHtm;
    } else {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style=\\"font-family:system-ui,sans-serif;padding:40px;text-align:center;background:#09090b;color:#f4f4f5;\\"><h1 style=\\"color:#ef4444;\\">404 Not Found</h1><p>Requested path <code>" + safePath + "</code> was not found.</p></body></html>");
      return;
    }
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" || ext === ".htm" ? "no-cache" : "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Internal Server Error: " + (err && err.message ? err.message : String(err)));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("[StaticServer] Serving static site from " + webRoot + " on http://0.0.0.0:" + PORT);
});
`;

/**
 * Ensures the self-contained static web server script exists in the target directory.
 */
export function ensureStaticServerScript(projectDir: string): void {
  try {
    const targetFile = path.join(projectDir, "_static_server.cjs");
    fs.writeFileSync(targetFile, STATIC_SERVER_CODE, "utf8");
  } catch (err) {
    console.error("[nativeRunner] Failed to write _static_server.cjs:", err);
  }
}

/**
 * Resolves the appropriate build & start commands for a repository without Docker.
 */
export function resolveNativeCommands(projectDir: string): {
  installCmd: string;
  buildCmd?: string;
  startCmd: string;
} {
  const pkgPath = path.join(projectDir, "package.json");

  const hasRootIndexHtml =
    fs.existsSync(path.join(projectDir, "index.html")) ||
    fs.existsSync(path.join(projectDir, "index.htm"));
  const hasPublicIndexHtml =
    fs.existsSync(path.join(projectDir, "public", "index.html")) ||
    fs.existsSync(path.join(projectDir, "public", "index.htm"));
  const hasDistIndexHtml =
    fs.existsSync(path.join(projectDir, "dist", "index.html")) ||
    fs.existsSync(path.join(projectDir, "dist", "index.htm"));
  const hasBuildIndexHtml =
    fs.existsSync(path.join(projectDir, "build", "index.html")) ||
    fs.existsSync(path.join(projectDir, "build", "index.htm"));
  const isStaticSite =
    hasRootIndexHtml || hasPublicIndexHtml || hasDistIndexHtml || hasBuildIndexHtml;

  // Node.js project
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const scripts = pkg.scripts || {};

      let buildCmd: string | undefined;
      if (scripts.build) {
        buildCmd = "npm run build";
      }

      let startCmd: string | undefined;
      if (scripts.start) {
        startCmd = "npm start";
      } else if (scripts.dev) {
        startCmd = "npm run dev";
      } else if (pkg.main && fs.existsSync(path.join(projectDir, pkg.main))) {
        startCmd = `node ${pkg.main}`;
      } else if (fs.existsSync(path.join(projectDir, "server.js"))) {
        startCmd = "node server.js";
      } else if (fs.existsSync(path.join(projectDir, "index.js"))) {
        startCmd = "node index.js";
      } else if (fs.existsSync(path.join(projectDir, "app.js"))) {
        startCmd = "node app.js";
      }

      // If package.json has a viable start command, use it
      if (startCmd) {
        return {
          installCmd: "npm install",
          buildCmd,
          startCmd,
        };
      }

      // If package.json has a build command or is a static site without backend start command
      if (isStaticSite || buildCmd) {
        ensureStaticServerScript(projectDir);
        return {
          installCmd: "npm install",
          buildCmd,
          startCmd: "node _static_server.cjs",
        };
      }
    } catch {}
  }

  // Pure Static HTML / Vanilla JS site without package.json
  if (isStaticSite) {
    ensureStaticServerScript(projectDir);
    return {
      installCmd: "echo 'Static HTML site ready (no build step needed)'",
      startCmd: "node _static_server.cjs",
    };
  }

  // Python project
  if (
    fs.existsSync(path.join(projectDir, "requirements.txt")) ||
    fs.existsSync(path.join(projectDir, "app.py")) ||
    fs.existsSync(path.join(projectDir, "main.py"))
  ) {
    const entry = fs.existsSync(path.join(projectDir, "app.py"))
      ? "app.py"
      : "main.py";
    return {
      installCmd: fs.existsSync(path.join(projectDir, "requirements.txt"))
        ? "pip install -r requirements.txt"
        : "echo 'No requirements.txt found'",
      startCmd: `python ${entry}`,
    };
  }

  // Fallback: if index.js exists use node index.js, otherwise static server
  if (fs.existsSync(path.join(projectDir, "index.js"))) {
    return {
      installCmd: "echo 'Universal runtime ready'",
      startCmd: "node index.js",
    };
  }

  ensureStaticServerScript(projectDir);
  return {
    installCmd: "echo 'Universal static runner ready'",
    startCmd: "node _static_server.cjs",
  };
}

/**
 * Runs build & installation step synchronously with live streaming logs.
 */
export function executeCommandWithLogs(
  command: string,
  cwd: string,
  onLog: (chunk: string, stream?: "stdout" | "stderr") => Promise<void>,
  extraEnv: Record<string, string> = {}
): Promise<void> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : "/bin/sh";
    const shellArg = isWin ? "/c" : "-c";

    const child = spawn(shell, [shellArg, command], {
      cwd,
      env: {
        ...process.env,
        ...extraEnv,
      },
    });

    child.stdout.on("data", (data) => {
      const text = data.toString();
      onLog(text.trimEnd(), "stdout");
    });

    child.stderr.on("data", (data) => {
      const text = data.toString();
      onLog(text.trimEnd(), "stderr");
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command '${command}' exited with code ${code}`));
      }
    });

    child.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Spawns and manages real application service in background on host port.
 */
export async function startNativeService({
  appId,
  appSlug,
  projectDir,
  port,
  env,
  startCmd,
  onLog,
}: {
  appId: string;
  appSlug: string;
  projectDir: string;
  port: number;
  env: Record<string, string>;
  startCmd: string;
  onLog: (chunk: string, stream?: "stdout" | "stderr") => Promise<void>;
}): Promise<NativeRunningProcess> {
  // Kill previous instance if any
  await stopNativeService(appId);

  const isWin = process.platform === "win32";
  const shell = isWin ? "cmd.exe" : "/bin/sh";
  const shellArg = isWin ? "/c" : "-c";

  await onLog(`Spawning native application process: ${startCmd} on port :${port}...`);

  const child = spawn(shell, [shellArg, startCmd], {
    cwd: projectDir,
    env: {
      ...process.env,
      ...env,
      PORT: String(port),
      NODE_ENV: "production",
    },
    detached: false,
  });

  child.stdout.on("data", (data) => {
    onLog(data.toString().trimEnd(), "stdout");
  });

  child.stderr.on("data", (data) => {
    onLog(data.toString().trimEnd(), "stderr");
  });

  child.on("close", (code) => {
    onLog(`[Process Exited] Service '${appSlug}' (PID: ${child.pid}) terminated with code ${code}`);
    activeProcesses.delete(appId);
  });

  child.on("error", (err) => {
    onLog(`[Process Error] ${err.message}`, "stderr");
  });

  const record: NativeRunningProcess = {
    pid: child.pid || 0,
    child,
    appId,
    appSlug,
    port,
    startedAt: new Date(),
  };

  activeProcesses.set(appId, record);
  return record;
}

/**
 * Polls the application's local HTTP port until responding.
 */
export async function waitForHttpReady(
  port: number,
  timeoutMs = 30000,
  intervalMs = 800
): Promise<boolean> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const isReady = await new Promise<boolean>((resolve) => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        resolve(res.statusCode !== undefined && res.statusCode < 500);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(1000, () => {
        req.destroy();
        resolve(false);
      });
    });

    if (isReady) return true;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return false;
}

/**
 * Retrieves list of active native running processes.
 */
export function getActiveNativeProcesses(): {
  appId: string;
  appSlug: string;
  port: number;
  pid: number;
  uptimeSeconds: number;
}[] {
  return Array.from(activeProcesses.values()).map((p) => ({
    appId: p.appId,
    appSlug: p.appSlug,
    port: p.port,
    pid: p.pid,
    uptimeSeconds: Math.floor((Date.now() - p.startedAt.getTime()) / 1000),
  }));
}
