# System Architecture & Technical Specification: MiniPaaS Engine

- **Document Version:** 1.0.0
- **Status:** Approved for Implementation
- **Author:** Principal Software Architect & SRE
- **Target OS:** Ubuntu 24.04 LTS (x86_64 / arm64)
- **Target Workload:** Multi-Tenant Logical Isolation, Single-Node Self-Hosted PaaS

---

## 1. System Overview & High-Level Architecture

### 1.1 Data Flow Diagram

```text
+---------------------------------------------------------------------------------------+
|                                    INTERNET                                           |
+---------------------------------------------------------------------------------------+
           |                                                       |
   (1) Git Push Webhook                                   (7) HTTPS User Traffic
   (HMAC-SHA256 Signed)                                   (SNI / TLS Terminated)
           |                                                       |
           v                                                       v
+--------------------------+                             +--------------------+
|  Reverse Proxy / Ingress |                             |   Traefik v3 /     |
|  (Traefik v3 or Caddy)   |                             |   Caddy Ingress    |
+--------------------------+                             +--------------------+
           |                                                       |
           v                                                       |
+-----------------------------------------------------+            |
| CONTROLLER PLANE (Node.js/Fastify/Next.js)          |            |
| - Webhook Signature Verifier (crypto.timingSafeEqual)|            |
| - State Machine & Deployment Lifecycle Manager      |            |
| - Secrets Decryption Manager (AES-256-GCM)          |            |
| - Persistence Layer: PostgreSQL + Prisma ORM        |            |
+-----------------------------------------------------+            |
           |                                                       |
           | (2) Queue Job                                         |
           v                                                       |
+-----------------------------------------------------+            |
| WORKER & EXECUTION ENGINE                           |            |
| - Ephemeral Workspace Allocator (/tmp/builds/{id})  |            |
| - Nixpacks / BuildKit Image Generator               |            |
+-----------------------------------------------------+            |
           |                                                       |
           | (3) Unix Socket (/var/run/docker.sock)                |
           v                                                       |
+-----------------------------------------------------+            |
| DOCKER ENGINE RUNTIME                               |            |
| - Build Image (`sha256:...`)                         |            |
| - Create App Network: `net_{project_id}`            |            |
| - Spawn Blue Container -> Healthcheck Loop          | (6) Route  |
| - Reconfigure Traefik Labels / Caddy API Rules -----+------------+
| - Drain & Stop Green Container                      |            |
+-----------------------------------------------------+            |
           |                                                       |
           +--------------------+----------------------------------+
                                |
                                v
               +----------------------------------+
               | Isolated App Container (Healthy) |
               | - Memory Limit (cgroups v2)      |
               | - CPU Quotas (shares/quota)      |
               | - Internal DNS Discovery         |
               +----------------------------------+
                                | (Internal Network: `net_{project_id}`)
                                v
               +----------------------------------+
               | Addon Containers (DB, Cache, MQ) |
               | - postgres:16-alpine (Volume)    |
               | - redis:7-alpine                 |
               | - rabbitmq:3-management-alpine   |
               +----------------------------------+
```

### 1.2 Component Separation of Concerns

1. **Ingress / Reverse Proxy (Traefik v3)**:
   - Binds directly to host ports `80` and `443`.
   - Listens to Docker events (`/var/run/docker.sock`) or dynamic file/HTTP providers.
   - Automatically negotiates TLS certificates via Let's Encrypt (ACME HTTP-01 or TLS-ALPN-01).
   - Routes ingress traffic to target containers based on host headers (`Host(`app.example.com`)`).

2. **Controller Plane (API Service)**:
   - Exposes REST endpoints for administration and webhooks.
   - Maintains transactional records in PostgreSQL via Prisma ORM.
   - Handles authentication, role-based access control (RBAC), and encryption/decryption of environment variables.
   - Streams build and runtime telemetry to clients via Server-Sent Events (SSE).

3. **Execution Engine (Worker Process)**:
   - Consumes deployment jobs in FIFO order.
   - Pulls Git trees without storing long-term history (`git clone --depth 1`).
   - Executes image compilation using Nixpacks CLI or native Docker BuildKit.
   - Directly interacts with Docker Engine API via socket client (`dockerode`).

4. **Internal Mesh Network**:
   - Every project owns an isolated Docker Bridge network (`net_{project_id}`).
   - Container-to-container communication bypasses the public ingress completely.

