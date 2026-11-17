import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { decryptSecret, encryptSecret } from "@/lib/engine/crypto";
import { isPortUsedInDatabase } from "@/lib/engine/ports";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: addonId } = await params;
    const addon = await db.addon.findUnique({
      where: { id: addonId },
      include: { project: true },
    });

    if (!addon) {
      return NextResponse.json({ success: false, error: "Addon not found" }, { status: 404 });
    }

    const decryptedPassword = decryptSecret(addon.encryptedPass, addon.iv, addon.authTag);

    return NextResponse.json({
      success: true,
      addon: {
        id: addon.id,
        projectId: addon.projectId,
        name: addon.name,
        type: addon.type,
        status: addon.status,
        internalHost: addon.internalHost,
        internalPort: addon.internalPort,
        publicPort: addon.publicPort,
        volumeName: addon.volumeName,
        containerId: addon.containerId,
        password: decryptedPassword,
        createdAt: addon.createdAt,
        updatedAt: addon.updatedAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.role === "VIEWER") {
      return NextResponse.json({ success: false, error: "Forbidden: Viewers cannot modify addons" }, { status: 403 });
    }

    const { id: addonId } = await params;
    const body = await req.json();
    const { name, publicPort, password, action } = body;

    const addon = await db.addon.findUnique({
      where: { id: addonId },
      include: { project: true },
    });

    if (!addon) {
      return NextResponse.json({ success: false, error: "Addon not found" }, { status: 404 });
    }

    let updatedPassword = decryptSecret(addon.encryptedPass, addon.iv, addon.authTag);
    let encryptedPass = addon.encryptedPass;
    let iv = addon.iv;
    let authTag = addon.authTag;

    // 1. Password change
    if (password && typeof password === "string" && password.trim().length >= 6) {
      updatedPassword = password.trim();
      const enc = encryptSecret(updatedPassword);
      encryptedPass = enc.ciphertext;
      iv = enc.iv;
      authTag = enc.authTag;
    }

    // 2. Public port change validation
    let updatedPublicPort = addon.publicPort;
    if (publicPort !== undefined) {
      if (publicPort === null || publicPort === "" || publicPort === 0) {
        updatedPublicPort = null;
      } else {
        const portNum = parseInt(publicPort, 10);
        if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
          return NextResponse.json(
            { success: false, error: "Public port must be between 1024 and 65535" },
            { status: 400 }
          );
        }
        if (portNum !== addon.publicPort) {
          const inUse = await isPortUsedInDatabase(portNum, { excludeAddonId: addon.id });
          if (inUse.used) {
            return NextResponse.json(
              { success: false, error: `Port ${portNum} is already assigned to ${inUse.ownerType} '${inUse.ownerName}'` },
              { status: 400 }
            );
          }
          updatedPublicPort = portNum;
        }
      }
    }

    const updatedName = name && typeof name === "string" && name.trim() ? name.trim() : addon.name;

    // Handle container action (restart / stop / start)
    if (action) {
      const { docker } = await import("@/lib/engine/docker");
      if (action === "restart") {
        if (addon.containerId) {
          try {
            const container = docker.getContainer(addon.containerId);
            await container.restart({ t: 2 });
          } catch (e: any) {
            console.warn("Docker restart notice:", e.message);
          }
        }
      } else if (action === "stop") {
        if (addon.containerId) {
          try {
            const container = docker.getContainer(addon.containerId);
            await container.stop({ t: 2 });
          } catch (e: any) {
            console.warn("Docker stop notice:", e.message);
          }
        }
        await db.addon.update({ where: { id: addonId }, data: { status: "STOPPED" } });
        return NextResponse.json({ success: true, message: `Addon '${addon.name}' stopped` });
      } else if (action === "start") {
        if (addon.containerId) {
          try {
            const container = docker.getContainer(addon.containerId);
            await container.start();
          } catch (e: any) {
            console.warn("Docker start notice:", e.message);
          }
        }
        await db.addon.update({ where: { id: addonId }, data: { status: "RUNNING" } });
        return NextResponse.json({ success: true, message: `Addon '${addon.name}' started` });
      }
    }

    // If port or password changed, re-provision container
    let newContainerId = addon.containerId;
    const portChanged = updatedPublicPort !== addon.publicPort;
    const passChanged = password && password.trim() !== decryptSecret(addon.encryptedPass, addon.iv, addon.authTag);

    if (portChanged || passChanged) {
      try {
        const { provisionDedicatedAddon } = await import("@/lib/engine/addons");
        const res = await provisionDedicatedAddon({
          addonId: addon.id,
          type: addon.type,
          networkName: addon.project?.networkName || "minipaas-global",
          internalHost: addon.internalHost,
          password: updatedPassword,
          publicPort: updatedPublicPort || undefined,
        });
        newContainerId = res.containerId;
      } catch (dockerErr) {
        console.warn("[PATCH Addon] Re-provision notice:", dockerErr);
      }
    }

    const updated = await db.addon.update({
      where: { id: addonId },
      data: {
        name: updatedName,
        publicPort: updatedPublicPort,
        encryptedPass,
        iv,
        authTag,
        containerId: newContainerId,
        status: "RUNNING",
      },
    });

    return NextResponse.json({
      success: true,
      addon: updated,
      message: "Addon configuration updated successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.role === "VIEWER") {
      return NextResponse.json({ success: false, error: "Forbidden: Viewers cannot delete addons" }, { status: 403 });
    }

    const { id: addonId } = await params;
    const addon = await db.addon.findUnique({
      where: { id: addonId },
      include: { project: true },
    });

    if (!addon) {
      return NextResponse.json({ success: false, error: "Addon not found" }, { status: 404 });
    }

    // 1. Docker container and volume cleanup
    try {
      const { docker } = await import("@/lib/engine/docker");
      if (addon.containerId) {
        try {
          const container = docker.getContainer(addon.containerId);
          await container.stop({ t: 2 }).catch(() => {});
          await container.remove({ force: true }).catch(() => {});
        } catch {}
      }
      try {
        const namedContainer = docker.getContainer(addon.internalHost);
        await namedContainer.stop({ t: 2 }).catch(() => {});
        await namedContainer.remove({ force: true }).catch(() => {});
      } catch {}

      try {
        const vol = docker.getVolume(`vol_${addon.internalHost}_data`);
        await vol.remove().catch(() => {});
      } catch {}
    } catch (dockerErr) {
      console.warn("Docker cleanup notice:", dockerErr);
    }

    // 2. Delete from database
    await db.addon.delete({
      where: { id: addonId },
    });

    return NextResponse.json({
      success: true,
      message: `Database Addon '${addon.name}' deleted successfully`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

