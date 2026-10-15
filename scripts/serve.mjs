// Minimal static server for the Tree Tracker Mac app. Localhost only, no dependencies.
// usage: node serve.mjs <app folder> <port> <build id>
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const [folder = ".", port = "27190", build = "dev"] = process.argv.slice(2);
const root = path.resolve(folder);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".geojson": "application/geo+json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

http
  .createServer(async (request, response) => {
    const { pathname } = new URL(request.url, "http://localhost");
    if (pathname === "/healthz") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ app: "TreeTracker", build, pid: process.pid }));
      return;
    }
    const file = path.join(root, decodeURIComponent(pathname).replace(/\/$/, "/index.html"));
    if (!file.startsWith(root + path.sep)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await fs.readFile(file);
      response.writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  })
  .listen(Number(port), "127.0.0.1");
