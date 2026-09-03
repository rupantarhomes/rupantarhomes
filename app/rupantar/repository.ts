import { categories, initialReviews, initialSettings, initialWorks } from "./data";
import { countBlogWords, maximumBlogWords, slugifyBlogTitle, type Blog, type BlogCategory, type BlogForm } from "./blog";
import type { Tables, TablesInsert } from "./database.types";
import { getSupabase, isSupabaseConfigured, type Session } from "./supabase";
import type {
  AdminStats,
  EstimateForm,
  Lead,
  LeadStatus,
  QueryForm,
  Review,
  ReviewForm,
  SiteSettings,
  Work,
  WorkForm,
  WorkImage,
} from "./types";

type WorkRow = Pick<
  Tables<"works">,
  "id" | "title" | "slug" | "category" | "location" | "short_description" | "long_description" | "featured" | "blog_url"
>;
type WorkImageRow = Pick<
  Tables<"work_images">,
  "id" | "work_id" | "secure_url" | "cloudinary_public_id" | "alt_text" | "sort_order" | "width" | "height" | "byte_size"
>;
type ReviewRow = Pick<Tables<"reviews">, "id" | "name" | "location" | "message" | "rating" | "instagram_url">;
type BlogRow = Pick<Tables<"blogs">, "id" | "title" | "slug" | "body" | "category" | "created_at" | "updated_at">;
type SettingsRow = Pick<
  Tables<"site_settings">,
  "id" | "slogan" | "phone" | "instagram_url" | "tiktok_url" | "address" | "workshop_note"
>;

type LeadRow = Pick<
  Tables<"leads">,
  | "id"
  | "name"
  | "phone"
  | "location"
  | "service_required"
  | "approximate_area"
  | "material_preference"
  | "message"
  | "reference_image_url"
  | "status"
  | "created_at"
  | "updated_at"
>;

export type LeadPage = {
  leads: Lead[];
  hasMore: boolean;
  nextBefore: string;
};

const allowedCategories = new Set(categories.map((category) => category.slug));
const allowedLeadStatuses = new Set<LeadStatus>(["new", "contacted", "closed"]);
const allowedBlogCategories = new Set<BlogCategory>(["architecture", "interior-design", "home-construction"]);
const maximumPublicMessageLength = 4000;
const maximumEstimatePhotoBytes = 10 * 1024 * 1024;
const adminWorksBatchSize = 1000;
const blogColumns = "id,title,slug,body,category,created_at,updated_at";
const reviewColumns = "id,name,location,message,rating,instagram_url";
const settingsColumns = "id,slogan,phone,instagram_url,tiktok_url,address,workshop_note";
const inquiryAttemptStoragePrefix = "rupantar-inquiry-attempt:";
const inquiryAttemptMemory = new Map<string, string>();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const workDraftIdPattern = /^rupantar-homes\/works\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let settingsConfirmed = false;

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function trimmed(value: unknown): string {
  return text(value).trim();
}

function requiredText(value: unknown, label: string): string {
  const normalized = trimmed(value);
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function publicMessage(value: unknown, required = false): string {
  const normalized = trimmed(value);
  if (required && !normalized) throw new Error("Message / Requirements is required.");
  if (normalized.length > maximumPublicMessageLength) {
    throw new Error(`Message must be ${maximumPublicMessageLength.toLocaleString()} characters or fewer.`);
  }
  return normalized;
}

function categorySlug(value: unknown): string {
  const normalized = trimmed(value) || "architect";
  if (!allowedCategories.has(normalized)) throw new Error("Please select a valid category.");
  return normalized;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(new Error("Request timed out.")), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

function digestHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function inquiryFingerprint(
  kind: "estimate" | "query",
  payload: Record<string, string>,
  attachment?: File | null,
): Promise<string> {
  const canonicalPayload = Object.entries(payload).sort(([left], [right]) => left.localeCompare(right));
  const attachmentIdentity = attachment
    ? [attachment.type, attachment.size, digestHex(await crypto.subtle.digest("SHA-256", await attachment.arrayBuffer()))]
    : null;
  const canonical = JSON.stringify([kind, canonicalPayload, attachmentIdentity]);
  return digestHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical)));
}

