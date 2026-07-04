#!/usr/bin/env node

/**
 * MEMBERSTACK CLEANUP
 *
 * Lists or deletes inactive Memberstack accounts.
 * Default mode is DRY-RUN — no member is deleted unless --delete is passed.
 *
 * Usage:
 *   node scripts/memberstack-cleanup.js                  # dry-run, 6-month threshold
 *   node scripts/memberstack-cleanup.js --months=12      # custom threshold
 *   node scripts/memberstack-cleanup.js --include-paid   # also target members with an active paid plan (off by default)
 *   node scripts/memberstack-cleanup.js --delete         # actually delete after reviewing dry-run
 *
 * Key:
 *   Reads MEMBERSTACK_ADMIN_KEY from env or .vscode/mcp.json (gitignored).
 */

const fs = require("fs");
const path = require("path");

const ADMIN_URL = "https://admin.memberstack.com";
const DEFAULT_INACTIVE_MONTHS = 6;
const PAGE_LIMIT = 100;

function readKey() {
  if (process.env.MEMBERSTACK_ADMIN_KEY) return process.env.MEMBERSTACK_ADMIN_KEY;
  const mcpPath = path.resolve(__dirname, "../.vscode/mcp.json");
  if (!fs.existsSync(mcpPath)) return null;
  const raw = fs.readFileSync(mcpPath, "utf8");
  const m = raw.match(/"MEMBERSTACK_ADMIN_KEY"\s*:\s*"([^"]+)"/);
  return m ? m[1] : null;
}

