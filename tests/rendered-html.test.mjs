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
  const [site, repository, admin, supabase] = await Promise.all([
    read("../app/rupantar/site.tsx"),
    read("../app/rupantar/repository.ts"),
    read("../app/rupantar/admin.tsx"),
    read("../app/rupantar/supabase.ts"),
  ]);

  assert.doesNotMatch(site, /localStorage/);
  assert.doesNotMatch(admin, /admin123|any email\/password|demo admin/i);
  assert.match(repository, /signInWithPassword/);
  assert.match(repository, /from\("admin_users"\)/);
  assert.match(repository, /from\("work_images"\)/);
  assert.match(repository, /from\("estimate_requests"\)/);
  assert.match(supabase, /createClient<Database>/);
});

test("uses only the canonical production column contract", async () => {
  const repository = await read("../app/rupantar/repository.ts");

  for (const column of [
    "short_description",
    "long_description",
    "byte_size",
    "instagram_url",
    "tiktok_url",
    "approximate_size",
    "material_preference",
  ]) {
    assert.match(repository, new RegExp(`\\b${column}\\b`));
  }

  assert.doesNotMatch(repository, /\bshort_desc\s*:/);
  assert.doesNotMatch(repository, /\blong_desc\s*:/);
  assert.doesNotMatch(repository, /\binstagram_link\s*:/);
  assert.doesNotMatch(repository, /\bsize\s*:/);
  assert.doesNotMatch(repository, /\bmaterial\s*:/);
});