function submissionIdForFingerprint(fingerprint: string): string {
  const storageKey = `${inquiryAttemptStoragePrefix}${fingerprint}`;
  try {
    const stored = window.sessionStorage.getItem(storageKey);
    if (stored && uuidPattern.test(stored)) {
      inquiryAttemptMemory.set(fingerprint, stored);
      return stored;
    }
  } catch {
    // Private browsing/storage restrictions fall back to in-memory retry state.
  }

  const remembered = inquiryAttemptMemory.get(fingerprint);
  if (remembered && uuidPattern.test(remembered)) return remembered;

  const submissionId = crypto.randomUUID();
  inquiryAttemptMemory.set(fingerprint, submissionId);
  try {
    window.sessionStorage.setItem(storageKey, submissionId);
  } catch {
    // In-memory state still preserves retry safety for this page lifetime.
  }
  return submissionId;
}

function clearSubmissionIdForFingerprint(fingerprint: string): void {
  inquiryAttemptMemory.delete(fingerprint);
  try {
    window.sessionStorage.removeItem(`${inquiryAttemptStoragePrefix}${fingerprint}`);
  } catch {
    // Nothing else is required after a confirmed successful submission.
  }
}

async function submitPublicInquiry(
  kind: "estimate" | "query",
  payload: Record<string, string>,
  attachment?: File | null,
): Promise<void> {
  const fingerprint = await inquiryFingerprint(kind, payload, attachment);
  const submissionId = submissionIdForFingerprint(fingerprint);
  const body = new FormData();
  body.set("kind", kind);
  body.set("submission_id", submissionId);
  for (const [name, value] of Object.entries(payload)) body.set(name, value);
  if (attachment) body.set("attachment", attachment, attachment.name);

  const response = await fetchWithTimeout("/api/inquiries", { method: "POST", body }, attachment ? 60_000 : 30_000);
  let result: { error?: unknown } | null = null;
  try {
    result = (await response.json()) as { error?: unknown };
  } catch {
    // The status check below provides the fallback message.
  }
  if (!response.ok) {
    const detail = typeof result?.error === "string" ? result.error : "Your request could not be sent. Please try again.";
    throw new Error(detail);
  }
  clearSubmissionIdForFingerprint(fingerprint);
}

function httpsUrl(value: unknown, label: string, optional = false): string | null {
  const normalized = trimmed(value);
  if (!normalized && optional) return null;
  if (!normalized) throw new Error(`${label} is required.`);

  try {
    const url = new URL(normalized);
    if (url.protocol !== "https:" || !url.hostname) throw new Error();
    return url.toString();
  } catch {
    throw new Error(`${label} must be a complete HTTPS URL.`);
  }
}

function databaseId(value: unknown, label: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error(`Invalid ${label}.`);
  return id;
}

function positiveInteger(value: unknown, label: string): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`Image ${label} is missing.`);
  return number;
}

function mapImage(row: WorkImageRow): WorkImage {
  return {
    id: text(row.id),
    workId: text(row.work_id),
    url: requiredText(row.secure_url, "Work image URL"),
    publicId: requiredText(row.cloudinary_public_id, "Work image public ID"),
    altText: row.alt_text,
    sortOrder: row.sort_order,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    bytes: row.byte_size ?? undefined,
  };
}

function mapWork(row: WorkRow, images: WorkImage[]): Work {
  return {
    id: text(row.id),
    title: text(row.title),
    slug: text(row.slug),
    category: text(row.category) || "architect",
    location: text(row.location),
    shortDesc: row.short_description,
    longDesc: row.long_description,
    featured: Boolean(row.featured),
    blogUrl: row.blog_url ?? "",
    images,
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: text(row.id),
    name: row.name,
    location: row.location,
    message: row.message,
    rating: row.rating,
    instagramLink: row.instagram_url ?? "",
  };
}

function mapSettings(row: SettingsRow): SiteSettings {
  return {
    slogan: text(row.slogan),
    phone: text(row.phone),
    instagram: text(row.instagram_url),
    tiktok: text(row.tiktok_url),
    address: text(row.address),
    workshopNote: text(row.workshop_note),
  };
}

