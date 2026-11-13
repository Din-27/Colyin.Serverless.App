import crypto from "crypto";
import fs from "fs";
import path from "path";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET || process.env.ENCRYPTION_KEY || "minipaas-super-secure-auth-jwt-secret-key-32";
}

export type UserRole = "ADMIN" | "DEVELOPER" | "VIEWER";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  exp: number;
}

export function isRequestSecure(req?: Request): boolean {
  // Explicit override if configured in .env / docker-compose
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;

  if (!req) {
    return false;
  }

  // Check standard reverse proxy headers (Traefik, Nginx, Cloudflare, etc.)
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedProto) {
    const proto = forwardedProto.split(",")[0].trim().toLowerCase();
    return proto === "https";
  }

  const forwardedSsl = req.headers.get("x-forwarded-ssl");
  if (forwardedSsl && forwardedSsl.toLowerCase() === "on") {
    return true;
  }

  try {
    const url = new URL(req.url);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

export function getSessionCookieOptions(req?: Request) {
  return {
    httpOnly: true,
    secure: isRequestSecure(req),
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  };
}

export function getPublicRedirectUrl(target: string, req: Request): URL {
  // If target is already a full absolute URL (e.g. http://103.xxx:3050/projects/...), use it directly
  try {
    if (target.startsWith("http://") || target.startsWith("https://")) {
      return new URL(target);
    }
  } catch {}

  // Determine public host from headers
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = (forwardedHost || req.headers.get("host") || "localhost").split(",")[0].trim();

  // Determine protocol
  const isSecure = isRequestSecure(req);
  const proto = isSecure ? "https" : "http";

  const baseUrl = `${proto}://${host}`;
  return new URL(target, baseUrl);
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(testHash, "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function createSessionToken(user: { id: string; email: string; name: string; role: string }): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: (user.role as UserRole) || "DEVELOPER",
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getAuthSecret()).update(encodedPayload).digest("base64url");
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const [encodedPayload, signature] = token.split(".");
    if (!encodedPayload || !signature) return null;

    const expectedSig = crypto.createHmac("sha256", getAuthSecret()).update(encodedPayload).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8"));
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("paas_session")?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

export function generateUniqueMasterPassword(): string {
  // Generates unique, memorable high-entropy password like Colyin-8e4a9b2c3d1f-6a7b
  const part1 = crypto.randomBytes(6).toString("hex");
  const part2 = crypto.randomBytes(4).toString("hex");
  return `Colyin-${part1}-${part2}`;
}

export function saveMasterCredentialsFile(email: string, password: string): void {
  try {
    const credPath = path.join(process.cwd(), "colyin-credentials.txt");
    const dataDir = path.join(process.cwd(), "data");
    const dataCredPath = path.join(dataDir, "colyin-credentials.txt");

    const content = `================================================================================
COLYIN - INITIAL MASTER ADMIN CREDENTIALS
Generated at: ${new Date().toISOString()}
================================================================================

Email    : ${email}
Password : ${password}
Role     : ADMIN (Full Cluster Authority)

IMPORTANT SECURITY NOTICE:
1. Access your web console at: http://localhost:3050/login
2. This unique password was generated specifically for this server/VPS installation.
3. Once logged in as Admin, you can invite and create other team members (Collaborators)
   with granular roles (ADMIN, DEVELOPER, VIEWER) under "Settings & Team" (RBAC).
4. You can change your password anytime inside the "Settings & Team" dashboard.
5. If you ever forget your password, refer to this file on your VPS or run:
   docker compose exec controller node scripts/reset-admin-password.js <newPassword>
================================================================================
`;
    // Write to root process dir
    fs.writeFileSync(credPath, content, { encoding: "utf-8", mode: 0o600 });

    // Also write to persistent ./data volume (which is directly mounted to host ./data)
    try {
      if (fs.existsSync(dataDir)) {
        fs.writeFileSync(dataCredPath, content, { encoding: "utf-8", mode: 0o600 });
      }
    } catch {}
  } catch (err) {
    console.warn("Could not write colyin-credentials.txt:", err);
  }
}

export async function ensureDefaultAdmin(): Promise<void> {
  const count = await db.user.count();

  // If more than 1 user exists, ensure initial credentials notice is purged permanently
  if (count > 1) {
    try {
      await db.systemSetting.deleteMany({
        where: { key: "INITIAL_MASTER_CREDENTIALS" },
      });
    } catch {}
    return;
  }

  // If 0 users exist, generate unique master credentials for this VPS installation
  if (count === 0) {
    // Purge legacy dummy credentials if any
    try {
      await db.user.deleteMany({
        where: { email: "admin@minipaas.local" },
      });
    } catch {}

    const adminEmail = (process.env.ADMIN_EMAIL || "admin@colyin.local").toLowerCase().trim();
    const uniquePassword = process.env.ADMIN_PASSWORD || generateUniqueMasterPassword();
    const { hash, salt } = hashPassword(uniquePassword);

    await db.user.create({
      data: {
        email: adminEmail,
        name: process.env.ADMIN_NAME || "Master Administrator",
        password: hash,
        salt,
        role: "ADMIN",
      },
    });

    // Save to persistent file on VPS host
    saveMasterCredentialsFile(adminEmail, uniquePassword);

    // Save initial master credentials to SystemSetting for one-time display on first web access
    await db.systemSetting.upsert({
      where: { key: "INITIAL_MASTER_CREDENTIALS" },
      update: {
        value: JSON.stringify({
          email: adminEmail,
          password: uniquePassword,
          viewed: false,
          createdAt: new Date().toISOString(),
        }),
      },
      create: {
        key: "INITIAL_MASTER_CREDENTIALS",
        value: JSON.stringify({
          email: adminEmail,
          password: uniquePassword,
          viewed: false,
          createdAt: new Date().toISOString(),
        }),
      },
    });
  }
}

export async function getInitialMasterCredentials(): Promise<{ email: string; password: string } | null> {
  const count = await db.user.count();

  // If there are other users (more than 1), it MUST NOT be shown!
  if (count > 1) {
    try {
      await db.systemSetting.deleteMany({
        where: { key: "INITIAL_MASTER_CREDENTIALS" },
      });
    } catch {}
    return null;
  }

  if (count === 0) {
    await ensureDefaultAdmin();
  }

  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: "INITIAL_MASTER_CREDENTIALS" },
    });
    if (!setting) return null;
    const parsed = JSON.parse(setting.value);
    if (parsed.viewed) return null;
    return {
      email: parsed.email,
      password: parsed.password,
    };
  } catch {
    return null;
  }
}

export async function dismissInitialMasterCredentials(): Promise<void> {
  try {
    await db.systemSetting.deleteMany({
      where: { key: "INITIAL_MASTER_CREDENTIALS" },
    });
  } catch {}
}