test("keeps Cloudinary secrets server-side and requires admin authorization", async () => {
  const [clientUpload, signature, deleteFunction, cloudinaryHelper, auth, site, admin] = await Promise.all([
    read("../app/rupantar/cloudinary.ts"),
    read("../functions/api/cloudinary-signature.ts"),
    read("../functions/api/cloudinary-delete.ts"),
    read("../functions/_lib/cloudinary.ts"),
    read("../functions/_lib/admin-auth.ts"),
    read("../app/rupantar/site.tsx"),
    read("../app/rupantar/admin.tsx"),
  ]);

  assert.doesNotMatch(clientUpload, /CLOUDINARY_API_SECRET/);
  assert.doesNotMatch(clientUpload, /Promise\.all\(\s*files\.map/);
  assert.match(clientUpload, /for \(const \[index, file\] of files\.entries\(\)\)/);
  assert.match(clientUpload, /deleteCloudinaryImages\(uploaded\.map/);
  assert.match(clientUpload, /format !== "webp"/);
  assert.match(clientUpload, /Math\.max\(width, height\) > 1920/);
  assert.match(clientUpload, /index \+= deleteBatchSize/);
  assert.match(signature, /requireAdmin/);
  assert.match(deleteFunction, /requireAdmin/);
  assert.match(signature, /CLOUDINARY_API_SECRET/);
  assert.match(signature, /c_limit,h_1080,w_1920\/f_webp\/q_auto:good/);
  assert.match(clientUpload, /body\.set\("format", signed\.format\)/);
  assert.match(clientUpload, /body\.set\("transformation", signed\.transformation\)/);
  assert.match(deleteFunction, /destroyCloudinaryImage/);
  assert.match(cloudinaryHelper, /body\?\.result === "ok"/);
  assert.match(cloudinaryHelper, /body\?\.result === "not found"/);
  assert.match(auth, /\/auth\/v1\/user/);
  assert.match(auth, /admin_users/);
  assert.match(site, /deletedImagePublicIds = await deleteWork\(id\)[\s\S]*await deleteCloudinaryImages\(deletedImagePublicIds\)/);
  assert.match(site, /draftImagePublicIds/);
  assert.match(site, /handleRemoveWorkImage/);
  assert.match(clientUpload, /export const maximumWorkImages = 3/);
  assert.match(clientUpload, /files\.length > maximumWorkImages/);
  assert.match(site, /remainingImageSlots = maximumWorkImages - currentImageCount/);
  assert.match(admin, /grid-cols-3/);
  assert.match(admin, /Array\.from\(\{ length: maximumWorkImages \}/);
  assert.match(admin, /multiple/);
});

test("saves complete work aggregates through atomic Supabase RPCs", async () => {
  const [repository, site, sql, databaseTypes] = await Promise.all([
    read("../app/rupantar/repository.ts"),
    read("../app/rupantar/site.tsx"),
    read("../supabase/migrations/20260809200422_atomic_work_crud.sql"),
    read("../app/rupantar/database.types.ts"),
  ]);

  const saveStart = repository.indexOf("export async function saveWork");
  const deleteStart = repository.indexOf("export async function deleteWork");
  const saveSource = repository.slice(saveStart, deleteStart);

  assert.ok(saveStart >= 0 && deleteStart > saveStart);
  assert.match(saveSource, /rpc\("save_work_with_images"/);
  assert.doesNotMatch(saveSource, /\.from\("works"\)|\.from\("work_images"\)/);
  assert.match(repository, /rpc\("delete_work_with_images"/);
  assert.match(site, /await saveWork\(workForm, editingWorkId\)[\s\S]*await refreshContent\(\)/);
  assert.match(site, /deletedImagePublicIds = await deleteWork\(id\)[\s\S]*await refreshContent\(\)/);

  assert.match(sql, /create or replace function public\.save_work_with_images/i);
  assert.match(sql, /security invoker[\s\S]*set search_path = ''/i);
  assert.match(sql, /delete from public\.work_images[\s\S]*insert into public\.work_images/i);
  assert.match(sql, /raise exception[\s\S]*Work was not found or is not writable/i);
  assert.match(sql, /revoke all on function public\.save_work_with_images[\s\S]*from public, anon, authenticated, service_role/i);
  assert.match(sql, /grant execute on function public\.save_work_with_images[\s\S]*to authenticated/i);
  assert.match(sql, /create or replace function public\.delete_work_with_images/i);
  assert.match(sql, /array_agg\(image\.cloudinary_public_id order by image\.sort_order, image\.id\)/i);
  assert.match(databaseTypes, /save_work_with_images:/);
  assert.match(databaseTypes, /delete_work_with_images:/);
});

test("keeps secondary content flows validated and synchronized", async () => {
  const [repository, site, home, admin] = await Promise.all([
    read("../app/rupantar/repository.ts"),
    read("../app/rupantar/site.tsx"),
    read("../app/rupantar/home-page.tsx"),
    read("../app/rupantar/admin.tsx"),
  ]);

  assert.match(repository, /requiredText\(form\.name, "Review name"\)/);
  assert.match(repository, /httpsUrl\(form\.instagramLink, "Instagram link", true\)/);
  assert.match(repository, /httpsUrl\(settings\.instagram, "Instagram URL"\)/);
  assert.match(repository, /categorySlug\(form\.category\)/);
  assert.match(repository, /Message must be.*characters or fewer/);
  assert.match(repository, /select\("id", \{ count: "exact", head: true \}\)/);

  assert.match(site, /nextPage === "admin-dashboard"[\s\S]*refreshAdminStats/);
  assert.match(site, /await submitEstimate\(estimate\)[\s\S]*if \(isAdmin\) await Promise\.all\(\[refreshAdminStats\(\), refreshLeads\(\)\]\)/);
  assert.match(site, /await submitQuery\(query\)[\s\S]*if \(isAdmin\) await Promise\.all\(\[refreshAdminStats\(\), refreshLeads\(\)\]\)/);
  assert.match(site, /await saveReview\(reviewForm\)[\s\S]*await refreshContent\(\)/);
  assert.match(site, /await saveSettings\(settings\)[\s\S]*await refreshContent\(\)/);

  assert.match(home, /maxLength=\{4000\}/);
  assert.match(home, /type="file"/);
  assert.match(home, /accept="image\/jpeg,image\/png,\.jpg,\.jpeg,\.png"/);
  assert.match(home, /onDragOver/);
  assert.match(repository, /fetch\("\/api\/inquiries"/);
  assert.match(site, /busy=\{adminBusy\}/);
  assert.match(site, /PublicFooter navigate=\{navigate\}/);
  assert.match(site, /AboutPage navigate=\{navigate\}/);
  assert.match(admin, /type="url"[\s\S]*Instagram Video Link/);
  assert.match(admin, /SettingField label="Instagram URL" type="url"/);
});

test("defines normalized tables, explicit grants, RLS, and the public inquiry boundary", async () => {
  const [sql, inquirySql, inquiryFunction, environment, inquiryRestriction, inquiryEdgeFunction] = await Promise.all([
    read("../supabase/migrations/20260809130140_baseline_and_reconcile_schema.sql"),
    read("../supabase/migrations/20260809224500_secure_public_inquiries.sql"),
    read("../functions/api/inquiries.ts"),
    read("../functions/_lib/env.ts"),
    read("../supabase/migrations/20260815193000_restrict_public_inquiry_rpc.sql"),
    read("../supabase/functions/submit-public-inquiry/index.ts"),
  ]);

  for (const table of ["admin_users", "works", "work_images", "reviews", "site_settings", "queries", "estimate_requests"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /work_id bigint not null references public\.works\(id\) on delete cascade/i);
  assert.match(sql, /works_public_read/i);
  assert.match(sql, /grant select on table public\.works/i);
  assert.match(inquirySql, /drop policy if exists queries_public_insert/i);
  assert.match(inquirySql, /revoke insert on table public\.queries, public\.estimate_requests/i);
  assert.match(inquiryFunction, /requireSameOrigin/);
  assert.match(inquiryFunction, /PUBLIC_INQUIRY_RATE_LIMITER\.limit/);
  assert.match(inquiryFunction, /PUBLIC_INQUIRY_GLOBAL_RATE_LIMITER\.limit/);
  assert.match(inquiryFunction, /verifyImageSignature/);
  assert.match(inquiryFunction, /result\?\.format !== "webp"/);
  assert.match(inquiryFunction, /destroyCloudinaryImage/);
  assert.match(inquiryFunction, /requiredEnv\(env, "SUPABASE_URL"\)/);
  assert.match(inquiryFunction, /functions\/v1\/submit-public-inquiry/);
  assert.doesNotMatch(inquiryFunction, /rest\/v1\/rpc\/submit_public_inquiry/);
  assert.match(environment, /SUPABASE_PUBLISHABLE_KEY/);
  assert.match(inquiryRestriction, /revoke execute[\s\S]*from anon, authenticated/i);
  assert.match(inquiryRestriction, /grant execute[\s\S]*to service_role/i);
  assert.match(inquiryEdgeFunction, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("delivers admin work images responsively and pages the public gallery", async () => {
  const [shared, publicPages, repository] = await Promise.all([
    read("../app/rupantar/shared.tsx"),
    read("../app/rupantar/public-pages.tsx"),
    read("../app/rupantar/repository.ts"),
  ]);

  assert.match(shared, /c_limit,w_\$\{width\}\/f_auto\/q_auto:good/);
  assert.match(shared, /srcSet=\{sources\}/);
  assert.match(shared, /loading=\{eager \? "eager" : "lazy"\}/);
  assert.match(repository, /export async function loadPublicWorksPage\(offset = 0, limit = 12, category = "all"\)/);
  assert.match(repository, /\.range\(offset, offset \+ limit - 1\)/);
  assert.match(repository, /\.in\("work_id", ids\)/);
  assert.match(publicPages, /onLoadMore/);
  assert.match(publicPages, /Load More Works/);
});

test("preserves the supplied HTML as an immutable visual reference", async () => {
  const baseline = await readFile(new URL("../public/baseline/rupantar-latest.html", import.meta.url));
  assert.equal(
    createHash("sha256").update(baseline).digest("hex"),
    "74483ad7c3a1f04fe06914dc9be17b075ab4d066d4790ce5311b44ae3d9eff16",
  );
});

