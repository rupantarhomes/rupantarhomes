import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("loads the complete admin works collection without changing public pagination", async () => {
  const site = await read("../app/rupantar/site.tsx");

  assert.match(site, /const adminWorksLimit = 1000;/);
  assert.match(site, /const refreshAdminWorks = useCallback\(async \(\) => \{/);
  assert.match(site, /loadPublicWorksPage\(0, adminWorksLimit, "all"\)/);
  assert.match(site, /loadPublicWorksPage\(offset, 12, category\)/);
});

test("opens Admin immediately after authorization and avoids full Admin reloads on tab switches", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const login = site.indexOf("const handleLogin = async");
  const dashboard = site.indexOf('setPage("admin-dashboard")', login);
  const backgroundLoad = site.indexOf("Promise.allSettled([refreshAdminWorks(), refreshContent(), refreshAdminStats(), refreshLeads(), refreshBlogs()])", dashboard);
  const navigate = site.slice(site.indexOf("const navigate = (nextPage: Page) =>"), site.indexOf("const goToEstimate"));

  assert.ok(login >= 0);
  assert.ok(dashboard > login);
  assert.ok(backgroundLoad > dashboard);
  assert.doesNotMatch(navigate, /if \(nextPage\.startsWith\("admin-"\) && nextPage !== "admin-login"\) \{/);
  assert.doesNotMatch(navigate, /refreshContent\(|refreshLeads\(/);
  assert.equal((navigate.match(/refreshBlogs\(/g) ?? []).length, 1);
  assert.match(navigate, /nextPage === "admin-dashboard"[\s\S]*refreshAdminStats/);
});

test("does not seed Admin dashboard with fake public works while live Admin data is loading", async () => {
  const site = await read("../app/rupantar/site.tsx");

  assert.match(site, /const initialRouteIsAdmin = initialRoute\.kind === "admin";/);
  assert.match(site, /initialRouteUsesWorks \|\| initialRouteIsAdmin \? \[\] : initialWorks/);
  assert.match(site, /initialRouteUsesWorks \|\| initialRouteIsAdmin \? 0 : initialWorks\.length/);
});

test("guards public, Admin Works, Leads and Blog reads against stale in-flight responses", async () => {
  const site = await read("../app/rupantar/site.tsx");

  assert.match(site, /const adminWorksRequestIdRef = useRef\(0\)/);
  assert.match(site, /const contentRequestIdRef = useRef\(0\)/);
  assert.match(site, /const leadsRequestIdRef = useRef\(0\)/);
  assert.match(site, /const blogsRequestIdRef = useRef\(0\)/);
  assert.match(site, /if \(requestId !== contentRequestIdRef\.current\) return;/);
  assert.match(site, /if \(requestId !== adminWorksRequestIdRef\.current\) return;/);
  assert.match(site, /if \(requestId !== leadsRequestIdRef\.current\) return;/);
  assert.match(site, /if \(requestId !== blogsRequestIdRef\.current\) return;/);
});

test("keeps public-content refreshes from overwriting the Admin works list", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const refresh = site.slice(site.indexOf("const refreshContent = useCallback"), site.indexOf("const refreshAdminWorks"));

  assert.match(refresh, /if \(route\.kind !== "home"\) return;/);
  assert.doesNotMatch(refresh, /route\.kind !== "home" && route\.kind !== "admin"/);
});

test("pins persisted image ownership for the lifetime of an edit", async () => {
  const site = await read("../app/rupantar/site.tsx");

  assert.match(site, /const persistedDraftImageIdsRef = useRef\(new Set<string>\(\)\)/);
  assert.match(site, /persistedDraftImageIdsRef\.current = new Set\(work\.images\.map\(\(image\) => image\.publicId\)\)/);
  assert.match(site, /const removed = Array\.from\(persistedDraftImageIdsRef\.current\)\.filter/);
  assert.match(site, /const persisted = persistedDraftImageIdsRef\.current\.has\(image\.publicId\)/);
});

test("commits a confirmed Work save to Admin and homepage state immediately without waiting for a second list fetch", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const repository = await read("../app/rupantar/repository.ts");
  const save = site.slice(site.indexOf("const handleSaveWork = async"), site.indexOf("const editWork"));

  assert.match(repository, /export async function saveWork\(form: WorkForm, editingId: string \| null\): Promise<Work>/);
  assert.match(save, /savedWork = await saveWork\(workForm, editingId\)/);
  assert.match(save, /worksRef\.current = nextWorks;/);
  assert.match(save, /setWorks\(nextWorks\);/);
  assert.match(save, /homeWorksRef\.current = \[savedWork, \.\.\.currentHome\]\.slice\(0, 6\)/);
  assert.doesNotMatch(save, /await refreshAdminWorks\(\)/);
});

test("Work delete disappears immediately from Admin/home state after the confirmed database delete", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const remove = site.slice(site.indexOf("const handleDeleteWork = async"), site.indexOf("const cancelWork"));

  assert.match(remove, /deletedImagePublicIds = await deleteWork\(id\)/);
  assert.match(remove, /worksRef\.current\.filter\(\(work\) => work\.id !== id\)/);
  assert.match(remove, /homeWorksRef\.current = homeWorksRef\.current\.filter/);
  assert.doesNotMatch(remove, /await refreshAdminWorks\(\)/);
});

test("selected Work and Blog detail records are independent from mutable list pagination", async () => {
  const site = await read("../app/rupantar/site.tsx");

  assert.match(site, /const \[selectedWork, setSelectedWork\] = useState<Work \| null>\(null\)/);
  assert.match(site, /const \[selectedBlog, setSelectedBlog\] = useState<Blog \| null>\(null\)/);
  assert.match(site, /worksRequestIdRef\.current \+= 1;[\s\S]*setSelectedWork\(work\);[\s\S]*setPage\("work-detail"\)/);
  assert.match(site, /blogsRequestIdRef\.current \+= 1;[\s\S]*setSelectedBlog\(blog\);[\s\S]*setPage\("blog-detail"\)/);
  assert.doesNotMatch(site, /const selectedWork = works\.find/);
  assert.doesNotMatch(site, /const selectedBlog = blogs\.find/);
});

test("Blog saves return the saved record and become visible immediately without a post-save reload", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const repository = await read("../app/rupantar/repository.ts");
  const save = site.slice(site.indexOf("const handleSaveBlog = async"), site.indexOf("const editBlog"));

  assert.match(repository, /export async function saveBlog\(form: BlogForm, editingBlogId: string \| null\): Promise<Blog>/);
  assert.match(save, /const savedBlog = await saveBlog\(blogForm, editingBlogId\)/);
  assert.match(save, /blogsRef\.current = nextBlogs;/);
  assert.match(save, /setBlogs\(nextBlogs\);/);
  assert.doesNotMatch(save, /refreshBlogs\(/);
});

test("Lead status and delete actions update local React state after the confirmed write instead of reloading Leads", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const admin = await read("../app/rupantar/admin.tsx");
  const repository = await read("../app/rupantar/repository.ts");
  const status = site.slice(site.indexOf("const handleUpdateLeadStatus"), site.indexOf("const handleDeleteLead"));
  const remove = site.slice(site.indexOf("const handleDeleteLead"), site.indexOf("const handleSaveWork"));

  assert.match(status, /await updateLeadStatus\(id, status\)/);
  assert.match(status, /setLeads\(\(current\) => current\.map/);
  assert.doesNotMatch(status, /refreshLeads\(/);
  assert.match(repository, /export async function deleteLead\(id: string\): Promise<void>/);
  assert.match(remove, /await deleteLead\(id\)/);
  assert.match(remove, /setLeads\(\(current\) => current\.filter/);
  assert.doesNotMatch(admin, /leads\.splice\(/);
  assert.doesNotMatch(admin, /getSupabase/);
  assert.match(admin, /onDeleteLead: \(id: string\) => Promise<void>/);
});

test("Review saves/deletes and Settings saves update exactly their public state without broad content reloads", async () => {
  const site = await read("../app/rupantar/site.tsx");
  const repository = await read("../app/rupantar/repository.ts");
  const reviewSave = site.slice(site.indexOf("const handleSaveReview"), site.indexOf("const handleDeleteReview"));
  const reviewDelete = site.slice(site.indexOf("const handleDeleteReview"), site.indexOf("const handleSaveSettings"));
  const settingsSave = site.slice(site.indexOf("const handleSaveSettings"), site.indexOf("const handleEstimate"));

  assert.match(repository, /export async function saveReview\(form: ReviewForm\): Promise<Review>/);
  assert.match(reviewSave, /const savedReview = await saveReview\(reviewForm\)/);
  assert.match(reviewSave, /setReviews\(\(current\) => \[savedReview/);
  assert.doesNotMatch(reviewSave, /refreshContent\(/);
  assert.match(reviewDelete, /setReviews\(\(current\) => current\.filter/);
  assert.doesNotMatch(reviewDelete, /refreshContent\(/);
  assert.match(repository, /export async function saveSettings\(settings: SiteSettings\): Promise<SiteSettings>/);
  assert.match(settingsSave, /const savedSettings = await saveSettings\(settings\)/);
  assert.match(settingsSave, /setSettings\(savedSettings\)/);
  assert.doesNotMatch(settingsSave, /refreshContent\(/);
});

test("Admin, upload, login and public form handlers reject duplicate in-flight touch/submission calls", async () => {
  const site = await read("../app/rupantar/site.tsx");

  assert.match(site, /const loginMutationRef = useRef\(false\)/);
  assert.match(site, /const adminMutationRef = useRef\(false\)/);
  assert.match(site, /const uploadMutationRef = useRef\(false\)/);
  assert.match(site, /const estimateMutationRef = useRef\(false\)/);
  assert.match(site, /const queryMutationRef = useRef\(false\)/);
  assert.match(site, /if \(loginMutationRef\.current\) return;/);
  assert.match(site, /if \(adminMutationRef\.current\) return;/);
  assert.match(site, /if \(!files\.length \|\| uploadMutationRef\.current\) return;/);
  assert.match(site, /if \(estimateMutationRef\.current\) return;/);
  assert.match(site, /if \(queryMutationRef\.current\) return;/);
});

test("makes every empty work image slot open the existing approved file picker", async () => {
  const enhancer = await read("../app/rupantar/admin-leads-enhancer.ts");

  assert.match(enhancer, /function enhanceWorkImageSlots\(\)/);
  assert.match(enhancer, /label\.textContent\?\.trim\(\) === "Empty"/);
  assert.match(enhancer, /slot\.setAttribute\("role", "button"\)/);
  assert.match(enhancer, /slot\.setAttribute\("tabindex", "0"\)/);
  assert.match(enhancer, /if \(!fileInput\.disabled\) fileInput\.click\(\)/);
  assert.match(enhancer, /enhanceWorkImageSlots\(\)/);
});

test("landing page requests the six newest works instead of letting older featured works crowd out a new save", async () => {
  const repository = await read("../app/rupantar/repository.ts");

  assert.match(repository, /loadPublicWorksPage\(0, 6, "all"\)/);
  assert.match(repository, /\.order\("created_at", \{ ascending: false \}\)/);
  assert.match(repository, /works: initialWorks\.slice\(0, 6\)/);
});

test("every Admin-to-public exit performs a fresh root load", async () => {
  const admin = await read("../app/rupantar/admin.tsx");
  const site = await read("../app/rupantar/site.tsx");

  assert.match(admin, /Back to site/);
  assert.ok((admin.match(/window\.location\.assign\("\/"\)/g) ?? []).length >= 3);
  assert.match(site, /await signOutAdmin\(\)[\s\S]*window\.location\.assign\("\/"\)/);
});

test("Recent Works and Blog cards respond across the full card without double-firing nested controls", async () => {
  const enhancer = await read("../app/rupantar/admin-leads-enhancer.ts");

  assert.match(enhancer, /function enhancePublicClickCards\(\)/);
  assert.match(enhancer, /heading\.textContent\?\.trim\(\) === "Recent Works"/);
  assert.match(enhancer, /button\.textContent\?\.includes\("View Details"\)/);
  assert.match(enhancer, /heading\.textContent\?\.trim\(\) === "Blog"/);
  assert.match(enhancer, /button\.textContent\?\.includes\("Read Article"\)/);
  assert.match(enhancer, /if \(isInteractiveTarget\(event\.target\)\) return;/);
  assert.match(enhancer, /action\.click\(\)/);
  assert.match(enhancer, /enhancePublicClickCards\(\)/);
});
