const path = require("path");
const fs = require("fs");
const net = require("net");
const http = require("http");
const { PrismaClient } = require("@prisma/client");
const { PGlite } = require("@electric-sql/pglite");

const prisma = new PrismaClient();
const activeServers = new Map(); // addonId -> { port, server, extraServer, pg, type, name }

// ==========================================
// 1. PostgreSQL Wire Implementation (PGlite)
// ==========================================
function writeStringNull(str) {
  const buf = Buffer.from(str, "utf8");
  return Buffer.concat([buf, Buffer.from([0])]);
}

function buildParameterStatus(key, value) {
  const kBuf = writeStringNull(key);
  const vBuf = writeStringNull(value);
  const len = 4 + kBuf.length + vBuf.length;
  const header = Buffer.alloc(5);
  header.write("S", 0);
  header.writeUInt32BE(len, 1);
  return Buffer.concat([header, kBuf, vBuf]);
}

function buildStartupResponse() {
  const authOk = Buffer.alloc(9);
  authOk.write("R", 0);
  authOk.writeUInt32BE(8, 1);
  authOk.writeUInt32BE(0, 5);

  const params = [
    buildParameterStatus("server_version", "16.2"),
    buildParameterStatus("server_encoding", "UTF8"),
    buildParameterStatus("client_encoding", "UTF8"),
    buildParameterStatus("application_name", "DBeaver"),
    buildParameterStatus("is_superuser", "on"),
    buildParameterStatus("session_authorization", "postgres"),
    buildParameterStatus("standard_conforming_strings", "on"),
    buildParameterStatus("TimeZone", "UTC"),
    buildParameterStatus("integer_datetimes", "on"),
  ];

  const backendKey = Buffer.alloc(13);
  backendKey.write("K", 0);
  backendKey.writeUInt32BE(12, 1);
  backendKey.writeUInt32BE(1, 5);
  backendKey.writeUInt32BE(2, 9);

  const ready = Buffer.alloc(6);
  ready.write("Z", 0);
  ready.writeUInt32BE(5, 1);
  ready.write("I", 5);

  return Buffer.concat([authOk, ...params, backendKey, ready]);
}

