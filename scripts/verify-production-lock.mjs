import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../.github/production-lock.json', import.meta.url), 'utf8'));
// The manifest must not be able to silently remove an existing protected path.
const requiredPaths = [
  '.cloudflare-deploy-trigger', '.env.example', '.github/workflows/production-baseline.yml',
  'app', 'eslint.config.mjs', 'functions', 'index.html', 'package.json', 'pnpm-workspace.yaml',
  'public', 'scripts', 'supabase', 'tests', 'tsconfig.json', 'vite.config.ts', 'worker-configuration.d.ts',
];
if (manifest.schema !== 1 || !manifest.objects || Array.isArray(manifest.objects)
  || !requiredPaths.every((path) => Object.hasOwn(manifest.objects, path))
  || !Object.values(manifest.objects).every((sha) => typeof sha === 'string' && /^[0-9a-f]{40}$/.test(sha))) {
  console.error('Invalid production lock manifest: schema, protected paths and literal Git fingerprints are required.');
  process.exit(1);
}
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
