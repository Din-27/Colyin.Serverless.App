import { NextResponse } from "next/server";
import { validatePort, findNextAvailablePort } from "@/lib/engine/ports";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const portParam = searchParams.get("port");
    const appId = searchParams.get("appId") || undefined;
    const addonId = searchParams.get("addonId") || undefined;

    const requestedPort = parseInt(portParam || "3000", 10);

    const validation = await validatePort(requestedPort, {
      excludeAppId: appId,
      excludeAddonId: addonId,
    });

    const suggestedPort = validation.available
      ? requestedPort
      : validation.suggestedPort || (await findNextAvailablePort(requestedPort + 1, {
          excludeAppId: appId,
          excludeAddonId: addonId,
        }));

    return NextResponse.json({
      success: true,
      port: requestedPort,
      available: validation.available,
      reason: validation.reason,
      suggestedPort,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
