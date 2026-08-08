import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("builds the Cloudflare Pages entry document", async () => {
  const html = await read("../dist/index.html");
  assert.match(html, /<title>Rupantar Homes<\/title>/i);
  assert.match(html, /id="root"/i);
  assert.match(html, /\/assets\/index-[^"]+\.js/i);
  assert.match(html, /\/assets\/rupantar-favicon\.png/i);
});

test("keeps every locked public and admin surface in source components", async () => {
  const [home, publicPages, admin] = await Promise.all([
    read("../app/rupantar/home-page.tsx"),
    read("../app/rupantar/public-pages.tsx"),
    read("../app/rupantar/admin.tsx"),
  ]);

  assert.match(home, /Recent Works/);
  assert.match(home, /Have a Query\?/);
  assert.match(home, /How We Work/);
  assert.match(publicPages, /All Works/);
  assert.match(publicPages, /Project Overview/);
  assert.match(publicPages, /About Rupantar Homes/);
  assert.match(admin, /Admin Login/);
  assert.match(admin, /Dashboard/);
  assert.match(admin, /Manage Works/);
  assert.match(admin, /Manage Reviews/);
  assert.match(admin, /Save Settings/);
});

test("uses Supabase instead of browser-only storage or demo authentication", async () => {
  const [site, repository, admin] = await Promise.all([
    read("../app/rupantar/site.tsx"),
    read("../app/rupantar/repository.ts"),
    read("../app/rupantar/admin.tsx"),
  ]);

  assert.doesNotMatch(site, /localStorage/);
  assert.doesNotMatch(admin, /admin123|any email\/password|demo admin/i);
  assert.match(repository, /signInWithPassword/);
  assert.match(repository, /from\("admin_users"\)/);
  assert.match(repository, /from\("work_images"\)/);
  assert.match(repository, /from\("estimate_requests"\)/);
});

test("keeps Cloudinary secrets server-side and requires admin authorization", async () => {
  const [clientUpload, signature, deleteFunction, auth] = await Promise.all([
    read("../app/rupantar/cloudinary.ts"),
    read("../functions/api/cloudinary-signature.ts"),
    read("../functions/api/cloudinary-delete.ts"),
    read("../functions/_lib/admin-auth.ts"),
  ]);

  assert.doesNotMatch(clientUpload, /CLOUDINARY_API_SECRET/);
  assert.match(signature, /requireAdmin/);
  assert.match(deleteFunction, /requireAdmin/);
  assert.match(signature, /CLOUDINARY_API_SECRET/);
  assert.match(auth, /\/auth\/v1\/user/);
  assert.match(auth, /admin_users/);
});

test("defines normalized tables, explicit grants, and RLS", async () => {
  const sql = await read("../supabase/migrations/20260809000000_rupantar_schema.sql");

  for (const table of ["admin_users", "works", "work_images", "reviews", "site_settings", "queries", "estimate_requests"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /work_id uuid not null references public\.works\(id\) on delete cascade/i);
  assert.match(sql, /public_read_works/i);
  assert.match(sql, /public_insert_estimate_requests/i);
  assert.match(sql, /grant select on table public\.works/i);
  assert.match(sql, /grant insert on table public\.queries/i);
});

test("preserves the supplied HTML as an immutable visual reference", async () => {
  const baseline = await readFile(new URL("../public/baseline/rupantar-latest.html", import.meta.url));
  assert.equal(
    createHash("sha256").update(baseline).digest("hex"),
    "74483ad7c3a1f04fe06914dc9be17b075ab4d066d4790ce5311b44ae3d9eff16",
  );
});
