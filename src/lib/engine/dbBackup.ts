import path from "path";
import fs from "fs";
import { db } from "@/lib/db";

export interface DatabaseBackupInfo {
  filename: string;
  filePath: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
}

export interface DatabaseStats {
  filePath: string;
  exists: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  lastModified?: string;
  counts: {
    applications: number;
    deployments: number;
    addons: number;
    users: number;
    domains: number;
  };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Resolves the absolute path to the main SQLite database file.
 */
export function getDatabaseFilePath(): string {
  const dbUrl = process.env.DATABASE_URL || "file:./data/prod.db";
  const cleanPath = dbUrl.replace(/^file:/, "").split("?")[0];

  // 1. Direct path if exists
  if (fs.existsSync(cleanPath)) {
    return path.resolve(cleanPath);
  }

  // 2. Relative to process.cwd()
  const cwdPath = path.resolve(process.cwd(), cleanPath);
  if (fs.existsSync(cwdPath)) {
    return cwdPath;
  }

  // 3. Known production and dev candidates
  const candidates = [
    path.resolve(process.cwd(), "data", "prod.db"),
    path.resolve("/app/data/prod.db"),
    path.resolve(process.cwd(), "prisma", "dev.db"),
    path.resolve(process.cwd(), "build.db"),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  // Fallback to expected target path
  return path.resolve(process.cwd(), "data", "prod.db");
}

/**
 * Ensures the backups directory exists.
 */
export function getBackupsDirectory(): string {
  const backupsDir = path.resolve(process.cwd(), "data", "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }
  return backupsDir;
}

/**
 * Creates an atomic, consistent SQLite backup.
 * Tries SQLite's VACUUM INTO first, falls back to direct file copy.
 */
export async function createDatabaseBackup(customFilename?: string): Promise<DatabaseBackupInfo> {
  const srcPath = getDatabaseFilePath();
  const backupsDir = getBackupsDirectory();
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = customFilename || `colyin-backup-${dateStr}.db`;
  const destPath = path.join(backupsDir, filename);

  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source database file does not exist at ${srcPath}`);
  }

  let vacuumSuccess = false;
  try {
    // VACUUM INTO is SQLite's official atomic backup command (safe from concurrent writes)
    await db.$executeRawUnsafe(`VACUUM INTO '${destPath.replace(/\\/g, "/")}'`);
    vacuumSuccess = true;
  } catch (err: any) {
    console.warn("[createDatabaseBackup] VACUUM INTO failed, using atomic copy fallback:", err.message);
  }

  if (!vacuumSuccess || !fs.existsSync(destPath)) {
    // Fallback: Copy file
    fs.copyFileSync(srcPath, destPath);
  }

  const stat = fs.statSync(destPath);
  return {
    filename,
    filePath: destPath,
    sizeBytes: stat.size,
    sizeFormatted: formatBytes(stat.size),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Retrieves database statistics and row counts.
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  const filePath = getDatabaseFilePath();
  const exists = fs.existsSync(filePath);
  let sizeBytes = 0;
  let lastModified: string | undefined;

  if (exists) {
    const stat = fs.statSync(filePath);
    sizeBytes = stat.size;
    lastModified = stat.mtime.toISOString();
  }

  let counts = {
    applications: 0,
    deployments: 0,
    addons: 0,
    users: 0,
    domains: 0,
  };

  try {
    const [apps, deps, addons, users, domains] = await Promise.all([
      db.application.count().catch(() => 0),
      db.deployment.count().catch(() => 0),
      db.addon.count().catch(() => 0),
      db.user.count().catch(() => 0),
      db.domain.count().catch(() => 0),
    ]);
    counts = { applications: apps, deployments: deps, addons, users, domains };
  } catch (err) {
    console.warn("[getDatabaseStats] Error counting records:", err);
  }

  return {
    filePath,
    exists,
    sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    lastModified,
    counts,
  };
}

/**
 * Lists available stored database backups.
 */
export function listDatabaseBackups(): DatabaseBackupInfo[] {
  const backupsDir = getBackupsDirectory();
  if (!fs.existsSync(backupsDir)) return [];

  const files = fs.readdirSync(backupsDir).filter((f) => f.endsWith(".db") || f.endsWith(".sqlite"));
  const backups: DatabaseBackupInfo[] = [];

  for (const f of files) {
    const fullPath = path.join(backupsDir, f);
    try {
      const stat = fs.statSync(fullPath);
      backups.push({
        filename: f,
        filePath: fullPath,
        sizeBytes: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime.toISOString(),
      });
    } catch {}
  }

  return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

