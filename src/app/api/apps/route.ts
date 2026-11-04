import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const apps = await db.application.findMany({
      where: projectId ? { projectId } : undefined,
      include: {
        domains: true,
        deployments: {
          take: 5,
          orderBy: { startedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, apps });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      projectId,
      name,
      repositoryUrl,
      branch = "main",
      internalPort = 3000,
      buildPack = "NIXPACKS",
      dockerfilePath = "Dockerfile",
      cpuLimit = 1.0,
      memoryLimitMb = 512,
      domain,
    } = body;

    if (!projectId || !name || !repositoryUrl) {
      return NextResponse.json(
        { success: false, error: "projectId, name, and repositoryUrl are required" },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const app = await db.application.create({
      data: {
        projectId,
        name,
        slug,
        repositoryUrl,
        branch,
        internalPort: Number(internalPort),
        buildPack,
        dockerfilePath,
        cpuLimit: Number(cpuLimit),
        memoryLimitMb: Number(memoryLimitMb),
        domains: domain
          ? {
              create: {
                host: domain,
                isPrimary: true,
              },
            }
          : undefined,
      },
      include: {
        domains: true,
      },
    });

    return NextResponse.json({ success: true, app }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
