import { db } from "@/lib/db";
import crypto from "crypto";

export const DEFAULT_WILDCARD_DOMAIN = "127.0.0.1.sslip.io";

/**
 * Retrieves the root wildcard domain configured for the platform.
 * Checks database SystemSetting, then environment variables, then falls back to 127.0.0.1.sslip.io.
 */
export async function getWildcardBaseDomain(): Promise<string> {
  try {
    const setting = await db.systemSetting.findUnique({
      where: { key: "WILDCARD_DOMAIN" },
    });
    if (setting?.value && setting.value.trim().length > 0) {
      return sanitizeDomain(setting.value);
    }
  } catch (err) {
    console.warn("[getWildcardBaseDomain] Database lookup failed, using fallback:", err);
  }

  return (
    process.env.WILDCARD_DOMAIN?.trim() ||
    process.env.NEXT_PUBLIC_WILDCARD_DOMAIN?.trim() ||
    DEFAULT_WILDCARD_DOMAIN
  );
}

/**
 * Sanitizes any domain or URL string to a clean, lowercase hostname.
 * Strips protocols (http://, https://), ports (:3000), path segments (/...), and whitespace.
 */
export function sanitizeDomain(raw: string): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "")
    .trim();
}

/**
 * Generates an automatic Vercel-style domain for an application.
 * Example: "my-web-app-a3f12c.127.0.0.1.sslip.io"
 */
export function generateAutoDomain(slug: string, baseDomain = DEFAULT_WILDCARD_DOMAIN): string {
  const cleanSlug = (slug || "app")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  const randSuffix = crypto.randomBytes(3).toString("hex");
  const cleanBase = sanitizeDomain(baseDomain) || DEFAULT_WILDCARD_DOMAIN;

  return `${cleanSlug}-${randSuffix}.${cleanBase}`;
}

/**
 * Ensures an application has at least one primary domain with SSL enabled.
 * If the application currently has no domain, an automatic HTTPS domain is generated
 * and committed to the database.
 */
export async function ensureAppHasDomain(appId: string, slug: string) {
  const existingDomain = await db.domain.findFirst({
    where: { applicationId: appId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  if (existingDomain) {
    return existingDomain;
  }

  // Auto-generate domain
  const baseDomain = await getWildcardBaseDomain();
  const autoHost = generateAutoDomain(slug, baseDomain);

  const newDomain = await db.domain.create({
    data: {
      applicationId: appId,
      host: autoHost,
      isPrimary: true,
      sslEnabled: true,
      certificateStatus: "ISSUED",
    },
  });

  return newDomain;
}

/**
 * Formats a clean public URL for an application or domain, respecting HTTP_PORT and ENABLE_HTTPS.
 */
export function formatAccessUrl(host?: string | null, fallbackPort = 3000): string {
  if (!host) {
    return `http://localhost:${fallbackPort}`;
  }
  if (host.startsWith("http://") || host.startsWith("https://")) {
    return host;
  }
  const clean = sanitizeDomain(host);
  const isHttps = process.env.PUBLIC_HTTPS === "true" || process.env.PUBLIC_HTTP_PORT === "443" || process.env.ENABLE_HTTPS === "true" || (process.env.ENABLE_HTTPS !== "false" && !process.env.HTTP_PORT);
  const publicPort = process.env.PUBLIC_HTTP_PORT || process.env.HTTP_PORT;
  const portSuffix = (!isHttps && publicPort && publicPort !== "80" && publicPort !== "443") || (isHttps && publicPort && publicPort !== "443" && publicPort !== "80" && process.env.PUBLIC_HTTPS !== "true") ? `:${publicPort}` : "";
  return `${isHttps ? "https" : "http"}://${clean}${portSuffix}`;
}
