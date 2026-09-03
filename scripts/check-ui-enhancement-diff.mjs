import { execFileSync } from "node:child_process";

const baseSha = process.argv[2]?.trim();
if (!baseSha) {
  console.error("Frontend-only guard: missing base commit SHA.");
  process.exit(2);
}

const output = execFileSync(
  "git",
  ["diff", "--name-only", "--diff-filter=ACMR", `${baseSha}...HEAD`],
  { encoding: "utf8" },
);

const changedFiles = output
  .split(/\r?\n/)
  .map((value) => value.trim().replaceAll("\\", "/"))
  .filter(Boolean);

const allowedExact = new Set([
  "app/rupantar/home-page.tsx",
  "app/rupantar/public-pages.tsx",
  "app/rupantar/shared.tsx",
  "app/rupantar/admin.tsx",
  "app/rupantar/blog-pages.tsx",
  "app/rupantar/blog-admin.tsx",
  "app/rupantar/brand-intro.tsx",
]);

const allowedPrefixes = [
  "app/rupantar/ui-enhancements/",
  "tests/ui-enhancement/",
];

function isAllowed(path) {
  if (allowedExact.has(path)) return true;
  if (allowedPrefixes.some((prefix) => path.startsWith(prefix))) return true;
  if (path.startsWith("app/") && path.endsWith(".css")) return true;
  if (path.startsWith("public/") && path.endsWith(".css")) return true;
  return false;
}

const blockedFiles = changedFiles.filter((path) => !isAllowed(path));

console.log("Frontend-only guard: reviewing changed files against the locked production boundary.");
console.log(`Changed files: ${changedFiles.length}`);

if (blockedFiles.length) {
  console.error("\nBLOCKED: this frontend-only PR touches files outside the approved UI allowlist:\n");
  for (const path of blockedFiles) console.error(`  - ${path}`);
  console.error("\nBackend, data, security, deployment, dependencies, production guard scripts, content contracts and mixed business-logic files are locked for frontend-only branch families.");
  console.error("If a locked file genuinely needs to change, stop this frontend-only PR and make that work separately with explicit production-system review.");
  process.exit(1);
}

console.log("PASS: every changed file is inside the approved frontend-only allowlist.");
