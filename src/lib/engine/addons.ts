import { docker, buildHostConfig, ensureImage } from "./docker";
import crypto from "crypto";

export interface AddonPortSpec {
  port: number;
  protocol?: string;
  name: string;
  description?: string;
}

export interface AddonTemplate {
  type: string;
  name: string;
  image: string;
  defaultInternalPort: number;
  defaultVolumePath: string;
  uiPort?: number;
  extraPorts?: AddonPortSpec[];
  envBuilder: (params: {
    password: string;
    dbName: string;
    username: string;
  }) => string[];
  internalUriBuilder: (params: {
    host: string;
    port: number;
    user: string;
    password: string;
    dbName: string;
  }) => string;
  externalUriBuilder: (params: {
    host: string;
    port: number;
    user: string;
    password: string;
    dbName: string;
  }) => string;
}

export const ADDON_TEMPLATES: Record<string, AddonTemplate> = {
  POSTGRESQL: {
    type: "POSTGRESQL",
    name: "PostgreSQL Database",
    image: "postgres:16-alpine",
    defaultInternalPort: 5432,
    defaultVolumePath: "/var/lib/postgresql/data",
    envBuilder: ({ password, dbName, username }) => [
      `POSTGRES_USER=${username}`,
      `POSTGRES_PASSWORD=${password}`,
      `POSTGRES_DB=${dbName}`,
    ],
    internalUriBuilder: ({ host, port, user, password, dbName }) =>
      `postgresql://${user}:${password}@${host}:${port}/${dbName}`,
    externalUriBuilder: ({ host, port, user, password, dbName }) =>
      `postgresql://${user}:${password}@${host}:${port}/${dbName}`,
  },
  REDIS: {
    type: "REDIS",
    name: "Redis In-Memory Cache",
    image: "redis:7-alpine",
    defaultInternalPort: 6379,
    defaultVolumePath: "/data",
    envBuilder: () => [],
    internalUriBuilder: ({ host, port, password }) =>
      `redis://default:${password}@${host}:${port}`,
    externalUriBuilder: ({ host, port, password }) =>
      `redis://default:${password}@${host}:${port}`,
  },
  RABBITMQ: {
    type: "RABBITMQ",
    name: "RabbitMQ Message Broker",
    image: "rabbitmq:3-management-alpine",
    defaultInternalPort: 5672,
    defaultVolumePath: "/var/lib/rabbitmq",
    uiPort: 15672,
    extraPorts: [
      { port: 15672, protocol: "tcp", name: "stats", description: "Management Web UI & HTTP API" },
      { port: 25672, protocol: "tcp", name: "dist", description: "Erlang distribution / CLI inter-node" },
      { port: 4369, protocol: "tcp", name: "epmd", description: "Erlang Port Mapper Daemon (peer discovery)" },
    ],
    envBuilder: ({ password, username }) => [
      `RABBITMQ_DEFAULT_USER=${username}`,
      `RABBITMQ_DEFAULT_PASS=${password}`,
    ],
    internalUriBuilder: ({ host, port, user, password }) =>
      `amqp://${user}:${password}@${host}:${port}`,
    externalUriBuilder: ({ host, port, user, password }) =>
      `amqp://${user}:${password}@${host}:${port}`,
  },
  MINIO: {
    type: "MINIO",
    name: "MinIO S3 Object Storage",
    image: "cgr.dev/chainguard/minio:latest",
    defaultInternalPort: 9000,
    defaultVolumePath: "/data",
    uiPort: 9001,
    envBuilder: ({ password, username }) => [
      `MINIO_ROOT_USER=${username}`,
      `MINIO_ROOT_PASSWORD=${password}`,
    ],
    internalUriBuilder: ({ host, port }) => `http://${host}:${port}`,
    externalUriBuilder: ({ host, port }) => `http://${host}:${port}`,
  },
};

/**
 * Provisions a dedicated addon container connected to the project network.
 */
