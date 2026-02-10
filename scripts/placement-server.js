#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Placement Tool Server
 *
 * Tiny HTTP server for the interactive placement tool.
 * Serves static files + 3 API endpoints:
 *   GET  /api/items    - Load content-data.json items
 *   GET  /api/fixes    - Load current manual fixes
 *   POST /api/save-fix - Save a coordinate fix
 *
 * Zero npm dependencies. Node.js 18+ required.
 *
 * Usage: node scripts/placement-server.js [--port=8080]
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = parseInt(
  process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] || "8080",
  10,
);
const FIXES_PATH = path.join(__dirname, "manual-coordinate-fixes.json");
const CONTENT_DATA_PATH = path.join(ROOT, "assets/data/content-data.json");

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".geojson": "application/json",
};

function serveStatic(req, res) {
  const safePath = path.normalize(req.url.split("?")[0]).replace(/^(\.\.[\/\\])+/, "");
  const filePath = path.join(ROOT, safePath === "/" ? "index.html" : safePath);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // API: GET /api/items
  if (url.pathname === "/api/items" && req.method === "GET") {
    try {
      const data = fs.readFileSync(CONTENT_DATA_PATH, "utf8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Cannot read content-data.json" }));
    }
    return;
  }

  // API: GET /api/fixes
  if (url.pathname === "/api/fixes" && req.method === "GET") {
    try {
      const data = fs.readFileSync(FIXES_PATH, "utf8");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(data);
    } catch (err) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
    }
    return;
  }

  // API: POST /api/save-fix
  if (url.pathname === "/api/save-fix" && req.method === "POST") {
    try {
      const body = await readBody(req);
      const { slug, lat, lon, reason } = body;

      if (!slug || lat == null || lon == null) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing slug, lat, or lon" }));
        return;
      }

      // Read current fixes
      let fixes = {};
      try {
        fixes = JSON.parse(fs.readFileSync(FIXES_PATH, "utf8"));
      } catch (e) {
        /* file might not exist */
      }

      // Update/add the fix
      fixes[slug] = {
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        reason: reason || "Manual fix via placement tool",
      };

      // Write back
      fs.writeFileSync(FIXES_PATH, JSON.stringify(fixes, null, 2) + "\n");

      console.log(`  Fix saved: ${slug} → ${lat}, ${lon}`);

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, slug, lat, lon }));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Static files
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`\nPlacement Tool Server running at http://localhost:${PORT}`);
  console.log(`  Globe:     http://localhost:${PORT}/index.html`);
  console.log(`  Placement: http://localhost:${PORT}/placement.html`);
  console.log(`\nPress Ctrl+C to stop.\n`);
});
