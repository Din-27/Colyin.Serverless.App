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
 */
export async function cloneRepository(
  repoUrl: string,
  branch: string,
  targetDir: string,
  onLog: (chunk: string, stream: "stdout" | "stderr") => Promise<void>
): Promise<void> {
  // Ensure target parent directory exists and clean targetDir if it already exists
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  await onLog(`$ git clone --depth 1 -b ${branch} ${repoUrl} ...`, "stdout");

  return new Promise((resolve, reject) => {
    // Clone with depth 1
    const child = spawn("git", ["clone", "--depth", "1", "-b", branch, repoUrl, targetDir]);

    child.stdout.on("data", (data) => {
      const text = data.toString().trim();
      if (text) onLog(text, "stdout");
    });

    child.stderr.on("data", (data) => {
      const text = data.toString().trim();
      if (text) onLog(text, "stdout"); // Git often outputs progress to stderr
    });

    child.on("close", (code) => {
      if (code === 0) {
        onLog(`Git clone completed successfully (exit code 0).`, "stdout");
        resolve();
      } else {
        const errMsg = `Git clone failed with exit code ${code}. Check repository URL and branch name.`;
        onLog(errMsg, "stderr");
        reject(new Error(errMsg));
      }
    });

    child.on("error", (err) => {
      onLog(`Git command error: ${err.message}`, "stderr");
      reject(err);
    });
  });
}

/**
 * Automatically inspects the cloned directory to detect runtime framework,
 * buildpack requirement, and default port.
 */
export function detectRepositoryStack(dir: string): DetectedStack {
  // 1. Check for custom Dockerfile
  if (fs.existsSync(path.join(dir, "Dockerfile"))) {
    return {
      buildPack: "DOCKERFILE",
      framework: "Docker (Custom Dockerfile)",
      defaultPort: 3000,
      entryFile: "Dockerfile",
    };
  }

  // 2. Check for Node.js
  if (fs.existsSync(path.join(dir, "package.json"))) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
      let framework = "Node.js Application";
      let defaultPort = 3000;

      if (pkg.dependencies?.next || pkg.devDependencies?.next) {
        framework = "Next.js Fullstack";
        defaultPort = 3000;
      } else if (pkg.dependencies?.express) {
        framework = "Express.js API";
        defaultPort = 3000;
      } else if (pkg.dependencies?.nest || pkg.dependencies?.["@nestjs/core"]) {
        framework = "NestJS Application";
        defaultPort = 3000;
      } else if (pkg.dependencies?.fastify) {
        framework = "Fastify API";
        defaultPort = 3000;
      }

      return {
        buildPack: "NIXPACKS",
        framework,
        defaultPort,
        entryFile: "package.json",
      };
    } catch {
      return {
        buildPack: "NIXPACKS",
        framework: "Node.js",
        defaultPort: 3000,
      };
    }
  }

  // 3. Check for Python
  if (
    fs.existsSync(path.join(dir, "requirements.txt")) ||
    fs.existsSync(path.join(dir, "Pipfile")) ||
    fs.existsSync(path.join(dir, "pyproject.toml"))
  ) {
    return {
      buildPack: "NIXPACKS",
      framework: "Python (FastAPI / Flask / Django)",
      defaultPort: 8000,
      entryFile: "requirements.txt",
    };
  }

  // 4. Check for Go
  if (fs.existsSync(path.join(dir, "go.mod"))) {
    return {
      buildPack: "NIXPACKS",
      framework: "Go Application",
      defaultPort: 8080,
      entryFile: "go.mod",
    };
  }

  // 5. Check for Rust
  if (fs.existsSync(path.join(dir, "Cargo.toml"))) {
    return {
      buildPack: "NIXPACKS",
      framework: "Rust Application",
      defaultPort: 8080,
      entryFile: "Cargo.toml",
    };
  }

  // 6. Check for PHP
  if (fs.existsSync(path.join(dir, "composer.json"))) {
    return {
      buildPack: "NIXPACKS",
      framework: "PHP (Laravel / Symfony)",
      defaultPort: 8000,
      entryFile: "composer.json",
    };
  }

  // Default fallback
  return {
    buildPack: "NIXPACKS",
    framework: "Generic Runtime",
    defaultPort: 3000,
  };
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
