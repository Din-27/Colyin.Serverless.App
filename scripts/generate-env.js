#!/usr/bin/env node
/**
 * Colyin Automatic Environment Secrets Generator
 * Generates cryptographically secure, high-entropy secrets for AES-256-GCM,
 * JWT authentication, and Webhook verification if they are missing or still default.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const envPath = path.join(process.cwd(), ".env");
const defaultMasterKey = "e5b8719284fa9801c87361abef238914619a87cd5219e8301726a45e90bd67a1";
const defaultAuthSecret = "minipaas-super-secure-auth-jwt-secret-key-32";

function generateSecureHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function ensureEnvSecrets() {
  let content = "";
  let isNewFile = false;

  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, "utf-8");
  } else {
    isNewFile = true;
    const examplePath = path.join(process.cwd(), ".env.example");
    if (fs.existsSync(examplePath)) {
      content = fs.readFileSync(examplePath, "utf-8");
    } else {
      content = `# Runtime Environment
NODE_ENV=production
PUBLIC_IP=localhost
WILDCARD_DOMAIN=127.0.0.1.sslip.io
PAAS_DOMAIN=localhost
DATABASE_URL=file:./dev.db
`;
    }
  }

  let modified = false;

  // 1. ENCRYPTION_MASTER_KEY (64-char hex / 32 bytes)
  const isDefaultMaster = content.includes(defaultMasterKey);
  if (!content.includes("ENCRYPTION_MASTER_KEY=") || isDefaultMaster || content.includes("ENCRYPTION_MASTER_KEY=\"\"") || content.includes("ENCRYPTION_MASTER_KEY=''")) {
    const newKey = generateSecureHex(32);
    if (content.includes("ENCRYPTION_MASTER_KEY=")) {
      content = content.replace(/ENCRYPTION_MASTER_KEY=.*/g, `ENCRYPTION_MASTER_KEY="${newKey}"`);
    } else {
      content += `\nENCRYPTION_MASTER_KEY="${newKey}"\n`;
    }
    modified = true;
  }

  // 2. AUTH_SECRET (64-char hex / 32 bytes)
  const isDefaultAuth = content.includes(defaultAuthSecret);
  if (!content.includes("AUTH_SECRET=") || isDefaultAuth || content.includes("AUTH_SECRET=\"\"") || content.includes("AUTH_SECRET=''")) {
    const newAuthSecret = generateSecureHex(32);
    if (content.includes("AUTH_SECRET=")) {
      content = content.replace(/AUTH_SECRET=.*/g, `AUTH_SECRET="${newAuthSecret}"`);
    } else {
      content += `AUTH_SECRET="${newAuthSecret}"\n`;
    }
    modified = true;
  }

  // 3. GITHUB_WEBHOOK_SECRET (48-char hex / 24 bytes)
  if (!content.includes("GITHUB_WEBHOOK_SECRET=") || content.includes("GITHUB_WEBHOOK_SECRET=\"\"") || content.includes("GITHUB_WEBHOOK_SECRET=''")) {
    const newWebhookSecret = generateSecureHex(24);
    if (content.includes("GITHUB_WEBHOOK_SECRET=")) {
      content = content.replace(/GITHUB_WEBHOOK_SECRET=.*/g, `GITHUB_WEBHOOK_SECRET="${newWebhookSecret}"`);
    } else {
      content += `GITHUB_WEBHOOK_SECRET="${newWebhookSecret}"\n`;
    }
    modified = true;
  }

  if (modified || isNewFile) {
    fs.writeFileSync(envPath, content.trim() + "\n", { encoding: "utf-8" });
    console.log("[Colyin] Cryptographic environment secrets generated and saved to .env:");
    console.log("  ✓ ENCRYPTION_MASTER_KEY : 256-bit AES-GCM master key");
    console.log("  ✓ AUTH_SECRET           : 256-bit JWT authentication key");
    console.log("  ✓ GITHUB_WEBHOOK_SECRET : HMAC-SHA256 signature token");
  } else {
    console.log("[Colyin] Existing .env verified with active secure credentials.");
  }
}

try {
  ensureEnvSecrets();
} catch (err) {
  console.warn("[Colyin] Warning: Could not auto-generate .env secrets:", err.message);
}
