import { sanitizeDomain } from "./domains";

export interface TraefikLabelParams {
  routerName: string;
  hostDomain: string;
  internalPort: number;
  tlsCertResolver?: string;
  enableHttps?: boolean;
}

/**
 * Builds Traefik v3 dynamic Docker labels for zero-downtime routing and automatic Let's Encrypt SSL.
 */
export function buildTraefikLabels(params: TraefikLabelParams): Record<string, string> {
  const {
    routerName,
    hostDomain: rawHost,
    internalPort,
    tlsCertResolver = process.env.TRAEFIK_CERT_RESOLVER || "letsencrypt",
    enableHttps = true,
  } = params;

  const hostDomain = sanitizeDomain(rawHost);
  const safeName = routerName.replace(/[^a-zA-Z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  const hostRule = `Host(\`${hostDomain}\`)`;

  const labels: Record<string, string> = {
    "traefik.enable": "true",
    "traefik.docker.network": "minipaas-global",
    [`traefik.http.routers.${safeName}.rule`]: hostRule,
    [`traefik.http.routers.${safeName}.service`]: safeName,
    [`traefik.http.services.${safeName}.loadbalancer.server.port`]: internalPort.toString(),
  };

  if (enableHttps) {
    // 1. Primary Secure Router (HTTPS / 443)
    labels[`traefik.http.routers.${safeName}.entrypoints`] = "websecure";
    labels[`traefik.http.routers.${safeName}.tls`] = "true";
    labels[`traefik.http.routers.${safeName}.tls.certresolver`] = tlsCertResolver;
    
    // Security headers middleware
    labels[`traefik.http.middlewares.${safeName}-headers.headers.sslredirect`] = "true";
    labels[`traefik.http.middlewares.${safeName}-headers.headers.browserXssFilter`] = "true";
    labels[`traefik.http.middlewares.${safeName}-headers.headers.contentTypeNosniff`] = "true";
    labels[`traefik.http.routers.${safeName}.middlewares`] = `${safeName}-headers`;

    // 2. HTTP to HTTPS automatic upgrade router (HTTP / 80 -> HTTPS)
    const httpRouter = `${safeName}-http`;
    labels[`traefik.http.routers.${httpRouter}.rule`] = hostRule;
    labels[`traefik.http.routers.${httpRouter}.entrypoints`] = "web";
    labels[`traefik.http.routers.${httpRouter}.service`] = safeName;
    labels[`traefik.http.routers.${httpRouter}.middlewares`] = `${safeName}-redirect-ssl`;
    labels[`traefik.http.middlewares.${safeName}-redirect-ssl.redirectscheme.scheme`] = "https";
    labels[`traefik.http.middlewares.${safeName}-redirect-ssl.redirectscheme.permanent`] = "true";
  } else {
    // Plain HTTP routing (Direct / Reverse Proxy Mode)
    labels[`traefik.http.routers.${safeName}.entrypoints`] = "web";
  }

  return labels;
}
