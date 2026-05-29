#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function readToken() {
  if (process.env.WEBFLOW_TOKEN) return process.env.WEBFLOW_TOKEN;
  const mcpPath = path.resolve(__dirname, "../.vscode/mcp.json");
  if (!fs.existsSync(mcpPath)) return null;
  const raw = fs.readFileSync(mcpPath, "utf8");
  const match = raw.match(/"WEBFLOW_TOKEN"\s*:\s*"([^\"]+)"/);
  return match ? match[1] : null;
}

(async function main() {
  const token = readToken();
  if (!token) {
    console.error("NO TOKEN FOUND (env or .vscode/mcp.json)");
    process.exit(1);
  }

  const COLLECTION_ID = "679d148479ad083f33c518a1";
  const url = `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items?limit=1`;

  try {
    console.log("→ Testing GET", url);
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, accept: "application/json" },
    });
    console.log("Status:", res.status, res.statusText);
    const text = await res.text();
    try {
      console.log("Body:", JSON.stringify(JSON.parse(text), null, 2));
    } catch (e) {
      console.log("Body (raw):", text.slice(0, 1000));
    }
  } catch (err) {
    console.error("FETCH ERROR:", err && err.message ? err.message : err);
    process.exit(2);
  }
})();
