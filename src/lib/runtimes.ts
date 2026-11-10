export interface RuntimeOption {
  value: string;
  label: string;
  description?: string;
}

export interface RuntimeGroup {
  group: string;
  options: RuntimeOption[];
}

export const RUNTIME_GROUPS: RuntimeGroup[] = [
  {
    group: "Automatic Detection",
    options: [
      {
        value: "AUTO",
        label: "Auto-detect from Repository",
        description: "Inspects .nvmrc, go.mod, pom.xml, runtime.txt, Cargo.toml, Gemfile, etc.",
      },
    ],
  },
  {
    group: "C & C++ (ISO Standards & Modern Toolchains)",
    options: [
      {
        value: "c:c23",
        label: "C23 (ISO/IEC 9899:2024) - Latest Official ISO Standard",
        description: "Replaces C17 with auto types, nullptr, constexpr, and modern C23 attributes",
      },
      {
        value: "cpp:c++23",
        label: "C++23 (ISO/IEC 14882:2024) - Latest Official ISO Standard",
        description: "Official stable standard (deducing this, std::print, ranges formatting, C++26 draft ready)",
      },
      {
        value: "c:3.21",
        label: "Alpine 3.21 Toolchain (GCC 14 / Clang 19)",
        description: "Latest Alpine Linux toolchain with full C23/C++23 support and musl libc",
      },
      {
        value: "c:3.20",
        label: "Alpine 3.20 Toolchain (GCC 13)",
        description: "Previous stable Linux C/C++ compilation environment",
      },
    ],
  },
  {
    group: "Rust",
    options: [
      {
        value: "rust:1.99.1",
        label: "Rust 1.99.1 (Latest Stable Release)",
        description: "Current official release with full Cargo and rustc toolchain",
      },
      {
        value: "rust:1.82",
        label: "Rust 1.82 (Standard)",
        description: "Precise capturing syntax and async improvements",
      },
      {
        value: "rust:1.80",
        label: "Rust 1.80 (LTS)",
        description: "Stable Cargo workspace release",
      },
    ],
  },
  {
    group: "Zig",
    options: [
      {
        value: "zig:0.15.1",
        label: "Zig 0.15.1 (Latest Stable Release)",
        description: "Rilis stabil terbaru dengan kompilator native berkinerja tinggi",
      },
      {
        value: "zig:0.13.0",
        label: "Zig 0.13.0",
        description: "Previous release dengan dukungan build.zig standar",
      },
    ],
  },
  {
    group: "Go (Golang)",
    options: [
      {
        value: "go:1.26",
        label: "Go 1.26 (Latest Stable Release)",
        description: "Rilis stabil terkini dengan optimasi garbage collection dan compiler terbaru",
      },
      {
        value: "go:1.23",
        label: "Go 1.23",
        description: "Standard range over function iterators dan enhanced tooling",
      },
      {
        value: "go:1.22",
        label: "Go 1.22",
        description: "Enhanced loop variables semantics",
      },
    ],
  },
  {
    group: "JavaScript / TypeScript (Node.js)",
    options: [
      {
        value: "node:26.12.1",
        label: "Node.js v26.12.1 (Current Release)",
        description: "Jalur rilis Current terbaru dengan V8 engine termutakhir",
      },
      {
        value: "node:24.22.1",
        label: "Node.js v24.22.1 (Active LTS)",
        description: "Jalur rilis Long-Term Support (LTS) aktif rekomendasi enterprise",
      },
      {
        value: "node:22",
        label: "Node.js v22 (LTS Maintenance)",
        description: "LTS maintenance release",
      },
      {
        value: "node:20",
        label: "Node.js v20 (LTS Iron)",
        description: "Legacy LTS release",
      },
    ],
  },
  {
    group: "Python",
    options: [
      {
        value: "python:3.15.2",
        label: "Python 3.15.2 (Latest Stable Release)",
        description: "Versi stabil terbaru dari cabang 3.15 dengan JIT acceleration",
      },
      {
        value: "python:3.13",
        label: "Python 3.13 (Free-threaded / JIT Ready)",
        description: "Free-threading optional GIL dan copy-on-write allocator",
      },
      {
        value: "python:3.12",
        label: "Python 3.12 (Standard)",
        description: "Standard production release",
      },
      {
        value: "python:3.11",
        label: "Python 3.11",
        description: "High-speed CPython release",
      },
    ],
  },
  {
    group: "PHP",
    options: [
      {
        value: "php:8.5.12",
        label: "PHP 8.5.12 (Latest Active Stable)",
        description: "Versi stabil aktif terkini dengan optimasi OPcache JIT",
      },
      {
        value: "php:8.3",
        label: "PHP 8.3 CLI / FPM",
        description: "Typed class constants dan json_validate",
      },
      {
        value: "php:8.2",
        label: "PHP 8.2",
        description: "Readonly classes support",
      },
    ],
  },
  {
    group: "Java / JVM",
    options: [
      {
        value: "java:26",
        label: "Java 26 / JDK 26 (General Availability)",
        description: "Rilis fitur stabil terbaru (General Availability) dengan Project Loom & Amber",
      },
      {
        value: "java:21",
        label: "Java 21 (LTS Eclipse Temurin)",
        description: "Virtual Threads & Pattern Matching LTS",
      },
      {
        value: "java:17",
        label: "Java 17 (LTS)",
        description: "Enterprise LTS Standard",
      },
    ],
  },
  {
    group: ".NET / C#",
    options: [
      {
        value: "dotnet:10.0.13",
        label: ".NET 10 (10.0.13) (Primary Active LTS)",
        description: "Versi LTS aktif utama untuk aplikasi ASP.NET Core cloud-native",
      },
      {
        value: "dotnet:9.0",
        label: ".NET 9.0 SDK",
        description: "Standard term release",
      },
      {
        value: "dotnet:8.0",
        label: ".NET 8.0 SDK (LTS)",
        description: "Previous LTS release",
      },
    ],
  },
  {
    group: "Ruby",
    options: [
      {
        value: "ruby:4.0.9",
        label: "Ruby 4.0.9 (Latest Production Stable)",
        description: "Versi produksi stabil terkini dengan generasi baru YJIT & RJIT",
      },
      {
        value: "ruby:3.3",
        label: "Ruby 3.3 (YJIT)",
        description: "Production YJIT dengan Prism parser",
      },
    ],
  },
  {
    group: "Bun & Deno (Modern JS/TS Runtimes)",
    options: [
      {
        value: "bun:1.4.4",
        label: "Bun v1.4.4 (Latest Stable Release)",
        description: "Rilis stabil terkini runtime Bun dengan kinerja bundling ultra-cepat",
      },
      {
        value: "deno:2.9.7",
        label: "Deno v2.9.7 (Latest Stable Release)",
        description: "Rilis stabil terkini runtime Deno dengan kompatibilitas Node.js & npm penuh",
      },
    ],
  },
  {
    group: "Custom",
    options: [
      {
        value: "CUSTOM",
        label: "Custom Tag or Version",
        description: "Enter any Docker image tag or semver manually",
      },
    ],
  },
];

export function isKnownRuntimePreset(val?: string | null): boolean {
  if (!val || val === "AUTO") return true;
  for (const group of RUNTIME_GROUPS) {
    if (group.options.some((o) => o.value === val)) return true;
  }
  return false;
}

export function getRuntimeLabel(val?: string | null): string {
  if (!val || val === "AUTO") return "Auto-detect from repo";
  for (const group of RUNTIME_GROUPS) {
    const found = group.options.find((o) => o.value === val);
    if (found) return found.label;
  }
  return `Custom (${val})`;
}
