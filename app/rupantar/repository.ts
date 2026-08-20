import { categories, initialReviews, initialSettings, initialWorks } from "./data";
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
  "id" | "title" | "slug" | "category" | "location" | "short_description" | "long_description" | "featured"
>;
type WorkImageRow = Pick<
  Tables<"work_images">,
  "id" | "work_id" | "secure_url" | "cloudinary_public_id" | "alt_text" | "sort_order" | "width" | "height" | "byte_size"
>;
type ReviewRow = Pick<Tables<"reviews">, "id" | "name" | "location" | "message" | "rating" | "instagram_url">;
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
const maximumPublicMessageLength = 4000;
const maximumEstimatePhotoBytes = 10 * 1024 * 1024;

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

async function submitPublicInquiry(
  kind: "estimate" | "query",
  payload: Record<string, string>,
  attachment?: File | null,
): Promise<void> {
  const body = new FormData();
  body.set("kind", kind);
  for (const [name, value] of Object.entries(payload)) body.set(name, value);
  if (attachment) body.set("attachment", attachment, attachment.name);

  const response = await fetch("/api/inquiries", { method: "POST", body });
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
    url: row.secure_url,
    publicId: text(row.cloudinary_public_id),
    altText: row.alt_text,
    sortOrder: row.sort_order,
    width: row.width,
    height: row.height,
    bytes: row.byte_size,
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

function mapSettings(row: SettingsRow | null): SiteSettings {
  if (!row) return initialSettings;
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

export type PublicWorksPage = { works: Work[]; total: number };

export async function loadPublicWorkBySlug(category: string, slug: string): Promise<Work | null> {
  if (!isSupabaseConfigured) {
    return initialWorks.find((work) => work.category === category && work.slug === slug) ?? null;
  }
  const supabase = getSupabase();
  const workResult = await supabase
    .from("works")
    .select("id,title,slug,category,location,short_description,long_description,featured")
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
    .select("id,title,slug,category,location,short_description,long_description,featured", { count: "exact" })
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
  return { works: rows.map((row) => mapWork(row, imagesByWork.get(text(row.id)) ?? [])), total: worksResult.count ?? 0 };
}

export async function loadPublicContent(): Promise<{
  works: Work[];
  reviews: Review[];
  settings: SiteSettings;
}> {
  if (!isSupabaseConfigured) {
    return { works: initialWorks, reviews: initialReviews, settings: initialSettings };
  }

  const supabase = getSupabase();
  const [worksPage, reviewsResult, settingsResult] = await Promise.all([
    loadPublicWorksPage(),
    supabase
      .from("reviews")
      .select("id,name,location,message,rating,instagram_url")
      .order("created_at", { ascending: false }),
    supabase
      .from("site_settings")
      .select("id,slogan,phone,instagram_url,tiktok_url,address,workshop_note")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  const error = reviewsResult.error ?? settingsResult.error;
  if (error) throw new Error(error.message);

  return {
    works: worksPage.works,
    reviews: ((reviewsResult.data ?? []) as ReviewRow[]).map(mapReview),
    settings: mapSettings((settingsResult.data as SettingsRow | null) ?? null),
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
    throw new Error("This account is not authorized for the admin portal.");
  }

  return data.session;
}

export async function getCurrentAdminSession(): Promise<Session | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session) return null;

  const { data: admin } = await supabase
    .from("admin_users")
    .select("user_id,is_active")
    .eq("user_id", session.user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!admin) {
    await supabase.auth.signOut();
    return null;
  }
  return session;
}

export async function signOutAdmin(): Promise<void> {
  if (isSupabaseConfigured) await getSupabase().auth.signOut();
}

export async function saveWork(form: WorkForm, editingId: string | null): Promise<string> {
  const supabase = getSupabase();
  const title = trimmed(form.title);
  const slug = trimmed(form.slug);
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

  const { data, error } = await supabase.rpc("save_work_with_images", {
    p_title: title,
    p_slug: slug,
    p_category: trimmed(form.category) || "interior-designing",
    p_location: trimmed(form.location) || "Kathmandu",
    p_short_description: trimmed(form.shortDesc) || "Custom designed space",
    p_long_description: trimmed(form.longDesc) || "Detailed project description coming soon. Crafted at Rupantar workshop.",
    p_featured: Boolean(form.featured),
    p_images: imagePayload,
    p_work_id: editingId ? databaseId(editingId, "work ID") : null,
  });
  if (error || data == null) throw new Error(error?.message ?? "The work could not be saved.");
  return text(data);
}

export async function deleteWork(id: string): Promise<string[]> {
  const { data, error } = await getSupabase().rpc("delete_work_with_images", {
    p_work_id: databaseId(id, "work ID"),
  });
  if (error || !Array.isArray(data)) throw new Error(error?.message ?? "The work could not be deleted.");
  return data.map(text).filter(Boolean);
}

export async function saveReview(form: ReviewForm): Promise<void> {
  const rating = Number(form.rating);
  const payload: TablesInsert<"reviews"> = {
    name: requiredText(form.name, "Review name"),
    location: trimmed(form.location) || "Kathmandu",
    message: requiredText(form.message, "Review message"),
    rating: Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 5,
    instagram_url: httpsUrl(form.instagramLink, "Instagram link", true),
  };
  const { error } = await getSupabase().from("reviews").insert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteReview(id: string): Promise<void> {
  const { data, error } = await getSupabase().from("reviews").delete().eq("id", databaseId(id, "review ID")).select("id").maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "The review could not be deleted.");
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
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
  const { data, error } = await getSupabase().from("site_settings").upsert(payload, { onConflict: "id" }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Settings could not be saved.");
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
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "The lead could not be updated.");
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