function mapLead(row: LeadRow): Lead {
  const status = allowedLeadStatuses.has(row.status as LeadStatus) ? (row.status as LeadStatus) : "new";
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    location: row.location ?? "",
    serviceRequired: row.service_required ?? "",
    approximateArea: row.approximate_area ?? "",
    materialPreference: row.material_preference ?? "",
    message: row.message ?? "",
    referenceImageUrl: row.reference_image_url,
    status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBlog(row: BlogRow): Blog {
  return {
    id: String(row.id),
    title: row.title,
    slug: row.slug,
    body: row.body,
    category: row.category as BlogCategory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type PublicWorksPage = { works: Work[]; total: number };

export async function loadPublicWorkBySlug(category: string, slug: string): Promise<Work | null> {
  if (!isSupabaseConfigured) {
    return initialWorks.find((work) => work.category === category && work.slug === slug) ?? null;
  }
  const supabase = getSupabase();
  const workResult = await supabase
    .from("works")
    .select("id,title,slug,category,location,short_description,long_description,featured,blog_url")
    .eq("category", category)
    .eq("slug", slug)
    .maybeSingle();
  if (workResult.error) throw new Error(workResult.error.message);
  if (!workResult.data) return null;
  const row = workResult.data as WorkRow;
  const imagesResult = await supabase
    .from("work_images")
    .select("id,work_id,secure_url,cloudinary_public_id,alt_text,sort_order,width,height,byte_size")
    .eq("work_id", row.id)
    .order("sort_order", { ascending: true });
  if (imagesResult.error) throw new Error(imagesResult.error.message);
  return mapWork(row, ((imagesResult.data ?? []) as WorkImageRow[]).map(mapImage));
}

export async function loadPublicWorksPage(offset = 0, limit = 12, category = "all"): Promise<PublicWorksPage> {
  if (!isSupabaseConfigured) return { works: initialWorks.slice(offset, offset + limit), total: initialWorks.length };
  const supabase = getSupabase();
  let query = supabase
    .from("works")
    .select("id,title,slug,category,location,short_description,long_description,featured,blog_url", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (category !== "all") query = query.eq("category", category);
  const worksResult = await query;
  if (worksResult.error) throw new Error(worksResult.error.message);
  const rows = (worksResult.data ?? []) as WorkRow[];
  const ids = rows.map((row) => row.id);
  const imagesResult = ids.length
    ? await supabase.from("work_images").select("id,work_id,secure_url,cloudinary_public_id,alt_text,sort_order,width,height,byte_size").in("work_id", ids).order("sort_order", { ascending: true })
    : { data: [], error: null };
  if (imagesResult.error) throw new Error(imagesResult.error.message);
  const imagesByWork = new Map<string, WorkImage[]>();
  for (const row of (imagesResult.data ?? []) as WorkImageRow[]) {
    const id = text(row.work_id);
    imagesByWork.set(id, [...(imagesByWork.get(id) ?? []), mapImage(row)]);
  }
  const mappedWorks = rows.map((row) => mapWork(row, imagesByWork.get(text(row.id)) ?? []));
  const total = worksResult.count ?? 0;

  if (offset === 0 && limit >= adminWorksBatchSize && total > mappedWorks.length) {
    const allWorks = [...mappedWorks];
    for (let nextOffset = mappedWorks.length; nextOffset < total; nextOffset += adminWorksBatchSize) {
      const next = await loadPublicWorksPage(nextOffset, adminWorksBatchSize, category);
      allWorks.push(...next.works);
    }
    return { works: allWorks, total };
  }

  return { works: mappedWorks, total };
}

export async function loadPublicContent(): Promise<{
  works: Work[];
  reviews: Review[];
  settings: SiteSettings;
}> {
  if (!isSupabaseConfigured) {
    settingsConfirmed = false;
    return { works: initialWorks.slice(0, 6), reviews: initialReviews, settings: initialSettings };
  }

  settingsConfirmed = false;
  const supabase = getSupabase();
  const [worksPage, reviewsResult, settingsResult] = await Promise.all([
    loadPublicWorksPage(0, 6, "all"),
    supabase.from("reviews").select(reviewColumns).order("created_at", { ascending: false }),
    supabase.from("site_settings").select(settingsColumns).eq("id", 1).maybeSingle(),
  ]);

  const error = reviewsResult.error ?? settingsResult.error;
  if (error) throw new Error(error.message);
  if (!settingsResult.data) throw new Error("The production Settings row could not be confirmed.");

  settingsConfirmed = true;
  return {
    works: worksPage.works,
    reviews: ((reviewsResult.data ?? []) as ReviewRow[]).map(mapReview),
    settings: mapSettings(settingsResult.data as SettingsRow),
  };
}

export async function signInAdmin(email: string, password: string): Promise<Session> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) throw new Error(error?.message ?? "Login failed.");

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id,is_active")
    .eq("user_id", data.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError || !admin) {
    await supabase.auth.signOut();
    settingsConfirmed = false;
    throw new Error(adminError ? "Unable to verify admin access. Please try again." : "This account is not authorized for the admin portal.");
  }

  return data.session;
}

export async function getCurrentAdminSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabase();
  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return null;
  const session = data.session;
  if (!session) {
    settingsConfirmed = false;
    return null;
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id,is_active")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminError) return null;
  if (!admin) {
    await supabase.auth.signOut();
    settingsConfirmed = false;
    return null;
  }
  return session;
}

export async function signOutAdmin(): Promise<void> {
  settingsConfirmed = false;
  if (isSupabaseConfigured) await getSupabase().auth.signOut();
}

export async function saveWork(form: WorkForm, editingId: string | null): Promise<Work> {
  const supabase = getSupabase();
  const title = requiredText(form.title, "Title");
  const slug = requiredText(form.slug, "Slug");
  const category = trimmed(form.category) || "architect";
  const location = trimmed(form.location) || "Kathmandu";
  const shortDesc = trimmed(form.shortDesc) || "Custom designed space";
  const longDesc = trimmed(form.longDesc) || "Detailed project description coming soon. Crafted at Rupantar workshop.";
  const blogUrl = httpsUrl(form.blogUrl, "Project blog URL", true);
  const images = Array.isArray(form.images) ? form.images : [];
  const imagePayload = images.map((image) => {
    const publicId = trimmed(image.publicId);
    const secureUrl = trimmed(image.url);
    if (!publicId || !secureUrl) throw new Error("An uploaded image is incomplete. Please upload it again.");
    return {
      cloudinary_public_id: publicId,
      secure_url: secureUrl,
      alt_text: trimmed(image.altText) || title,
      width: positiveInteger(image.width, "width"),
      height: positiveInteger(image.height, "height"),
      byte_size: positiveInteger(image.bytes, "file size"),
    };
  });
  const workId = editingId ? databaseId(editingId, "work ID") : undefined;

  const { data, error } = await supabase.rpc("save_work_with_images", {
    p_title: title,
    p_slug: slug,
    p_category: category,
    p_location: location,
    p_short_description: shortDesc,
    p_long_description: longDesc,
    p_featured: Boolean(form.featured),
    p_blog_url: blogUrl ?? "",
    p_images: imagePayload,
    ...(workId === undefined ? {} : { p_work_id: workId }),
  });
  if (error || data == null) throw new Error(error?.message ?? "The work could not be saved.");

  if (imagePayload.length) {
    void (supabase as any).rpc("complete_cloudinary_draft_cleanup", {
      p_public_ids: imagePayload.map((image) => image.cloudinary_public_id),
    }).then(({ error: registryError }: { error?: { message?: string } | null }) => {
      if (registryError) console.error("Unable to finalize saved Work draft registry", registryError.message);
    });
  }

  const id = text(data);
  return {
    id,
    title,
    slug,
    category,
    location,
    shortDesc,
    longDesc,
    featured: Boolean(form.featured),
    blogUrl: blogUrl ?? "",
    images: images.map((image, sortOrder) => ({
      ...image,
      workId: id,
      altText: trimmed(image.altText) || title,
      sortOrder,
    })),
  };
}

export async function deleteWork(id: string): Promise<string[]> {
  const { data, error } = await getSupabase().rpc("delete_work_with_images", {
    p_work_id: databaseId(id, "work ID"),
  });
  if (error || !Array.isArray(data)) throw new Error(error?.message ?? "The work could not be deleted.");
  return data.map(text).filter(Boolean);
}

export async function saveReview(form: ReviewForm): Promise<Review> {
  const rating = Number(form.rating);
  const payload: TablesInsert<"reviews"> = {
    name: requiredText(form.name, "Review name"),
    location: trimmed(form.location) || "Kathmandu",
    message: requiredText(form.message, "Review message"),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 5,
    instagram_url: httpsUrl(form.instagramLink, "Instagram link", true),
  };
  const { data, error } = await getSupabase().from("reviews").insert(payload).select(reviewColumns).single();
  if (error || !data) throw new Error(error?.message ?? "The review could not be saved.");
  return mapReview(data as ReviewRow);
}

export async function deleteReview(id: string): Promise<void> {
  const { data, error } = await getSupabase().from("reviews").delete().eq("id", databaseId(id, "review ID")).select("id").maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "The review could not be deleted.");
}

export async function saveSettings(settings: SiteSettings): Promise<SiteSettings> {
  if (!settingsConfirmed) {
    throw new Error("Settings are not confirmed from production yet. Reload Admin and try again after the live data loads.");
  }
  const payload: TablesInsert<"site_settings"> = {
    id: 1,
    slogan: requiredText(settings.slogan, "Slogan"),
    phone: requiredText(settings.phone, "Phone"),
    instagram_url: httpsUrl(settings.instagram, "Instagram URL")!,
    tiktok_url: httpsUrl(settings.tiktok, "TikTok URL")!,
    address: trimmed(settings.address),
    workshop_note: trimmed(settings.workshopNote),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await getSupabase().from("site_settings").upsert(payload, { onConflict: "id" }).select(settingsColumns).single();
  if (error || !data) throw new Error(error?.message ?? "Settings could not be saved.");
  settingsConfirmed = true;
  return mapSettings(data as SettingsRow);
}

export async function submitEstimate(form: EstimateForm): Promise<void> {
  const attachment = form.attachment;
  if (!attachment) throw new Error("Please upload a space photo.");
  if (attachment.type !== "image/jpeg" && attachment.type !== "image/png") {
    throw new Error("Please choose a JPG or PNG photo.");
  }
  if (attachment.size > maximumEstimatePhotoBytes) throw new Error("Photo must be 10MB or smaller.");

  const payload = {
    name: requiredText(form.name, "Full name"),
    phone: requiredText(form.phone, "Phone"),
    location: requiredText(form.location, "Location"),
    category: categorySlug(form.category),
    approximate_size: requiredText(form.size, "Approximate size"),
    material_preference: requiredText(form.material, "Material preference"),
    message: publicMessage(form.message, true),
  };

  await submitPublicInquiry("estimate", payload, attachment);
}

export async function submitQuery(form: QueryForm): Promise<void> {
  const payload = {
    name: requiredText(form.name, "Name"),
    phone: requiredText(form.phone, "Phone"),
    category: categorySlug(form.category),
    message: publicMessage(form.message, true),
  };

  await submitPublicInquiry("query", payload);
}

export async function loadLeads(olderThan?: string): Promise<LeadPage> {
  const supabase = getSupabase();
  const columns = "id,name,phone,location,service_required,approximate_area,material_preference,message,reference_image_url,status,created_at,updated_at";
  const recentCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  if (!olderThan) {
    const [recentResult, olderResult] = await Promise.all([
      supabase.from("leads").select(columns).gte("created_at", recentCutoff).order("created_at", { ascending: false }),
      supabase.from("leads").select("id").lt("created_at", recentCutoff).limit(1),
    ]);
    if (recentResult.error || olderResult.error) {
      throw new Error(recentResult.error?.message ?? olderResult.error?.message);
    }
    const rows = (recentResult.data ?? []) as LeadRow[];
    return {
      leads: rows.map(mapLead),
      hasMore: Boolean(olderResult.data?.length),
      nextBefore: rows.at(-1)?.created_at ?? recentCutoff,
    };
  }

  const pageSize = 50;
  const { data, error } = await supabase
    .from("leads")
    .select(columns)
    .lt("created_at", olderThan)
    .order("created_at", { ascending: false })
    .limit(pageSize + 1);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as LeadRow[];
  const pageRows = rows.slice(0, pageSize);
  return {
    leads: pageRows.map(mapLead),
    hasMore: rows.length > pageSize,
    nextBefore: pageRows.at(-1)?.created_at ?? olderThan,
  };
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<void> {
  if (!allowedLeadStatuses.has(status)) throw new Error("Invalid lead status.");
  const supabase = getSupabase() as any;
  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", requiredText(id, "lead ID"))
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "The lead could not be updated.");
}

export async function deleteLead(id: string): Promise<void> {
  const { data, error } = await (getSupabase() as any)
    .from("leads")
    .delete()
    .eq("id", requiredText(id, "lead ID"))
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "The lead could not be deleted.");
}

export async function loadAdminStats(): Promise<AdminStats> {
  const supabase = getSupabase();
  const [queries, estimates] = await Promise.all([
    supabase.from("queries").select("id", { count: "exact", head: true }),
    supabase.from("estimate_requests").select("id", { count: "exact", head: true }),
  ]);
  if (queries.error || estimates.error) throw new Error(queries.error?.message ?? estimates.error?.message);
  return { queries: queries.count ?? 0, estimates: estimates.count ?? 0 };
}

export async function claimExpiredCloudinaryDrafts(): Promise<string[]> {
  const { data, error } = await (getSupabase() as any).rpc("claim_expired_cloudinary_drafts", {
    p_min_age_minutes: 10080,
    p_limit: 50,
  });
  if (error) throw new Error(error.message ?? "Unable to check stale Work image drafts.");
  if (!Array.isArray(data)) throw new Error("The stale Work image cleanup response was invalid.");
  const publicIds = data.filter((value): value is string => typeof value === "string" && workDraftIdPattern.test(value));
  if (publicIds.length !== data.length) throw new Error("The stale Work image cleanup returned an invalid public ID.");
  return publicIds;
}

function blogCategory(value: unknown): BlogCategory {
  const category = trimmed(value) as BlogCategory;
  if (!allowedBlogCategories.has(category)) throw new Error("Please select a valid blog category.");
  return category;
}

function blogBody(value: unknown): string {
  const body = requiredText(value, "Body");
  if (countBlogWords(body) > maximumBlogWords) throw new Error(`Body must be ${maximumBlogWords.toLocaleString()} words or fewer.`);
  return body;
}

export async function loadPublicBlogs(): Promise<Blog[]> {
  const { data, error } = await getSupabase().from("blogs").select(blogColumns).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as BlogRow[]).map(mapBlog);
}

