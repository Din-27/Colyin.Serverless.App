const Docker = require("dockerode");
const os = require("os");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

function getDockerSocketOptions() {
  if (process.env.DOCKER_HOST) {
    return { host: process.env.DOCKER_HOST };
  }
  if (os.platform() === "win32") {
    return { socketPath: "//./pipe/docker_engine" };
  }
  return { socketPath: "/var/run/docker.sock" };
}

const docker = new Docker(getDockerSocketOptions());
const prisma = new PrismaClient();

const ADDON_DOCKER_TEMPLATES = {
  POSTGRESQL: {
    image: "postgres:16-alpine",
    defaultInternalPort: 5432,
    defaultVolumePath: "/var/lib/postgresql/data",
    envBuilder: ({ password, dbName, username }) => [
      `POSTGRES_USER=${username}`,
      `POSTGRES_PASSWORD=${password}`,
      `POSTGRES_DB=${dbName}`,
    ],
  },
  REDIS: {
    image: "redis:7-alpine",
    defaultInternalPort: 6379,
    defaultVolumePath: "/data",
    envBuilder: () => [],
    cmdBuilder: ({ password }) => ["redis-server", "--requirepass", password],
  },
  RABBITMQ: {
    image: "rabbitmq:3-management-alpine",
    defaultInternalPort: 5672,
    defaultVolumePath: "/var/lib/rabbitmq",
    uiPort: 15672,
    extraPorts: [
      { port: 15672, name: "stats" },
      { port: 25672, name: "dist" },
      { port: 4369, name: "epmd" },
    ],
    envBuilder: ({ password, username }) => [
      `RABBITMQ_DEFAULT_USER=${username}`,
      `RABBITMQ_DEFAULT_PASS=${password}`,
    ],
  },
  MINIO: {
    image: "quay.io/minio/minio:latest",
    defaultInternalPort: 9000,
    defaultVolumePath: "/data",
    uiPort: 9001,
    cmdBuilder: () => ["server", "/data", "--console-address", ":9001"],
    envBuilder: ({ password, username }) => [
      `MINIO_ROOT_USER=${username}`,
      `MINIO_ROOT_PASSWORD=${password}`,
    ],
  },
};

function decryptSecret(encryptedHex, ivHex, authTagHex) {
  try {
    const masterKey = Buffer.from(
      process.env.ENCRYPTION_MASTER_KEY || "56a03b74bb5689993f6172203f29d1c8449e6fade88facd8db1e32d4fcb460f7",
      "hex"
    );
    const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    return "default_secret";
  }
}

async function ensureImage(imageTag) {
  const normalizedTag =
    imageTag === "minio/minio:latest" || imageTag === "minio/minio"
      ? "quay.io/minio/minio:latest"
      : imageTag;

  try {
    await docker.getImage(normalizedTag).inspect();
  } catch {
    console.log(`[Docker Addons] Pulling image ${normalizedTag}...`);
    await new Promise((resolve, reject) => {
      docker.pull(normalizedTag, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (pullErr) => {
          if (pullErr) return reject(pullErr);
          resolve();
        });
      });
    });
  }
}

async function syncDockerAddons() {
  try {
    await docker.ping();
  } catch (pingErr) {
    console.warn("[Docker Addons] Docker daemon is offline or unreachable:", pingErr.message);
    return;
  }

  try {
    const addons = await prisma.addon.findMany({
      where: { status: "RUNNING" },
      include: { project: true },
    });

    for (const addon of addons) {
      const template = ADDON_DOCKER_TEMPLATES[addon.type];
      if (!template) continue;

      let isRunning = false;
      if (addon.containerId) {
        try {
          const container = docker.getContainer(addon.containerId);
          const inspect = await container.inspect();
          if (inspect.State.Running) {
            isRunning = true;
          } else {
            console.log(`[Docker Addons] Starting stopped container ${addon.containerId} for ${addon.name}`);
            await container.start();
            isRunning = true;
          }
        } catch {
          isRunning = false;
        }
      }

      if (!isRunning) {
        try {
          console.log(`[Docker Addons] Provisioning Docker container for ${addon.name} (${addon.type})...`);
          await ensureImage(template.image);

          const password = decryptSecret(addon.encryptedPass, addon.iv, addon.authTag);
          const username = addon.type === "POSTGRESQL" ? "postgres" : addon.type === "MINIO" ? "minioadmin" : "guest";
          const dbName = "main";
          const envs = template.envBuilder({ password, dbName, username });
          const cmd = template.cmdBuilder ? template.cmdBuilder({ password }) : undefined;

          const portBindings = {};
          const exposedPorts = {
            [`${template.defaultInternalPort}/tcp`]: {},
          };

          if (addon.publicPort) {
            portBindings[`${template.defaultInternalPort}/tcp`] = [
              { HostIp: "0.0.0.0", HostPort: addon.publicPort.toString() },
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
              if (addon.publicPort || ep.port === 15672) {
                portBindings[`${ep.port}/tcp`] = [
                  { HostIp: "0.0.0.0", HostPort: ep.port.toString() },
                ];
              }
            }
          }

          const networkToUse = addon.project?.networkName || "minipaas-global";
          const volumeName = addon.volumeName || `vol_${addon.internalHost}_data`;

          const container = await docker.createContainer({
            name: addon.internalHost,
            Image: template.image,
            Env: envs,
            Cmd: cmd,
            ExposedPorts: exposedPorts,
            HostConfig: {
              Binds: [`${volumeName}:${template.defaultVolumePath}:rw`],
              PortBindings: portBindings,
              RestartPolicy: { Name: "unless-stopped" },
            },
            NetworkingConfig: {
              EndpointsConfig: {
                [networkToUse]: {
                  Aliases: [addon.internalHost],
                },
              },
            },
            Labels: {
              "managed-by": "minipaas",
              "addon-type": addon.type,
              "addon-id": addon.id,
            },
          });

          await container.start();
          console.log(`>> [Docker Addon Online] ${addon.name} running in container ${container.id}`);

          await prisma.addon.update({
            where: { id: addon.id },
            data: { containerId: container.id },
          });
        } catch (provErr) {
          console.error(`[Docker Addons] Failed to provision ${addon.name}:`, provErr.message);
        }
      }
    }
  } catch (err) {
    console.error("[Docker Addons] Error in daemon loop:", err.message);
  }
}

async function main() {
  console.log("=== Colyin Docker Addons Daemon ===");
  console.log("Monitoring and maintaining official Docker containers (PostgreSQL, Redis, RabbitMQ, MinIO)...");
  
  await syncDockerAddons();
  setInterval(syncDockerAddons, 8000);
}

main().catch(console.error);