---

## 2. Database Schema & Data Model (Prisma / PostgreSQL)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum DeploymentStatus {
  QUEUED
  BUILDING
  DEPLOYING
  ACTIVE
  FAILED
  TERMINATED
}

enum EnvType {
  BUILD_TIME
  RUNTIME
}

enum AddonType {
  POSTGRESQL
  MYSQL
  REDIS
  RABBITMQ
  MINIO
}

model Project {
  id           String        @id @default(cuid())
  name         String
  slug         String        @unique
  description  String?
  networkName  String        @unique // Example: "net_proj_123"
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  applications Application[]
  addons       Addon[]

  @@index([slug])
}

model Application {
  id              String                @id @default(cuid())
  projectId       String
  project         Project               @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name            String
  slug            String
  repositoryUrl   String
  branch          String                @default("main")
  buildPack       String                @default("NIXPACKS") // NIXPACKS | DOCKERFILE
  dockerfilePath  String?               @default("Dockerfile")
  installCommand  String?
  buildCommand    String?
  startCommand    String?
  internalPort    Int                   @default(3000)
  cpuLimit        Float                 @default(1.0) // 1.0 CPU Core
  memoryLimitMb   Int                   @default(512) // 512 MB
  restartPolicy   String                @default("unless-stopped")
  activeDeployId  String?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt

  deployments     Deployment[]
  envVariables    EnvironmentVariable[]
  domains         Domain[]
  storageVolumes  StorageVolume[]

  @@unique([projectId, slug])
}

model Deployment {
  id            String           @id @default(cuid())
  applicationId String
  application   Application      @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  commitHash    String?
  commitMessage String?
  branch        String
  imageTag      String?
  containerId   String?
  status        DeploymentStatus @default(QUEUED)
  buildLogs     String?          @db.Text
  errorMessage  String?          @db.Text
  startedAt     DateTime         @default(now())
  finishedAt    DateTime?

  @@index([applicationId, status])
}

model EnvironmentVariable {
  id            String      @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  key           String
  encryptedVal  String      @db.Text // Ciphertext in Base64 (AES-256-GCM)
  iv            String      // Initialization Vector in Base64
  authTag       String      // Authentication Tag in Base64
  type          EnvType     @default(RUNTIME)
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@unique([applicationId, key])
}

model Domain {
  id            String      @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  host          String      @unique // e.g. "api.company.com" or "app-123.local"
  isPrimary     Boolean     @default(false)
  sslEnabled    Boolean     @default(true)
  certificateStatus String  @default("PENDING") // PENDING | ISSUED | FAILED
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}

model StorageVolume {
  id            String      @id @default(cuid())
  applicationId String
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  name          String      @unique // e.g. "vol_app123_data"
  mountPath     String      // e.g. "/var/lib/app/data"
  sizeLimitMb   Int?        @default(1024)
  createdAt     DateTime    @default(now())
}

