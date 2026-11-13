import { COLYIN_MCP_TOOLS, executeMcpTool } from "./tools";

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export async function handleMcpJsonRpcRequest(payload: JsonRpcRequest): Promise<JsonRpcResponse> {
  const { id = null, method, params } = payload;

  switch (method) {
    case "initialize": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: {},
            resources: {},
            prompts: {},
          },
          serverInfo: {
            name: "colyin-paas-mcp",
            version: "1.0.0",
            description: "Colyin Self-Hosted Serverless PaaS & Container Orchestration MCP Server",
          },
        },
      };
    }

    case "notifications/initialized": {
      // Acknowledgement notification from client
      return {
        jsonrpc: "2.0",
        id,
        result: {},
      };
    }

    case "ping": {
      return {
        jsonrpc: "2.0",
        id,
        result: {},
      };
    }

    case "tools/list": {
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: COLYIN_MCP_TOOLS,
        },
      };
    }

    case "tools/call": {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      if (!toolName) {
        return {
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: "Invalid params: 'name' is required for tools/call",
          },
        };
      }

      try {
        const executionResult = await executeMcpTool(toolName, toolArgs);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: typeof executionResult === "string" ? executionResult : JSON.stringify(executionResult, null, 2),
              },
            ],
            isError: false,
          },
        };
      } catch (err: any) {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: `[MCP Error]: ${err.message || "Failed to execute tool"}`,
              },
            ],
            isError: true,
          },
        };
      }
    }

    default: {
      return {
        jsonrpc: "2.0",
        id,
        error: {
          code: -32601,
          message: `Method '${method}' not found. Supported methods: initialize, tools/list, tools/call, ping`,
        },
      };
    }
  }
}

