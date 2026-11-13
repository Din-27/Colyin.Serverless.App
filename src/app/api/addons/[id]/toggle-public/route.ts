import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { allocateUniqueAddonPublicPort } from "@/lib/engine/ports";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: addonId } = await params;
    const body = await req.json();
    const { enable } = body;

    const addon = await db.addon.findUnique({
      where: { id: addonId },
      include: { project: true },
    });

    if (!addon) {
      return NextResponse.json(
        { success: false, error: "Addon not found" },
        { status: 404 }
      );
    }

    let publicPort: number | null = null;
    if (enable) {
      publicPort = await allocateUniqueAddonPublicPort(addon.id);
    }

    const updated = await db.addon.update({
      where: { id: addonId },
      data: { publicPort },
    });

    // 1. Docker container reconfiguration (if containerId exists or Docker engine is active)
    if (addon.containerId) {
      try {
        const { docker } = await import("@/lib/engine/docker");
        const { provisionDedicatedAddon } = await import("@/lib/engine/addons");
        const { decryptSecret } = await import("@/lib/engine/crypto");

        // Stop & remove old container while keeping volume intact
        try {
          const oldContainer = docker.getContainer(addon.containerId);
          await oldContainer.stop({ t: 2 }).catch(() => {});
          await oldContainer.remove().catch(() => {});
        } catch (e) {}

        const decryptedPass = decryptSecret(updated.encryptedPass, updated.iv, updated.authTag);
        const res = await provisionDedicatedAddon({
          addonId: updated.id,
          type: updated.type,
          networkName: addon.project?.networkName || "bridge",
          password: decryptedPass,
          publicPort: updated.publicPort || undefined,
        });

        await db.addon.update({
          where: { id: updated.id },
          data: { containerId: res.containerId },
        });
      } catch (dockerErr) {
        console.warn("[TogglePublic] Docker container reconfiguration fallback:", dockerErr);
      }
    }

    // 2. Start or re-bind native instance (runs natively or fallback if Docker not used)
    try {
      const { startNativeAddon } = await import("@/lib/engine/nativeAddonRunner");
      await startNativeAddon(updated);
    } catch (nativeErr) {
      console.warn("[TogglePublic] Native runner re-bind notice:", nativeErr);
    }

    return NextResponse.json({
      success: true,
      addon: updated,
      message: enable
        ? `Public access enabled on port ${publicPort}`
        : "Public access disabled",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
