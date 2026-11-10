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

  const labels: Record<string, string> = {
    "traefik.enable": "true",
    [`traefik.http.routers.${routerName}.rule`]: `Host(\`${hostDomain}\`)`,
    [`traefik.http.services.${routerName}.loadbalancer.server.port`]: internalPort.toString(),
  };

  if (enableHttps) {
    // 1. Primary Secure Router (HTTPS / 443)
    labels[`traefik.http.routers.${routerName}.entrypoints`] = "websecure";
    labels[`traefik.http.routers.${routerName}.tls`] = "true";
    labels[`traefik.http.routers.${routerName}.tls.certresolver`] = tlsCertResolver;
    
    // Security headers middleware
    labels[`traefik.http.middlewares.${routerName}-headers.headers.sslredirect`] = "true";
    labels[`traefik.http.middlewares.${routerName}-headers.headers.browserXssFilter`] = "true";
    labels[`traefik.http.middlewares.${routerName}-headers.headers.contentTypeNosniff`] = "true";
    labels[`traefik.http.routers.${routerName}.middlewares`] = `${routerName}-headers`;

    // 2. HTTP to HTTPS automatic upgrade router (HTTP / 80 -> HTTPS)
    const httpRouter = `${routerName}-http`;
    labels[`traefik.http.routers.${httpRouter}.rule`] = `Host(\`${hostDomain}\`)`;
    labels[`traefik.http.routers.${httpRouter}.entrypoints`] = "web";
    labels[`traefik.http.routers.${httpRouter}.middlewares`] = `${routerName}-redirect-ssl`;
    labels[`traefik.http.middlewares.${routerName}-redirect-ssl.redirectscheme.scheme`] = "https";
    labels[`traefik.http.middlewares.${routerName}-redirect-ssl.redirectscheme.permanent`] = "true";
  } else {
    labels[`traefik.http.routers.${routerName}.entrypoints`] = "web";
  }

  return labels;
}
