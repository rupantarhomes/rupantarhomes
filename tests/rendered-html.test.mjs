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

test("keeps locked public and admin surfaces in source components", async () => {
  const [home, publicPages, shared, data, admin] = await Promise.all([
    read("../app/rupantar/home-page.tsx"),
    read("../app/rupantar/public-pages.tsx"),
    read("../app/rupantar/shared.tsx"),
    read("../app/rupantar/data.ts"),
    read("../app/rupantar/admin.tsx"),
  ]);

  assert.match(home, /Recent Works/);
  assert.match(home, /Have a Query\?/);
  assert.match(home, /How We Work/);
  assert.match(publicPages, /All Works/);
  assert.match(publicPages, /Project Overview/);
  assert.match(publicPages, /About Rupantar Homes/);
  assert.match(publicPages, /Founder &amp; Curator/);
  assert.match(publicPages, /At Rupantar Homes By Gokul Kunwar, we believe a home shouldn’t just be designed on paper, it should/);
  assert.match(publicPages, /We offer Interior &amp; Architecture Services, House Construction, 3D Design, Modular Kitchens, and/);
  assert.match(publicPages, /One team, one responsibility, from your first design to the final finish\./);
  assert.doesNotMatch(publicPages, /Craftsman/);
  assert.match(shared, /Architecture/);
  assert.match(shared, /Kathmandu Nepal/);
  assert.doesNotMatch(shared, /Crafted with/);
  assert.match(data, /slug: "architect"/);
  assert.match(data, /name: "Architecture"/);
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

test("keeps the strict Admin Work Cloudinary contract and secrets server-side", async () => {
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
  assert.match(clientUpload, /new Set\(\["image\/jpeg", "image\/png"\]\)/);
  assert.match(clientUpload, /file\.size > maximumBytes/);
  assert.match(clientUpload, /export const maximumWorkImages = 3/);
  assert.match(clientUpload, /format !== "webp"/);
  assert.match(clientUpload, /width > 1920 \|\| height > 1080/);
  assert.match(clientUpload, /body\.set\("asset_folder", signed\.assetFolder\)/);
  assert.match(clientUpload, /body\.set\("format", signed\.format\)/);
  assert.match(clientUpload, /body\.set\("transformation", signed\.transformation\)/);
  assert.doesNotMatch(clientUpload, /body\.set\("upload_preset"/);
  assert.doesNotMatch(clientUpload, /Promise\.all\(\s*files\.map/);
  assert.match(clientUpload, /for \(const \[index, file\] of files\.entries\(\)\)/);
  assert.match(clientUpload, /deleteCloudinaryImages\(uploaded\.map/);

  assert.match(signature, /requireAdmin/);
  assert.match(signature, /CLOUDINARY_API_SECRET/);
  assert.match(signature, /const workImageAssetFolder = "rupantar-homes\/works"/);
  assert.match(signature, /format: "webp"/);
  assert.match(signature, /c_limit,h_1080,w_1920\/q_auto:good/);
  assert.doesNotMatch(signature, /upload_preset:/);
  assert.doesNotMatch(signature, /f_webp/);

  assert.match(deleteFunction, /requireAdmin/);
  assert.match(deleteFunction, /destroyCloudinaryImage/);
  assert.match(cloudinaryHelper, /body\?\.result === "ok"/);
  assert.match(cloudinaryHelper, /body\?\.result === "not found"/);
  assert.match(auth, /\/auth\/v1\/user/);
  assert.match(auth, /admin_users/);

  assert.match(site, /draftImagePublicIds/);
  assert.match(site, /handleRemoveWorkImage/);
  assert.match(site, /if \(!persisted\) await deleteCloudinaryImages\(\[image\.publicId\]\)/);
  assert.match(site, /await saveWork\(workForm, editingWorkId\)[\s\S]*await deleteCloudinaryImages\(removed\)/);
  assert.match(site, /await deleteCloudinaryImages\(draftImagePublicIds\(\)\)[\s\S]*setEditingWorkId\(null\)/);
  assert.match(site, /remainingImageSlots = maximumWorkImages - currentImageCount/);

  assert.match(admin, /aria-label="Remove image"/);
  assert.match(admin, /onRemoveWorkImage\(index\)/);
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
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /delete from public\.work_images[\s\S]*insert into public\.work_images/i);
  assert.match(sql, /grant execute on function public\.save_work_with_images[\s\S]*to authenticated/i);
  assert.match(sql, /create or replace function public\.delete_work_with_images/i);
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

  assert.match(site, /nextPage === "admin-dashboard"[\s\S]*refreshAdminStats/);
  assert.match(site, /await submitEstimate\(estimate\)[\s\S]*setEstimateSaved\(true\)/);
  assert.match(site, /await submitQuery\(query\)[\s\S]*setEstimateSaved\(true\)/);
  assert.match(site, /await saveReview\(reviewForm\)[\s\S]*await refreshContent\(\)/);
  assert.match(site, /await saveSettings\(settings\)[\s\S]*await refreshContent\(\)/);
  assert.match(site, /Your form has been submitted\. Mr\. Gokul will connect with you in a few hours\./);
  assert.match(site, /estimateSaved/);
  assert.match(site, /createPortal\([\s\S]*document\.body/);
  assert.match(site, /position:\s*"fixed"/);
  assert.match(site, /zIndex:\s*2147483647/);
  assert.match(site, /background:\s*"rgba\(255, 255, 255, 0\.98\)"/);
  assert.match(site, /backdropFilter:\s*"blur\(6px\)"/);

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
    assert.match(sql, new RegExp(`alter table public\.${table} enable row level security`, "i"));
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

test("prevents stale Cloudinary cleanup from deleting an image that has been restored", async () => {
  const [migration, cleanupEndpoint] = await Promise.all([
    read("../supabase/migrations/20260820190000_prevent_stale_cloudinary_cleanup.sql"),
    read("../functions/api/cloudinary-delete.ts"),
  ]);

  assert.match(migration, /create table if not exists public\.cloudinary_cleanup_claims/i);
  assert.match(migration, /create or replace function public\.claim_unreferenced_cloudinary_images/i);
  assert.match(migration, /pg_advisory_xact_lock\(hashtext\(candidate_id\)::bigint\)/i);
  assert.match(migration, /if exists \(\s*select 1 from public\.work_images/i);
  assert.match(cleanupEndpoint, /claim_unreferenced_cloudinary_images/);
  assert.match(cleanupEndpoint, /for \(const publicId of claimedPublicIds\)/);
});

test("delivers work images responsively and pages the public gallery", async () => {
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

test("hardens inquiry delivery and bounds long-running data views", async () => {
  const [inquiries, environment, edgeFunction, repository, site, admin, imageLimitMigration] = await Promise.all([
    read("../functions/api/inquiries.ts"),
    read("../functions/_lib/env.ts"),
    read("../supabase/functions/submit-public-inquiry/index.ts"),
    read("../app/rupantar/repository.ts"),
    read("../app/rupantar/site.tsx"),
    read("../app/rupantar/admin.tsx"),
    read("../supabase/migrations/20260817150000_enforce_three_work_images.sql"),
  ]);

  assert.doesNotMatch(inquiries, /const web3FormsAccessKey\s*=/);
  assert.match(environment, /WEB3FORMS_ACCESS_KEY/);
  assert.match(inquiries, /X-Rupantar-Internal-Secret/);
  assert.match(edgeFunction, /get_public_inquiry_secret_hash/);
  assert.match(edgeFunction, /internalSecretIsValid/);
  assert.match(repository, /14 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(repository, /pageSize = 50/);
  assert.match(admin, /See More History/);
  assert.match(site, /nextPage === "works"/);
  assert.match(site, /loadWorks\(route\.category, 0, true\)/);
  assert.match(imageLimitMigration, /jsonb_array_length\(normalized_images\) > 3/);
});

test("preserves the supplied HTML as an immutable visual reference", async () => {
  const baseline = await readFile(new URL("../public/baseline/rupantar-latest.html", import.meta.url));
  assert.equal(
    createHash("sha256").update(baseline).digest("hex"),
    "74483ad7c3a1f04fe06914dc9be17b075ab4d066d4790ce5311b44ae3d9eff16",
  );
});
