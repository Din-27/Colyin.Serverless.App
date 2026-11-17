"use client";

import React, { useState } from "react";
import {
  Server,
  Globe,
  Radio,
  ExternalLink,
  Terminal,
  FileCode,
  Network,
  Cpu,
  Layers,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { CopyButton } from "@/components/CopyButton";

interface RabbitMqPortsCardProps {
  addonId: string;
  internalConnection: {
    host: string;
    port: number;
    user: string;
    password: string;
    connectionUri?: string;
  };
  externalConnection: {
    host: string;
    port: number;
    user: string;
    password: string;
    connectionUri?: string;
  } | null;
  activeHost: string;
  webManagementUiUrl: string | null;
  ports?: Array<{
    name: string;
    port: number;
    internalPort: number;
    protocol: string;
    service: string;
    description: string;
  }>;
}

export function RabbitMqPortsCard({
  internalConnection,
  externalConnection,
  activeHost,
  webManagementUiUrl,
  ports: serverPorts,
}: RabbitMqPortsCardProps) {
  const [activeSnippetTab, setActiveSnippetTab] = useState<
    "producer" | "consumer" | "pubsub" | "env" | "testScript"
  >("producer");

  const amqpPort = externalConnection?.port || 5672;
  const targetHost = activeHost.replace(/^https?:\/\//, "").split(":")[0] || "localhost";
  const user = externalConnection?.user || internalConnection.user || "guest";
  const pass = externalConnection?.password || internalConnection.password || "guest";

  const effectiveAmqpUri = `amqp://${user}:${pass}@${targetHost}:${amqpPort}`;
  const effectiveInternalAmqpUri = `amqp://${internalConnection.user}:${internalConnection.password}@${internalConnection.host}:5672`;

  const defaultPorts = [
    {
      name: "amqp",
      port: amqpPort,
      internalPort: 5672,
      protocol: "TCP",
      service: "AMQP 0-9-1",
      description: "Port protokol client utama untuk publisher dan consumer aplikasi",
    },
    {
      name: "stats",
      port: 15672,
      internalPort: 15672,
      protocol: "TCP",
      service: "Management UI & HTTP API",
      description: "Dashboard visual monitoring antrean, exchanges, dan konsumsi pesan",
    },
    {
      name: "dist",
      port: 25672,
      internalPort: 25672,
      protocol: "TCP",
      service: "Erlang Distribution",
      description: "Komunikasi inter-node clustering dan CLI management tools",
    },
    {
      name: "epmd",
      port: 4369,
      internalPort: 4369,
      protocol: "TCP",
      service: "Erlang Port Mapper Daemon",
      description: "Daemon penemuan peer clustering dan resolusi node name",
    },
  ];

  const ports = serverPorts && serverPorts.length > 0 ? serverPorts : defaultPorts;

  const producerSnippet = `import amqp from 'amqplib';

/**
 * 1. Kirim Pesan ke RabbitMQ Queue (Producer / Publisher)
 */
export async function sendToQueue(queueName: string, messagePayload: any) {
  // Sambungkan ke RabbitMQ broker
  const connection = await amqp.connect('${effectiveAmqpUri}');
  const channel = await connection.createChannel();

  // Pastikan queue tersedia (durable: true agar antrean bertahan saat server restart)
  await channel.assertQueue(queueName, { durable: true });

  // Kirim payload pesan (persistent: true agar pesan tersimpan ke disk)
  const messageBuffer = Buffer.from(JSON.stringify(messagePayload));
  channel.sendToQueue(queueName, messageBuffer, { persistent: true });

  console.log(\`Pesan sukses dikirim ke '\${queueName}':\`, messagePayload);

  await channel.close();
  await connection.close();
}`;

  const consumerSnippet = `import amqp from 'amqplib';

/**
 * 2. Terima dan Proses Pesan dari RabbitMQ Queue (Consumer / Worker)
 */
export async function startWorker(queueName: string) {
  const connection = await amqp.connect('${effectiveAmqpUri}');
  const channel = await connection.createChannel();

  await channel.assertQueue(queueName, { durable: true });

  // prefetch(1): jangan kirim pesan baru sebelum pesan sebelumnya selesai di-ACK
  channel.prefetch(1);

  console.log(\`[*] Worker mendengarkan antrean '\${queueName}'. Menunggu pesan...\`);

  channel.consume(queueName, async (msg) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());
      console.log(\`[x] Memproses tugas:\`, data);

      // Jalankan pekerjaan Anda di sini (misal: kirim email, generate report, convert video)
      // await doHeavyWork(data);

      // Konfirmasi pesan telah sukses diproses
      channel.ack(msg);
      console.log(\`[v] Selesai memproses pesan id: \${data.id || 'N/A'}\`);
    } catch (err) {
      console.error('Gagal memproses pesan:', err);
      // nack dengan requeue: true jika ingin mencoba ulang, atau false jika dibuang
      channel.nack(msg, false, false);
    }
  });
}`;

  const pubSubSnippet = `import amqp from 'amqplib';

/**
 * 3. Publish / Subscribe Pattern (Fanout Exchange)
 * Broadcast pesan ke banyak antrean sekaligus
 */
export async function broadcastMessage(exchangeName: string, eventData: any) {
  const connection = await amqp.connect('${effectiveAmqpUri}');
  const channel = await connection.createChannel();

  // Buat fanout exchange
  await channel.assertExchange(exchangeName, 'fanout', { durable: true });

  // Publish pesan ke exchange tanpa routing key
  channel.publish(exchangeName, '', Buffer.from(JSON.stringify(eventData)));
  console.log(\`Broadcast dikirim ke exchange '\${exchangeName}':\`, eventData);

  await channel.close();
  await connection.close();
}`;

  const envSnippet = `# RabbitMQ Connection Configuration
# External Connection (dari laptop / development lokal)
RABBITMQ_URL=${effectiveAmqpUri}

# Internal Connection (untuk aplikasi backend di Docker network yang sama)
RABBITMQ_INTERNAL_URL=${effectiveInternalAmqpUri}

# Port Details
RABBITMQ_AMQP_PORT=${amqpPort}
RABBITMQ_STATS_PORT=15672
RABBITMQ_DIST_PORT=25672
RABBITMQ_EPMD_PORT=4369
RABBITMQ_DEFAULT_USER=${user}
RABBITMQ_DEFAULT_PASS=${pass}`;

  const testScriptSnippet = `import amqp from 'amqplib';

async function testRabbitMQ() {
  const uri = '${effectiveAmqpUri}';
  console.log('Menghubungi RabbitMQ broker di:', uri.replace(/:[^:@]+@/, ':••••@'));

  try {
    const conn = await amqp.connect(uri);
    console.log('Koneksi TCP AMQP BERHASIL!');

    const ch = await conn.createChannel();
    const testQueue = 'test_connection_ping';

    await ch.assertQueue(testQueue, { durable: false, autoDelete: true });
    ch.sendToQueue(testQueue, Buffer.from(JSON.stringify({ ping: 'pong', timestamp: Date.now() })));
    console.log('Test kirim pesan ke queue berhasil!');

    await ch.close();
    await conn.close();
    console.log('Uji coba selesai dengan sukses.');
  } catch (err) {
    console.error('Koneksi Gagal:', err.message);
  }
}

testRabbitMQ();`;

  return (
    <div className="rounded-xl border border-orange-500/20 bg-card shadow-xs p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Network className="w-4 h-4 text-orange-500" />
              <span>RabbitMQ Ports &amp; Topology Matrix</span>
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              4 Core TCP Ports
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Topologi port resmi RabbitMQ mencakup protokol AMQP client, Erlang distribution inter-node, HTTP stats management API, dan EPMD discovery daemon.
          </p>
        </div>

        {webManagementUiUrl && (
          <a
            href={webManagementUiUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition shadow-xs cursor-pointer shrink-0"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Launch Web Console (:15672)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* 4 Ports Grid (amqp, stats, dist, epmd) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {ports.map((p) => {
          const isAmqp = p.name === "amqp";
          const isStats = p.name === "stats";
          const isDist = p.name === "dist";
          const isEpmd = p.name === "epmd";

          return (
            <div
              key={p.name}
              className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                isAmqp
                  ? "bg-orange-500/5 border-orange-500/30"
                  : isStats
                  ? "bg-amber-500/5 border-amber-500/30"
                  : isDist
                  ? "bg-indigo-500/5 border-indigo-500/30"
                  : "bg-cyan-500/5 border-cyan-500/30"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs uppercase px-2 py-0.5 rounded bg-muted/80 text-foreground">
                    {p.name}
                  </span>
                  <span className="font-mono text-[11px] font-semibold text-foreground px-2 py-0.5 rounded bg-background border border-border">
                    {p.port}/{p.protocol}
                  </span>
                </div>

                <div className="mt-2.5">
                  <span className="font-semibold text-xs text-foreground block">
                    {p.service}
                  </span>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {p.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-border/50 flex items-center justify-between font-mono text-[11px]">
                <span className="text-muted-foreground truncate">
                  {targetHost}:{p.port}
                </span>
                <CopyButton text={`${targetHost}:${p.port}`} label="Copy" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Code Snippets Section for Node.js / amqplib */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-orange-500" />
            <span>Integrasi Node.js &amp; npm <code>amqplib</code></span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-muted-foreground text-[11px]">Install:</span>
            <code className="px-2 py-0.5 rounded bg-muted text-foreground text-[11px]">
              pnpm add amqplib
            </code>
            <CopyButton text="pnpm add amqplib" label="Copy" />
          </div>
        </div>

        {/* Tab Headers */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-border">
          <button
            type="button"
            onClick={() => setActiveSnippetTab("producer")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeSnippetTab === "producer"
                ? "bg-muted text-foreground border-b-2 border-orange-500 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-orange-500" />
            <span>Producer (Send Queue)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSnippetTab("consumer")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeSnippetTab === "consumer"
                ? "bg-muted text-foreground border-b-2 border-orange-500 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <span>Consumer (Worker)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSnippetTab("pubsub")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeSnippetTab === "pubsub"
                ? "bg-muted text-foreground border-b-2 border-orange-500 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Pub / Sub (Fanout)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSnippetTab("env")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeSnippetTab === "env"
                ? "bg-muted text-foreground border-b-2 border-orange-500 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-cyan-500" />
            <span>.env Config</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSnippetTab("testScript")}
            className={`px-3 py-1.5 rounded-t-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeSnippetTab === "testScript"
                ? "bg-muted text-foreground border-b-2 border-orange-500 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span>Test Script (amqp ping)</span>
          </button>
        </div>

        {/* Code Content Box */}
        <div className="relative rounded-lg border border-border bg-muted/20 p-4 font-mono text-xs">
          <div className="absolute top-3 right-3">
            <CopyButton
              text={
                activeSnippetTab === "producer"
                  ? producerSnippet
                  : activeSnippetTab === "consumer"
                  ? consumerSnippet
                  : activeSnippetTab === "pubsub"
                  ? pubSubSnippet
                  : activeSnippetTab === "env"
                  ? envSnippet
                  : testScriptSnippet
              }
              label="Copy Code"
            />
          </div>

          <pre className="overflow-x-auto text-[11px] leading-relaxed text-foreground pr-24 whitespace-pre">
            {activeSnippetTab === "producer" && producerSnippet}
            {activeSnippetTab === "consumer" && consumerSnippet}
            {activeSnippetTab === "pubsub" && pubSubSnippet}
            {activeSnippetTab === "env" && envSnippet}
            {activeSnippetTab === "testScript" && testScriptSnippet}
          </pre>
        </div>
      </div>
    </div>
  );
}

