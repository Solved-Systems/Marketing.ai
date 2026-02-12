#!/usr/bin/env node

/**
 * Vercel ignoreCommand.
 *
 * Exit code semantics:
 * - 0 => ignore/skip deployment
 * - 1 => continue deployment
 *
 * Policy:
 * - Only build on `dev` and `main`. Skip all feature branch previews.
 * - Skip deployment when all changed files are CI-only workflow files.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CommonJS script used by Vercel ignoreCommand.
const { execSync } = require("node:child_process");

const ALLOWED_BRANCHES = ["dev", "main"];

const CI_ONLY_REGEXES = [
  /^\.github\/workflows\//,
];

function run(command) {
  return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function detectRange() {
  const prev = process.env.VERCEL_GIT_PREVIOUS_SHA;
  const curr = process.env.VERCEL_GIT_COMMIT_SHA;
  if (prev && curr) return [prev, curr];

  try {
    const head = run("git rev-parse HEAD");
    const parent = run("git rev-parse HEAD^");
    return [parent, head];
  } catch {
    return [null, null];
  }
}

function getChangedFiles(base, head) {
  if (!base || !head) return [];
  try {
    const output = run(`git diff --name-only ${base} ${head}`);
    return output ? output.split("\n").filter(Boolean) : [];
  } catch {
    return [];
  }
}

function isCiOnly(file) {
  return CI_ONLY_REGEXES.some((regex) => regex.test(file));
}

const branch = process.env.VERCEL_GIT_COMMIT_REF || "";
if (!ALLOWED_BRANCHES.includes(branch)) {
  console.log(`[vercel-ignore-build] Branch "${branch}" is not dev or main. Skipping deployment.`);
  process.exit(0);
}

const [base, head] = detectRange();
const changedFiles = getChangedFiles(base, head);

if (changedFiles.length === 0) {
  console.log("[vercel-ignore-build] Could not determine changed files; running deployment.");
  process.exit(1);
}

const allCiOnly = changedFiles.every(isCiOnly);

console.log("[vercel-ignore-build] Changed files:");
for (const file of changedFiles) {
  console.log(`- ${file}`);
}

if (allCiOnly) {
  console.log("[vercel-ignore-build] CI-only change detected. Skipping Vercel deployment.");
  process.exit(0);
}

console.log(`[vercel-ignore-build] Building ${branch}. App-impacting change detected.`);
process.exit(1);
