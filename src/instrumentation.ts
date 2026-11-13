export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Safe auto-migration for newly added columns across existing sqlite databases
    try {
      const { db } = await import("@/lib/db");
      await db.$executeRawUnsafe(`ALTER TABLE "Application" ADD COLUMN "version" TEXT DEFAULT 'v1.0.0'`).catch(() => {});
      await db.$executeRawUnsafe(`ALTER TABLE "Deployment" ADD COLUMN "version" TEXT`).catch(() => {});
    } catch {}

    const { ensureDefaultAdmin } = await import("@/lib/auth");
    ensureDefaultAdmin().catch((e) =>
      console.warn("Could not ensure default admin on startup:", e)
    );

    const { ensureNativeProxyRunning } = await import("@/lib/engine/nativeProxy");
    ensureNativeProxyRunning();

    const { syncAllNativeAddons } = await import("@/lib/engine/nativeAddonRunner");
    syncAllNativeAddons().catch((e) =>
      console.warn("Could not sync native addons on startup:", e)
    );
  }
}
