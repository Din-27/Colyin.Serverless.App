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
    const decryptedPassword = decryptSecret(
      addon.encryptedPass,
      addon.iv,
      addon.authTag
    );

    const publicHost = process.env.PUBLIC_IP || "localhost";
    const username = addon.type === "POSTGRESQL" ? "postgres" : "root";
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
