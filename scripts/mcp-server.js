#!/usr/bin/env node
/**
 * Colyin Standalone Stdio Model Context Protocol (MCP) Server
 * Compatible with Claude Desktop, Antigravity, Cursor, and Roo Code.
 * 
 * Usage:
 *   node scripts/mcp-server.js
 * 
 * Configuration in claude_desktop_config.json:
 * {
 *   "mcpServers": {
 *     "colyin": {
 *       "command": "node",
 *       "args": ["/opt/colyin/scripts/mcp-server.js"],
 *       "env": {
 *         "DATABASE_URL": "file:/opt/colyin/data/prod.db"
 *       }
 *     }
 *   }
 * }
 */

const readline = require("readline");
const os = require("os");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TOOLS = [
  {
    name: "colyin_list_projects",
    description: "List all projects in the Colyin cluster with their application counts and database addons.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "colyin_list_applications",
    description: "List all deployed applications in the cluster or in a specific project, including status, port, domain, and version.",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Optional project ID filter." },
      },
    },
  },
  {
    name: "colyin_get_application",
    description: "Get full specifications for an application by ID or slug.",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "The ID or slug of the application." },
      },
      required: ["appId"],
    },
  },
  {
    name: "colyin_get_docker_logs",
    description: "Read the latest Docker container stdout/stderr logs for an application.",
    inputSchema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "The ID or slug of the application." },
        tail: { type: "integer", description: "Number of lines (default: 100)", default: 100 },
      },
      required: ["appId"],
    },
  },
  {
    name: "colyin_get_system_telemetry",
    description: "Retrieve host CPU, RAM, and Docker status metrics.",
    inputSchema: { type: "object", properties: {} },
  },
];

async function handleToolCall(name, args = {}) {
  switch (name) {
    case "colyin_list_projects": {
      const projects = await prisma.project.findMany({
        include: {
          applications: { select: { id: true, name: true, slug: true, internalPort: true } },
          addons: { select: { id: true, name: true, type: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      return { total: projects.length, projects };
    }

    case "colyin_list_applications": {
      const where = args.projectId ? { projectId: args.projectId } : {};
      const apps = await prisma.application.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          domains: { select: { host: true, isPrimary: true } },
          deployments: {
            orderBy: { startedAt: "desc" },
            take: 1,
            select: { id: true, status: true, commitHash: true, containerId: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return {
        total: apps.length,
        applications: apps.map((a) => ({
          id: a.id,
          name: a.name,
          slug: a.slug,
          version: a.version || "v1.0.0",
          status: a.deployments[0]?.status || "STOPPED",
          projectName: a.project.name,
          internalPort: a.internalPort,
          domain: a.domains[0]?.host || null,
          containerId: a.deployments[0]?.containerId || null,
        })),
      };
    }

    case "colyin_get_application": {
      const app = await prisma.application.findFirst({
        where: { OR: [{ id: args.appId }, { slug: args.appId }] },
        include: {
          project: true,
          domains: true,
          deployments: { orderBy: { startedAt: "desc" }, take: 5 },
          envVariables: { select: { key: true, type: true } },
        },
      });
      if (!app) throw new Error(`Application '${args.appId}' not found.`);
      return app;
    }

    case "colyin_get_system_telemetry": {
      const totalMem = Math.round(os.totalmem() / (1024 * 1024));
      const freeMem = Math.round(os.freemem() / (1024 * 1024));
      const appsCount = await prisma.application.count();

      return {
        hostname: os.hostname(),
        platform: os.platform(),
        uptimeSeconds: Math.round(os.uptime()),
        memory: {
          totalMb: totalMem,
          usedMb: totalMem - freeMem,
          freeMb: freeMem,
        },
        stats: {
          totalApplications: appsCount,
        },
      };
    }

    default:
      throw new Error(`Tool '${name}' is not recognized.`);
  }
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  const sendResponse = (res) => {
    process.stdout.write(JSON.stringify(res) + "\n");
  };

  rl.on("line", async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    let req;
    try {
      req = JSON.parse(trimmed);
    } catch (e) {
      sendResponse({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
      return;
    }

    const { id = null, method, params } = req;

    if (method === "initialize") {
      sendResponse({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "colyin-mcp-server", version: "1.0.0" },
        },
      });
      return;
    }

    if (method === "notifications/initialized" || method === "ping") {
      sendResponse({ jsonrpc: "2.0", id, result: {} });
      return;
    }

    if (method === "tools/list") {
      sendResponse({
        jsonrpc: "2.0",
        id,
        result: { tools: TOOLS },
      });
      return;
    }

    if (method === "tools/call") {
      try {
        const result = await handleToolCall(params?.name, params?.arguments);
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
            isError: false,
          },
        });
      } catch (err) {
        sendResponse({
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: `[Error]: ${err.message}` }],
            isError: true,
          },
        });
      }
      return;
    }

    sendResponse({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method '${method}' not found` },
    });
  });
}

main().catch((err) => {
  console.error("Fatal MCP error:", err);
  process.exit(1);
});

