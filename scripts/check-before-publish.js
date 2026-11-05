#!/usr/bin/env node

/**
 * Last check before the robot replaces the published contents file: a refusal
 * leaves the previous file online. No npm dependency, like the other scripts.
 *
 * Usage: node scripts/check-before-publish.js <previous-file> <new-file>
 */

const fs = require("fs");

// More than this share of contents gone at once is a failure, not an edit
const MAX_LOSS = 0.1;

/** Why the new data must not be published; empty when it can be. */
function findProblems(previous, next) {
  if (!Array.isArray(next?.items) || next.items.length === 0) {
    return ["The new file has no contents."];
  }
  const problems = [];
  const before = previous?.items?.length ?? 0;
  if (before > 0 && next.items.length < before * (1 - MAX_LOSS)) {
    problems.push(`Too many contents gone at once: ${before} before, ${next.items.length} now.`);
  }
  for (const item of next.items) {
    for (const [time, position] of Object.entries(item.periods || {})) {
      if (!(Number.isFinite(position?.lat) && Number.isFinite(position?.lon))) {
        problems.push(`${item.slug}: no coordinates at ${time} Ma.`);
      }
    }
  }
  return problems;
}

function main() {
  const [previousPath, nextPath] = process.argv.slice(2);
  const problems = findProblems(
    JSON.parse(fs.readFileSync(previousPath, "utf8")),
    JSON.parse(fs.readFileSync(nextPath, "utf8")),
  );
  if (problems.length > 0) {
    console.error(`Not published:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Checked: the file can be published.");
}

if (require.main === module) {
  main();
}

module.exports = { findProblems };
