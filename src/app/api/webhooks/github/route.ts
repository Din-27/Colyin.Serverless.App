import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyGitHubSignature } from "@/lib/engine/crypto";
import { runBuildPipeline } from "@/app/api/apps/[id]/deploy/route";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256") || "";
    const event = req.headers.get("x-github-event") || "";
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";

    if (webhookSecret) {
      const isValid = verifyGitHubSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        return NextResponse.json(
          { success: false, error: "Invalid HMAC signature" },
          { status: 401 }
        );
      }
    }

    if (event !== "push") {
      return NextResponse.json(
        { success: true, message: `Ignored event: ${event}` },
        { status: 200 }
      );
    }

    const payload = JSON.parse(rawBody);
    const repoUrl = payload.repository?.clone_url || payload.repository?.html_url;
    const ref = payload.ref || ""; // e.g. "refs/heads/main"
    const branch = ref.replace("refs/heads/", "");

    if (!repoUrl) {
      return NextResponse.json(
        { success: false, error: "Missing repository URL in payload" },
        { status: 400 }
      );
    }

    // Find configured application matching repository and branch
    const app = await db.application.findFirst({
      where: {
        repositoryUrl: { contains: payload.repository?.name },
        branch,
      },
      include: {
        project: true,
        domains: true,
        envVariables: true,
      },
    });

    if (!app) {
      return NextResponse.json(
        { success: false, message: "No matching application found for this push" },
        { status: 200 }
      );
    }

    // Trigger deployment
    const deployment = await db.deployment.create({
      data: {
        applicationId: app.id,
        branch,
        commitHash: payload.after?.slice(0, 7) || "webhook",
        commitMessage: payload.head_commit?.message || "Triggered via GitHub webhook",
        status: "BUILDING",
      },
    });

    // Execute build & deploy pipeline asynchronously in background
    runBuildPipeline(app, deployment.id).catch((err) => {
      console.error("[Webhook Auto-Deploy Error]:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: "Deployment triggered via webhook",
        deploymentId: deployment.id,
      },
      { status: 202 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