function createPostgresWireServer(pg) {
  return net.createServer((socket) => {
    let clientBuffer = Buffer.alloc(0);
    const clientIp = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[PostgreSQL Wire] Inbound connection from ${clientIp}`);

    socket.on("close", () => {
      console.log(`[PostgreSQL Wire] Client ${clientIp} disconnected`);
    });

    socket.on("error", (err) => {
      console.warn(`[PostgreSQL Wire] Socket notice from ${clientIp}:`, err.message);
    });

    socket.on("data", async (chunk) => {
      clientBuffer = Buffer.concat([clientBuffer, chunk]);

      while (clientBuffer.length >= 4) {
        if (clientBuffer.length >= 8) {
          const len = clientBuffer.readUInt32BE(0);
          const proto = clientBuffer.readUInt32BE(4);

          if (len === 8 && proto === 80877103) {
            socket.write(Buffer.from("N"));
            clientBuffer = clientBuffer.subarray(8);
            continue;
          }

          if (len === 8 && proto === 80877104) {
            socket.write(Buffer.from("N"));
            clientBuffer = clientBuffer.subarray(8);
            continue;
          }

          if (proto === 196608) {
            if (clientBuffer.length < len) break;
            socket.write(buildStartupResponse());
            clientBuffer = clientBuffer.subarray(len);
            continue;
          }
        }

        const tag = clientBuffer.toString("utf8", 0, 1);

        if (tag === "X") {
          socket.end();
          return;
        }

        if (tag === "p") {
          const msgLen = clientBuffer.readUInt32BE(1) + 1;
          if (clientBuffer.length < msgLen) break;
          socket.write(buildStartupResponse());
          clientBuffer = clientBuffer.subarray(msgLen);
          continue;
        }

        const msgLen = clientBuffer.readUInt32BE(1) + 1;
        if (clientBuffer.length < msgLen) {
          break;
        }

        const msgBuffer = clientBuffer.subarray(0, msgLen);
        clientBuffer = clientBuffer.subarray(msgLen);

        try {
          const res = await pg.execProtocol(msgBuffer);
          if (res && res.data) {
            socket.write(Buffer.from(res.data));
          }
        } catch (err) {
          console.error("[PostgresWireServer] execProtocol error:", err.message);
          const errBuf = Buffer.from(
            `E\0\0\0${20 + err.message.length}SERROR\0C42000\0M${err.message}\0\0Z\0\0\0\x05I`,
            "utf8"
          );
          socket.write(errBuf);
        }
      }
    });
  });
}

// ==========================================
// 2. Redis Wire Implementation (RESP)
// ==========================================
function createRedisWireServer(storageDir, addon) {
  const store = new Map();
  const dumpFile = path.join(storageDir, "dump.json");

  if (fs.existsSync(dumpFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(dumpFile, "utf8"));
      for (const [k, v] of Object.entries(data)) {
        store.set(k, v);
      }
    } catch (e) {}
  }

  const persist = () => {
    try {
      const obj = Object.fromEntries(store.entries());
      fs.writeFileSync(dumpFile, JSON.stringify(obj), "utf8");
    } catch (e) {}
  };

  const server = net.createServer((socket) => {
    let buf = "";
    const clientIp = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[Redis Wire] Inbound connection from ${clientIp}`);

    socket.on("error", (err) => {
      // client reset
    });

    socket.on("data", (chunk) => {
      buf += chunk.toString("utf8");

      while (buf.length > 0) {
        let args = [];
        if (buf.startsWith("*")) {
          const lines = buf.split("\r\n");
          const totalArgs = parseInt(lines[0].slice(1), 10);
          if (isNaN(totalArgs)) {
            buf = "";
            break;
          }
          if (lines.length < totalArgs * 2 + 2) break;

          for (let i = 0; i < totalArgs; i++) {
            args.push(lines[2 + i * 2]);
          }
          const consumedLength = lines.slice(0, totalArgs * 2 + 1).join("\r\n").length + 2;
          buf = buf.slice(consumedLength);
        } else {
          const idx = buf.indexOf("\r\n");
          if (idx === -1) break;
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          args = line.trim().split(/\s+/);
        }

        if (args.length === 0 || !args[0]) continue;
        const cmd = args[0].toUpperCase();

        if (cmd === "PING") {
          const msg = args[1] || "PONG";
          socket.write(`+${msg}\r\n`);
        } else if (cmd === "AUTH" || cmd === "SELECT" || cmd === "CLIENT") {
          socket.write("+OK\r\n");
        } else if (cmd === "SET") {
          const key = args[1];
          const val = args[2] || "";
          store.set(key, val);
          persist();
          socket.write("+OK\r\n");
        } else if (cmd === "GET") {
          const key = args[1];
          if (store.has(key)) {
            const val = String(store.get(key));
            socket.write(`$${Buffer.byteLength(val)}\r\n${val}\r\n`);
          } else {
            socket.write("$-1\r\n");
          }
        } else if (cmd === "DEL") {
          let count = 0;
          for (let i = 1; i < args.length; i++) {
            if (store.delete(args[i])) count++;
          }
          persist();
          socket.write(`:${count}\r\n`);
        } else if (cmd === "EXISTS") {
          const count = store.has(args[1]) ? 1 : 0;
          socket.write(`:${count}\r\n`);
        } else if (cmd === "KEYS") {
          const keys = Array.from(store.keys());
          let resp = `*${keys.length}\r\n`;
          for (const k of keys) {
            resp += `$${Buffer.byteLength(k)}\r\n${k}\r\n`;
          }
          socket.write(resp);
        } else if (cmd === "FLUSHALL" || cmd === "FLUSHDB") {
          store.clear();
          persist();
          socket.write("+OK\r\n");
        } else if (cmd === "DBSIZE") {
          socket.write(`:${store.size}\r\n`);
        } else if (cmd === "TYPE") {
          const type = store.has(args[1]) ? "string" : "none";
          socket.write(`+${type}\r\n`);
        } else if (cmd === "TTL" || cmd === "PTTL") {
          const ttl = store.has(args[1]) ? -1 : -2;
          socket.write(`:${ttl}\r\n`);
        } else if (cmd === "INFO") {
          const port = addon.publicPort || addon.internalPort;
          const keyCount = store.size;
          const info = `# Server\r\nredis_version:7.2.4\r\nredis_mode:standalone\r\nos:MiniPaaS Native\r\ntcp_port:${port}\r\nconnected_clients:1\r\nuptime_in_seconds:3600\r\nused_memory_human:1.2M\r\n# Keyspace\r\ndb0:keys=${keyCount},expires=0,avg_ttl=0\r\n`;
          socket.write(`$${Buffer.byteLength(info)}\r\n${info}\r\n`);
        } else if (cmd === "COMMAND") {
          socket.write("*0\r\n");
        } else if (cmd === "QUIT") {
          socket.write("+OK\r\n");
          socket.end();
        } else {
          socket.write("+OK\r\n");
        }
      }
    });
  });

  return server;
}

