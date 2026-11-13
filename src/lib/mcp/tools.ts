import { db } from "@/lib/db";
import { docker, getDockerDaemonStatus, parseDockerLogChunk } from "@/lib/engine/docker";
import { runBuildPipeline } from "@/app/api/apps/[id]/deploy/route";
import os from "os";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export const COLYIN_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "colyin_list_projects",
    description: "List all projects in the Colyin PaaS cluster along with their applications count, database addons, and network configuration.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "colyin_list_applications",
    description: "List all deployed applications across the cluster or within a specific project. Includes running status, version, domains, port, and resource limits.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: {
          type: "string",
          description: "Optional project ID filter. If omitted, returns all applications in the cluster.",
        },
      },
    },
  },
  {
    name: "colyin_get_application",
    description: "Retrieve comprehensive specifications of a single application by ID or slug: domains, active version, container ID, CPU/RAM limits, and environment variable keys.",
    inputSchema: {
      type: "object",
      properties: {
        appId: {
          type: "string",
          description: "The unique ID or slug of the application.",
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "colyin_get_docker_logs",
    description: "Fetch real Docker container logs (stdout & stderr) for a running application. Useful for debugging errors, checking startup state, and inspecting runtime output.",
    inputSchema: {
      type: "object",
      properties: {
        appId: {
          type: "string",
          description: "The unique ID or slug of the application to inspect.",
        },
        tail: {
          type: "integer",
          description: "Number of most recent log lines to retrieve (default: 100, max: 1000).",
          default: 100,
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "colyin_deploy_application",
    description: "Trigger a fresh build and deployment pipeline for an application from its Git repository, incrementing its release version.",
    inputSchema: {
      type: "object",
      properties: {
        appId: {
          type: "string",
          description: "The unique ID or slug of the application to deploy.",
        },
        branch: {
          type: "string",
          description: "Optional Git branch override to build and deploy.",
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "colyin_restart_application",
    description: "Safely restart the running Docker container or process for an application without rebuilding.",
    inputSchema: {
      type: "object",
      properties: {
        appId: {
          type: "string",
          description: "The unique ID or slug of the application to restart.",
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "colyin_stop_application",
    description: "Stop the running Docker container for an application without deleting the application service.",
    inputSchema: {
      type: "object",
      properties: {
        appId: {
          type: "string",
          description: "The unique ID or slug of the application to stop.",
        },
      },
      required: ["appId"],
    },
  },
  {
    name: "colyin_docker_prune",
    description: "Reclaim host server disk space by cleaning up either Docker build cache ('builder') or unused containers/images/networks ('system').",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          enum: ["builder", "system"],
          description: "The cleanup target mode: 'builder' clears buildx cache, 'system' cleans unused images and containers.",
          default: "builder",
        },
      },
      required: ["mode"],
    },
  },
  {
    name: "colyin_get_system_telemetry",
    description: "Retrieve host server telemetry metrics: CPU load, RAM usage, Docker daemon status, total containers running, and disk information.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

export async function executeMcpTool(name: string, args: Record<string, any> = {}): Promise<any> {
  switch (name) {
    case "colyin_list_projects": {
      const projects = await db.project.findMany({
        include: {
          applications: {
            select: { id: true, name: true, slug: true, internalPort: true },
          },
          addons: {
            select: { id: true, name: true, type: true, status: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        total: projects.length,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          networkName: p.networkName,
          applicationsCount: p.applications.length,
          applications: p.applications,
          addonsCount: p.addons.length,
          addons: p.addons,
          createdAt: p.createdAt,
        })),
      };
    }

    case "colyin_list_applications": {
      const whereClause: any = {};
      if (args.projectId) {
        whereClause.projectId = args.projectId;
      }

      const apps = await db.application.findMany({
        where: whereClause,
        include: {
          project: { select: { id: true, name: true } },
          domains: { select: { id: true, host: true, isPrimary: true } },
          deployments: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: { id: true, status: true, commitHash: true, containerId: true, startedAt: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        total: apps.length,
        applications: apps.map((app) => {
          const latestDeploy = app.deployments[0];
          return {
            id: app.id,
            name: app.name,
            slug: app.slug,
            version: (app as any).version || "v1.0.0",
            status: latestDeploy?.status || "STOPPED",
            projectId: app.project.id,
            projectName: app.project.name,
            internalPort: app.internalPort,
            primaryDomain: app.domains.find((d) => d.isPrimary)?.host || app.domains[0]?.host || null,
            cpuLimit: app.cpuLimit,
            memoryLimitMb: app.memoryLimitMb,
            buildPack: app.buildPack,
            repositoryUrl: app.repositoryUrl,
            branch: app.branch,
            containerId: latestDeploy?.containerId || null,
          };
        }),
      };
    }

    case "colyin_get_application": {
      const { appId } = args;
      if (!appId) throw new Error("Argument 'appId' is required.");

      const app = await db.application.findFirst({
        where: {
          OR: [{ id: appId }, { slug: appId }],
        },
        include: {
          project: true,
          domains: true,
          envVariables: { select: { key: true, type: true, createdAt: true } },
          deployments: {
            orderBy: { startedAt: "desc" },
            take: 5,
            select: { id: true, status: true, version: true, commitHash: true, containerId: true, startedAt: true, finishedAt: true },
          },
        },
      });

      if (!app) {
        throw new Error(`Application with ID or slug '${appId}' was not found.`);
      }

      const activeDeploy = app.deployments[0];
      return {
        id: app.id,
        name: app.name,
        slug: app.slug,
        version: (app as any).version || "v1.0.0",
        status: activeDeploy?.status || "STOPPED",
        project: {
          id: app.project.id,
          name: app.project.name,
          slug: app.project.slug,
        },
        repositoryUrl: app.repositoryUrl,
        branch: app.branch,
        buildPack: app.buildPack,
        internalPort: app.internalPort,
        cpuLimit: app.cpuLimit,
        memoryLimitMb: app.memoryLimitMb,
        containerId: activeDeploy?.containerId || null,
        domains: app.domains.map((d) => ({
          host: d.host,
          isPrimary: d.isPrimary,
          sslEnabled: d.sslEnabled,
        })),
        environmentVariableKeys: app.envVariables.map((e) => e.key),
        recentDeployments: app.deployments,
      };
    }

    case "colyin_get_docker_logs": {
      const { appId, tail = 100 } = args;
      if (!appId) throw new Error("Argument 'appId' is required.");

      const app = await db.application.findFirst({
        where: { OR: [{ id: appId }, { slug: appId }] },
        include: {
          deployments: {
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!app) {
        throw new Error(`Application '${appId}' not found.`);
      }

      const activeDeployment = app.deployments[0];
      let containerId = activeDeployment?.containerId;

      const dockerStatus = await getDockerDaemonStatus();
      if (!dockerStatus.online) {
        return {
          appId: app.id,
          appName: app.name,
          dockerStatus: "OFFLINE",
          message: "Docker daemon is offline. Service is managed via native standalone mode.",
          logs: [],
        };
      }

      // If containerId is missing from db record, try to discover by container name
      if (!containerId) {
        try {
          const containers = await docker.listContainers({ all: true });
          const found = containers.find(
            (c) =>
              c.Names?.some((n) => n.includes(app.slug) || n.includes(app.id)) ||
              c.Labels?.["app-id"] === app.id
          );
          if (found) {
            containerId = found.Id;
          }
        } catch {}
      }

      if (!containerId) {
        return {
          appId: app.id,
          appName: app.name,
          status: activeDeployment?.status || "STOPPED",
          containerId: null,
          message: "No Docker container is currently associated with this application. Run 'colyin_deploy_application' first.",
          logs: [],
        };
      }

      try {
        const container = docker.getContainer(containerId);
        const logBuffer = await container.logs({
          follow: false,
          stdout: true,
          stderr: true,
          tail: Math.min(Math.max(1, tail), 1000),
          timestamps: true,
        });

        const parsed = parseDockerLogChunk(Buffer.isBuffer(logBuffer) ? logBuffer : Buffer.from(logBuffer as any));
        const rawLines = parsed.flatMap((p) => p.text.split("\n").filter((l) => l.trim().length > 0));

        return {
          appId: app.id,
          appName: app.name,
          containerId: containerId.slice(0, 12),
          linesCount: rawLines.length,
          logs: rawLines,
          rawOutput: rawLines.join("\n"),
        };
      } catch (err: any) {
        return {
          appId: app.id,
          appName: app.name,
          containerId: containerId.slice(0, 12),
          error: `Failed to read docker logs: ${err.message}`,
        };
      }
    }

    case "colyin_deploy_application": {
      const { appId, branch } = args;
      if (!appId) throw new Error("Argument 'appId' is required.");

      const app = await db.application.findFirst({
        where: { OR: [{ id: appId }, { slug: appId }] },
      });

      if (!app) {
        throw new Error(`Application '${appId}' not found.`);
      }

      const deployCount = await db.deployment.count({ where: { applicationId: app.id } });
      const nextVersion = deployCount === 0 ? (app.version || "v1.0.0") : `v1.0.${deployCount}`;

      const deployment = await db.deployment.create({
        data: {
          applicationId: app.id,
          branch: branch || app.branch,
          status: "BUILDING",
          version: nextVersion,
          commitHash: Math.random().toString(36).slice(2, 9),
          commitMessage: "Deployment triggered via AI Agent (MCP)",
        },
      });

      // Launch pipeline asynchronously
      runBuildPipeline(app, deployment.id, nextVersion).catch((err) => {
        console.error("[MCP Deploy Error]:", err);
      });

      return {
        success: true,
        message: `Deployment pipeline triggered successfully for '${app.name}'.`,
        deploymentId: deployment.id,
        targetVersion: nextVersion,
        branch: branch || app.branch,
        status: "BUILDING",
      };
    }

    case "colyin_restart_application": {
      const { appId } = args;
      if (!appId) throw new Error("Argument 'appId' is required.");

      const app = await db.application.findFirst({
        where: { OR: [{ id: appId }, { slug: appId }] },
        include: {
          deployments: {
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!app) throw new Error(`Application '${appId}' not found.`);

      const activeDeploy = app.deployments[0];
      const containerId = activeDeploy?.containerId;

      if (!containerId) {
        throw new Error(`No active container found for application '${app.name}'. Deploy it first.`);
      }

      const dockerStatus = await getDockerDaemonStatus();
      if (!dockerStatus.online) {
        throw new Error("Docker daemon is offline.");
      }

      const container = docker.getContainer(containerId);
      await container.restart({ t: 2 });

      return {
        success: true,
        message: `Application container '${containerId.slice(0, 12)}' restarted successfully.`,
        appId: app.id,
        appName: app.name,
      };
    }

    case "colyin_stop_application": {
      const { appId } = args;
      if (!appId) throw new Error("Argument 'appId' is required.");

      const app = await db.application.findFirst({
        where: { OR: [{ id: appId }, { slug: appId }] },
        include: {
          deployments: {
            orderBy: { startedAt: "desc" },
            take: 1,
          },
        },
      });

      if (!app) throw new Error(`Application '${appId}' not found.`);

      const activeDeploy = app.deployments[0];
      const containerId = activeDeploy?.containerId;

      if (!containerId) {
        return { success: true, message: "Service is already stopped." };
      }

      const dockerStatus = await getDockerDaemonStatus();
      if (dockerStatus.online) {
        try {
          const container = docker.getContainer(containerId);
          await container.stop({ t: 2 });
        } catch {}
      }

      if (activeDeploy) {
        await db.deployment.update({
          where: { id: activeDeploy.id },
          data: { status: "TERMINATED" },
        });
      }

      return {
        success: true,
        message: `Application '${app.name}' stopped successfully.`,
        appId: app.id,
      };
    }

    case "colyin_docker_prune": {
      const { mode = "builder" } = args;
      const dockerStatus = await getDockerDaemonStatus();
      if (!dockerStatus.online) {
        throw new Error("Docker daemon is offline.");
      }

      let spaceReclaimedMb = 0;
      if (mode === "builder") {
        const res: any = await docker.pruneBuilder().catch(() => ({ SpaceReclaimed: 0 }));
        spaceReclaimedMb = Math.round((res?.SpaceReclaimed || 0) / (1024 * 1024));
      } else {
        const [cPrune, iPrune, bPrune]: any = await Promise.all([
          docker.pruneContainers().catch(() => ({ SpaceReclaimed: 0 })),
          docker.pruneImages({ filters: { dangling: { false: true } } }).catch(() => ({ SpaceReclaimed: 0 })),
          docker.pruneBuilder().catch(() => ({ SpaceReclaimed: 0 })),
        ]);
        const totalBytes = (cPrune?.SpaceReclaimed || 0) + (iPrune?.SpaceReclaimed || 0) + (bPrune?.SpaceReclaimed || 0);
        spaceReclaimedMb = Math.round(totalBytes / (1024 * 1024));
      }

      return {
        success: true,
        mode,
        spaceReclaimedMb: `${spaceReclaimedMb} MB`,
        message: `Docker ${mode} prune completed. Reclaimed ${spaceReclaimedMb} MB of disk space.`,
      };
    }

    case "colyin_get_system_telemetry": {
      const dockerStatus = await getDockerDaemonStatus();
      const totalMem = Math.round(os.totalmem() / (1024 * 1024));
      const freeMem = Math.round(os.freemem() / (1024 * 1024));
      const usedMem = totalMem - freeMem;
      const memPercent = Math.round((usedMem / totalMem) * 100);

      const appsCount = await db.application.count();
      const addonsCount = await db.addon.count();

      let dockerContainersCount = 0;
      if (dockerStatus.online) {
        try {
          const list = await docker.listContainers({ all: true });
          dockerContainersCount = list.length;
        } catch {}
      }

      return {
        hostname: os.hostname(),
        platform: os.platform(),
        uptimeSeconds: Math.round(os.uptime()),
        cpuCount: os.cpus().length,
        loadAverage: os.loadavg(),
        memory: {
          totalMb: totalMem,
          usedMb: usedMem,
          freeMb: freeMem,
          usagePercentage: `${memPercent}%`,
        },
        docker: {
          online: dockerStatus.online,
          totalContainers: dockerContainersCount,
          version: (dockerStatus.info as any)?.ServerVersion || "Unknown",
        },
        stats: {
          totalApplications: appsCount,
          totalAddons: addonsCount,
        },
      };
    }

    default:
      throw new Error(`Unknown MCP Tool: '${name}'. Available tools: ${COLYIN_MCP_TOOLS.map((t) => t.name).join(", ")}`);
  }
}

