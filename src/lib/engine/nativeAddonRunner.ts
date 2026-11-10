import path from "path";
import fs from "fs";
import net from "net";
import { db } from "../db";
import { decryptSecret } from "./crypto";

// Active in-memory running servers mapped by addonId
interface RunningAddon {
  addonId: string;
  type: string;
  port: number;
  server: net.Server;
  pgInstance?: any;
  dataDir: string;
}

const activeAddons = new Map<string, RunningAddon>();

/**
 * Starts a real native PostgreSQL instance on the designated port with persistent disk storage.
 */
export async function startNativePostgres(addon: {
  id: string;
  volumeName: string;
  publicPort?: number | null;
  internalPort: number;
  encryptedPass: string;
  iv: string;
  authTag: string;
}): Promise<RunningAddon> {
  // Stop existing if running
  await stopNativeAddon(addon.id);

  const storageDir = path.join(process.cwd(), "addons-storage", addon.volumeName);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  const targetPort = addon.publicPort || addon.internalPort;

  // Dynamically import PGlite and pglite-server
  const { PGlite } = await import("@electric-sql/pglite");
  const { createServer } = await import("pglite-server");

  const pg = new PGlite(storageDir);
  await pg.waitReady;

  // Ensure default database 'main' exists
  try {
    // Check if main database or schema is accessible
    await pg.exec(`
      CREATE TABLE IF NOT EXISTS _minipaas_meta (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        service_name TEXT
      );
      INSERT INTO _minipaas_meta (service_name) VALUES ('MiniPaaS Dedicated PostgreSQL')
      ON CONFLICT DO NOTHING;
    `);
  } catch (e) {
    console.warn("Could not run initial migration on PGlite:", e);
  }

  const server = createServer(pg);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(targetPort, "0.0.0.0", () => {
      console.log(`[Native Addon] PostgreSQL '${addon.id}' listening on 0.0.0.0:${targetPort} (Dir: ${storageDir})`);
      resolve();
    });
  });

  const record: RunningAddon = {
    addonId: addon.id,
    type: "POSTGRESQL",
    port: targetPort,
    server,
    pgInstance: pg,
    dataDir: storageDir,
  };

  activeAddons.set(addon.id, record);
  return record;
}

/**
 * Stops an active native addon server.
 */
export async function stopNativeAddon(addonId: string): Promise<void> {
  const existing = activeAddons.get(addonId);
  if (existing) {
    try {
      existing.server.close();
      if (existing.pgInstance && typeof existing.pgInstance.close === "function") {
        await existing.pgInstance.close();
      }
    } catch (e) {
      console.warn(`Error closing native addon ${addonId}:`, e);
    }
    activeAddons.delete(addonId);
    console.log(`[Native Addon] Stopped addon '${addonId}' on port ${existing.port}`);
  }
}

/**
 * Syncs and boots all active database addons in the system (e.g. at startup or after settings update).
 */
export async function syncAllNativeAddons(): Promise<void> {
  try {
    const addons = await db.addon.findMany({
      where: {
        status: "RUNNING",
      },
    });

    for (const addon of addons) {
      if (addon.type === "POSTGRESQL") {
        try {
          await startNativePostgres(addon);
        } catch (err: any) {
          console.error(`Failed to boot native addon '${addon.name}' (${addon.id}):`, err.message);
        }
      }
    }
  } catch (err: any) {
    console.error("Error during syncAllNativeAddons:", err.message);
  }
}

export function getRunningAddons() {
  return Array.from(activeAddons.values()).map((a) => ({
    addonId: a.addonId,
    type: a.type,
    port: a.port,
    dataDir: a.dataDir,
  }));
}
