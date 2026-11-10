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

/**
 * Resolves the appropriate build & start commands for a repository without Docker.
 */
export function resolveNativeCommands(projectDir: string): {
  installCmd: string;
  buildCmd?: string;
  startCmd: string;
} {
  const pkgPath = path.join(projectDir, "package.json");

  // Node.js project
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      const scripts = pkg.scripts || {};

      let buildCmd: string | undefined;
      if (scripts.build) {
        buildCmd = "npm run build";
      }

      let startCmd = "npm start";
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

      return {
        installCmd: "npm install",
        buildCmd,
        startCmd,
      };
    } catch {}
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

  // Fallback
  return {
    installCmd: "echo 'Universal runtime ready'",
    startCmd: "node index.js",
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
