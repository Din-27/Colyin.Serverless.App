export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureNativeProxyRunning } = await import("@/lib/engine/nativeProxy");
    ensureNativeProxyRunning();

    const { syncAllNativeAddons } = await import("@/lib/engine/nativeAddonRunner");
    syncAllNativeAddons().catch((e) =>
      console.warn("Could not sync native addons on startup:", e)
    );
  }
}
