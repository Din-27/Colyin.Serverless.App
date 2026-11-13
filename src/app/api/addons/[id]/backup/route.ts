import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/engine/crypto";
import { exec } from "child_process";
import { promisify } from "util";
import { Client } from "pg";

const execAsync = promisify(exec);

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot download database backups" },
        { status: 403 }
      );
    }

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

    const cleanName = addon.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
    let dumpSql = "";

    // 1. Try Docker Exec native pg_dump if containerId exists
    if (addon.containerId && addon.type === "POSTGRESQL") {
      try {
        const { stdout } = await execAsync(
          `docker exec ${addon.containerId} pg_dump -U postgres postgres`
        );
        if (stdout && stdout.trim().length > 0) {
          dumpSql = stdout;
        }
      } catch (err: any) {
        console.warn(`[AddonBackup] docker exec pg_dump failed for ${addon.id}:`, err.message);
      }
    }

    // 2. Fallback: Query tables via Client if pg_dump was empty or unavailable
    if (!dumpSql && addon.type === "POSTGRESQL") {
      let decryptedPassword = "";
      try {
        decryptedPassword = decryptSecret(addon.encryptedPass, addon.iv, addon.authTag);
      } catch {
        decryptedPassword = "postgres";
      }

      const client = new Client({
        host: "127.0.0.1",
        port: addon.publicPort || addon.internalPort,
        user: "postgres",
        password: decryptedPassword,
        database: "postgres",
        connectionTimeoutMillis: 5000,
      });

      try {
        await client.connect();

        // Fetch all user tables
        const tablesRes = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          ORDER BY table_name;
        `);

        let sqlExport = `-- Colyin Serverless Database Backup\n-- Addon: ${addon.name} (${addon.type})\n-- Generated at: ${new Date().toISOString()}\n\n`;

        for (const row of tablesRes.rows) {
          const tableName = row.table_name;
          sqlExport += `-- Table: ${tableName}\n`;

          // Get table rows
          const rowsRes = await client.query(`SELECT * FROM "${tableName}" LIMIT 5000;`);
          if (rowsRes.rows.length > 0) {
            for (const r of rowsRes.rows) {
              const cols = Object.keys(r);
              const vals = Object.values(r).map((v) => {
                if (v === null) return "NULL";
                if (typeof v === "number" || typeof v === "boolean") return String(v);
                return `'${String(v).replace(/'/g, "''")}'`;
              });
              sqlExport += `INSERT INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(", ")}) VALUES (${vals.join(", ")});\n`;
            }
            sqlExport += "\n";
          }
        }

        dumpSql = sqlExport;
        await client.end();
      } catch (err: any) {
        console.warn("[AddonBackup] Table fallback query failed:", err.message);
      }
    }

    if (!dumpSql) {
      dumpSql = `-- Colyin Database Backup for ${addon.name} (${addon.type})\n-- Timestamp: ${new Date().toISOString()}\n-- Note: Database is empty or server was unreachable at backup time.\n`;
    }

    const filename = `${cleanName}-backup-${dateStr}.sql`;
    const buffer = Buffer.from(dumpSql, "utf-8");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to generate database backup" },
      { status: 500 }
    );
  }
}

