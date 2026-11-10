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

/**
 * Starts an existing stopped container.
 */
export async function startContainer(containerId: string): Promise<boolean> {
  try {
    const container = docker.getContainer(containerId);
    await container.start();
    return true;
  } catch (err: any) {
    console.error(`Error starting container ${containerId}:`, err);
    throw err;
  }
}

/**
 * Stops a running container.
 */
export async function stopContainer(containerId: string): Promise<boolean> {
  try {
    const container = docker.getContainer(containerId);
    await container.stop({ t: 10 });
    return true;
  } catch (err: any) {
    console.error(`Error stopping container ${containerId}:`, err);
    throw err;
  }
}

/**
 * Restarts a running container.
 */
export async function restartContainer(containerId: string): Promise<boolean> {
  try {
    const container = docker.getContainer(containerId);
    await container.restart({ t: 10 });
    return true;
  } catch (err: any) {
    console.error(`Error restarting container ${containerId}:`, err);
    throw err;
  }
}

/**
 * Inspects container runtime status.
 */
export async function inspectContainer(containerId: string): Promise<any> {
  try {
    const container = docker.getContainer(containerId);
    return await container.inspect();
  } catch (err: any) {
    return null;
  }
}

/**
 * Force stops and removes a container.
 */
export async function removeContainer(containerId: string): Promise<boolean> {
  try {
    const container = docker.getContainer(containerId);
    try {
      await container.stop({ t: 2 });
    } catch {}
    await container.remove({ force: true, v: true });
    return true;
  } catch (err: any) {
    console.warn(`Could not remove container ${containerId}:`, err?.message);
    return false;
  }
}

/**
 * Removes an isolated Docker network.
 */
export async function removeNetwork(networkName: string): Promise<boolean> {
  try {
    const networks = await docker.listNetworks();
    const existing = networks.find((n) => n.Name === networkName);
    if (existing) {
      const net = docker.getNetwork(existing.Id);
      await net.remove();
      return true;
    }
    return false;
  } catch (err: any) {
    console.warn(`Could not remove network ${networkName}:`, err?.message);
    return false;
  }
}


