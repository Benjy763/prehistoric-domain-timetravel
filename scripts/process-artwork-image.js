#!/usr/bin/env node

/**
 * Resize and encode a submitted artwork image into the two variants the CMS
 * expects (low: gallery thumbnail, high: full-res display image), both AVIF.
 *
 * Uses `ffmpeg` (libaom-av1 encoder) — not `sips`, which cannot encode AVIF
 * at all. Converting a compressed JPEG source to lossless PNG (the previous
 * approach) inflated file size ~9x for zero quality gain; ffmpeg encodes
 * directly to AVIF, matching (and typically beating) manual XnConvert output
 * sizes. No npm dependency — `ffmpeg`/`ffprobe` are system binaries (Homebrew:
 * `brew install ffmpeg`), same pattern as the project's other scripts that
 * shell out to native tools (sips, rsync, wrangler).
 *
 * Usage: node scripts/process-artwork-image.js <input-image-path> <slug> [output-dir]
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const LOW_WIDTH = 1000;
const HIGH_WIDTH = 3840;
// libaom-av1 CRF (0-63, lower = higher quality/bigger file). Low variant is a
// thumbnail (favor size); high variant is the full display image (favor quality).
const LOW_CRF = 30;
const HIGH_CRF = 22;

function assertFfmpegAvailable() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
  } catch (error) {
    throw new Error(
      "ffmpeg/ffprobe not found — install with `brew install ffmpeg` (required for AVIF encoding)",
    );
  }
}

function getPixelWidth(imagePath) {
  const output = execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width",
      "-of",
      "csv=p=0",
      imagePath,
    ],
    { encoding: "utf8" },
  ).trim();
  const width = parseInt(output, 10);
  if (!width) {
    throw new Error(`Could not read width from ffprobe output for ${imagePath}`);
  }
  return width;
}

function encodeToAvif(inputPath, targetWidth, crf, outputPath) {
  execFileSync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    inputPath,
    "-vf",
    `scale=min(${targetWidth}\\,iw):-2`,
    "-c:v",
    "libaom-av1",
    "-crf",
    String(crf),
    "-b:v",
    "0",
    "-cpu-used",
    "4",
    outputPath,
  ]);
}

/**
 * @param {string} inputPath - Source image (any ffmpeg-readable format: jpeg, png, ...)
 * @param {string} slug - CMS item slug, used to name the output files
 * @param {string} [outputDir] - Defaults to the input file's directory
 * @returns {{low: string, high: string}} Paths to the generated AVIF variants
 */
function processArtworkImage(inputPath, slug, outputDir) {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input image not found: ${inputPath}`);
  }
  assertFfmpegAvailable();

  const dir = outputDir || path.dirname(inputPath);
  const originalWidth = getPixelWidth(inputPath);

  const lowPath = path.join(dir, `${slug}-low.avif`);
  const highPath = path.join(dir, `${slug}-high.avif`);

  // scale=min(N,iw) already prevents upscaling, but clamp explicitly too so
  // the two calls stay obviously capped at the source's own resolution.
  const lowWidth = Math.min(LOW_WIDTH, originalWidth);
  const highWidth = Math.min(HIGH_WIDTH, originalWidth);

  encodeToAvif(inputPath, lowWidth, LOW_CRF, lowPath);
  encodeToAvif(inputPath, highWidth, HIGH_CRF, highPath);

  return { low: lowPath, high: highPath };
}

function main() {
  const [inputPath, slug, outputDir] = process.argv.slice(2);

  if (!inputPath || !slug) {
    console.error(
      "Usage: node scripts/process-artwork-image.js <input-image-path> <slug> [output-dir]",
    );
    process.exit(1);
  }

  try {
    const result = processArtworkImage(inputPath, slug, outputDir);
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { processArtworkImage };
