import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export interface DetectedStack {
  buildPack: "DOCKERFILE" | "NIXPACKS";
  framework: string;
  defaultPort: number;
  entryFile?: string;
}

/**
 * Executes real Git shallow clone with live streaming of output chunks.
 * Supports private repositories via authToken with full credential masking in logs.
 */
export async function cloneRepository(
  repoUrl: string,
  branch: string,
  targetDir: string,
  onLog: (chunk: string, stream: "stdout" | "stderr") => Promise<void>,
  authToken?: string
): Promise<void> {
  // Ensure target parent directory exists and clean targetDir if it already exists
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  // Format authenticated clone URL if authToken is provided
  let cloneTargetUrl = repoUrl.trim();
  if (authToken && cloneTargetUrl.startsWith("http")) {
    try {
      const parsed = new URL(cloneTargetUrl);
      if (parsed.hostname.includes("github.com")) {
        parsed.username = "x-access-token";
        parsed.password = authToken;
      } else {
        parsed.username = "oauth2";
        parsed.password = authToken;
      }
      cloneTargetUrl = parsed.toString();
    } catch {
      cloneTargetUrl = cloneTargetUrl.replace(
        "https://",
        `https://x-access-token:${encodeURIComponent(authToken)}@`
      );
    }
  }

  // Helper to sanitize token from any log message
  const sanitize = (text: string): string => {
    if (!authToken) return text;
    return text
      .split(authToken)
      .join("***")
      .replace(/https:\/\/[^@\s]+@/g, "https://***@");
  };

  const safeLog = async (chunk: string, stream: "stdout" | "stderr" = "stdout") => {
    await onLog(sanitize(chunk), stream);
  };

  const maskedDisplayUrl = sanitize(cloneTargetUrl);
  await safeLog(`$ git clone --depth 1 -b ${branch} ${maskedDisplayUrl} ...`, "stdout");

  return new Promise((resolve, reject) => {
    // Clone with depth 1, non-interactive mode
    const child = spawn(
      "git",
      ["clone", "--depth", "1", "-b", branch, cloneTargetUrl, targetDir],
      {
        env: {
          ...process.env,
          GIT_TERMINAL_PROMPT: "0",
          GIT_ASKPASS: "echo",
        },
      }
    );

    child.stdout.on("data", (data) => {
      const text = data.toString().trim();
      if (text) safeLog(text, "stdout");
    });

    child.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) safeLog(text, "stdout"); // Git often outputs progress info to stderr
    });

    child.on("close", (code) => {
      if (code === 0) {
        safeLog(`Git clone completed successfully (exit code 0).`, "stdout");
        resolve();
      } else {
        const errMsg = authToken
          ? `Git clone failed (exit code ${code}). Check if the repository URL, branch, and token 'repo' permissions are valid.`
          : `Git clone failed (exit code ${code}). If this is a private repository, please connect your GitHub account with a Personal Access Token ('repo' scope).`;
        safeLog(errMsg, "stderr");
        reject(new Error(errMsg));
      }
    });

    child.on("error", (err) => {
      safeLog(`Git command error: ${err.message}`, "stderr");
      reject(err);
    });
  });
}

import { detectUniversalStack, UniversalStackInfo } from "./buildpacks";

/**
 * Automatically inspects the cloned directory to detect runtime framework,
 * buildpack requirement, and default port across all languages (C to latest frameworks).
 */
export function detectRepositoryStack(dir: string): UniversalStackInfo {
  return detectUniversalStack(dir);
}

/**
 * Creates an ephemeral build directory in the system temp directory.
 */
export function createBuildWorkspace(deploymentId: string): string {
  const baseTemp = path.join(os.tmpdir(), "minipaas-builds");
  if (!fs.existsSync(baseTemp)) {
    fs.mkdirSync(baseTemp, { recursive: true });
  }
  return path.join(baseTemp, deploymentId);
}

/**
 * Safely removes the ephemeral build directory.
 */
export function cleanupBuildWorkspace(dir: string): void {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  } catch (err) {
    console.warn(`Could not cleanup build dir ${dir}:`, err);
  }
}
