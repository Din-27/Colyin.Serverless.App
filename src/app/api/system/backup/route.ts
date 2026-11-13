import { NextResponse } from "next/server";
import fs from "fs";
import { getSessionUser } from "@/lib/auth";
import {
  createDatabaseBackup,
  getDatabaseStats,
  listDatabaseBackups,
  getDatabaseFilePath,
} from "@/lib/engine/dbBackup";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot download database backups" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const shouldDownload = searchParams.get("download") === "1" || searchParams.get("action") === "download";

    if (shouldDownload) {
      // Create a fresh atomic backup to guarantee consistency
      const backupInfo = await createDatabaseBackup();
      const fileBuffer = fs.readFileSync(backupInfo.filePath);

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          "Content-Type": "application/x-sqlite3",
          "Content-Disposition": `attachment; filename="${backupInfo.filename}"`,
          "Content-Length": backupInfo.sizeBytes.toString(),
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
    }

    // Return backup status, stats, and stored backups
    const stats = await getDatabaseStats();
    const backups = listDatabaseBackups();

    return NextResponse.json({
      success: true,
      stats,
      backups,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to process database backup request" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getSessionUser();
    if (session && session.role === "VIEWER") {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Viewers cannot create database backups" },
        { status: 403 }
      );
    }

    const backup = await createDatabaseBackup();
    return NextResponse.json({
      success: true,
      message: `Database backup created successfully: ${backup.filename}`,
      backup,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create database backup" },
      { status: 500 }
    );
  }
}

