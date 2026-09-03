import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Work image limit is six in browser and canonical save RPC", async () => {
  const [client, migration] = await Promise.all([
    read("../app/rupantar/cloudinary.ts"),
    read("../supabase/migrations/20260904010000_expand_work_images_to_six.sql"),
  ]);

  assert.match(client, /export const maximumWorkImages = 6/);
  assert.match(client, /files\.length > maximumWorkImages/);
  assert.match(migration, /jsonb_array_length\(normalized_images\) > 6/);
  assert.match(migration, /at most six images/);
  assert.match(migration, /Admin authorization required/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /p_blog_url text/);
  assert.match(migration, /'home-construction','interior'/);
});

test("Admin Work editor keeps a compact two-column six-slot image grid with preview and remove", async () => {
  const [admin, enhancer] = await Promise.all([
    read("../app/rupantar/admin.tsx"),
    read("../app/work-six-image-enhancer.ts"),
  ]);

  assert.match(admin, /Array\.from\(\{ length: maximumWorkImages \}/);
  assert.match(admin, /aria-label="Remove image"/);
  assert.match(admin, /onRemoveWorkImage\(index\)/);
  assert.match(enhancer, /rh-admin-work-image-grid/);
  assert.match(enhancer, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(enhancer, /grid-template-rows: repeat\(3,/);
  assert.match(enhancer, /openLightbox\(\[\{ id: image\.src/);
  assert.match(enhancer, /input\.click\(\)/);
});

test("dedicated Work pages use the stacked six-image viewer with arrows and swipe", async () => {
  const [index, enhancer] = await Promise.all([
    read("../index.html"),
    read("../app/work-six-image-enhancer.ts"),
  ]);

  assert.match(index, /work-six-image-enhancer\.ts/);
  assert.match(enhancer, /loadPublicWorkBySlug/);
  assert.match(enhancer, /work\.images\.filter[\s\S]*slice\(0, 6\)/);
  assert.match(enhancer, /rh-work-stack-gallery/);
  assert.match(enhancer, /images\.slice\(1\)\.reverse\(\)/);
  assert.match(enhancer, /translateY\(var\(--rh-stack-offset/);
  assert.match(enhancer, /Previous image/);
  assert.match(enhancer, /Next image/);
  assert.match(enhancer, /ArrowLeft/);
  assert.match(enhancer, /ArrowRight/);
  assert.match(enhancer, /pointerdown/);
  assert.match(enhancer, /pointerup/);
  assert.match(enhancer, /Math\.abs\(delta\) < 42/);
});