export async function loadPublicBlogBySlug(slug: string): Promise<Blog | null> {
  const { data, error } = await getSupabase().from("blogs").select(blogColumns).eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapBlog(data as BlogRow) : null;
}

async function nextBlogSlug(title: string): Promise<string> {
  const base = slugifyBlogTitle(title);
  if (!base) throw new Error("Title must include letters or numbers.");
  const { data, error } = await getSupabase().from("blogs").select("slug").like("slug", `${base}%`);
  if (error) throw new Error(error.message);
  const existing = new Set((data ?? []).map((row) => row.slug));
  if (!existing.has(base)) return base;
  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export async function saveBlog(form: BlogForm, editingBlogId: string | null): Promise<Blog> {
  const title = requiredText(form.title, "Title");
  const body = blogBody(form.body);
  const category = blogCategory(form.category);
  const supabase = getSupabase() as any;

  if (editingBlogId) {
    const { data, error } = await supabase
      .from("blogs")
      .update({ title, body, category, updated_at: new Date().toISOString() })
      .eq("id", Number(editingBlogId))
      .select(blogColumns)
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "Article could not be saved.");
    return mapBlog(data as BlogRow);
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slug = await nextBlogSlug(title);
    const { data, error } = await supabase.from("blogs").insert({ title, slug, body, category }).select(blogColumns).single();
    if (!error && data) return mapBlog(data as BlogRow);
    if (error?.code !== "23505" || attempt === 2) throw new Error(error?.message ?? "Article could not be saved.");
  }

  throw new Error("Article could not be saved.");
}

export async function deleteBlog(id: string): Promise<void> {
  const { data, error } = await (getSupabase() as any).from("blogs").delete().eq("id", Number(id)).select("id").maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "Article could not be deleted.");
}
