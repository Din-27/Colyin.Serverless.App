import nodemailer from "nodemailer";

export interface AlertPayload {
  appId: string;
  appName: string;
  errorType: "BUILD_FAILED" | "CONTAINER_CRASH" | "HEALTHCHECK_FAILED" | "OOM_KILLED";
  errorSnippet: string;
  targetEmail?: string;
}

// In-memory cooldown cache: appId:errorType -> timestamp
const alertCooldownCache = new Map<string, number>();

/**
 * Dispatches an automated incident email alert via SMTP with rate-limiting / cooldown.
 */
export async function dispatchSystemAlert(payload: AlertPayload): Promise<boolean> {
  const targetEmail = payload.targetEmail || process.env.ADMIN_ALERT_EMAIL;
  if (!targetEmail || !process.env.SMTP_HOST || !process.env.SMTP_USER) {
    console.warn("[Alerting] SMTP credentials or target email not configured. Alert skipped.");
    return false;
  }

  const cacheKey = `${payload.appId}:${payload.errorType}`;
  const now = Date.now();
  const lastSent = alertCooldownCache.get(cacheKey) || 0;
  const cooldownPeriodMs = 15 * 60 * 1000; // 15 Minutes cooldown

  if (now - lastSent < cooldownPeriodMs) {
    console.log(`[Alerting] Cooldown active for ${cacheKey}. Alert suppressed.`);
    return false;
  }

  alertCooldownCache.set(cacheKey, now);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #27272a; border-radius: 8px; overflow: hidden; background-color: #09090b; color: #f4f4f5;">
      <div style="background-color: #e11d48; color: #ffffff; padding: 14px 20px; font-weight: 600; font-size: 15px;">
        Incident Alert: ${payload.errorType}
      </div>
      <div style="padding: 20px;">
        <p style="margin: 0 0 14px 0; color: #a1a1aa;">The following service experienced an unrecoverable failure:</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 14px;">
          <tr><td style="padding: 6px 0; color: #71717a;">Service:</td><td style="font-weight: 600; color: #f4f4f5;">${payload.appName}</td></tr>
          <tr><td style="padding: 6px 0; color: #71717a;">Incident:</td><td style="font-weight: 600; color: #fb7185;">${payload.errorType}</td></tr>
          <tr><td style="padding: 6px 0; color: #71717a;">Timestamp:</td><td style="color: #d4d4d8;">${new Date().toISOString()}</td></tr>
        </table>
        <div style="background-color: #18181b; border: 1px solid #27272a; color: #f43f5e; padding: 12px; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; white-space: pre-wrap; overflow-x: auto; max-height: 250px;">
${payload.errorSnippet.slice(-1000)}
        </div>
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"MiniPaaS Engine" <${process.env.SMTP_FROM || "alert@minipaas.local"}>`,
      to: targetEmail,
      subject: `[ALERT] ${payload.appName} - ${payload.errorType}`,
      html: htmlBody,
    });
    console.log(`[Alerting] Incident email dispatched to ${targetEmail}`);
    return true;
  } catch (err) {
    console.error("[Alerting] Failed to send email via SMTP:", err);
    return false;
  }
}
