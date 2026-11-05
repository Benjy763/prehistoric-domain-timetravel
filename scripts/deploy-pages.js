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
 * Usage: node scripts/deploy-pages.js <project-name> <staging|beta>
 *        node scripts/deploy-pages.js <project-name> main --production
 * The project name can also be set via CLOUDFLARE_PAGES_PROJECT.
 *
 * staging and beta get their own address (<target>.<project>.pages.dev) and
 * read their contents from a file on R2 that the sync robot keeps up to date.
 * main is what the Webflow site shows: it keeps its built-in file and needs
 * --production, on purpose. Only this script's code deploys: never the data.
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const DIST_DIR = path.resolve(__dirname, "../dist");
const ROOT_DIR = path.resolve(__dirname, "..");

// The contents file of each target (same names in .github/workflows/sync-globe.yml)
const CONTENT_DATA_URLS = {
  staging: "https://media.prehistoricdomain.com/globe/staging/content-data.json",
  beta: "https://media.prehistoricdomain.com/globe/beta/content-data.json",
  main: "",
};

function build(target) {
  execFileSync("npm", ["run", "build"], {
    cwd: ROOT_DIR,
    stdio: "inherit",
    env: { ...process.env, GLOBE_CONTENT_DATA_URL: CONTENT_DATA_URLS[target] },
  });
}

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

function deploy(projectName, target) {
  assertWranglerAuthenticated();
  build(target);
  assertBuilt();

  console.log(`Deploying ${DIST_DIR} to "${target}" of Cloudflare Pages project "${projectName}"...`);

  // stdio: "inherit" so wrangler's own output (including any first-deploy
  // project-creation prompt) is visible directly to whoever runs this.
  execFileSync(
    "wrangler",
    // Always the named target, whatever the local git branch
    ["pages", "deploy", DIST_DIR, `--project-name=${projectName}`, `--branch=${target}`],
    { stdio: "inherit" },
  );
}

function main() {
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const projectName = args[0] || process.env.CLOUDFLARE_PAGES_PROJECT;
  const target = args[1];

  if (!projectName || !(target in CONTENT_DATA_URLS)) {
    console.error(
      "Usage: node scripts/deploy-pages.js <project-name> <staging|beta>\n" +
        "       node scripts/deploy-pages.js <project-name> main --production",
    );
    process.exit(1);
  }

  if (target === "main" && !process.argv.includes("--production")) {
    console.error('"main" is what the Webflow site shows: it needs --production.');
    process.exit(1);
  }

  try {
    deploy(projectName, target);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { deploy };