model Addon {
  id            String      @id @default(cuid())
  projectId     String
  project       Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name          String
  type          AddonType
  containerId   String?
  internalHost  String      // e.g. "postgres_addon_1"
  internalPort  Int         // e.g. 5432
  publicPort    Int?        // Nullable. Populated only when public access is toggled
  volumeName    String      // Docker named volume
  encryptedPass String      // AES-256-GCM
  iv            String
  authTag       String
  status        String      @default("STOPPED")
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

---

## 3. Dynamic Configuration Specs (Core Engine)

### 3.1 Dynamic Ingress & Routing Engine (Traefik v3 Docker Labels)

When spawning an application container, the Controller calculates and attaches the following labels dynamically:

```typescript
export interface IngressConfigParams {
  routerName: string;
  hostDomain: string;
  internalPort: number;
  tlsCertResolver: string;
}

export function buildTraefikLabels(params: IngressConfigParams): Record<string, string> {
  const { routerName, hostDomain, internalPort, tlsCertResolver } = params;

  return {
    "traefik.enable": "true",
    [`traefik.http.routers.${routerName}.rule`]: `Host(\`${hostDomain}\`)`,
    [`traefik.http.routers.${routerName}.entrypoints`]: "websecure",
    [`traefik.http.routers.${routerName}.tls`]: "true",
    [`traefik.http.routers.${routerName}.tls.certresolver`]: tlsCertResolver,
    [`traefik.http.services.${routerName}.loadbalancer.server.port`]: internalPort.toString(),
    // Standard secure headers
    [`traefik.http.middlewares.${routerName}-headers.headers.sslredirect`]: "true",
    [`traefik.http.middlewares.${routerName}-headers.headers.browserXssFilter`]: "true",
    [`traefik.http.routers.${routerName}.middlewares`]: `${routerName}-headers`
  };
}
```

### 3.2 Internal Network Mesh

1. **Isolation Rule**:
   - Each project has a dedicated bridge network created via Docker Engine API:
     ```typescript
     await docker.createNetwork({
       Name: `net_${project.id}`,
       Driver: "bridge",
       CheckDuplicate: true,
       Internal: false,
       Attachable: true,
       Labels: {
         "managed-by": "minipaas",
         "project-id": project.id
       }
     });
     ```
2. **DNS Discovery**:
   - Containers use their service name as their network alias.
   - Example: A backend container can connect to PostgreSQL using `postgres:5432` without public port exposure.

### 3.3 Dynamic Environment Injection

1. **Decryption at Runtime**:
   Secrets stored in the database as AES-256-GCM ciphertext are decrypted only inside the Controller's memory right before container initialization.
2. **Built-in System Injections**:
   The engine automatically injects reserved runtime variables:
   - `PORT`: Matched to `application.internalPort`.
   - `HOST`: Set to `0.0.0.0`.
   - `MINIPAAS_DEPLOYMENT_ID`: Target deployment ID.
   - `MINIPAAS_APP_ID`: Application ID.
   - `PUBLIC_URL`: Primary bound domain (e.g., `https://api.domain.com`).

```typescript
export function composeContainerEnv(
  systemEnvs: Record<string, string>,
  userEnvs: Array<{ key: string; value: string }>
): string[] {
  const merged = new Map<string, string>();
  for (const [k, v] of Object.entries(systemEnvs)) merged.set(k, v);
  for (const u of userEnvs) merged.set(u.key, u.value);

  const envArray: string[] = [];
  for (const [key, val] of merged.entries()) {
    envArray.push(`${key}=${val}`);
  }
  return envArray;
}
```

### 3.4 Resource Quotas & Limits

Limits are enforced through cgroups v2 settings via the Docker Engine API:

```typescript
export interface ResourceLimits {
  cpuLimit: number;      // e.g. 0.5 (50% of 1 CPU) or 2.0 (2 CPUs)
  memoryLimitMb: number; // e.g. 512
}

export function buildHostConfig(limits: ResourceLimits, volumeBinds: string[] = []): Docker.HostConfig {
  const NanoCPUs = Math.floor(limits.cpuLimit * 1e9);
  const Memory = limits.memoryLimitMb * 1024 * 1024;
  const MemorySwap = Memory; // MemorySwap == Memory disables extra swap to prevent disk thrashing

  return {
    NanoCPUs,
    Memory,
    MemorySwap,
    OomKillDisable: false, // Trigger OOM event if quota breached
    RestartPolicy: {
      Name: "unless-stopped"
    },
    Binds: volumeBinds,
    NetworkMode: "bridge"
  };
}
```

### 3.5 Persistent Storage Allocation

- For persistent disk mounts, use Docker Named Volumes prefixed with `vol_{appId}_{volumeName}`.
- Host configuration mount structure:
  ```json
  "Binds": [
    "vol_clz09x_data:/var/lib/app/data:rw"
  ]
  ```

---

## 4. Deployment Pipeline & Orchestration State Machine

### 4.1 Deployment State Machine

```text
[QUEUED] 
    │
    ▼
[BUILDING]  ──(Compile Error)──► [FAILED]
    │                               ▲
    ▼ (Image Ready)                 │ (Healthcheck Timeout)
[DEPLOYING] ────────────────────────┘
    │
    ▼ (Healthcheck Succeeded 200 OK)
[ACTIVE] ──(New Deployment Active)──► [TERMINATED]
```

### 4.2 Webhook Handler & Build Pipeline Implementation

