#!/usr/bin/env node

/**
 * PREHISTORIC DOMAIN - Sync display-on-app
 *
 * Met à jour le switch display-on-app dans Webflow :
 * - true si free-tags est rempli
 * - false sinon
 */

const fs = require("fs");
const path = require("path");

const COLLECTION_ID = "679d148479ad083f33c518a1";

function readToken() {
  if (process.env.WEBFLOW_TOKEN) return process.env.WEBFLOW_TOKEN;

  const mcpPath = path.resolve(__dirname, "../.vscode/mcp.json");
  if (!fs.existsSync(mcpPath)) return null;

  const raw = fs.readFileSync(mcpPath, "utf8");
  const match = raw.match(/"WEBFLOW_TOKEN"\s*:\s*"([^"]+)"/);
  return match ? match[1] : null;
}

async function fetchAllItems(token) {
  let allItems = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await fetch(
      `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items?offset=${offset}&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: "application/json",
        },
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Erreur API: ${response.status} ${response.statusText} - ${error}`,
      );
    }

    const data = await response.json();
    const items = data.items || [];
    allItems = allItems.concat(items);

    hasMore = items.length === 100;
    offset += 100;
  }

  return allItems;
}

async function updateItems(token, updates) {
  if (updates.length === 0) return;

  const response = await fetch(
    `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ items: updates }),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Erreur API (update): ${response.status} ${response.statusText} - ${error}`,
    );
  }
}

async function main() {
  const token = readToken();
  if (!token) {
    console.error("❌ WEBFLOW_TOKEN manquant.");
    process.exit(1);
  }

  console.log("🔄 Synchronisation du switch display-on-app...");

  const items = await fetchAllItems(token);
  let updatedCount = 0;

  // Préparer les updates par batch de 100
  let batch = [];

  for (const item of items) {
    const freeTags = item.fieldData?.["free-tags"] || "";
    const shouldDisplay = freeTags.trim().length > 0;
    const current = !!item.fieldData?.["display-on-app"];

    if (current !== shouldDisplay) {
      batch.push({
        id: item.id,
        fieldData: {
          "display-on-app": shouldDisplay,
        },
      });
      updatedCount += 1;
    }

    if (batch.length >= 100) {
      await updateItems(token, batch);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await updateItems(token, batch);
  }

  console.log(`✅ Synchronisation terminée. Items mis à jour: ${updatedCount}`);
}

main().catch((error) => {
  console.error("❌ Erreur:", error.message);
  process.exit(1);
});
