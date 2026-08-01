/**
 * serve-build.cjs — serveur statique pour la build de production
 *
 * Sert artifacts/nostress-web/build/ sur le port $PORT (défaut 25266).
 * Ouvre le port en <1 seconde sans webpack, compatible Node v24.
 *
 * Routing :
 *  - /nostress-web/static/...    → build/static/...
 *  - /nostress-web/favicon.svg   → build/favicon.svg
 *  - /nostress-web/...           → build/index.html (SPA fallback)
 *  - /nostress-web               → build/index.html
 *  - /                           → redirect vers /nostress-web/
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "25266", 10);
const HOST = process.env.HOST || "0.0.0.0";
const BUILD_DIR = path.join(__dirname, "build");
const BASE = "/nostress-web";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".map": "application/json",
};

function serveFile(res, filePath, statusCode = 200) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || "application/octet-stream";
    const headers = {
      "Content-Type": mime,
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=31536000",
    };
    res.writeHead(statusCode, headers);
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  let url = req.url || "/";

  // Strip query string
  const qIdx = url.indexOf("?");
  if (qIdx !== -1) url = url.slice(0, qIdx);

  // Redirect root to base path
  if (url === "/" || url === "") {
    res.writeHead(302, { Location: BASE + "/" });
    res.end();
    return;
  }

  // Ensure base path prefix
  if (!url.startsWith(BASE)) {
    res.writeHead(302, { Location: BASE + "/" });
    res.end();
    return;
  }

  // Strip base prefix to get relative path
  let relPath = url.slice(BASE.length);
  if (!relPath.startsWith("/")) relPath = "/" + relPath;

  // Static assets (have extension) → serve directly
  const ext = path.extname(relPath);
  if (ext) {
    const filePath = path.join(BUILD_DIR, relPath);
    // Security: ensure path is within BUILD_DIR
    if (!filePath.startsWith(BUILD_DIR + path.sep) && filePath !== BUILD_DIR) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }
    serveFile(res, filePath);
    return;
  }

  // SPA fallback → index.html
  serveFile(res, path.join(BUILD_DIR, "index.html"));
});

server.listen(PORT, HOST, () => {
  console.log(`\nNoStress Web serving production build`);
  console.log(`  Local:   http://localhost:${PORT}${BASE}`);
  console.log(`  Network: http://${HOST}:${PORT}${BASE}\n`);
});

server.on("error", (err) => {
  console.error("Server error:", err.message);
  process.exit(1);
});
