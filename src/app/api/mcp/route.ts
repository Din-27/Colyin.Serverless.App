import { NextRequest, NextResponse } from "next/server";
import { handleMcpJsonRpcRequest, JsonRpcRequest } from "@/lib/mcp/handler";
import { COLYIN_MCP_TOOLS } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";

// GET /api/mcp - Server description and tools list for web clients/health checks
export async function GET() {
  return NextResponse.json({
    status: "online",
    name: "Colyin Model Context Protocol (MCP) Server",
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    description: "Allows AI assistants (Claude Desktop, Cursor, Antigravity) to manage, inspect, and deploy applications on your Colyin cluster.",
    endpoint: "/api/mcp",
    transport: "HTTP POST (JSON-RPC 2.0) or Stdio (scripts/mcp-server.js)",
    supportedMethods: ["initialize", "tools/list", "tools/call", "ping"],
    toolsCount: COLYIN_MCP_TOOLS.length,
    tools: COLYIN_MCP_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
    })),
  });
}

// POST /api/mcp - Standard JSON-RPC 2.0 MCP Endpoint
export async function POST(req: NextRequest) {
  try {
    const body: JsonRpcRequest = await req.json();

    if (!body || body.jsonrpc !== "2.0" || !body.method) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          id: (body as any)?.id || null,
          error: {
            code: -32600,
            message: "Invalid Request: Must be a valid JSON-RPC 2.0 object with 'jsonrpc' and 'method'.",
          },
        },
        { status: 400 }
      );
    }

    const rpcResponse = await handleMcpJsonRpcRequest(body);
    return NextResponse.json(rpcResponse);
  } catch (err: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32700,
          message: `Parse error: ${err.message}`,
        },
      },
      { status: 500 }
    );
  }
}
