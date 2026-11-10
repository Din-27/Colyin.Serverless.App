import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/engine/crypto";
import { Client } from "pg";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: addonId } = await params;
    const body = await req.json();
    const { sql } = body;

    if (!sql || typeof sql !== "string") {
      return NextResponse.json(
        { success: false, error: "SQL query is required" },
        { status: 400 }
      );
    }

    const addon = await db.addon.findUnique({
      where: { id: addonId },
    });

    if (!addon) {
      return NextResponse.json(
        { success: false, error: "Addon not found" },
        { status: 404 }
      );
    }

    if (addon.type !== "POSTGRESQL") {
      return NextResponse.json(
        { success: false, error: "Web query is currently only supported for PostgreSQL" },
        { status: 400 }
      );
    }

    const decryptedPassword = decryptSecret(
      addon.encryptedPass,
      addon.iv,
      addon.authTag
    );

    const targetPort = addon.publicPort || addon.internalPort;

    const client = new Client({
      host: "127.0.0.1",
      port: targetPort,
      user: "postgres",
      password: decryptedPassword,
      database: "main",
      connectionTimeoutMillis: 3000,
    });

    const start = performance.now();
    await client.connect();

    try {
      const result = await client.query(sql);
      const executionTimeMs = Math.round((performance.now() - start) * 10) / 10;

      const isArray = Array.isArray(result);
      const finalResult = isArray ? result[result.length - 1] : result;

      return NextResponse.json({
        success: true,
        command: finalResult.command,
        rowCount: finalResult.rowCount ?? finalResult.rows?.length ?? 0,
        fields: finalResult.fields ? finalResult.fields.map((f: any) => f.name) : [],
        rows: finalResult.rows || [],
        executionTimeMs,
      });
    } finally {
      await client.end().catch(() => {});
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