export async function provisionDedicatedAddon(params: {
  addonId: string;
  type: string;
  networkName: string;
  internalHost?: string;
  dbName?: string;
  user?: string;
  password?: string;
  publicPort?: number;
}): Promise<{ containerId: string; internalHost: string }> {
  const template = ADDON_TEMPLATES[params.type];
  if (!template) {
    throw new Error(`Unsupported addon type: ${params.type}`);
  }

  const internalHost =
    params.internalHost || `addon_${params.type.toLowerCase()}_${params.addonId.slice(-6)}`;
  const volumeName = `vol_${internalHost}_data`;
  const password = params.password || crypto.randomBytes(12).toString("hex");
  const username = params.user || (params.type === "POSTGRESQL" ? "postgres" : "root");
  const dbName = params.dbName || "main";

  // 1. Ensure docker networks exist
  const networkToUse = params.networkName || "minipaas-global";
  try {
    const { ensureProjectNetwork, ensureGlobalNetwork } = await import("./docker");
    if (networkToUse === "minipaas-global") {
      await ensureGlobalNetwork();
    } else {
      await ensureProjectNetwork(networkToUse, params.addonId);
    }
  } catch (netErr) {
    console.warn("[provisionDedicatedAddon] Could not ensure network:", netErr);
  }

  // 2. Stop and remove any pre-existing container with this name
  try {
    const oldContainer = docker.getContainer(internalHost);
    await oldContainer.stop({ t: 2 }).catch(() => {});
    await oldContainer.remove({ force: true }).catch(() => {});
  } catch {}

  // 3. Ensure image exists
  await ensureImage(template.image);

  const envs = template.envBuilder({ password, dbName, username });

  // Add specific CMD / flags for Redis and MinIO
  let cmd: string[] | undefined = undefined;
  if (params.type === "REDIS") {
    cmd = ["redis-server", "--requirepass", password];
  } else if (params.type === "MINIO") {
    cmd = ["server", "/data", "--console-address", ":9001"];
  }

  const portBindings: Record<string, Array<{ HostIp?: string; HostPort: string }>> = {};
  const exposedPorts: Record<string, {}> = {
    [`${template.defaultInternalPort}/tcp`]: {},
  };

  if (params.publicPort) {
    portBindings[`${template.defaultInternalPort}/tcp`] = [
      { HostIp: "0.0.0.0", HostPort: params.publicPort.toString() },
    ];
  }
  if (template.uiPort) {
    exposedPorts[`${template.uiPort}/tcp`] = {};
    portBindings[`${template.uiPort}/tcp`] = [
      { HostIp: "0.0.0.0", HostPort: template.uiPort.toString() },
    ];
  }
  if (template.extraPorts) {
    for (const ep of template.extraPorts) {
      exposedPorts[`${ep.port}/tcp`] = {};
      if (params.publicPort || ep.port === 15672) {
        portBindings[`${ep.port}/tcp`] = [
          { HostIp: "0.0.0.0", HostPort: ep.port.toString() },
        ];
      }
    }
  }

  const hostConfig = buildHostConfig(
    0.5, // 0.5 CPU
    512, // 512 MB
    [`${volumeName}:${template.defaultVolumePath}:rw`],
    portBindings,
    networkToUse
  );

  const container = await docker.createContainer({
    name: internalHost,
    Image: template.image,
    Env: envs,
    Cmd: cmd,
    ExposedPorts: exposedPorts,
    HostConfig: hostConfig,
    NetworkingConfig: {
      EndpointsConfig: {
        [networkToUse]: {
          Aliases: [internalHost],
        },
      },
    },
    Labels: {
      "managed-by": "minipaas",
      "addon-type": params.type,
      "addon-id": params.addonId,
    },
  });

  await container.start();

  // Also connect to minipaas-global if project network is isolated, so controller/traefik can communicate
  if (networkToUse !== "minipaas-global") {
    try {
      const globalNet = docker.getNetwork("minipaas-global");
      await globalNet
        .connect({ Container: container.id, EndpointConfig: { Aliases: [internalHost] } })
        .catch(() => {});
    } catch {}
  }

  return { containerId: container.id, internalHost };
}

/**
 * Syncs and ensures all RUNNING database addons have active Docker containers.
 */
export async function syncAllDockerAddons(): Promise<void> {
  try {
    const { getDockerDaemonStatus } = await import("./docker");
    const status = await getDockerDaemonStatus();
    if (!status.online) {
      console.warn("[Docker Addons] Docker daemon is offline. Skipping addon container sync.");
      return;
    }

    const { db } = await import("@/lib/db");
    const addons = await db.addon.findMany({
      where: { status: "RUNNING" },
      include: { project: true },
    });

    for (const addon of addons) {
      try {
        const template = ADDON_TEMPLATES[addon.type];
        if (!template) continue;

        let containerNeedsStart = true;
        if (addon.containerId) {
          try {
            const container = docker.getContainer(addon.containerId);
            const inspect = await container.inspect();
            if (inspect.State.Running) {
              containerNeedsStart = false;
            } else {
              await container.start();
              containerNeedsStart = false;
            }
          } catch {
            containerNeedsStart = true;
          }
        }

        if (containerNeedsStart) {
          const { decryptSecret } = await import("./crypto");
          const password = decryptSecret(addon.encryptedPass, addon.iv, addon.authTag);
          const res = await provisionDedicatedAddon({
            addonId: addon.id,
            type: addon.type,
            networkName: addon.project?.networkName || "minipaas-global",
            internalHost: addon.internalHost,
            password,
            publicPort: addon.publicPort || undefined,
          });

          await db.addon.update({
            where: { id: addon.id },
            data: { containerId: res.containerId },
          });
        }
      } catch (err: any) {
        console.warn(`[Docker Addons] Failed to sync addon container '${addon.name}':`, err.message);
      }
    }
  } catch (err: any) {
    console.warn("[Docker Addons] Error in syncAllDockerAddons:", err.message);
  }
}
