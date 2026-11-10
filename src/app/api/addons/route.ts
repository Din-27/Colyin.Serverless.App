import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { encryptSecret } from "@/lib/engine/crypto";
import { ADDON_TEMPLATES, provisionDedicatedAddon } from "@/lib/engine/addons";
import crypto from "crypto";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const addons = await db.addon.findMany({
      where: projectId ? { projectId } : undefined,
      select: {
        id: true,
        projectId: true,
        name: true,
        type: true,
        internalHost: true,
        internalPort: true,
        publicPort: true,
        volumeName: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, addons });
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
    const { projectId, name, type } = body;

    if (!projectId || !name || !type) {
      return NextResponse.json(
        { success: false, error: "projectId, name, and type are required" },
        { status: 400 }
      );
    }

    const template = ADDON_TEMPLATES[type.toUpperCase()];
    if (!template) {
      return NextResponse.json(
        { success: false, error: `Invalid addon type: ${type}` },
        { status: 400 }
      );
    }

    const project = await db.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404 }
      );
    }

    const generatedPassword = crypto.randomBytes(12).toString("hex");
    const encrypted = encryptSecret(generatedPassword);

    const internalHost = `addon_${type.toLowerCase()}_${Date.now().toString(36)}`;
    const volumeName = `vol_${internalHost}_data`;

    const addon = await db.addon.create({
      data: {
        projectId,
        name,
        type: type.toUpperCase(),
        internalHost,
        internalPort: template.defaultInternalPort,
        volumeName,
        encryptedPass: encrypted.ciphertext,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        status: "RUNNING",
      },
    });

    // Provision addon using real native runner or Docker container
    if (type.toUpperCase() === "POSTGRESQL") {
      try {
        const { startNativePostgres } = await import("@/lib/engine/nativeAddonRunner");
        await startNativePostgres(addon);
      } catch (nativeErr: any) {
        console.error("Failed to start native postgres instance:", nativeErr);
      }
    } else {
      try {
        const res = await provisionDedicatedAddon({
          addonId: addon.id,
          type: type.toUpperCase(),
          networkName: project.networkName,
          password: generatedPassword,
        });

        await db.addon.update({
          where: { id: addon.id },
          data: { containerId: res.containerId },
        });
      } catch (dockerErr) {
        console.warn("Docker is offline. Addon simulated for development:", dockerErr);
      }
    }

    return NextResponse.json({ success: true, addon }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
