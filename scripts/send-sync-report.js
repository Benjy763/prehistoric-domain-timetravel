#!/usr/bin/env node

/**
 * E-mail after a sync of the robot, sent only when there is something to look
 * at: contents added to the globe, removed, left unplaced, or a failed run. A
 * failure to send never fails the run: the file is already published.
 *
 * Usage: node scripts/send-sync-report.js <previous-file> <new-file>
 *        node scripts/send-sync-report.js --failed
 * Needs RESEND_API_KEY and REPORT_TO; reads ENVIRONMENT and RUN_URL.
 */

const fs = require("fs");

const isPlaced = (item) => Object.keys(item.periods || {}).length > 0;

/** What changed on the globe between two files. A content stays unplaced quietly once reported. */
function summarize(previous, next) {
  const before = new Map(previous.items.map((item) => [item.id, item]));
  const nextIds = new Set(next.items.map((item) => item.id));
  const wanted = next.items.filter((item) => item.displayOnApp);
  return {
    added: wanted.filter((item) => isPlaced(item) && !(before.get(item.id) && isPlaced(before.get(item.id)))),
    unplaced: wanted.filter((item) => !isPlaced(item) && !before.get(item.id)?.displayOnApp),
    removed: previous.items.filter((item) => isPlaced(item) && !nextIds.has(item.id)),
  };
}

function reportText({ added, unplaced, removed }, environment) {
  const section = (title, items, line) =>
    items.length > 0 ? [`${title} (${items.length})`, ...items.map(line), ""] : [];
  return [
    `Globe, ${environment}.`,
    "",
    ...section("Now on the globe", added, (i) => `- ${i.name}: ${i.location || i.freeTags} -> ${i.sitePageUrl}`),
    ...section("Not placed, to look at", unplaced, (i) => `- ${i.name} (${i.slug}), tags: ${i.freeTags || "none"}`),
    ...section("Gone from the globe", removed, (i) => `- ${i.name} (${i.slug})`),
    "A wrong position: ask Claude for a manual fix of the position of this content.",
  ].join("\n");
}

async function send(subject, text) {
  const { RESEND_API_KEY, REPORT_TO } = process.env;
  if (!(RESEND_API_KEY && REPORT_TO)) {
    console.log("No e-mail settings: report not sent.");
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: "Prehistoric Domain <contact@prehistoricdomain.com>",
      to: [REPORT_TO],
      subject,
      text,
    }),
  });
  console.log(response.ok ? "Report sent." : `Report not sent: HTTP ${response.status}.`);
}

async function main() {
  const environment = process.env.ENVIRONMENT || "unknown";
  if (process.argv.includes("--failed")) {
    await send(
      `Globe ${environment}: update failed`,
      `The update of the globe failed: the previous file stays online.\n\n${process.env.RUN_URL || ""}`,
    );
    return;
  }
  const [previousPath, nextPath] = process.argv.slice(2);
  const changes = summarize(
    JSON.parse(fs.readFileSync(previousPath, "utf8")),
    JSON.parse(fs.readFileSync(nextPath, "utf8")),
  );
  const count = changes.added.length + changes.unplaced.length + changes.removed.length;
  console.log(`${changes.added.length} added, ${changes.unplaced.length} not placed, ${changes.removed.length} gone.`);
  if (count > 0) {
    await send(
      `Globe ${environment}: ${changes.added.length} added, ${changes.unplaced.length} not placed`,
      reportText(changes, environment),
    );
  }
}

if (require.main === module) {
  main().catch((error) => console.log(`Report not sent: ${error.message}`));
}

module.exports = { summarize, reportText };
