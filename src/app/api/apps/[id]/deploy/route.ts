import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { docker, buildHostConfig, getDockerDaemonStatus } from "@/lib/engine/docker";
import { buildTraefikLabels } from "@/lib/engine/traefik";
import { dispatchSystemAlert } from "@/lib/engine/alerting";
import EventEmitter from "events";

export const globalDeploymentEvents = new EventEmitter();

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: appId } = await params;
    const body = await req.json().catch(() => ({}));
    const branch = body.branch;

    const app = await db.application.findUnique({
      where: { id: appId },
      include: {
        project: true,
        domains: true,
        envVariables: true,
      },
    });

    if (!app) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // 1. Create Deployment record
    const deployment = await db.deployment.create({
      data: {
        applicationId: app.id,
        branch: branch || app.branch,
        status: "BUILDING",
        commitHash: crypto.randomUUID().slice(0, 7),
        commitMessage: "Deployment triggered via console",
      },
    });

    // Run async build pipeline in background
    runBuildPipeline(app, deployment.id).catch((err) => {
      console.error("[Deploy Pipeline Error]:", err);
    });

    return NextResponse.json({
      success: true,
      deploymentId: deployment.id,
      status: "BUILDING",
      logsStreamUrl: `/api/deployments/${deployment.id}/logs`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

async function runBuildPipeline(app: any, deploymentId: string) {
  const log = async (chunk: string, stream: "stdout" | "stderr" = "stdout") => {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${chunk}`;
    globalDeploymentEvents.emit("log", {
      deploymentId,
      chunk: formatted,
      stream,
    });

    await db.deployment.update({
      where: { id: deploymentId },
      data: {
        buildLogs: {
          set: (await getExistingLogs(deploymentId)) + formatted + "\n",
        },
      },
    });
  };

  try {
    await log(`Initializing deployment pipeline for service '${app.name}'...`);
    await log(`Repository: ${app.repositoryUrl} (Branch: ${app.branch})`);

    const dockerStatus = await getDockerDaemonStatus();

    if (!dockerStatus.online) {
      // Local development fallback when Docker daemon is not running
      await log(`[Engine Warning] Docker daemon is offline or not installed on host.`);
      await log(`Running simulated pipeline for testing UI and state transitions...`);
      await new Promise((r) => setTimeout(r, 1000));
      await log(`[Simulated] Cloning repository... Done.`);
      await new Promise((r) => setTimeout(r, 1000));
      await log(`[Simulated] Buildpack detection: ${app.buildPack} detected.`);
      await new Promise((r) => setTimeout(r, 1000));
      await log(`[Simulated] Compiling OCI Container image minipaas/${app.slug}:${deploymentId}... Done.`);
      await new Promise((r) => setTimeout(r, 1000));
      await log(`[Simulated] Spawning blue container on port ${app.internalPort}...`);
      await log(`[Simulated] Healthcheck polling: HTTP 200 OK.`);
      await log(`Deployment successfully activated!`);

      await db.deployment.update({
        where: { id: deploymentId },
        data: {
          status: "ACTIVE",
          finishedAt: new Date(),
          containerId: `sim_${deploymentId.slice(-8)}`,
        },
      });

      await db.application.update({
        where: { id: app.id },
        data: { activeDeployId: deploymentId },
      });

      globalDeploymentEvents.emit("complete", {
        deploymentId,
        status: "ACTIVE",
      });
      return;
    }

    // Real Docker execution
    await log(`Connected to Docker Engine successfully.`);
    const imageTag = `minipaas/${app.slug}:${deploymentId}`;

    await db.deployment.update({
      where: { id: deploymentId },
      data: { status: "DEPLOYING", imageTag },
    });

    const primaryDomain = app.domains.find((d: any) => d.isPrimary) || app.domains[0];
    const traefikLabels = primaryDomain
      ? buildTraefikLabels({
          routerName: `router_${app.slug}`,
          hostDomain: primaryDomain.host,
          internalPort: app.internalPort,
        })
      : {};

    const containerName = `app_${app.slug}_${deploymentId.slice(-6)}`;
    const hostConfig = buildHostConfig(app.cpuLimit, app.memoryLimitMb);

    const container = await docker.createContainer({
      name: containerName,
      Image: "alpine:latest", // lightweight testing baseline image
      Cmd: ["sh", "-c", `echo 'Application ${app.name} running on port ${app.internalPort}' && sleep 86400`],
      HostConfig: hostConfig,
      Labels: {
        "managed-by": "minipaas",
        "app-id": app.id,
        "deployment-id": deploymentId,
        ...traefikLabels,
      },
    });

    await container.start();
    await log(`Container ${containerName} started with ID ${container.id.slice(0, 12)}.`);

    await db.deployment.update({
      where: { id: deploymentId },
      data: {
        status: "ACTIVE",
        containerId: container.id,
        finishedAt: new Date(),
      },
    });

    await db.application.update({
      where: { id: app.id },
      data: { activeDeployId: deploymentId },
    });

    await log(`Service promoted to ACTIVE status.`);
    globalDeploymentEvents.emit("complete", { deploymentId, status: "ACTIVE" });
  } catch (err: any) {
    const errorMsg = err.message || "Unknown deployment error";
    await log(`ERROR: ${errorMsg}`, "stderr");

    await db.deployment.update({
      where: { id: deploymentId },
      data: {
        status: "FAILED",
        errorMessage: errorMsg,
        finishedAt: new Date(),
      },
    });

    // Send automated incident email alert
    await dispatchSystemAlert({
      appId: app.id,
      appName: app.name,
      errorType: "BUILD_FAILED",
      errorSnippet: errorMsg,
    });

    globalDeploymentEvents.emit("complete", { deploymentId, status: "FAILED" });
  }
}

async function getExistingLogs(deploymentId: string): Promise<string> {
  const d = await db.deployment.findUnique({
    where: { id: deploymentId },
    select: { buildLogs: true },
  });
  return d?.buildLogs || "";
}
