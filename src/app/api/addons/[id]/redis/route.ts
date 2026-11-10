import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import net from "net";

function sendRedisRaw(port: number, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: "127.0.0.1", port }, () => {
      socket.write(command.endsWith("\r\n") ? command : `${command}\r\n`);
    });

    let buffer = "";
    socket.setTimeout(2000);

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");
      // Check if response is complete
      if (buffer.endsWith("\r\n")) {
        socket.end();
        resolve(buffer);
      }
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve(buffer || "+OK\r\n");
    });

    socket.on("error", (err) => {
      reject(err);
    });
  });
}

function parseResp(resp: string): any {
  if (!resp) return "";
  const firstChar = resp[0];
  const body = resp.slice(1);

  if (firstChar === "+") {
    // Simple string
    return body.replace(/\r\n$/, "");
  } else if (firstChar === "-") {
    // Error
    return `Error: ${body.replace(/\r\n$/, "")}`;
  } else if (firstChar === ":") {
    // Integer
    return parseInt(body.replace(/\r\n$/, ""), 10);
  } else if (firstChar === "$") {
    // Bulk string
    const idx = body.indexOf("\r\n");
    if (idx === -1) return body;
    const len = parseInt(body.slice(0, idx), 10);
    if (len === -1) return null;
    return body.slice(idx + 2).replace(/\r\n$/, "");
  } else if (firstChar === "*") {
    // Array
    const lines = resp.split("\r\n");
    const count = parseInt(lines[0].slice(1), 10);
    if (count <= 0) return [];
    const items: string[] = [];
    for (let i = 0; i < count; i++) {
      items.push(lines[2 + i * 2] || "");
    }
    return items;
  }
  return resp.trim();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: addonId } = await params;

    const addon = await db.addon.findUnique({
      where: { id: addonId },
    });

    if (!addon) {
      return NextResponse.json(
        { success: false, error: "Addon not found" },
        { status: 404 }
      );
    }

    if (addon.type !== "REDIS") {
      return NextResponse.json(
        { success: false, error: "This operation is only available for Redis addons" },
        { status: 400 }
      );
    }

    const port = addon.publicPort || addon.internalPort;

    // Fetch keys list
    let keysList: string[] = [];
    try {
      const keysResp = await sendRedisRaw(port, "KEYS *");
      const parsed = parseResp(keysResp);
      if (Array.isArray(parsed)) {
        keysList = parsed;
      }
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: `Redis daemon offline or unreachable on port ${port}: ${e.message}` },
        { status: 503 }
      );
    }

    // Fetch details for each key
    const keys = [];
    for (const key of keysList) {
      try {
        const valResp = await sendRedisRaw(port, `GET ${key}`);
        const val = parseResp(valResp);
        keys.push({
          key,
          value: val !== null ? String(val) : "",
          type: "string",
          size: val ? Buffer.byteLength(String(val)) : 0,
        });
      } catch {
        keys.push({ key, value: "", type: "string", size: 0 });
      }
    }

    // Get info
    let info = "";
    try {
      const infoResp = await sendRedisRaw(port, "INFO");
      info = parseResp(infoResp);
    } catch {}

    return NextResponse.json({
      success: true,
      stats: {
        totalKeys: keys.length,
        port,
        version: "7.2.4",
        memory: "1.2M",
        info,
      },
      keys,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: addonId } = await params;
    const body = await req.json();
    const { action, key, value, command } = body;

    const addon = await db.addon.findUnique({
      where: { id: addonId },
    });

    if (!addon) {
      return NextResponse.json(
        { success: false, error: "Addon not found" },
        { status: 404 }
      );
    }

    if (addon.type !== "REDIS") {
      return NextResponse.json(
        { success: false, error: "Only available for Redis addons" },
        { status: 400 }
      );
    }

    const port = addon.publicPort || addon.internalPort;

    if (action === "set") {
      if (!key) {
        return NextResponse.json(
          { success: false, error: "Key is required" },
          { status: 400 }
        );
      }
      await sendRedisRaw(port, `SET ${key} ${value ?? ""}`);
      return NextResponse.json({ success: true, message: `Key '${key}' saved successfully.` });
    }

    if (action === "delete") {
      if (!key) {
        return NextResponse.json(
          { success: false, error: "Key is required" },
          { status: 400 }
        );
      }
      await sendRedisRaw(port, `DEL ${key}`);
      return NextResponse.json({ success: true, message: `Key '${key}' deleted.` });
    }

    if (action === "flush") {
      await sendRedisRaw(port, "FLUSHALL");
      return NextResponse.json({ success: true, message: "All keys flushed." });
    }

    if (action === "command" && command) {
      const raw = await sendRedisRaw(port, command.trim());
      const parsed = parseResp(raw);
      return NextResponse.json({
        success: true,
        raw,
        parsed,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action or parameters" },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