```typescript
import crypto from "crypto";
import { exec } from "child_process";
import { promisify } from "util";
import Docker from "dockerode";

const execAsync = promisify(exec);
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// 1. Signature Verification
export function verifyGitHubSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

// 2. Build and Rollout Orchestrator
export async function executeDeploymentPipeline(deploymentId: string): Promise<void> {
  const deployment = await getDeploymentWithApp(deploymentId);
  const { application } = deployment;
  const buildDir = `/tmp/builds/${deploymentId}`;
  const imageTag = `minipaas/${application.slug}:${deploymentId}`;

  try {
    await updateDeploymentStatus(deploymentId, "BUILDING");

    // a. Shallow Git Clone
    await execAsync(`git clone --depth 1 --branch ${deployment.branch} ${application.repositoryUrl} ${buildDir}`);

    // b. Builder Engine: Check Dockerfile vs Nixpacks
    const hasDockerfile = await fileExists(`${buildDir}/${application.dockerfilePath || "Dockerfile"}`);
    if (hasDockerfile) {
      await execAsync(`docker build -t ${imageTag} -f ${buildDir}/${application.dockerfilePath || "Dockerfile"} ${buildDir}`);
    } else {
      await execAsync(`nixpacks build ${buildDir} --name ${imageTag}`);
    }

    await updateDeploymentStatus(deploymentId, "DEPLOYING", { imageTag });

    // c. Blue-Green Rollout
    const newContainer = await startNewContainer(application, deploymentId, imageTag);

    // d. Healthcheck Loop (Poll port / health route for 60 seconds)
    const isHealthy = await pollContainerHealth(newContainer.id, application.internalPort, 60);
    if (!isHealthy) {
      throw new Error(`Container healthcheck failed on port ${application.internalPort}`);
    }

    // e. Promote: Update Active Pointer & Drain Old Container
    const oldContainerId = application.activeDeployId ? await getContainerByDeployId(application.activeDeployId) : null;
    
    await updateAppActiveDeployment(application.id, deploymentId);
    await updateDeploymentStatus(deploymentId, "ACTIVE");

    if (oldContainerId) {
      await drainAndTerminate(oldContainerId);
    }
  } catch (error: any) {
    await updateDeploymentStatus(deploymentId, "FAILED", { errorMessage: error.message });
    // Trigger Automated Email Alerting System
    await sendAlertEmail({
      type: "DEPLOYMENT_FAILED",
      app: application.name,
      deployId: deploymentId,
      errorSnippet: error.message
    });
  } finally {
    // Cleanup temporary build workspace
    await execAsync(`rm -rf ${buildDir}`).catch(() => {});
  }
}

async function pollContainerHealth(containerId: string, port: number, timeoutSec: number): Promise<boolean> {
  const startTime = Date.now();
  const maxMs = timeoutSec * 1000;

  while (Date.now() - startTime < maxMs) {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    if (!info.State.Running) return false;

    try {
      const ip = info.NetworkSettings.Networks[Object.keys(info.NetworkSettings.Networks)[0]].IPAddress;
      const res = await fetch(`http://${ip}:${port}/`, { method: "HEAD", signal: AbortSignal.timeout(2000) });
      if (res.status >= 200 && res.status < 400) return true;
    } catch {
      // Continue polling
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}
```

---

## 5. Log Streaming & Observability Architecture

### 5.1 Telemetry Pipeline Architecture

```text
[Build Process stdout/stderr] ──► Pipe ──► Log Buffer ──► Prisma (DB on complete)
                                               │
                                               ▼
                                      [SSE Broadcaster]
                                               │
                                               ▼
                                      [HTTP Client EventStream]
                                               ▲
                                               │
[Docker Container Log Stream] ─► dockerode.logs({ follow: true }) ─┘
```

### 5.2 Server-Sent Events (SSE) Controller Specification

```typescript
import { FastifyRequest, FastifyReply } from "fastify";
import EventEmitter from "events";

export const logEventEmitter = new EventEmitter();

