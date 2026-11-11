import fs from "fs";
import path from "path";

export interface UniversalStackInfo {
  language: string;
  framework: string;
  buildPack: "DOCKERFILE" | "NIXPACKS";
  defaultPort: number;
  detectedVersion: string;
  entryFile?: string;
  installCmd?: string;
  buildCmd?: string;
  startCmd?: string;
}

/**
 * Universal Language, Framework, and Dynamic Version Detector
 * Inspects project files (.nvmrc, package.json engines, go.mod, requirements.txt, Cargo.toml, pom.xml, csproj, etc.)
 */
export function detectUniversalStack(dir: string): UniversalStackInfo {
  // 1. User-provided Dockerfile
  if (fs.existsSync(path.join(dir, "Dockerfile"))) {
    return {
      language: "Docker",
      framework: "Custom Dockerfile",
      buildPack: "DOCKERFILE",
      defaultPort: 3000,
      detectedVersion: "custom",
      entryFile: "Dockerfile",
    };
  }

  // 2. C / C++ Language
  const hasMakefile = fs.existsSync(path.join(dir, "Makefile"));
  const hasCMake = fs.existsSync(path.join(dir, "CMakeLists.txt"));
  const hasCSource = hasFileWithExtension(dir, [".c", ".cpp", ".cc", ".cxx"]);

  if (hasMakefile || hasCMake || hasCSource) {
    const isCpp = hasFileWithExtension(dir, [".cpp", ".cc", ".cxx"]);
    const alpineVer = detectAlpineVersion(dir) || "3.21";
    return {
      language: isCpp ? "C++" : "C",
      framework: hasCMake ? "CMake Build" : hasMakefile ? "Makefile Project" : "GCC Single-Binary",
      buildPack: "NIXPACKS",
      defaultPort: 8080,
      detectedVersion: alpineVer,
      entryFile: hasCMake ? "CMakeLists.txt" : hasMakefile ? "Makefile" : "main.c",
      buildCmd: hasCMake ? "cmake -B build && cmake --build build" : hasMakefile ? "make" : isCpp ? "g++ -O3 -o app *.cpp" : "gcc -O3 -o app *.c",
      startCmd: "./app",
    };
  }

  // 3. Zig Language
  if (fs.existsSync(path.join(dir, "build.zig")) || fs.existsSync(path.join(dir, "main.zig"))) {
    return {
      language: "Zig",
      framework: "Zig Native Application",
      buildPack: "NIXPACKS",
      defaultPort: 8080,
      detectedVersion: "0.15.1",
      entryFile: "build.zig",
      buildCmd: "zig build -Doptimize=ReleaseFast",
      startCmd: "./zig-out/bin/app",
    };
  }

  // 4. Rust Language
  if (fs.existsSync(path.join(dir, "Cargo.toml"))) {
    const rustVer = detectRustVersion(dir) || "1.99.1";
    return {
      language: "Rust",
      framework: "Cargo / Rust Application",
      buildPack: "NIXPACKS",
      defaultPort: 8080,
      detectedVersion: rustVer,
      entryFile: "Cargo.toml",
      buildCmd: "cargo build --release",
      startCmd: "./target/release/app",
    };
  }

  // 5. Go Language
  if (fs.existsSync(path.join(dir, "go.mod")) || fs.existsSync(path.join(dir, "main.go"))) {
    const goVer = detectGoVersion(dir) || "1.26";
    return {
      language: "Go",
      framework: "Go Application",
      buildPack: "NIXPACKS",
      defaultPort: 8080,
      detectedVersion: goVer,
      entryFile: fs.existsSync(path.join(dir, "go.mod")) ? "go.mod" : "main.go",
      buildCmd: "CGO_ENABLED=0 go build -o /app/server .",
      startCmd: "/app/server",
    };
  }

  // 6. Bun Runtime
  if (fs.existsSync(path.join(dir, "bun.lockb")) || fs.existsSync(path.join(dir, "bunfig.toml"))) {
    return {
      language: "Bun",
      framework: "Bun JavaScript/TypeScript",
      buildPack: "NIXPACKS",
      defaultPort: 3000,
      detectedVersion: "1.4.4",
      entryFile: "bun.lockb",
      installCmd: "bun install",
      startCmd: "bun run start || bun index.ts",
    };
  }

  // 7. Deno Runtime
  if (fs.existsSync(path.join(dir, "deno.json")) || fs.existsSync(path.join(dir, "deno.jsonc"))) {
    return {
      language: "Deno",
      framework: "Deno Application",
      buildPack: "NIXPACKS",
      defaultPort: 8000,
      detectedVersion: "2.9.7",
      entryFile: "deno.json",
      startCmd: "deno run --allow-all main.ts",
    };
  }

  // 8. Node.js / TypeScript
  if (fs.existsSync(path.join(dir, "package.json"))) {
    const nodeVer = detectNodeVersion(dir) || "20";
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
      const hasPnpm = fs.existsSync(path.join(dir, "pnpm-lock.yaml"));
      const hasYarn = fs.existsSync(path.join(dir, "yarn.lock"));

      const isVite = !!(pkg.dependencies?.vite || pkg.devDependencies?.vite);
      const isReact = !!(pkg.dependencies?.react || pkg.devDependencies?.react);
      const isVue = !!(pkg.dependencies?.vue || pkg.devDependencies?.vue);
      const isSvelte = !!(pkg.dependencies?.svelte || pkg.devDependencies?.svelte);
      const isAngular = !!(pkg.dependencies?.["@angular/core"] || pkg.devDependencies?.["@angular/core"]);

      let framework = "Node.js Application";
      let defaultPort = 3000;
      let startCmd = hasPnpm ? "pnpm start" : hasYarn ? "yarn start" : "npm start";

      if (pkg.dependencies?.next || pkg.devDependencies?.next) {
        framework = "Next.js (App Router / Pages)";
        defaultPort = 3000;
        startCmd = hasPnpm ? "pnpm run start" : hasYarn ? "yarn start" : "npm run start";
      } else if (pkg.dependencies?.["@nestjs/core"]) {
        framework = "NestJS Enterprise API";
        defaultPort = 3000;
        startCmd = hasPnpm ? "pnpm run start:prod" : hasYarn ? "yarn start:prod" : "npm run start:prod";
      } else if (pkg.dependencies?.nuxt) {
        framework = "Nuxt.js Vue Framework";
        defaultPort = 3000;
        startCmd = hasPnpm ? "pnpm start" : hasYarn ? "yarn start" : "npm start";
      } else if (pkg.dependencies?.["@sveltejs/kit"]) {
        framework = "SvelteKit Application";
        defaultPort = 3000;
        startCmd = "node build";
      } else if (pkg.dependencies?.astro) {
        framework = "Astro Framework";
        defaultPort = 4321;
        startCmd = hasPnpm ? "pnpm start" : hasYarn ? "yarn start" : "npm start";
      } else if (isVite) {
        framework = "Vite React/Vue/SPA Web Application";
        defaultPort = 3000;
        if (pkg.scripts?.start) {
          startCmd = hasPnpm ? "pnpm start" : hasYarn ? "yarn start" : "npm start";
        } else if (pkg.scripts?.preview) {
          startCmd = `serve -s dist -l ${defaultPort} || ${hasPnpm ? "pnpm run preview --host 0.0.0.0 --port " + defaultPort : "npm run preview -- --host 0.0.0.0 --port " + defaultPort}`;
        } else {
          startCmd = `serve -s dist -l ${defaultPort}`;
        }
      } else if (pkg.dependencies?.["react-scripts"]) {
        framework = "Create React App";
        defaultPort = 3000;
        startCmd = pkg.scripts?.start ? (hasPnpm ? "pnpm start" : "npm start") : `serve -s build -l ${defaultPort}`;
      } else if (isAngular) {
        framework = "Angular SPA";
        defaultPort = 4200;
        startCmd = pkg.scripts?.start ? (hasPnpm ? "pnpm start" : "npm start") : `serve -s dist -l ${defaultPort}`;
      } else if (isReact || isVue || isSvelte) {
        framework = isReact ? "React SPA" : isVue ? "Vue SPA" : "Svelte SPA";
        defaultPort = 3000;
        if (pkg.scripts?.start) {
          startCmd = hasPnpm ? "pnpm start" : hasYarn ? "yarn start" : "npm start";
        } else if (pkg.scripts?.preview) {
          startCmd = `serve -s dist -l ${defaultPort} || ${hasPnpm ? "pnpm run preview --host 0.0.0.0 --port " + defaultPort : "npm run preview -- --host 0.0.0.0 --port " + defaultPort}`;
        } else {
          startCmd = `serve -s dist -l ${defaultPort} || serve -s build -l ${defaultPort}`;
        }
      } else if (pkg.dependencies?.express) {
        framework = "Express.js REST API";
        defaultPort = 3000;
        startCmd = pkg.scripts?.start
          ? (hasPnpm ? "pnpm start" : "npm start")
          : (fs.existsSync(path.join(dir, "server.js")) ? "node server.js" : "node index.js");
      } else if (pkg.dependencies?.fastify) {
        framework = "Fastify High-Performance API";
        defaultPort = 3000;
        startCmd = pkg.scripts?.start
          ? (hasPnpm ? "pnpm start" : "npm start")
          : (fs.existsSync(path.join(dir, "server.js")) ? "node server.js" : "node index.js");
      } else if (pkg.dependencies?.hono) {
        framework = "Hono Web Framework";
        defaultPort = 3000;
        startCmd = pkg.scripts?.start
          ? (hasPnpm ? "pnpm start" : "npm start")
          : (fs.existsSync(path.join(dir, "server.js")) ? "node server.js" : "node index.js");
      } else {
        // Fallback for general Node.js apps
        if (pkg.scripts?.start) {
          startCmd = hasPnpm ? "pnpm start" : hasYarn ? "yarn start" : "npm start";
        } else if (pkg.scripts?.preview) {
          startCmd = `serve -s dist -l ${defaultPort} || ${hasPnpm ? "pnpm run preview --host 0.0.0.0 --port " + defaultPort : "npm run preview -- --host 0.0.0.0 --port " + defaultPort}`;
        } else if (fs.existsSync(path.join(dir, "server.js"))) {
          startCmd = "node server.js";
        } else if (fs.existsSync(path.join(dir, "index.js"))) {
          startCmd = "node index.js";
        } else if (pkg.main && fs.existsSync(path.join(dir, pkg.main))) {
          startCmd = `node ${pkg.main}`;
        } else if (fs.existsSync(path.join(dir, "src/index.js"))) {
          startCmd = "node src/index.js";
        } else if (fs.existsSync(path.join(dir, "dist/index.js"))) {
          startCmd = "node dist/index.js";
        } else {
          startCmd = `serve -s dist -l ${defaultPort} || serve -s build -l ${defaultPort} || node index.js`;
        }
      }

      const installCmd = hasPnpm ? "pnpm install --config.dangerously-allow-all-builds=true" : hasYarn ? "yarn install" : "npm install";

      return {
        language: "Node.js",
        framework,
        buildPack: "NIXPACKS",
        defaultPort,
        detectedVersion: nodeVer,
        entryFile: "package.json",
        installCmd,
        buildCmd: pkg.scripts?.build ? (hasPnpm ? "pnpm run build" : hasYarn ? "yarn build" : "npm run build") : undefined,
        startCmd,
      };
    } catch {
      return {
        language: "Node.js",
        framework: "Node.js Application",
        buildPack: "NIXPACKS",
        defaultPort: 3000,
        detectedVersion: nodeVer,
        installCmd: "npm install",
        startCmd: "node index.js",
      };
    }
  }

  // 9. Python (FastAPI, Django, Flask, Streamlit)
  if (
    fs.existsSync(path.join(dir, "requirements.txt")) ||
    fs.existsSync(path.join(dir, "pyproject.toml")) ||
    fs.existsSync(path.join(dir, "Pipfile")) ||
    fs.existsSync(path.join(dir, "main.py"))
  ) {
    const pythonVer = detectPythonVersion(dir) || "3.15.2";
    let framework = "Python Application";
    let defaultPort = 8000;
    let startCmd = "python main.py";

    if (fs.existsSync(path.join(dir, "requirements.txt"))) {
      const reqs = fs.readFileSync(path.join(dir, "requirements.txt"), "utf8").toLowerCase();
      if (reqs.includes("fastapi") || reqs.includes("uvicorn")) {
        framework = "FastAPI / ASGI Microservice";
        defaultPort = 8000;
        startCmd = "uvicorn main:app --host 0.0.0.0 --port 8000";
      } else if (reqs.includes("django")) {
        framework = "Django Web Framework";
        defaultPort = 8000;
        startCmd = "python manage.py runserver 0.0.0.0:8000";
      } else if (reqs.includes("flask")) {
        framework = "Flask REST API";
        defaultPort = 5000;
        startCmd = "python app.py";
      } else if (reqs.includes("streamlit")) {
        framework = "Streamlit Data App";
        defaultPort = 8501;
        startCmd = "streamlit run app.py --server.port=8501 --server.address=0.0.0.0";
      }
    }

    return {
      language: "Python",
      framework,
      buildPack: "NIXPACKS",
      defaultPort,
      detectedVersion: pythonVer,
      entryFile: fs.existsSync(path.join(dir, "requirements.txt")) ? "requirements.txt" : "main.py",
      installCmd: "pip install -r requirements.txt",
      startCmd,
    };
  }

  // 10. PHP (Laravel / Symfony / Composer / Native)
  if (fs.existsSync(path.join(dir, "composer.json")) || fs.existsSync(path.join(dir, "index.php"))) {
    const phpVer = detectPhpVersion(dir) || "8.5.12";
    let framework = "PHP Application";
    let startCmd = "php -S 0.0.0.0:8000 -t public";
    if (fs.existsSync(path.join(dir, "artisan"))) {
      framework = "Laravel PHP Framework";
      startCmd = "php artisan serve --host=0.0.0.0 --port=8000";
    }

    return {
      language: "PHP",
      framework,
      buildPack: "NIXPACKS",
      defaultPort: 8000,
      detectedVersion: phpVer,
      entryFile: fs.existsSync(path.join(dir, "composer.json")) ? "composer.json" : "index.php",
      installCmd: fs.existsSync(path.join(dir, "composer.json")) ? "composer install --no-dev" : undefined,
      startCmd,
    };
  }

  // 11. Java / Kotlin (Maven / Gradle / Spring Boot)
  if (
    fs.existsSync(path.join(dir, "pom.xml")) ||
    fs.existsSync(path.join(dir, "build.gradle")) ||
    fs.existsSync(path.join(dir, "build.gradle.kts"))
  ) {
    const javaVer = detectJavaVersion(dir) || "26";
    const isGradle = fs.existsSync(path.join(dir, "build.gradle")) || fs.existsSync(path.join(dir, "build.gradle.kts"));
    return {
      language: isGradle ? "Java / Kotlin (Gradle)" : "Java (Maven)",
      framework: "Spring Boot / JVM Microservice",
      buildPack: "NIXPACKS",
      defaultPort: 8080,
      detectedVersion: javaVer,
      entryFile: isGradle ? "build.gradle" : "pom.xml",
      buildCmd: isGradle ? "./gradlew build -x test" : "mvn clean package -DskipTests",
      startCmd: "java -jar target/*.jar || java -jar build/libs/*.jar",
    };
  }

  // 12. .NET / C# / ASP.NET
  if (hasFileWithExtension(dir, [".csproj", ".sln", ".fsproj"])) {
    const dotnetVer = detectDotnetVersion(dir) || "10.0.13";
    return {
      language: "C# / .NET",
      framework: "ASP.NET Core Web API",
      buildPack: "NIXPACKS",
      defaultPort: 8080,
      detectedVersion: dotnetVer,
      entryFile: "Program.cs",
      buildCmd: "dotnet publish -c Release -o /app/publish",
      startCmd: "dotnet /app/publish/*.dll",
    };
  }

  // 13. Ruby (Rails / Sinatra)
  if (fs.existsSync(path.join(dir, "Gemfile"))) {
    const rubyVer = detectRubyVersion(dir) || "4.0.9";
    const gemfile = fs.readFileSync(path.join(dir, "Gemfile"), "utf8");
    const isRails = gemfile.includes("rails");
    return {
      language: "Ruby",
      framework: isRails ? "Ruby on Rails" : "Ruby Application",
      buildPack: "NIXPACKS",
      defaultPort: 3000,
      detectedVersion: rubyVer,
      entryFile: "Gemfile",
      installCmd: "bundle install",
      startCmd: isRails ? "bundle exec rails server -b 0.0.0.0 -p 3000" : "bundle exec ruby app.rb",
    };
  }

  // 14. Static HTML / Vanilla JS
  if (fs.existsSync(path.join(dir, "index.html"))) {
    return {
      language: "Static",
      framework: "Static HTML / Web Site",
      buildPack: "NIXPACKS",
      defaultPort: 80,
      detectedVersion: "latest",
      entryFile: "index.html",
      startCmd: "nginx -g 'daemon off;'",
    };
  }

  // 15. Universal fallback
  return {
    language: "Generic",
    framework: "Containerized Workload",
    buildPack: "NIXPACKS",
    defaultPort: 3000,
    detectedVersion: "latest",
    startCmd: "./start.sh || node index.js || python main.py",
  };
}

