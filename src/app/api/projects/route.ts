import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureProjectNetwork, getDockerDaemonStatus } from "@/lib/engine/docker";

export async function GET() {
  try {
    const projects = await db.project.findMany({
      include: {
        applications: {
          select: {
            id: true,
            name: true,
            slug: true,
            activeDeployId: true,
            internalPort: true,
          },
        },
        addons: {
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            publicPort: true,
            internalPort: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const dockerStatus = await getDockerDaemonStatus();

    return NextResponse.json({
      success: true,
      projects,
      dockerStatus,
    });
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
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { success: false, error: "Project name is required" },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const networkName = `net_${slug}_${Date.now().toString(36)}`;

    // Create DB record
    const project = await db.project.create({
      data: {
        name,
        slug,
        description,
        networkName,
      },
    });

    // Attempt to initialize project network in Docker
    try {
      await ensureProjectNetwork(networkName, project.id);
    } catch (dockerErr) {
      console.warn("Could not create Docker network (Docker may be offline):", dockerErr);
    }

    return NextResponse.json({ success: true, project }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
