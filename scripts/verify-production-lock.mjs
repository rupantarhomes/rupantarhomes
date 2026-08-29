import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../.github/production-lock.json', import.meta.url), 'utf8'));
const failures = [];

for (const [path, expected] of Object.entries(manifest.objects)) {
  let actual;
  try {
    actual = execFileSync('git', ['rev-parse', `HEAD:${path}`], { encoding: 'utf8' }).trim();
  } catch {
    failures.push(`${path}: missing (expected ${expected})`);
    continue;
  }

  if (actual !== expected) {
    failures.push(`${path}: ${actual} != ${expected}`);
  }
}

if (failures.length) {
  console.error('\nPRODUCTION HANDOVER LOCK FAILED\n');
  console.error(`Frozen baseline: ${manifest.baseline_commit}`);
  console.error('Production-bearing code/configuration drifted from the accepted handover manifest:\n');
  for (const failure of failures) console.error(` - ${failure}`);
  console.error('\nIf this is an intentional post-handover production change, verify it completely, update only the affected fingerprints in .github/production-lock.json, and document the accepted new baseline in docs/PRODUCTION-BASELINE.md in the same reviewed PR.');
  process.exit(1);
}

console.log(`Production handover lock verified against baseline ${manifest.baseline_commit}.`);
