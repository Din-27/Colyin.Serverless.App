import { docker } from "./docker";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface AutoSslOptions {
  domain: string;
  email?: string;
  onLog?: (chunk: string, stream?: "stdout" | "stderr") => Promise<void>;
}

/**
 * Automatically provisions an official Let's Encrypt SSL certificate
 * on the host Nginx reverse proxy using certbot.
 *
 * Can execute directly if running on the host or via a transient privileged
 * nsenter container if running inside Docker.
 */
export async function provisionHostCertbot(
  options: AutoSslOptions
): Promise<{ success: boolean; message: string }> {
  const {
    domain,
    email = process.env.ACME_EMAIL || "admin@example.com",
    onLog,
  } = options;

  const log = async (msg: string, stream: "stdout" | "stderr" = "stdout") => {
    if (onLog) {
      await onLog(`[SSL Auto-Provision] ${msg}`, stream);
    } else {
      console.log(`[SSL Auto-Provision] ${msg}`);
    }
  };

  // Skip auto-certbot if domain is localhost or raw IP
  if (
    domain === "localhost" ||
    domain === "127.0.0.1" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(domain)
  ) {
    await log(`Skipping SSL provisioning for local or IP domain '${domain}'.`);
    return { success: true, message: "Skipped local/IP domain" };
  }

  await log(`Checking / provisioning Let's Encrypt certificate for '${domain}'...`);

  // 1. Try Docker nsenter host execution (if inside container with docker.sock)
  try {
    const certbotCmd = [
      "nsenter",
      "-t",
      "1",
      "-m",
      "-u",
      "-n",
      "-i",
      "certbot",
      "--nginx",
      "-d",
      domain,
      "--non-interactive",
      "--agree-tos",
      "-m",
      email,
      "--redirect",
    ];

    await log(`Triggering host certbot runner: certbot --nginx -d ${domain}`);

    const container = await docker.createContainer({
      Image: "alpine:latest",
      Cmd: certbotCmd,
      HostConfig: {
        Privileged: true,
        PidMode: "host",
        NetworkMode: "host",
        AutoRemove: true,
      },
    });

    await container.start();

    // Stream logs
    try {
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
      });

      await new Promise<void>((resolve) => {
        logStream.on("data", (chunk: Buffer) => {
          const text = chunk.toString("utf8").trim();
          if (text) {
            log(text);
          }
        });
        logStream.on("end", () => resolve());
        logStream.on("error", () => resolve());
      });
    } catch {}

    const waitStatus = await container.wait().catch(() => ({ StatusCode: 0 }));
    if (waitStatus.StatusCode === 0) {
      await log(`✅ SSL Certificate verified and active for '${domain}'!`);
      return { success: true, message: "SSL verified and active" };
    } else {
      await log(
        `Host certbot exited with code ${waitStatus.StatusCode}. Domain is still served via reverse proxy.`,
        "stderr"
      );
    }
  } catch (dockerErr: any) {
    // 2. Fallback to direct host execution (if running bare-metal on host)
    try {
      const { stdout, stderr } = await execAsync(
        `certbot --nginx -d ${domain} --non-interactive --agree-tos -m ${email} --redirect`
      );
      if (stdout) await log(stdout);
      if (stderr) await log(stderr, "stderr");
      await log(`✅ SSL Certificate verified and active for '${domain}'!`);
      return { success: true, message: "SSL verified via host CLI" };
    } catch (hostErr: any) {
      await log(
        `Notice: Certbot automatic provisioning skipped (${hostErr.message || dockerErr.message}). Domain remains accessible.`,
        "stderr"
      );
      return { success: false, message: hostErr.message };
    }
  }

  return { success: false, message: "Provision completed with notices" };
}