/**
 * Dynamically synthesizes an optimized, multi-stage production Dockerfile
 * using the resolved runtime version (auto-detected or user override).
 */
export function generateUniversalDockerfile(
  info: UniversalStackInfo,
  dir: string,
  userOverrideVersion?: string | null
): string {
  const port = info.defaultPort || 8080;
  // Use user override if not empty/AUTO, otherwise use detected version
  const rawVersion =
    userOverrideVersion && userOverrideVersion !== "AUTO" && userOverrideVersion.trim()
      ? userOverrideVersion.trim()
      : info.detectedVersion;
  const version = rawVersion.includes(":") ? rawVersion.split(":")[1] : rawVersion;

  switch (info.language) {
    case "C":
    case "C++": {
      const isCpp = info.language === "C++";
      const compiler = isCpp ? "g++" : "gcc";
      const hasCMake = fs.existsSync(path.join(dir, "CMakeLists.txt"));
      const hasMakefile = fs.existsSync(path.join(dir, "Makefile"));
      const isC23 = version.toLowerCase().includes("c23") || version.toLowerCase().includes("c++23") || version === "3.21";
      const alpineTag = isC23 ? "3.21" : version.includes(".") ? version : "3.21";
      const stdFlag = isCpp ? "-std=c++23" : "-std=c2x";

      if (hasCMake) {
        return `# Multi-stage C/C++ Build (Alpine ${alpineTag} / ${isCpp ? "C++23" : "C23"})
FROM alpine:${alpineTag} AS builder
RUN apk add --no-cache build-base cmake ninja
WORKDIR /src
COPY . .
RUN cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=Release && cmake --build build

FROM alpine:${alpineTag}
RUN apk add --no-cache libstdc++
WORKDIR /app
COPY --from=builder /src/build/ /app/
EXPOSE ${port}
CMD ["/bin/sh", "-c", "find /app -maxdepth 2 -type f -executable -exec {} \\;"]
`;
      }

      if (hasMakefile) {
        return `# Multi-stage Makefile Build (Alpine ${alpineTag} / ${isCpp ? "C++23" : "C23"})
FROM alpine:${alpineTag} AS builder
RUN apk add --no-cache build-base
WORKDIR /src
COPY . .
RUN make

FROM alpine:${alpineTag}
RUN apk add --no-cache libstdc++
WORKDIR /app
COPY --from=builder /src/ /app/
EXPOSE ${port}
CMD ["/bin/sh", "-c", "find /app -maxdepth 1 -type f -executable -exec {} \\;"]
`;
      }

      return `# Single/Multi file C/C++ build (Alpine ${alpineTag} - ${isCpp ? "C++23" : "C23"})
FROM alpine:${alpineTag} AS builder
RUN apk add --no-cache build-base
WORKDIR /src
COPY . .
RUN ${compiler} -O3 ${stdFlag} -static -o /src/app $(find . -name "*.c" -o -name "*.cpp" -o -name "*.cc")

FROM alpine:${alpineTag}
WORKDIR /app
COPY --from=builder /src/app /app/app
EXPOSE ${port}
CMD ["/app/app"]
`;
    }

    case "Zig": {
      return `FROM alpine:3.21 AS builder
RUN apk add --no-cache zig
WORKDIR /src
COPY . .
RUN if [ -f build.zig ]; then zig build -Doptimize=ReleaseFast; else zig build-exe $(find . -name "*.zig" | head -n 1) -O ReleaseFast -femit-bin=/src/zig-out/bin/app; fi

FROM alpine:3.21
WORKDIR /app
COPY --from=builder /src/zig-out/bin/ /app/
EXPOSE ${port}
CMD ["/bin/sh", "-c", "find /app -type f -executable -exec {} \\;"]
`;
    }

    case "Rust": {
      const rustTag = version.includes("alpine") ? version : `${version}-alpine`;
      return `FROM rust:${rustTag} AS builder
RUN apk add --no-cache musl-dev
WORKDIR /usr/src/app
COPY . .
RUN cargo build --release

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /usr/src/app/target/release/ /app/
EXPOSE ${port}
CMD ["/bin/sh", "-c", "find /app -maxdepth 1 -type f -executable ! -name '*.d' -exec {} \\;"]
`;
    }

    case "Go": {
      const goTag = version.includes("alpine") ? version : `${version}-alpine`;
      return `FROM golang:${goTag} AS builder
WORKDIR /app
COPY go.mod go.sum* ./
RUN go mod download || true
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server .

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /app/server /app/server
EXPOSE ${port}
CMD ["/app/server"]
`;
    }

    case "Node.js": {
      const nodeTag = version.includes("alpine") ? version : `${version}-alpine`;
      const hasPnpm = fs.existsSync(path.join(dir, "pnpm-lock.yaml"));
      const hasYarn = fs.existsSync(path.join(dir, "yarn.lock"));
      const hasPrisma = fs.existsSync(path.join(dir, "prisma")) || fs.existsSync(path.join(dir, "prisma/schema.prisma"));

      return `FROM node:${nodeTag} AS builder
WORKDIR /app
${hasPnpm ? "RUN corepack enable && corepack prepare pnpm@latest --activate && pnpm config set dangerously-allow-all-builds true" : ""}
COPY package*.json ${hasPnpm ? "pnpm-lock.yaml* pnpm-workspace.yaml* .npmrc*" : hasYarn ? "yarn.lock* .yarnrc*" : ".npmrc*"} ./
${hasPnpm ? `RUN printf "dangerously-allow-all-builds=true\\nstrict-dep-builds=false\\n" >> .npmrc && \\
    (printf "\\ndangerouslyAllowAllBuilds: true\\n" >> pnpm-workspace.yaml 2>/dev/null || true) && \\
    (pnpm approve-builds --all 2>/dev/null || true) && \\
    (pnpm install --frozen-lockfile --config.dangerously-allow-all-builds=true || pnpm install --config.dangerously-allow-all-builds=true)` : hasYarn ? "RUN yarn install --frozen-lockfile || yarn install" : "RUN npm ci || npm install"}
COPY . .
RUN if [ -d "prisma" ] || [ -f "prisma/schema.prisma" ]; then npx prisma generate || true; fi
${hasPnpm ? "RUN (pnpm rebuild || true)" : ""}
RUN ${info.buildCmd || "npm run build --if-present"}

FROM node:${nodeTag} AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g serve
${hasPnpm ? "RUN corepack enable && corepack prepare pnpm@latest --activate" : ""}
COPY --from=builder /app ./
EXPOSE ${port}
CMD ["/bin/sh", "-c", "${info.startCmd || "npm start"}"]
`;
    }

    case "Bun": {
      const bunTag = version.includes("alpine") ? version : `${version}-alpine`;
      return `FROM oven/bun:${bunTag}
WORKDIR /app
COPY package*.json bun.lockb* bunfig.toml* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
EXPOSE ${port}
CMD ["bun", "run", "start"]
`;
    }

    case "Deno": {
      const denoTag = version.includes("alpine") ? version : `${version}-alpine`;
      return `FROM denoland/deno:${denoTag}
WORKDIR /app
COPY . .
RUN deno cache main.ts || true
EXPOSE ${port}
CMD ["run", "--allow-all", "main.ts"]
`;
    }

    case "Python": {
      const pyTag = version.includes("slim") ? version : `${version}-slim`;
      return `FROM python:${pyTag}
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt* pyproject.toml* ./
RUN if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi
COPY . .
EXPOSE ${port}
CMD [${info.startCmd?.split(" ").map((s) => `"${s}"`).join(", ") || '"python", "main.py"'}]
`;
    }

    case "PHP": {
      const phpTag = version.includes("alpine") ? version : `${version}-cli-alpine`;
      return `FROM php:${phpTag}
WORKDIR /var/www/html
COPY . .
EXPOSE ${port}
CMD ["php", "-S", "0.0.0.0:${port}", "-t", "."]
`;
    }

    case "Java / Kotlin (Gradle)":
    case "Java (Maven)": {
      const jvmTag = version; // e.g. 17, 21
      return `FROM maven:3.9-eclipse-temurin-${jvmTag}-alpine AS builder
WORKDIR /app
COPY . .
RUN if [ -f pom.xml ]; then mvn clean package -DskipTests; elif [ -f gradlew ]; then ./gradlew build -x test; fi

FROM eclipse-temurin:${jvmTag}-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar /app/app.jar || COPY --from=builder /app/build/libs/*.jar /app/app.jar
EXPOSE ${port}
CMD ["java", "-jar", "/app/app.jar"]
`;
    }

    case "C# / .NET": {
      const netTag = version.includes("alpine") ? version : `${version}-alpine`;
      return `FROM mcr.microsoft.com/dotnet/sdk:${netTag} AS build
WORKDIR /source
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:${netTag}
WORKDIR /app
COPY --from=build /app .
EXPOSE ${port}
CMD ["/bin/sh", "-c", "dotnet $(ls *.dll | head -n 1)"]
`;
    }

    case "Ruby": {
      const rbTag = version.includes("slim") ? version : `${version}-slim`;
      return `FROM ruby:${rbTag}
WORKDIR /app
RUN apt-get update -qq && apt-get install -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
COPY Gemfile Gemfile.lock* ./
RUN bundle install
COPY . .
EXPOSE ${port}
CMD ["bundle", "exec", "rails", "server", "-b", "0.0.0.0", "-p", "${port}"]
`;
    }

    case "Static":
      return `FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;

    default:
      return `FROM alpine:3.20
WORKDIR /app
COPY . .
EXPOSE ${port}
CMD ["sh", "-c", "echo 'Application ready' && sleep 86400"]
`;
  }
}

// ----------------------------------------------------
// Version Extractors from Source Repositories
// ----------------------------------------------------

function detectNodeVersion(dir: string): string | null {
  // 1. .nvmrc or .node-version
  for (const file of [".nvmrc", ".node-version"]) {
    const p = path.join(dir, file);
    if (fs.existsSync(p)) {
      const match = fs.readFileSync(p, "utf8").trim().match(/v?(\d+)/);
      if (match) return match[1];
    }
  }

  // 2. package.json engines.node
  const pkgPath = path.join(dir, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      if (pkg.engines?.node) {
        const match = pkg.engines.node.match(/(\d+)/);
        if (match) return match[1];
      }
    } catch {}
  }
  return null;
}

function detectPythonVersion(dir: string): string | null {
  // 1. .python-version or runtime.txt
  for (const file of [".python-version", "runtime.txt"]) {
    const p = path.join(dir, file);
    if (fs.existsSync(p)) {
      const match = fs.readFileSync(p, "utf8").trim().match(/(\d+\.\d+)/);
      if (match) return match[1];
    }
  }

  // 2. pyproject.toml requires-python
  const pyproj = path.join(dir, "pyproject.toml");
  if (fs.existsSync(pyproj)) {
    const content = fs.readFileSync(pyproj, "utf8");
    const match = content.match(/requires-python\s*=\s*["'][^"']*?(\d+\.\d+)/);
    if (match) return match[1];
  }
  return null;
}

function detectGoVersion(dir: string): string | null {
  const gomod = path.join(dir, "go.mod");
  if (fs.existsSync(gomod)) {
    const content = fs.readFileSync(gomod, "utf8");
    const match = content.match(/go\s+(\d+\.\d+)/);
    if (match) return match[1];
  }
  return null;
}

function detectRustVersion(dir: string): string | null {
  for (const file of ["rust-toolchain", "rust-toolchain.toml"]) {
    const p = path.join(dir, file);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf8");
      const match = content.match(/(\d+\.\d+)/);
      if (match) return match[1];
    }
  }
  return null;
}

function detectPhpVersion(dir: string): string | null {
  const composer = path.join(dir, "composer.json");
  if (fs.existsSync(composer)) {
    try {
      const json = JSON.parse(fs.readFileSync(composer, "utf8"));
      if (json.require?.php) {
        const match = json.require.php.match(/(\d+\.\d+)/);
        if (match) return match[1];
      }
    } catch {}
  }
  return null;
}

function detectJavaVersion(dir: string): string | null {
  // 1. .java-version
  const jv = path.join(dir, ".java-version");
  if (fs.existsSync(jv)) {
    const match = fs.readFileSync(jv, "utf8").trim().match(/(\d+)/);
    if (match) return match[1];
  }

  // 2. pom.xml
  const pom = path.join(dir, "pom.xml");
  if (fs.existsSync(pom)) {
    const content = fs.readFileSync(pom, "utf8");
    const match =
      content.match(/<java\.version>(\d+)<\/java\.version>/) ||
      content.match(/<maven\.compiler\.target>(\d+)<\/maven\.compiler\.target>/);
    if (match) return match[1];
  }

  // 3. build.gradle
  for (const g of ["build.gradle", "build.gradle.kts"]) {
    const p = path.join(dir, g);
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf8");
      const match = content.match(/sourceCompatibility\s*=\s*['"]?(\d+)['"]?/);
      if (match) return match[1];
    }
  }
  return null;
}

function detectDotnetVersion(dir: string): string | null {
  try {
    const files = fs.readdirSync(dir);
    const csproj = files.find((f) => f.endsWith(".csproj"));
    if (csproj) {
      const content = fs.readFileSync(path.join(dir, csproj), "utf8");
      const match = content.match(/<TargetFramework>net(\d+\.\d+)<\/TargetFramework>/i);
      if (match) return match[1];
    }
  } catch {}
  return null;
}

function detectRubyVersion(dir: string): string | null {
  const rv = path.join(dir, ".ruby-version");
  if (fs.existsSync(rv)) {
    const match = fs.readFileSync(rv, "utf8").trim().match(/(\d+\.\d+)/);
    if (match) return match[1];
  }

  const gemfile = path.join(dir, "Gemfile");
  if (fs.existsSync(gemfile)) {
    const content = fs.readFileSync(gemfile, "utf8");
    const match = content.match(/ruby\s+['"](\d+\.\d+)/);
    if (match) return match[1];
  }
  return null;
}

function detectAlpineVersion(dir: string): string | null {
  const alpine = path.join(dir, ".alpine-version");
  if (fs.existsSync(alpine)) {
    return fs.readFileSync(alpine, "utf8").trim();
  }
  return null;
}

function hasFileWithExtension(dir: string, extensions: string[]): boolean {
  try {
    const files = fs.readdirSync(dir);
    return files.some((f) => extensions.some((ext) => f.endsWith(ext)));
  } catch {
    return false;
  }
}
