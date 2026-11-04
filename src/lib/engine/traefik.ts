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
    hostDomain,
    internalPort,
    tlsCertResolver = process.env.TRAEFIK_CERT_RESOLVER || "letsencrypt",
    enableHttps = true,
  } = params;

  const labels: Record<string, string> = {
    "traefik.enable": "true",
    [`traefik.http.routers.${routerName}.rule`]: `Host(\`${hostDomain}\`)`,
    [`traefik.http.services.${routerName}.loadbalancer.server.port`]: internalPort.toString(),
  };

  if (enableHttps) {
    labels[`traefik.http.routers.${routerName}.entrypoints`] = "websecure";
    labels[`traefik.http.routers.${routerName}.tls`] = "true";
    labels[`traefik.http.routers.${routerName}.tls.certresolver`] = tlsCertResolver;
    // Security and redirect middlewares
    labels[`traefik.http.middlewares.${routerName}-headers.headers.sslredirect`] = "true";
    labels[`traefik.http.middlewares.${routerName}-headers.headers.browserXssFilter`] = "true";
    labels[`traefik.http.middlewares.${routerName}-headers.headers.contentTypeNosniff`] = "true";
    labels[`traefik.http.routers.${routerName}.middlewares`] = `${routerName}-headers`;
  } else {
    labels[`traefik.http.routers.${routerName}.entrypoints`] = "web";
  }

  return labels;
}