async function fetchAllMembers(key) {
  const all = [];
  let cursor = null;
  let page = 0;

  while (true) {
    page++;
    const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (cursor) params.set("after", cursor);
    const url = `${ADMIN_URL}/members?${params}`;

    const res = await fetch(url, {
      headers: { "X-API-KEY": key, accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on page ${page}: ${await res.text()}`);
    }

    const json = await res.json();
    const items = json.data || [];
    all.push(...items);

    process.stdout.write(
      `\r📥 Chargé ${all.length}/${json.totalCount || "?"} membres (page ${page})...`,
    );

    if (!json.hasNextPage || !json.endCursor || items.length === 0) break;
    cursor = json.endCursor;
  }

  console.log();
  return all;
}

function classify(member, thresholdDate) {
  const lastLogin = member.lastLogin ? new Date(member.lastLogin) : null;
  const createdAt = new Date(member.createdAt);
  // Treat a member as inactive if their most recent activity (login if any,
  // otherwise signup) predates the threshold.
  const referenceDate = lastLogin || createdAt;
  const inactive = referenceDate < thresholdDate;

  const activePlans = (member.planConnections || []).filter(
    (p) => p.active && p.status === "ACTIVE",
  );
  const activePaidPlans = activePlans.filter((p) => p.type !== "FREE");

  return {
    id: member.id,
    email: member.auth?.email || "(no email)",
    lastLogin: member.lastLogin,
    createdAt: member.createdAt,
    neverLoggedIn: !lastLogin,
    inactive,
    hasActivePaid: activePaidPlans.length > 0,
    activePlanNames: activePlans.map((p) => `${p.planName} (${p.type})`),
  };
}

async function deleteMember(key, id) {
  const res = await fetch(`${ADMIN_URL}/members/${id}`, {
    method: "DELETE",
    headers: { "X-API-KEY": key },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }
}

function formatDate(iso) {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "—";
}

async function main() {
  const args = process.argv.slice(2);
  const monthsArg = args.find((a) => a.startsWith("--months="));
  const months = monthsArg
    ? parseInt(monthsArg.split("=")[1], 10)
    : DEFAULT_INACTIVE_MONTHS;
  const shouldDelete = args.includes("--delete");
  const includePaid = args.includes("--include-paid");

  const key = readKey();
  if (!key) {
    console.error(
      "❌ MEMBERSTACK_ADMIN_KEY introuvable. Ajoute-la dans .vscode/mcp.json sous \"secrets\" ou en variable d'env.",
    );
    process.exit(1);
  }

  console.log(
    `\n🔍 Memberstack cleanup — seuil: ${months} mois sans connexion`,
  );
  console.log(
    `   Mode: ${shouldDelete ? "🗑️  SUPPRESSION RÉELLE" : "👀 DRY-RUN (rien ne sera supprimé)"}`,
  );
  console.log(
    `   Plans payants actifs: ${includePaid ? "⚠️  inclus (--include-paid)" : "protégés (skip par défaut)"}\n`,
  );

  const threshold = new Date();
  threshold.setMonth(threshold.getMonth() - months);
  console.log(`   Seuil de date: ${threshold.toISOString().slice(0, 10)}\n`);

  const members = await fetchAllMembers(key);
  console.log();

  const classified = members.map((m) => classify(m, threshold));
  const inactive = classified.filter((c) => c.inactive);
  const candidates = inactive.filter((c) => includePaid || !c.hasActivePaid);

  // SAFETY AUDIT: re-verify every candidate is genuinely older than the threshold.
  // This catches any classification mistake before a deletion is even considered.
  const recentLeak = candidates.filter((c) => {
    const ref = c.lastLogin ? new Date(c.lastLogin) : new Date(c.createdAt);
    return !(ref < threshold);
  });
  if (recentLeak.length > 0) {
    console.error(
      `\n🛑 ANOMALIE: ${recentLeak.length} candidat(s) avec activité postérieure au seuil. Arrêt par sécurité.\n`,
    );
    recentLeak
      .slice(0, 10)
      .forEach((c) =>
        console.error(`   - ${c.email} | last=${c.lastLogin} created=${c.createdAt}`),
      );
    process.exit(2);
  }
  console.log(
    `🛡️  Audit sécurité: 0/${candidates.length} candidat(s) avec activité < ${months} mois — OK.\n`,
  );

  const stats = {
    total: members.length,
    inactive: inactive.length,
    neverLogged: inactive.filter((c) => c.neverLoggedIn).length,
    inactivePaidSkipped: inactive.filter((c) => c.hasActivePaid).length,
  };

  console.log(`📊 Statistiques:`);
  console.log(`   Total membres: ${stats.total}`);
  console.log(`   Inactifs (>${months} mois): ${stats.inactive}`);
  console.log(`     - jamais connectés: ${stats.neverLogged}`);
  console.log(
    `     - avec plan payant actif: ${stats.inactivePaidSkipped} ${includePaid ? "(inclus)" : "(skip)"}`,
  );
  console.log(`\n🎯 Candidats à supprimer: ${candidates.length}\n`);

  if (candidates.length === 0) {
    console.log("✅ Aucun candidat. Rien à faire.\n");
    return;
  }

  // Preview
  const previewLimit = 30;
  const preview = candidates.slice(0, previewLimit);
  for (const c of preview) {
    const last = c.lastLogin
      ? `last login ${formatDate(c.lastLogin)}`
      : `jamais (créé ${formatDate(c.createdAt)})`;
    const plans = c.activePlanNames.length
      ? ` [${c.activePlanNames.join(", ")}]`
      : " [aucun plan actif]";
    console.log(`  - ${c.email} | ${last}${plans}`);
  }
  if (candidates.length > previewLimit) {
    console.log(`  ... et ${candidates.length - previewLimit} autres`);
  }

  if (!shouldDelete) {
    console.log(`\n💡 Pour supprimer ces ${candidates.length} comptes:`);
    console.log(
      `   node scripts/memberstack-cleanup.js --months=${months}${includePaid ? " --include-paid" : ""} --delete\n`,
    );
    return;
  }

  // Real deletion
  console.log(`\n⚠️  SUPPRESSION de ${candidates.length} comptes...\n`);
  let ok = 0;
  let fail = 0;
  const failures = [];
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];

    // Last-line-of-defense re-check: never delete a member whose
    // reference date isn't strictly older than the threshold.
    const ref = c.lastLogin ? new Date(c.lastLogin) : new Date(c.createdAt);
    if (!(ref < threshold)) {
      fail++;
      failures.push(`${c.email}: SKIP (safety re-check: ref=${ref.toISOString()} >= seuil)`);
      continue;
    }

    try {
      await deleteMember(key, c.id);
      ok++;
    } catch (e) {
      fail++;
      failures.push(`${c.email}: ${e.message}`);
    }
    process.stdout.write(
      `\r🗑️  ${i + 1}/${candidates.length} (${ok} ok, ${fail} échec)`,
    );
  }
  console.log(`\n\n✅ ${ok} supprimés, ${fail} échecs.\n`);
  if (failures.length > 0) {
    console.log("Échecs détaillés:");
    failures.slice(0, 20).forEach((f) => console.log(`  - ${f}`));
  }
}

main().catch((e) => {
  console.error("\n❌ Erreur:", e.message);
  process.exit(1);
});
