import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("production lock fails closed for missing protection, malformed fingerprints and schema drift", async () => {
  const manifest = JSON.parse(await readFile(new URL("../.github/production-lock.json", import.meta.url), "utf8"));
  const script = await readFile(new URL("../scripts/verify-production-lock.mjs", import.meta.url), "utf8");
  const directory = await mkdtemp(join(tmpdir(), "rupantar-lock-test-"));
  try {
    await mkdir(join(directory, "scripts"));
    await mkdir(join(directory, ".github"));
    await writeFile(join(directory, "scripts/verify-production-lock.mjs"), script);
    const invalid = [
      { ...manifest, objects: {} },
      { ...manifest, objects: Object.fromEntries(Object.entries(manifest.objects).filter(([path]) => path !== "functions")) },
      { ...manifest, objects: { ...manifest.objects, app: "HEAD:app" } },
      { ...manifest, schema: 2 },
    ];
    for (const candidate of invalid) {
      await writeFile(join(directory, ".github/production-lock.json"), JSON.stringify(candidate));
      const result = spawnSync(process.execPath, [join(directory, "scripts/verify-production-lock.mjs")], { encoding: "utf8" });
      assert.equal(result.status, 1, "invalid lock must not pass even when no objects are compared");
      assert.match(result.stderr, /Invalid production lock manifest/);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
