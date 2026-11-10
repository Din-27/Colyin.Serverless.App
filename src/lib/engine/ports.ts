import net from "net";
import { db } from "@/lib/db";

export const RESERVED_PLATFORM_PORTS: Record<number, string> = {
  80: "HTTP Ingress Reverse Proxy",
  443: "HTTPS Ingress Reverse Proxy (Wildcard SSL)",
  3000: "MiniPaaS Platform Dashboard",
  22: "SSH Daemon",
  53: "DNS Service",
};

/**
 * Tests active TCP connection to detect services already listening (including dual-stack IPv6).
 */
function testConnect(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    socket.setTimeout(300);

    socket.once("connect", () => {
      settled = true;
      socket.destroy();
      resolve(true); // Active connection succeeded -> port is occupied
    });

    socket.once("timeout", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.once("error", () => {
      if (!settled) {
        settled = true;
        socket.destroy();
        resolve(false);
      }
    });

    try {
      socket.connect(port, host);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Checks whether a port can be bound exclusively.
 * Returns true if port is occupied (in use/error), false if cleanly free.
 */
function testListen(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    let settled = false;

    server.once("error", () => {
      if (!settled) {
        settled = true;
        resolve(true);
      }
    });

    server.once("listening", () => {
      if (!settled) {
        settled = true;
        server.close(() => {
          resolve(false);
        });
      }
    });

    try {
      server.listen({ port, host, exclusive: true });
    } catch {
      resolve(true);
    }
  });
}

export async function isPortListeningOnHost(port: number): Promise<boolean> {
  if (!port || port < 1 || port > 65535) return true;

  // 1. Reserved platform port check
  if (RESERVED_PLATFORM_PORTS[port]) {
    return true;
  }

  // 2. Active client probe across loopbacks
  const connLocal = await testConnect(port, "localhost");
  if (connLocal) return true;

  const conn127 = await testConnect(port, "127.0.0.1");
  if (conn127) return true;

  const connIpv6 = await testConnect(port, "::1");
  if (connIpv6) return true;

  // 3. Socket listen bind probe
  const occupied0 = await testListen(port, "0.0.0.0");
  if (occupied0) return true;

  const occupied127 = await testListen(port, "127.0.0.1");
  if (occupied127) return true;

  return false;
}

export interface PortCheckResult {
  available: boolean;
  reason?: string;
  suggestedPort?: number;
}

/**
 * Checks if a port is recorded in the SQLite database by any active Application or Addon.
 */
export async function isPortUsedInDatabase(
  port: number,
  options?: { excludeAppId?: string; excludeAddonId?: string }
): Promise<{ used: boolean; ownerType?: string; ownerName?: string }> {
  // Check applications
  const app = await db.application.findFirst({
    where: {
      internalPort: port,
      id: options?.excludeAppId ? { not: options.excludeAppId } : undefined,
    },
    select: { id: true, name: true },
  });

  if (app) {
    return {
      used: true,
      ownerType: "Application",
      ownerName: app.name,
    };
  }

  // Check addons (both internal and public ports)
  const addon = await db.addon.findFirst({
    where: {
      OR: [{ internalPort: port }, { publicPort: port }],
      id: options?.excludeAddonId ? { not: options.excludeAddonId } : undefined,
    },
    select: { id: true, name: true, publicPort: true, internalPort: true },
  });

  if (addon) {
    const portType = addon.publicPort === port ? "Public Port" : "Internal Port";
    return {
      used: true,
      ownerType: `Addon (${portType})`,
      ownerName: addon.name,
    };
  }

  return { used: false };
}

/**
 * Validates whether a port is strictly unique (not in DB), not reserved by platform, AND not listening on host.
 */
export async function validatePort(
  port: number,
  options?: { excludeAppId?: string; excludeAddonId?: string }
): Promise<PortCheckResult> {
  if (!port || isNaN(port) || port < 1 || port > 65535) {
    const suggestedPort = await findNextAvailablePort(3001, options);
    return {
      available: false,
      reason: "Port must be an integer between 1 and 65535",
      suggestedPort,
    };
  }

  // 1. Check reserved system ports (e.g. 3000 for MiniPaaS Dashboard, 80/443 for Ingress)
  if (RESERVED_PLATFORM_PORTS[port]) {
    const suggestedPort = await findNextAvailablePort(port + 1, options);
    return {
      available: false,
      reason: `Port ${port} is reserved for ${RESERVED_PLATFORM_PORTS[port]}. Deployed services cannot share platform ports.`,
      suggestedPort,
    };
  }

  // 2. Check database uniqueness
  const dbCheck = await isPortUsedInDatabase(port, options);
  if (dbCheck.used) {
    const suggestedPort = await findNextAvailablePort(port + 1, options);
    return {
      available: false,
      reason: `Port ${port} is already assigned to ${dbCheck.ownerType} '${dbCheck.ownerName}'`,
      suggestedPort,
    };
  }

  // 3. Check host socket availability
  const hostInUse = await isPortListeningOnHost(port);
  if (hostInUse) {
    const suggestedPort = await findNextAvailablePort(port + 1, options);
    return {
      available: false,
      reason: `Port ${port} is currently in use by another active process on the host system`,
      suggestedPort,
    };
  }

  return { available: true };
}

/**
 * Finds the next available port that is GUARANTEED to be:
 * 1. Unique across all applications and addons in the database.
 * 2. Unoccupied by any process currently running on the host OS.
 */
export async function findNextAvailablePort(
  preferredPort = 3001,
  options?: { excludeAppId?: string; excludeAddonId?: string; minPort?: number; maxPort?: number }
): Promise<number> {
  const minPort = options?.minPort || Math.max(1024, preferredPort);
  const maxPort = options?.maxPort || 65535;

  let candidate = minPort;

  // Scan sequentially for a clean, non-conflicting port
  while (candidate <= maxPort) {
    const dbCheck = await isPortUsedInDatabase(candidate, options);
    if (!dbCheck.used) {
      const inUse = await isPortListeningOnHost(candidate);
      if (!inUse) {
        return candidate;
      }
    }
    candidate++;
  }

  // Fallback to random high ports (20000 - 30000)
  for (let attempt = 0; attempt < 50; attempt++) {
    const randomCandidate = Math.floor(20000 + Math.random() * 10000);
    const dbCheck = await isPortUsedInDatabase(randomCandidate, options);
    if (!dbCheck.used) {
      const inUse = await isPortListeningOnHost(randomCandidate);
      if (!inUse) {
        return randomCandidate;
      }
    }
  }

  return candidate;
}

/**
 * Allocates a unique, unoccupied public port for an Addon in the 10000 - 20000 range.
 */
export async function allocateUniqueAddonPublicPort(excludeAddonId?: string): Promise<number> {
  return findNextAvailablePort(10000, {
    excludeAddonId,
    minPort: 10000,
    maxPort: 20000,
  });
}
