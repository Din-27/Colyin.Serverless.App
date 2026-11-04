import { docker, buildHostConfig, ensureImage } from "./docker";
import crypto from "crypto";

export interface AddonTemplate {
  type: string;
  name: string;
  image: string;
  defaultInternalPort: number;
  defaultVolumePath: string;
  uiPort?: number;
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
  MYSQL: {
    type: "MYSQL",
    name: "MySQL Database",
    image: "mysql:8.4",
    defaultInternalPort: 3306,
    defaultVolumePath: "/var/lib/mysql",
    envBuilder: ({ password, dbName, username }) => [
      `MYSQL_ROOT_PASSWORD=${password}`,
      `MYSQL_USER=${username}`,
      `MYSQL_PASSWORD=${password}`,
      `MYSQL_DATABASE=${dbName}`,
    ],
    internalUriBuilder: ({ host, port, user, password, dbName }) =>
      `mysql://${user}:${password}@${host}:${port}/${dbName}`,
    externalUriBuilder: ({ host, port, user, password, dbName }) =>
      `mysql://${user}:${password}@${host}:${port}/${dbName}`,
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
    image: "minio/minio:latest",
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
  dbName?: string;
  user?: string;
  password?: string;
  publicPort?: number;
}): Promise<{ containerId: string; internalHost: string }> {
  const template = ADDON_TEMPLATES[params.type];
  if (!template) {
    throw new Error(`Unsupported addon type: ${params.type}`);
  }

  const internalHost = `addon_${params.type.toLowerCase()}_${params.addonId.slice(-6)}`;
  const volumeName = `vol_${internalHost}_data`;
  const password = params.password || crypto.randomBytes(12).toString("hex");
  const username = params.user || (params.type === "POSTGRESQL" ? "postgres" : "root");
  const dbName = params.dbName || "main";

  await ensureImage(template.image);

  const envs = template.envBuilder({ password, dbName, username });
  if (params.type === "REDIS") {
    envs.push(`REDIS_ARGS=--requirepass ${password}`);
  }

  const portBindings: Record<string, Array<{ HostPort: string }>> = {};
  if (params.publicPort) {
    portBindings[`${template.defaultInternalPort}/tcp`] = [
      { HostPort: params.publicPort.toString() },
    ];
  }

  const hostConfig = buildHostConfig(
    0.5, // 0.5 CPU
    512, // 512 MB
    [`${volumeName}:${template.defaultVolumePath}:rw`],
    portBindings
  );

  const container = await docker.createContainer({
    name: internalHost,
    Image: template.image,
    Env: envs,
    HostConfig: hostConfig,
    NetworkingConfig: {
      EndpointsConfig: {
        [params.networkName]: {
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
  return { containerId: container.id, internalHost };
}