export async function streamDeploymentLogs(req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
  const { id } = req.params;

  reply.raw.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive"
  });

  reply.raw.write(`event: init\ndata: ${JSON.stringify({ deploymentId: id })}\n\n`);

  const onLogChunk = (payload: { deploymentId: string; chunk: string; stream: "stdout" | "stderr" }) => {
    if (payload.deploymentId === id) {
      reply.raw.write(`event: log\ndata: ${JSON.stringify(payload)}\n\n`);
    }
  };

  logEventEmitter.on("log", onLogChunk);

  req.raw.on("close", () => {
    logEventEmitter.off("log", onLogChunk);
  });
}
```

---

## 6. Security & Sandbox Isolation

### 6.1 Daemon Socket Security (`/var/run/docker.sock`)
- **Principle of Least Privilege**: The Controller service must execute as a non-root system user belonging to a dedicated `docker` group.
- **Socket Proxying**: For enterprise isolation, wrap `/var/run/docker.sock` with a read/write filtering proxy (e.g., `tecnativa/docker-socket-proxy`) that completely blocks destructive API routes (`/volumes/prune`, `/swarm/*`).

### 6.2 Container Hardening
- Do not grant `--privileged` flags under any circumstances.
- Deny host capability additions: set `CapDrop: ["ALL"]`, allow only essential network/process capabilities (`CHOWN`, `SETUID`, `SETGID`, `NET_BIND_SERVICE`).
- Block host file system leakage: User storage mounts are strictly bounded to managed Docker named volumes. Direct host binds (`/etc`, `/var`, `/`) are prohibited by the Controller validator.

### 6.3 Cryptography Standard (Secrets at Rest)
- Algorithm: **AES-256-GCM**.
- Key Material: Derived from `MASTER_KEY` environment variable (32-byte hexadecimal string).
- Each secret record stores its own unique 12-byte IV and 16-byte Auth Tag.

```typescript
import crypto from "crypto";

const MASTER_KEY = Buffer.from(process.env.ENCRYPTION_MASTER_KEY!, "hex"); // 32 bytes

export function encryptSecret(plainText: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", MASTER_KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag
  };
}

export function decryptSecret(ciphertext: string, ivBase64: string, authTagBase64: string): string {
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
```

---

## 7. API Endpoints Contract

### 7.1 `POST /api/webhooks/github`
Handles automatic deployments from repository push events.

- **Headers**:
  - `X-GitHub-Event`: `push`
  - `X-Hub-Signature-256`: `sha256={digest}`
- **Request Body**: Standard GitHub Push Webhook JSON payload.
- **Response**:
  - `202 Accepted`: Deployment triggered successfully.
  - `401 Unauthorized`: Invalid HMAC signature.
  - `400 Bad Request`: Irrelevant branch or non-configured repo.

### 7.2 `POST /api/apps`
Creates a new application service entity under a project.

- **Request Body**:
  ```json
  {
    "projectId": "clz001a",
    "name": "Inventory API",
    "slug": "inventory-api",
    "repositoryUrl": "https://github.com/company/inventory-api.git",
    "branch": "main",
    "internalPort": 8080,
    "buildPack": "NIXPACKS",
    "cpuLimit": 0.5,
    "memoryLimitMb": 512
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "id": "app_991823",
    "slug": "inventory-api",
    "status": "INITIALIZED"
  }
  ```

### 7.3 `POST /api/apps/:id/deploy`
Manually dispatches an active build and deployment job.

- **Request Body**:
  ```json
  {
    "branch": "main",
    "commitHash": "a1b2c3d" // Optional
  }
  ```
- **Response `202 Accepted`**:
  ```json
  {
    "deploymentId": "dep_44812",
    "status": "QUEUED",
    "logsStreamUrl": "/api/deployments/dep_44812/logs"
  }
  ```

### 7.4 `GET /api/deployments/:id/logs`
Streams real-time build and execution logs via Server-Sent Events.

- **Headers**:
  - `Accept`: `text/event-stream`
- **Response Stream (`text/event-stream`)**:
  ```text
  event: init
  data: {"deploymentId":"dep_44812"}

  event: log
  data: {"stream":"stdout","chunk":"[Nixpacks] Detecting application framework..."}

  event: log
  data: {"stream":"stdout","chunk":"[Nixpacks] Building image tag minipaas/inventory-api:dep_44812..."}

  event: complete
  data: {"status":"ACTIVE","finishedAt":"2026-11-03T09:47:00Z"}
  ```

### 7.5 `PUT /api/apps/:id/env`
Atomically sets or updates environment variables for an application.

- **Request Body**:
  ```json
  {
    "variables": [
      { "key": "DATABASE_URL", "value": "postgresql://usr:pwd@postgres:5432/inv", "type": "RUNTIME" },
      { "key": "NODE_ENV", "value": "production", "type": "RUNTIME" },
      { "key": "NPM_CONFIG_PRODUCTION", "value": "false", "type": "BUILD_TIME" }
    ]
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "success": true,
    "updatedKeys": ["DATABASE_URL", "NODE_ENV", "NPM_CONFIG_PRODUCTION"]
  }
  ```

---

## 8. Addons & Managed Services Subsystem

### 8.1 Supported Addon Templates & Default Runtimes

| Addon Type | Official Docker Image | Internal Port | Default Volume Path | Auto-Generated Connection Variable |
| :--- | :--- | :--- | :--- | :--- |
| **PostgreSQL** | `postgres:16-alpine` | `5432` | `/var/lib/postgresql/data` | `DATABASE_URL=postgresql://{user}:{pass}@{host}:5432/{db}` |
| **MySQL** | `mysql:8.4` | `3306` | `/var/lib/mysql` | `DATABASE_URL=mysql://{user}:{pass}@{host}:3306/{db}` |
| **Redis** | `redis:7-alpine` | `6379` | `/data` | `REDIS_URL=redis://default:{pass}@{host}:6379` |
| **RabbitMQ** | `rabbitmq:3-management-alpine` | `5672` (AMQP)<br>`15672` (UI) | `/var/lib/rabbitmq` | `RABBITMQ_URL=amqp://{user}:{pass}@{host}:5672` |
| **MinIO (S3)** | `minio/minio:latest` | `9000` (API)<br>`9001` (Console) | `/data` | `S3_ENDPOINT=http://{host}:9000`<br>`S3_ACCESS_KEY={user}` |

### 8.2 Shared vs. Dedicated Provisioning Workflow

When attaching an addon to an application service:
1. **Dedicated Instance**: Spawns a dedicated container with isolated RAM/CPU and persistent volume.
2. **Shared Multi-Tenant Instance**:
   - For PostgreSQL: Connects to existing container via `docker exec` or admin TCP connection and runs:
     ```sql
     CREATE USER app_user WITH ENCRYPTED PASSWORD 'generated_pwd';
     CREATE DATABASE app_db OWNER app_user;
     GRANT ALL PRIVILEGES ON DATABASE app_db TO app_user;
     ```
   - For RabbitMQ: Generates isolated Virtual Host:
     ```bash
     rabbitmqctl add_vhost /vhost_app
     rabbitmqctl set_permissions -p /vhost_app app_user ".*" ".*" ".*"
     ```
   - For MinIO: Invokes MinIO Client (`mc`) to create a discrete bucket:
     ```bash
     mc mb local/{app_bucket_name}
     ```

---

## 9. Automated Alerting & Notification Engine

### 9.1 Alert Trigger Rules

```text
[Failure Event Detected]
       │
       ├── Deployment Status == FAILED
       ├── Container Healthcheck Status != 200 (Timeout after 60s)
       ├── Container Exited with Code > 0 (CrashLoopBackOff)
       └── Container State == OOMKilled
       │
       ▼
[Rate-Limiting / Cooldown Filter]
       │
       ├── Key: `alert:{appId}:{errorType}`
       ├── Cooldown TTL: 900 seconds (15 minutes)
       └── Already Sent within TTL? ──► YES ──► Drop Alert (Prevent Email Storm)
                                    └── NO  ──► Dispatch via SMTP
```

### 9.2 Cooldown Implementation & Dispatcher

```typescript
import nodemailer from "nodemailer";

interface AlertPayload {
  appId: string;
  appName: string;
  errorType: "BUILD_FAILED" | "CONTAINER_CRASH" | "HEALTHCHECK_FAILED" | "OOM_KILLED";
  errorSnippet: string;
  targetEmail: string;
}

const alertCooldownCache = new Map<string, number>();

export async function dispatchSystemAlert(payload: AlertPayload): Promise<boolean> {
  const cacheKey = `${payload.appId}:${payload.errorType}`;
  const now = Date.now();
  const lastSent = alertCooldownCache.get(cacheKey) || 0;
  const cooldownPeriodMs = 15 * 60 * 1000; // 15 Minutes

  if (now - lastSent < cooldownPeriodMs) {
    return false; // Suppressed by rate-limiter
  }

  alertCooldownCache.set(cacheKey, now);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #f43f5e; color: #ffffff; padding: 16px 20px; font-weight: 600; font-size: 16px;">
        Incident Alert: ${payload.errorType}
      </div>
      <div style="padding: 20px; background-color: #ffffff; color: #18181b;">
        <p style="margin: 0 0 12px 0;">Service <strong>${payload.appName}</strong> experienced an unrecoverable failure.</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #71717a;">Service:</td><td style="font-weight: 500;">${payload.appName}</td></tr>
          <tr><td style="padding: 6px 0; color: #71717a;">Incident:</td><td style="font-weight: 500;">${payload.errorType}</td></tr>
          <tr><td style="padding: 6px 0; color: #71717a;">Timestamp:</td><td style="font-weight: 500;">${new Date().toISOString()}</td></tr>
        </table>
        <div style="background-color: #09090b; color: #f43f5e; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; white-space: pre-wrap; overflow-x: auto;">
${payload.errorSnippet.slice(-1000)}
        </div>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"MiniPaaS SRE" <${process.env.SMTP_FROM || "alert@minipaas.local"}>`,
    to: payload.targetEmail,
    subject: `[ALERT] ${payload.appName} - ${payload.errorType}`,
    html: htmlBody
  });

  return true;
}
```

---

## 10. Direct Access & Transparency Engine

### 10.1 Public Port Mapping & Credential Exposure Contract

To eliminate the "black box" concern, the controller exposes endpoints to inspect connection strings and optionally bind ports to external host interfaces.

#### `GET /api/addons/:id/credentials`
- **Response `200 OK`**:
  ```json
  {
    "id": "addon_pg_01",
    "name": "Production Postgres",
    "type": "POSTGRESQL",
    "isPublic": true,
    "internalConnection": {
      "host": "postgres_addon_1",
      "port": 5432,
      "connectionString": "postgresql://postgres:pass@postgres_addon_1:5432/app_db"
    },
    "externalConnection": {
      "host": "vps.company.com",
      "port": 15432,
      "connectionString": "postgresql://postgres:pass@vps.company.com:15432/app_db"
    },
    "webManagementUiUrl": "https://adminer.vps.company.com?server=postgres_addon_1"
  }
  ```

#### `POST /api/addons/:id/toggle-public`
- **Request Body**: `{ "enable": true }`
- **Engine Logic**:
  - Dynamically assigns an unallocated high port (`10000-20000`).
  - Updates container host configuration with `PortBindings`:
    ```json
    {
      "5432/tcp": [{ "HostPort": "15432" }]
    }
    ```
  - Recreates container using persistent volume intact.

---

## 11. Frontend UI/UX & User Views Specification

Seluruh antarmuka dibangun di atas Next.js 15 App Router menggunakan Tailwind CSS dan `lucide-react` (tanpa karakter emoji teks biasa).

### 11.1 Project Canvas & Dashboard View (`/projects/:id`)

Menampilkan tata letak visual seluruh service yang tergabung dalam satu project:

```text
+-----------------------------------------------------------------------------------------+
| [Project: Store-Production]           [Project Settings] [+ New Service / Addon]       |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  +-----------------------------+               +-----------------------------+          |
|  | [Icon: Globe] payment-api   |               | [Icon: Database] pg-cluster |          |
|  | Status: [CheckCircle2] Run  |               | Status: [CheckCircle2] Run  |          |
|  | Route : api.domain.com      |-------------->| Internal: postgres:5432     |          |
|  | RAM   : 142MB / 512MB       |               | Volume  : 2.1GB / 10GB      |          |
|  +-----------------------------+               +-----------------------------+          |
|                 |                                             |                         |
|                 v                                             v                         |
|  +-----------------------------+               +-----------------------------+          |
|  | [Icon: Layers] redis-cache  |               | [Icon: Network] rabbit-mq   |          |
|  | Status: [CheckCircle2] Run  |               | Status: [CheckCircle2] Run  |          |
|  | Internal: redis:6379        |               | Port: 5672 | UI: 15672      |          |
|  +-----------------------------+               +-----------------------------+          |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

### 11.2 Service Creation Wizard (`/projects/:id/new`)

Formulir 3-langkah untuk mendaftarkan service baru:
1. **Source Configuration**:
   - Git Repository URL (`https://github.com/org/repo.git`)
   - Branch input (`main`)
   - Buildpack selector: `[ Auto-Detect (Nixpacks) ]` vs `[ Dockerfile ]`
2. **Resource Attachment (Modular Dependencies)**:
   - Database: `[ ( ) None | ( ) New Container | (*) Attach Existing: pg-cluster ]`
     - Sub-opsi: `[ Auto-create isolated logical DB ('payment_db') ]`
   - Cache: `[ (*) Attach Existing: redis-cache ]`
   - Queue: `[ (*) Attach Existing: rabbit-mq (Auto-vhost: /payment) ]`
   - Storage: `[ ( ) None | (*) Attach Existing: minio (Auto-bucket: payment-bucket) ]`
3. **Environment & Deploy**:
   - Input key-value pairs (dengan tombol bulk paste `.env`).
   - Tombol aksi: `[ Deploy Service Now ]`

### 11.3 Application Detail & Tabbed View (`/apps/:id`)

Halaman manajemen service terbagi menjadi 5 tab fungsional:

1. **Tab Overview & Metrics**:
   - Kartu metrik live: CPU Usage (%), Memory Usage (MB), Network I/O.
   - Status badge container (`RUNNING`, `CRASHED`, `BUILDING`).
   - Tombol kontrol cepat: `Restart`, `Stop`, `Redeploy`.
2. **Tab Deployments (History)**:
   - Tabel riwayat commit: Commit Hash, Branch, Waktu Trigger, Durasi Build, Status (`ACTIVE`, `FAILED`).
   - Tombol aksi: `Rollback to this version` dan `View Build Logs`.
3. **Tab Live Logs (Terminal)**:
   - Terminal terintegrasi berbasis `xterm.js` / monospace stream via SSE.
   - Kontrol toolbar: Toggle Auto-scroll, Filter stream (`All`, `stdout`, `stderr`), Text Search, dan tombol `Download .log`.
4. **Tab Environment Variables**:
   - Daftar kunci & nilai variabel rahasia dengan opsi `[Show/Hide Value]`.
   - Klasifikasi tipe: `Build-time` (misal build flag) vs `Runtime` (misal secret key).
5. **Tab Networking & Settings**:
   - Konfigurasi Custom Domain dengan auto SSL badge.
   - Konfigurasi alokasi port internal (`PORT: 3000`).
   - Slider pengaturan batas resource: CPU Shares (0.1 - 4.0 Cores) dan RAM Limit (128MB - 4GB).

### 11.4 Database & Addon View (`/addons/:id`)

Halaman transparansi penuh untuk mengelola PostgreSQL, Redis, RabbitMQ, dan MinIO:

```text
+-----------------------------------------------------------------------------------------+
| [Icon: Database] PostgreSQL Cluster                 Status: [CheckCircle2] Healthy      |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  KONEKSI INTERNAL (Untuk Service dalam Server):                                         |
|  Hostname    : postgres_addon_1                                             [Copy]      |
|  Port        : 5432                                                         [Copy]      |
|  Database    : production_db                                                [Copy]      |
|  Internal URI: postgresql://postgres:******@postgres_addon_1:5432/prod_db   [Copy]      |
|                                                                                         |
|  -------------------------------------------------------------------------------------  |
|                                                                                         |
|  KONEKSI EKSTERNAL / REMOTE (DBeaver, TablePlus, Laptop):                               |
|  Public Access Switch: [ Toggle: ON ]                                                   |
|  Public Host : vps.domain.com (103.xxx.xxx.xxx)                             [Copy]      |
|  Public Port : 15432 (Auto-mapped)                                          [Copy]      |
|  External URI: postgresql://postgres:******@vps.domain.com:15432/prod_db    [Copy]      |
|                                                                                         |
|  -------------------------------------------------------------------------------------  |
|                                                                                         |
|  MANAJEMEN INSTAN & WEB GUI:                                                            |
|  [ Launch Adminer Web GUI ]  [ Launch RabbitMQ Console (Port 15672) ]                   |
|                                                                                         |
+-----------------------------------------------------------------------------------------+
```

### 11.5 Alerting & Notification Settings View (`/settings/notifications`)

Pengaturan saluran peringatan kegagalan sistem:
- **Email Recipient List**: Form tambah/hapus alamat email developer penerima peringatan.
- **Trigger Rules Checkboxes**:
  - `[x] Notify on Deployment Build Failed`
  - `[x] Notify on Container Crash (Non-zero Exit Code)`
  - `[x] Notify on Healthcheck Failure / 502 Bad Gateway`
  - `[x] Notify on Out-of-Memory (OOM Killed)`
- **SMTP Settings**: Input konfigurasi Host SMTP, Port, Username, Password, dan tombol `[ Send Test Email ]`.


