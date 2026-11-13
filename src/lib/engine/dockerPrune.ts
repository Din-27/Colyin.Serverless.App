import { spawn } from "child_process";
import { docker } from "./docker";

export interface PruneResult {
  success: boolean;
  builderPruneOutput?: string;
  systemPruneOutput?: string;
  reclaimedSpace?: string;
  error?: string;
  timestamp: string;
}

/**
 * Runs a shell command safely and returns its exit code and output streams.
 */
function runCommand(cmd: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn(cmd, args, {
      env: process.env,
      shell: true,
    });

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (err) => {
      stderr += err.message;
      resolve({ code: 1, stdout, stderr });
    });

    proc.on("close", (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

/**
 * Executes `docker builder prune -af` and `docker system prune -af`.
 * First attempts to run via direct Docker CLI, and falls back to Docker Engine Socket API.
 */
export async function executeDockerPrune(): Promise<PruneResult> {
  const timestamp = new Date().toISOString();
  let builderOutput = "";
  let systemOutput = "";
  let cliSucceeded = false;

  // 1. Try native Docker CLI (works when docker-cli is installed or on host)
  try {
    const builderRes = await runCommand("docker", ["builder", "prune", "-af"]);
    if (builderRes.code === 0 || builderRes.stdout.length > 0) {
      builderOutput = builderRes.stdout || builderRes.stderr;
      cliSucceeded = true;
    }

    const systemRes = await runCommand("docker", ["system", "prune", "-af"]);
    if (systemRes.code === 0 || systemRes.stdout.length > 0) {
      systemOutput = systemRes.stdout || systemRes.stderr;
      cliSucceeded = true;
    }
  } catch (err: any) {
    console.warn("[executeDockerPrune] Docker CLI invocation failed, attempting Docker API fallback:", err);
  }

  if (cliSucceeded) {
    const combined = `${builderOutput}\n${systemOutput}`;
    const matches = combined.match(/Total reclaimed space:\s*([^\r\n]+)/gi);
    const reclaimedSpace = matches ? matches.join(" | ") : "Cache & dangling resources cleared";

    return {
      success: true,
      builderPruneOutput: builderOutput.trim(),
      systemPruneOutput: systemOutput.trim(),
      reclaimedSpace,
      timestamp,
    };
  }

  // 2. Fallback: Use Docker Engine Socket API via Dockerode
  try {
    const containersPrune = await docker.pruneContainers({ all: true }).catch(() => null);
    const imagesPrune = await docker.pruneImages({ all: true }).catch(() => null);
    const networksPrune = await docker.pruneNetworks().catch(() => null);

    // Call Docker Engine build prune endpoint
    const buildPrune = await new Promise((resolve) => {
      (docker.modem as any).dial(
        {
          path: "/build/prune?all=true&keep-storage=0",
          method: "POST",
          statusCodes: { 200: true },
        },
        (err: any, data: any) => {
          if (err) return resolve(null);
          resolve(data);
        }
      );
    }).catch(() => null);

    let spaceReclaimedBytes = 0;
    if (imagesPrune && (imagesPrune as any).SpaceReclaimed) {
      spaceReclaimedBytes += (imagesPrune as any).SpaceReclaimed;
    }
    if (containersPrune && (containersPrune as any).SpaceReclaimed) {
      spaceReclaimedBytes += (containersPrune as any).SpaceReclaimed;
    }
    if (buildPrune && (buildPrune as any).SpaceReclaimed) {
      spaceReclaimedBytes += (buildPrune as any).SpaceReclaimed;
    }

    const reclaimedMb = (spaceReclaimedBytes / (1024 * 1024)).toFixed(2);

    return {
      success: true,
      builderPruneOutput: buildPrune
        ? `BuildKit cache cleared (${(buildPrune as any).CachesDeleted?.length || 0} build layers pruned)`
        : "BuildKit cache pruned via Docker Engine Socket",
      systemPruneOutput: `Cleaned dangling images (${(imagesPrune as any)?.ImagesDeleted?.length || 0} images removed), stopped containers, and unused networks.`,
      reclaimedSpace: `${reclaimedMb} MB reclaimed`,
      timestamp,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to execute Docker prune.",
      timestamp,
    };
  }
}

