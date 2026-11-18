#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT, 10) || 8080;
const PROJECT_ROOT = process.cwd();

// Auto-detect web root if output directory exists
let webRoot = PROJECT_ROOT;
const candidateDirs = ["dist", "build", "out", "public"];
for (const dir of candidateDirs) {
  const candidate = path.join(PROJECT_ROOT, dir);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
    if (fs.existsSync(path.join(candidate, "index.html")) || fs.existsSync(path.join(candidate, "index.htm"))) {
      webRoot = candidate;
      break;
    }
  }
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".eot": "application/vnd.ms-fontobject",
  ".wasm": "application/wasm",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".map": "application/json; charset=utf-8",
};

const server = http.createServer((req, res) => {
  // Allow GET and HEAD
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Method Not Allowed");
    return;
  }

  // Parse path
  let decodedUrl = "/";
  try {
    const parsed = new URL(req.url || "/", `http://localhost:${PORT}`);
    decodedUrl = decodeURIComponent(parsed.pathname);
  } catch {
    decodedUrl = "/";
  }

  // Prevent directory traversal
  const safePath = path.normalize(decodedUrl).replace(/^(\.\.[\/\\])+/, "");
  let filePath = path.join(webRoot, safePath);

  // If path is a directory or points to root, look for index.html or index.htm
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    if (fs.existsSync(path.join(filePath, "index.html"))) {
      filePath = path.join(filePath, "index.html");
    } else if (fs.existsSync(path.join(filePath, "index.htm"))) {
      filePath = path.join(filePath, "index.htm");
    }
  }

  // SPA fallback: if file does not exist, check for index.html
  if (!fs.existsSync(filePath)) {
    const rootIndex = path.join(webRoot, "index.html");
    const rootHtm = path.join(webRoot, "index.htm");
    if (fs.existsSync(rootIndex)) {
      filePath = rootIndex;
    } else if (fs.existsSync(rootHtm)) {
      filePath = rootHtm;
    } else {
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end(`<!DOCTYPE html>
<html>
  <head><title>404 Not Found</title></head>
  <body style="font-family:system-ui,sans-serif;background:#09090b;color:#f4f4f5;padding:40px;text-align:center;">
    <h1 style="color:#ef4444;">404 Not Found</h1>
    <p>The requested path <code>${safePath}</code> was not found.</p>
  </body>
</html>`);
      return;
    }
  }

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stat.size,
      "Cache-Control": ext === ".html" || ext === ".htm" ? "no-cache" : "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Internal Server Error: ${err && err.message ? err.message : String(err)}`);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[StaticServer] Listening on http://0.0.0.0:${PORT} (serving from: ${webRoot})`);
});

