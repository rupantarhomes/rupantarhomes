import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

const canonicalCategories = [
  "architect",
  "modular-kitchen",
  "tv-cabinet",
  "wardrobe",
  "hydraulic-bed",
  "false-ceiling",
  "parqueting",
  "railing",
  "home-construction",
  "interior",
];

test("keeps the public inquiry path aligned with every canonical service category", async () => {
  const [data, cloudflare, migration] = await Promise.all([
    read("../app/rupantar/data.ts"),
    read("../functions/api/inquiries.ts"),
    read("../supabase/migrations/20260903143000_align_public_inquiry_categories.sql"),
  ]);

  for (const category of canonicalCategories) {
    assert.match(data, new RegExp(`slug: ["']${category}["']`), `frontend is missing ${category}`);
    assert.match(cloudflare, new RegExp(`["']${category}["']`), `Cloudflare inquiry validation is missing ${category}`);
    assert.match(migration, new RegExp(`["']${category}["']`), `database inquiry validation is missing ${category}`);
  }

  assert.match(migration, /queries_category_allowed/);
  assert.match(migration, /estimate_requests_category_allowed/);
  assert.match(migration, /create or replace function public\.submit_public_inquiry/);
  assert.match(migration, /when btrim\(coalesce\(p_category, ''\)\) = 'interior-designing' then 'architect'/);
  assert.match(migration, /revoke all on function public\.submit_public_inquiry[\s\S]*from public, anon, authenticated/);
  assert.match(migration, /grant execute on function public\.submit_public_inquiry[\s\S]*to service_role/);
});

test("production verification includes strict TypeScript checking", async () => {
  const packageJson = JSON.parse(await read("../package.json"));
  assert.equal(packageJson.scripts.typecheck, "tsc --noEmit");
  assert.match(packageJson.scripts.verify, /npm run typecheck/);
  assert.match(packageJson.scripts.verify, /npm run build/);
  assert.match(packageJson.scripts.verify, /npm test/);
});

test("public inquiry delivery stays server mediated, bounded and rate limited", async () => {
  const [repository, cloudflare, edge, restriction, http] = await Promise.all([
    read("../app/rupantar/repository.ts"),
    read("../functions/api/inquiries.ts"),
    read("../supabase/functions/submit-public-inquiry/index.ts"),
    read("../supabase/migrations/20260815193000_restrict_public_inquiry_rpc.sql"),
    read("../functions/_lib/http.ts"),
  ]);

  assert.match(repository, /fetchWithTimeout\("\/api\/inquiries"/);
  assert.match(cloudflare, /requireSameOrigin/);
  assert.match(cloudflare, /PUBLIC_INQUIRY_GLOBAL_RATE_LIMITER/);
  assert.match(cloudflare, /PUBLIC_INQUIRY_RATE_LIMITER/);
  assert.match(cloudflare, /verifyImageSignature/);
  assert.match(cloudflare, /functions\/v1\/submit-public-inquiry/);
  assert.match(cloudflare, /const inquiryAssetFolder = "rupantar-homes\/inquiries"/);
  assert.match(cloudflare, /fetchWithTimeout\([\s\S]*api\.cloudinary\.com/);
  assert.match(cloudflare, /fetchWithTimeout\([\s\S]*api\.web3forms\.com/);
  assert.match(edge, /X-Rupantar-Internal-Secret/);
  assert.match(edge, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(edge, /fetchWithTimeout/);
  assert.match(restriction, /revoke execute[\s\S]*from anon, authenticated/i);
  assert.match(restriction, /grant execute[\s\S]*to service_role/i);
  assert.match(http, /AbortController/);
});

test("Admin Work media keeps atomic persistence, bounded dependencies and reference-safe cleanup", async () => {
  const [repository, saveMigration, cleanupMigration, cloudinary, serverCloudinary, deleteEndpoint, auth] = await Promise.all([
    read("../app/rupantar/repository.ts"),
    read("../supabase/migrations/20260903130000_allow_interior_work_rpc_category.sql"),
    read("../supabase/migrations/20260820190000_prevent_stale_cloudinary_cleanup.sql"),
    read("../app/rupantar/cloudinary.ts"),
    read("../functions/_lib/cloudinary.ts"),
    read("../functions/api/cloudinary-delete.ts"),
    read("../functions/_lib/admin-auth.ts"),
  ]);

  assert.match(repository, /rpc\("save_work_with_images"/);
  assert.match(repository, /rpc\("delete_work_with_images"/);
  assert.match(repository, /const category = trimmed\(form\.category\) \|\| "architect"/);
  assert.match(repository, /const adminWorksBatchSize = 1000/);
  assert.match(repository, /for \(let nextOffset = mappedWorks\.length; nextOffset < total; nextOffset \+= adminWorksBatchSize\)/);
  assert.match(saveMigration, /Admin authorization required/);
  assert.match(cleanupMigration, /pg_advisory_xact_lock/);
  assert.match(cleanupMigration, /claim_unreferenced_cloudinary_images/);
  assert.match(cloudinary, /export const maximumWorkImages = 3/);
  assert.match(cloudinary, /format !== "webp"/);
  assert.match(cloudinary, /width > 1920 \|\| height > 1080/);
  assert.match(cloudinary, /fetchWithTimeout/);
  assert.match(serverCloudinary, /fetchWithTimeout/);
  assert.match(deleteEndpoint, /claimUnreferencedImages/);
  assert.match(deleteEndpoint, /fetchWithTimeout/);
  assert.match(auth, /fetchWithTimeout/);
});

test("the public runtime has crash recovery and dead review links cannot masquerade as actions", async () => {
  const [entry, boundary] = await Promise.all([
    read("../app/client-entry.tsx"),
    read("../app/rupantar/error-boundary.tsx"),
  ]);

  assert.match(entry, /<SiteErrorBoundary>/);
  assert.match(entry, /if \(link\.getAttribute\("href"\) === "#"\)/);
  assert.match(entry, /link\.hidden = true/);
  assert.match(boundary, /getDerivedStateFromError/);
  assert.match(boundary, /window\.location\.reload\(\)/);
  assert.match(boundary, /window\.location\.assign\("\/"\)/);
});

test("health endpoint checks the core database dependency without exposing secrets", async () => {
  const health = await read("../functions/api/health.ts");
  assert.match(health, /site_settings/);
  assert.match(health, /fetchWithTimeout/);
  assert.match(health, /database: "ok"/);
  assert.match(health, /database: "unavailable"/);
  assert.doesNotMatch(health, /SERVICE_ROLE|API_SECRET|PUBLIC_INQUIRY_INTERNAL_SECRET/);
});
