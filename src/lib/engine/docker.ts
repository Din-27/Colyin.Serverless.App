import Docker from "dockerode";
import os from "os";

// Detect system socket path: Windows named pipe or Linux/Unix socket
function getDockerSocketOptions(): Docker.DockerOptions {
  if (process.env.DOCKER_HOST) {
    return { host: process.env.DOCKER_HOST };
  }
  if (os.platform() === "win32") {
    return { socketPath: "//./pipe/docker_engine" };
  }
  return { socketPath: "/var/run/docker.sock" };
}

export const docker = new Docker(getDockerSocketOptions());

/**
 * Checks if the Docker daemon is accessible and returns system info.
 */
export async function getDockerDaemonStatus(): Promise<{
  online: boolean;
  info?: any;
  error?: string;
}> {
  try {
    const info = await docker.info();
    return { online: true, info };
  } catch (err: any) {
    return {
      online: false,
      error: err?.message || "Failed to connect to Docker socket.",
    };
  }
}

/**
 * Ensures a project-scoped isolated bridge network exists.
 */
export async function ensureProjectNetwork(networkName: string, projectId: string): Promise<string> {
  try {
    const networks = await docker.listNetworks();
    const existing = networks.find((n) => n.Name === networkName);
    if (existing) {
      return existing.Id;
    }

    const created = await docker.createNetwork({
      Name: networkName,
      Driver: "bridge",
      CheckDuplicate: true,
      Internal: false,
      Attachable: true,
      Labels: {
        "managed-by": "minipaas",
        "project-id": projectId,
      },
    });

    return created.id;
  } catch (err: any) {
    console.error(`Error ensuring network ${networkName}:`, err);
    throw err;
  }
}

/**
 * Calculates CPU and Memory quota settings for cgroups v2.
 */
export function buildHostConfig(
  cpuLimit: number = 1.0,
  memoryLimitMb: number = 512,
  volumeBinds: string[] = [],
  portBindings: Record<string, Array<{ HostPort: string }>> = {}
): Docker.HostConfig {
  const NanoCpus = Math.floor(cpuLimit * 1e9);
  const Memory = memoryLimitMb * 1024 * 1024;
  const MemorySwap = Memory; // Disable swap to avoid disk thrashing

  return {
    NanoCpus,
    Memory,
    MemorySwap,
    OomKillDisable: false,
    RestartPolicy: {
      Name: "unless-stopped",
    },
    Binds: volumeBinds,
    PortBindings: portBindings,
    CapDrop: ["ALL"],
    CapAdd: ["CHOWN", "SETUID", "SETGID", "NET_BIND_SERVICE"],
  };
}

/**
 * Pulls a docker image if not present locally.
 */
export async function ensureImage(imageTag: string): Promise<void> {
  try {
    await docker.getImage(imageTag).inspect();
  } catch {
    await new Promise((resolve, reject) => {
      docker.pull(imageTag, (err: any, stream: any) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (pullErr: any, output: any) => {
          if (pullErr) return reject(pullErr);
          resolve(output);
        });
      });
    });
  }
}
