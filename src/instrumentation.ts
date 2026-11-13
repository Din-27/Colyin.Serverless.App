export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
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
