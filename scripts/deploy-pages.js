#!/usr/bin/env node

/**
 * Deploy the built site (dist/) to Cloudflare Pages via the wrangler CLI.
 * No npm dependency — wrangler is a globally installed system binary
 * (`npm install -g wrangler`), same pattern as the project's other scripts
 * that shell out to native tools (sips, rsync).
 *
 * Auth: `wrangler login` (OAuth, stored locally in ~/.wrangler — never in
 * this repo). Run it once before the first deploy.
 *
 * Usage: node scripts/deploy-pages.js [project-name]
 * The project name can also be set via CLOUDFLARE_PAGES_PROJECT.
 * On the very first deploy for a given name, wrangler creates the Pages
 * project automatically (may prompt interactively).
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIST_DIR = path.resolve(__dirname, "../dist");

function assertBuilt() {
  if (!fs.existsSync(DIST_DIR) || fs.readdirSync(DIST_DIR).length === 0) {
    throw new Error(`${DIST_DIR} is missing or empty — run "npm run build" first`);
  }
}

function assertWranglerAuthenticated() {
  // `wrangler whoami` exits 0 even when logged out — it just prints a
  // message — so the auth state has to be read from stdout, not the exit code.
  const output = execFileSync("wrangler", ["whoami"], { encoding: "utf8" });
  if (/not authenticated/i.test(output)) {
    throw new Error(
      'wrangler is not authenticated — run "wrangler login" first (see PLAN_artist-submission-pipeline.md section 9)',
    );
  }
}

function deploy(projectName) {
  assertBuilt();
  assertWranglerAuthenticated();

  console.log(`Deploying ${DIST_DIR} to Cloudflare Pages project "${projectName}"...`);

  // stdio: "inherit" so wrangler's own output (including any first-deploy
  // project-creation prompt) is visible directly to whoever runs this.
  execFileSync(
    "wrangler",
    ["pages", "deploy", DIST_DIR, `--project-name=${projectName}`],
    { stdio: "inherit" },
  );
}

function main() {
  const projectName = process.argv[2] || process.env.CLOUDFLARE_PAGES_PROJECT;

  if (!projectName) {
    console.error(
      "Usage: node scripts/deploy-pages.js <project-name>\n" +
        "(or set CLOUDFLARE_PAGES_PROJECT)",
    );
    process.exit(1);
  }

  try {
    deploy(projectName);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { deploy };
