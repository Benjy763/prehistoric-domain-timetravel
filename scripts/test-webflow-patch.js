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

(async function () {
  const token = readToken();
  if (!token) {
    console.error("NO TOKEN");
    process.exit(1);
  }

  const COLLECTION_ID = "679d148479ad083f33c518a1";
  // pick a failed id from geocoded-items.json
  const geo = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../geocoded-items.json"), "utf8"),
  );
  const failed = geo.failed && geo.failed[0] ? geo.failed[0].id : null;
  if (!failed) {
    console.error("No failed id found in geocoded-items.json");
    process.exit(1);
  }

  const url = `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items`;
  const updates = [{ id: failed, fieldData: { "display-on-app": false } }];

  try {
    console.log("PATCH", url);
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: updates }),
    });
    console.log("Status:", res.status, res.statusText);
    const txt = await res.text();
    try {
      console.log("Body:", JSON.stringify(JSON.parse(txt), null, 2));
    } catch (e) {
      console.log("Body raw:", txt.slice(0, 2000));
    }
  } catch (err) {
    console.error("FETCH ERROR:", err && err.message ? err.message : err);
    process.exit(2);
  }
})();
