import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/engine/crypto";
import { ADDON_TEMPLATES } from "@/lib/engine/addons";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: addonId } = await params;

    const addon = await db.addon.findUnique({
      where: { id: addonId },
    });

    if (!addon) {
      return NextResponse.json(
        { success: false, error: "Addon not found" },
        { status: 404 }
      );
    }

    const template = ADDON_TEMPLATES[addon.type];
    let decryptedPassword = "";
    try {
      decryptedPassword = decryptSecret(
        addon.encryptedPass,
        addon.iv,
        addon.authTag
      );
    } catch (e: any) {
      console.warn(`[Credentials] Failed to decrypt password for addon ${addon.id}:`, e.message);
      if (addon.type === "REDIS") decryptedPassword = "redispass123";
      else if (addon.type === "RABBITMQ") decryptedPassword = "guest";
      else if (addon.type === "POSTGRESQL") decryptedPassword = "postgres";
      else decryptedPassword = "password";
    }

    // Resolve public host:
    // 1. Explicit env PUBLIC_IP or SERVER_IP
    // 2. Incoming request Host / Domain / IP (if not localhost)
    // 3. Extract IP from Wildcard Domain (e.g. 103.x.x.x.sslip.io)
    // 4. Default to incoming detected host or localhost
    const reqHostHeader = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const detectedHost = reqHostHeader.split(":")[0]?.trim();

    let serverIpFromWildcard: string | null = null;
    try {
      const { getWildcardBaseDomain } = await import("@/lib/engine/domains");
      const baseDomain = await getWildcardBaseDomain();
      const ipMatch = baseDomain.match(/^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (ipMatch && ipMatch[1] !== "127.0.0.1" && ipMatch[1] !== "0.0.0.0") {
        serverIpFromWildcard = ipMatch[1];
      }
    } catch {}

    const isLocalhost = !detectedHost || detectedHost === "localhost" || detectedHost === "127.0.0.1" || detectedHost === "0.0.0.0";
    const publicHost =
      process.env.PUBLIC_IP?.trim() ||
      process.env.SERVER_IP?.trim() ||
      (!isLocalhost ? detectedHost : null) ||
      serverIpFromWildcard ||
      (detectedHost && detectedHost !== "0.0.0.0" ? detectedHost : "localhost");
    const username =
      addon.type === "POSTGRESQL"
        ? "postgres"
        : addon.type === "MYSQL"
        ? "root"
        : addon.type === "RABBITMQ"
        ? "guest"
        : addon.type === "REDIS"
        ? "default"
        : addon.type === "MINIO"
        ? "minioadmin"
        : "root";
    const dbName = "main";

    const internalConnection = {
      host: addon.internalHost,
      port: addon.internalPort,
      user: username,
      password: decryptedPassword,
      database: dbName,
      connectionUri: template
        ? template.internalUriBuilder({
            host: addon.internalHost,
            port: addon.internalPort,
            user: username,
            password: decryptedPassword,
            dbName,
          })
        : "",
    };

    const externalConnection = addon.publicPort
      ? {
          host: publicHost,
          port: addon.publicPort,
          user: username,
          password: decryptedPassword,
          database: dbName,
          connectionUri: template
            ? template.externalUriBuilder({
                host: publicHost,
                port: addon.publicPort,
                user: username,
                password: decryptedPassword,
                dbName,
              })
            : "",
        }
      : null;

    let webManagementUiUrl = null;
    if (addon.type === "RABBITMQ") {
      webManagementUiUrl = `http://${publicHost}:15672`;
    } else if (addon.type === "MINIO") {
      webManagementUiUrl = `http://${publicHost}:9001`;
    }

    return NextResponse.json({
      success: true,
      addon: {
        id: addon.id,
        name: addon.name,
        type: addon.type,
        status: addon.status,
        isPublic: !!addon.publicPort,
        internalConnection,
        externalConnection,
        webManagementUiUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
