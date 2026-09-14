import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("production monitoring is read-only, scheduled, and opens one recoverable incident", async () => {
  const [workflow, smoke] = await Promise.all([
    read(".github/workflows/production-monitor.yml"),
    read("scripts/production-smoke.mjs"),
  ]);
  assert.match(workflow, /cron: "\*\/15 \* \* \* \*"/);
  assert.match(workflow, /permissions:[\s\S]*contents: read[\s\S]*issues: write/);
  assert.match(workflow, /npm run smoke:production/);
  assert.match(workflow, /data\.some\(\(issue\) => issue\.title === title\)/);
  assert.match(smoke, /\/api\/health/);
  assert.match(smoke, /\/api\/public-home/);
  assert.match(smoke, /Back to Posts/);
  assert.match(smoke, /edgeChallengePattern/);
  assert.match(smoke, /sameOriginScripts/);
  assert.match(smoke, /strictFallbackReady = Object\.values\(directEvidence\)\.every\(Boolean\)/);
  assert.match(smoke, /GitHub browser was edge-blocked[\s\S]*strict direct fallback evidence was incomplete/);
  assert.match(smoke, /directEvidence\.health = true/);
  assert.match(smoke, /directEvidence\.home = true/);
  assert.match(smoke, /directEvidence\.shell = true/);
  assert.match(smoke, /directEvidence\.appEntry = true/);
  assert.doesNotMatch(smoke, /method:\s*["'](?:POST|PUT|PATCH|DELETE)["']/);
});

test("database exports are encrypted before leaving the runner", async () => {
  const workflow = await read(".github/workflows/encrypted-supabase-backup.yml");
  assert.match(workflow, /supabase@2\.117\.0 db dump/);
  assert.match(workflow, /openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000/);
  assert.match(workflow, /rm -rf backup backup\.tar\.gz/);
  assert.match(workflow, /retention-days: 30/);
  assert.doesNotMatch(workflow, /SUPABASE_DB_URL:\s*(?:postgres|postgresql):/);
});

test("build budgets and deterministic installs are mandatory", async () => {
  const [workflow, packageJson, lock, budget, dependabot] = await Promise.all([
    read(".github/workflows/production-baseline.yml"),
    read("package.json"),
    read("package-lock.json"),
    read("scripts/check-performance-budget.mjs"),
    read(".github/dependabot.yml"),
  ]);
  assert.match(workflow, /npm ci --no-audit --no-fund/);
  assert.match(workflow, /npm run budget/);
  assert.equal(JSON.parse(packageJson).devDependencies.playwright, "1.62.1");
  assert.equal(JSON.parse(lock).packages[""].devDependencies.playwright, "1.62.1");
  assert.match(budget, /entryJavaScriptGzip/);
  assert.match(dependabot, /package-ecosystem: npm/);
  assert.match(dependabot, /package-ecosystem: github-actions/);
});
