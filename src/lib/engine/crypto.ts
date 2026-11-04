import crypto from "crypto";

const MASTER_KEY_HEX =
  process.env.ENCRYPTION_MASTER_KEY ||
  "e5b8719284fa9801c87361abef238914619a87cd5219e8301726a45e90bd67a1";

const MASTER_KEY = Buffer.from(MASTER_KEY_HEX, "hex");

export interface EncryptedPayload {
  ciphertext: string; // Base64
  iv: string; // Base64
  authTag: string; // Base64
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 */
export function encryptSecret(plainText: string): EncryptedPayload {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", MASTER_KEY, iv);
  let encrypted = cipher.update(plainText, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag().toString("base64");

  return {
    ciphertext: encrypted,
    iv: iv.toString("base64"),
    authTag,
  };
}

/**
 * Decrypts ciphertext using AES-256-GCM.
 */
export function decryptSecret(
  ciphertext: string,
  ivBase64: string,
  authTagBase64: string
): string {
  const iv = Buffer.from(ivBase64, "base64");
  const authTag = Buffer.from(authTagBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, "base64", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Verifies GitHub Webhook HMAC-SHA256 signature using timingSafeEqual to avoid timing attacks.
 */
export function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !signature.startsWith("sha256=")) return false;
  const hmac = crypto.createHmac("sha256", secret);
  const digest = "sha256=" + hmac.update(payload).digest("hex");

  const sigBuffer = Buffer.from(signature);
  const digestBuffer = Buffer.from(digest);

  if (sigBuffer.length !== digestBuffer.length) return false;
  return crypto.timingSafeEqual(sigBuffer, digestBuffer);
}