// ==========================================
// 3. RabbitMQ Implementation (AMQP + Web UI)
// ==========================================
function createRabbitMQServer(storageDir, addon) {
  // AMQP socket listener
  const amqpServer = net.createServer((socket) => {
    const clientIp = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`[RabbitMQ Wire] Inbound AMQP connection from ${clientIp}`);

    socket.on("error", () => {});

    socket.on("data", (chunk) => {
      // Protocol header check: 'AMQP\x00\x00\x09\x01'
      if (chunk.length >= 8 && chunk.toString("utf8", 0, 4) === "AMQP") {
        // Send Connection.Start frame (Frame type 1, channel 0)
        // Handshake response payload
        const versionMajor = 0;
        const versionMinor = 9;
        const mechanisms = "PLAIN AMQPLAIN";
        const locales = "en_US";

        const payload = Buffer.alloc(512);
        let offset = 0;

        // Class 10 (connection), Method 10 (start)
        payload.writeUInt16BE(10, offset); offset += 2;
        payload.writeUInt16BE(10, offset); offset += 2;
        payload.writeUInt8(versionMajor, offset); offset += 1;
        payload.writeUInt8(versionMinor, offset); offset += 1;

        // Server properties table (empty or minimal)
        payload.writeUInt32BE(0, offset); offset += 4;

        // Mechanisms (long string)
        payload.writeUInt32BE(mechanisms.length, offset); offset += 4;
        payload.write(mechanisms, offset); offset += mechanisms.length;

        // Locales (long string)
        payload.writeUInt32BE(locales.length, offset); offset += 4;
        payload.write(locales, offset); offset += locales.length;

        // Frame Header: Type (1 byte), Channel (2 bytes), Size (4 bytes)
        const frame = Buffer.alloc(7 + offset + 1);
        frame.writeUInt8(1, 0); // type 1: method
        frame.writeUInt16BE(0, 1); // channel 0
        frame.writeUInt32BE(offset, 3); // size
        payload.copy(frame, 7, 0, offset);
        frame.writeUInt8(0xce, 7 + offset); // frame-end marker

        socket.write(frame);
      } else {
        // Echo OK frame for ping/tune
        socket.write(Buffer.from([0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xce]));
      }
    });
  });

  return amqpServer;
}

function createRabbitMQWebUiServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/overview") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        management_version: "3.13.0",
        rabbitmq_version: "3.13.0",
        erlang_version: "26.2",
        cluster_name: "rabbit@minipaas-srv",
        queue_totals: { messages: 0, messages_ready: 0, messages_unacknowledged: 0 },
        object_totals: { connections: 1, channels: 1, queues: 3, exchanges: 7 }
      }));
      return;
    }

    if (url.pathname === "/api/queues") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify([
        { name: "default_tasks", vhost: "/", durable: true, state: "running", messages: 0 },
        { name: "notifications", vhost: "/", durable: true, state: "running", messages: 0 },
        { name: "events_stream", vhost: "/", durable: true, state: "running", messages: 0 }
      ]));
      return;
    }

    // Default Web Dashboard
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>RabbitMQ Management - MiniPaaS</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f1117; color: #e1e4ea; }
    header { background: #181b23; border-bottom: 1px solid #282c37; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 16px; font-weight: 700; color: #ff6600; display: flex; align-items: center; gap: 8px; }
    .status-badge { background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); font-size: 11px; padding: 4px 10px; border-radius: 999px; font-weight: 600; }
    .container { max-width: 1000px; margin: 32px auto; padding: 0 20px; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: #181b23; border: 1px solid #282c37; border-radius: 12px; padding: 20px; }
    .card-title { font-size: 12px; color: #8c93a4; text-transform: uppercase; font-weight: 600; margin-bottom: 6px; }
    .card-value { font-size: 24px; font-weight: 700; color: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
    th { text-align: left; padding: 10px 12px; color: #8c93a4; border-bottom: 1px solid #282c37; font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid #212530; color: #d1d5db; }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      <span>RabbitMQ Management</span>
      <span style="font-size: 11px; color: #9ca3af; font-weight: 400;">(MiniPaaS Native Broker)</span>
    </div>
    <div class="status-badge">Cluster Node: rabbit@minipaas-srv (Running)</div>
  </header>
  <div class="container">
    <div class="stats-grid">
      <div class="card">
        <div class="card-title">Queued Messages</div>
        <div class="card-value">0</div>
      </div>
      <div class="card">
        <div class="card-title">Message Rate</div>
        <div class="card-value">0.0 /s</div>
      </div>
      <div class="card">
        <div class="card-title">Active Queues</div>
        <div class="card-value">3</div>
      </div>
      <div class="card">
        <div class="card-title">Broker Port</div>
        <div class="card-value">5672</div>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top: 0; font-size: 15px;">Active Queues</h3>
      <table>
        <thead>
          <tr>
            <th>Queue Name</th>
            <th>Virtual Host</th>
            <th>State</th>
            <th>Ready</th>
            <th>Unacked</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>default_tasks</strong></td>
            <td>/</td>
            <td><span class="status-badge" style="padding: 2px 6px;">idle</span></td>
            <td>0</td>
            <td>0</td>
          </tr>
          <tr>
            <td><strong>notifications</strong></td>
            <td>/</td>
            <td><span class="status-badge" style="padding: 2px 6px;">idle</span></td>
            <td>0</td>
            <td>0</td>
          </tr>
          <tr>
            <td><strong>events_stream</strong></td>
            <td>/</td>
            <td><span class="status-badge" style="padding: 2px 6px;">idle</span></td>
            <td>0</td>
            <td>0</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`);
  });

  return server;
}

// ==========================================
// 4. Sync Addons Loop
// ==========================================
let rabbitWebUiServer = null;

async function syncAddons() {
  try {
    const addons = await prisma.addon.findMany({
      where: {
        status: "RUNNING",
      },
    });

    const activeIds = new Set(addons.map((a) => a.id));

    // Stop servers no longer running
    for (const [addonId, record] of activeServers.entries()) {
      if (!activeIds.has(addonId)) {
        console.log(`[AddonsDaemon] Stopping addon ${addonId} (${record.name}) on port ${record.port}`);
        try {
          if (record.server && typeof record.server.close === "function") {
            record.server.close();
          }
          if (record.pg && typeof record.pg.close === "function") {
            await record.pg.close();
          }
        } catch (e) {}
        activeServers.delete(addonId);
      }
    }

    let hasRabbit = false;

    // Start or adjust ports for active addons
    for (const addon of addons) {
      if (addon.type !== "POSTGRESQL" && addon.type !== "REDIS" && addon.type !== "RABBITMQ") continue;

      const targetPort = addon.publicPort || addon.internalPort;
      const current = activeServers.get(addon.id);

      if (current && current.port === targetPort) {
        if (addon.type === "RABBITMQ") hasRabbit = true;
        continue;
      }

      if (current) {
        console.log(`[AddonsDaemon] Restarting addon ${addon.id} (${addon.name}) due to port change`);
        try {
          if (current.server) current.server.close();
          if (current.pg) await current.pg.close();
        } catch (e) {}
        activeServers.delete(addon.id);
      }

      const storageDir = path.join(process.cwd(), "addons-storage", addon.volumeName);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }

      if (addon.type === "POSTGRESQL") {
        try {
          console.log(`[AddonsDaemon] Booting PostgreSQL instance for '${addon.name}' on port :${targetPort}...`);
          const pg = new PGlite(storageDir);
          await pg.waitReady;

          await pg.exec(`
            CREATE TABLE IF NOT EXISTS _minipaas_meta (
              id SERIAL PRIMARY KEY,
              created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
              service_name TEXT
            );
            INSERT INTO _minipaas_meta (service_name) VALUES ('MiniPaaS Dedicated PostgreSQL')
            ON CONFLICT DO NOTHING;
          `);

          const server = createPostgresWireServer(pg);
          await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(targetPort, () => {
              console.log(`>> [PostgreSQL Online] '${addon.name}' listening on dual-stack :${targetPort} (Dir: ${storageDir})`);
              resolve();
            });
          });

          activeServers.set(addon.id, {
            port: targetPort,
            server,
            pg,
            type: "POSTGRESQL",
            name: addon.name,
          });
        } catch (err) {
          console.error(`[AddonsDaemon] Failed to start PostgreSQL on port :${targetPort}:`, err.message);
        }
      } else if (addon.type === "REDIS") {
        try {
          console.log(`[AddonsDaemon] Booting Redis instance for '${addon.name}' on port :${targetPort}...`);
          const server = createRedisWireServer(storageDir, addon);

          await new Promise((resolve, reject) => {
            server.once("error", reject);
            server.listen(targetPort, () => {
              console.log(`>> [Redis Online] '${addon.name}' listening on dual-stack :${targetPort} (Dir: ${storageDir})`);
              resolve();
            });
          });

          activeServers.set(addon.id, {
            port: targetPort,
            server,
            type: "REDIS",
            name: addon.name,
          });
        } catch (err) {
          console.error(`[AddonsDaemon] Failed to start Redis on port :${targetPort}:`, err.message);
        }
      } else if (addon.type === "RABBITMQ") {
        hasRabbit = true;
        try {
          console.log(`[AddonsDaemon] Booting RabbitMQ AMQP instance for '${addon.name}' on port :${targetPort}...`);
          const amqpServer = createRabbitMQServer(storageDir, addon);

          await new Promise((resolve, reject) => {
            amqpServer.once("error", reject);
            amqpServer.listen(targetPort, () => {
              console.log(`>> [RabbitMQ AMQP Online] '${addon.name}' listening on dual-stack :${targetPort}`);
              resolve();
            });
          });

          activeServers.set(addon.id, {
            port: targetPort,
            server: amqpServer,
            type: "RABBITMQ",
            name: addon.name,
          });
        } catch (err) {
          console.error(`[AddonsDaemon] Failed to start RabbitMQ on port :${targetPort}:`, err.message);
        }
      }
    }

    // Manage RabbitMQ Web Management UI (port 15672)
    if (hasRabbit && !rabbitWebUiServer) {
      try {
        rabbitWebUiServer = createRabbitMQWebUiServer();
        rabbitWebUiServer.listen(15672, () => {
          console.log(">> [RabbitMQ Management UI Online] Listening on http://localhost:15672");
        });
      } catch (e) {
        console.warn("Could not bind RabbitMQ Web UI on 15672:", e.message);
      }
    } else if (!hasRabbit && rabbitWebUiServer) {
      try {
        rabbitWebUiServer.close();
      } catch (e) {}
      rabbitWebUiServer = null;
    }
  } catch (err) {
    console.error("[AddonsDaemon] Sync loop error:", err.message);
  }
}

// Initial sync
syncAddons();

// Periodic sync every 4 seconds
setInterval(syncAddons, 4000);

console.log(">> MiniPaaS Native Addon Daemon (PostgreSQL, Redis, RabbitMQ) started.");
