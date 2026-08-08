import { initialReviews, initialSettings, initialWorks } from "./data";
import { getSupabase, isSupabaseConfigured, type Session } from "./supabase";
import type {
  AdminStats,
  EstimateForm,
  QueryForm,
  Review,
  ReviewForm,
  SiteSettings,
  Work,
  WorkForm,
  WorkImage,
} from "./types";

type WorkRow = {
  id: string;
  title: string;
  slug: string;
  category: string;
  location: string;
  short_desc: string;
  long_desc: string;
  featured: boolean;
};

type WorkImageRow = {
  id: string;
  work_id: string;
  secure_url: string;
  cloudinary_public_id: string;
  alt_text: string | null;
  sort_order: number;
  width: number | null;
  height: number | null;
  bytes: number | null;
};

type ReviewRow = {
  id: string;
  name: string;
  location: string;
  message: string;
  rating: number;
  instagram_link: string | null;
};

type SettingsRow = {
  slogan: string;
  phone: string;
  instagram: string;
  tiktok: string;
  address: string;
  workshop_note: string;
};

function mapImage(row: WorkImageRow): WorkImage {
  return {
    id: row.id,
    workId: row.work_id,
    url: row.secure_url,
    publicId: row.cloudinary_public_id,
    altText: row.alt_text ?? "",
    sortOrder: row.sort_order,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    bytes: row.bytes ?? undefined,
  };
}

function mapWork(row: WorkRow, images: WorkImage[]): Work {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    location: row.location,
    shortDesc: row.short_desc,
    longDesc: row.long_desc,
    featured: row.featured,
    images,
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    message: row.message,
    rating: row.rating,
    instagramLink: row.instagram_link ?? "",
  };
}

function mapSettings(row: SettingsRow | null): SiteSettings {
  if (!row) return initialSettings;
  return {
    slogan: row.slogan,
    phone: row.phone,
    instagram: row.instagram,
    tiktok: row.tiktok,
    address: row.address,
    workshopNote: row.workshop_note,
  };
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
  const [worksResult, imagesResult, reviewsResult, settingsResult] = await Promise.all([
    supabase.from("works").select("*").order("created_at", { ascending: false }),
    supabase.from("work_images").select("*").order("sort_order", { ascending: true }),
    supabase.from("reviews").select("*").order("created_at", { ascending: false }),
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  const error = worksResult.error ?? imagesResult.error ?? reviewsResult.error ?? settingsResult.error;
  if (error) throw new Error(error.message);

  const imageRows = (imagesResult.data ?? []) as WorkImageRow[];
  const imagesByWork = new Map<string, WorkImage[]>();
  for (const row of imageRows) {
    const images = imagesByWork.get(row.work_id) ?? [];
    images.push(mapImage(row));
    imagesByWork.set(row.work_id, images);
  }

  return {
    works: ((worksResult.data ?? []) as WorkRow[]).map((row) => mapWork(row, imagesByWork.get(row.id) ?? [])),
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
    .select("user_id")
    .eq("user_id", data.user.id)
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
    .select("user_id")
    .eq("user_id", session.user.id)
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

export async function saveWork(form: WorkForm, editingId: string | null): Promise<void> {
  const supabase = getSupabase();
  const payload = {
    title: form.title.trim(),
    slug: form.slug.trim(),
    category: form.category,
    location: form.location.trim() || "Kathmandu",
    short_desc: form.shortDesc.trim() || "Custom designed space",
    long_desc: form.longDesc.trim() || "Detailed project description coming soon. Crafted at Rupantar workshop.",
    featured: form.featured,
    updated_at: new Date().toISOString(),
  };

  let workId = editingId;
  if (editingId) {
    const { error } = await supabase.from("works").update(payload).eq("id", editingId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase.from("works").insert(payload).select("id").single();
    if (error || !data) throw new Error(error?.message ?? "Unable to save work.");
    workId = data.id as string;
  }

  if (!workId) throw new Error("Unable to identify the saved work.");
  const { error: deleteImagesError } = await supabase.from("work_images").delete().eq("work_id", workId);
  if (deleteImagesError) throw new Error(deleteImagesError.message);

  if (form.images.length > 0) {
    const imagePayload = form.images.map((image, index) => ({
      work_id: workId,
      cloudinary_public_id: image.publicId,
      secure_url: image.url,
      alt_text: image.altText || form.title,
      sort_order: index,
      width: image.width ?? null,
      height: image.height ?? null,
      bytes: image.bytes ?? null,
      format: "webp",
    }));
    const { error } = await supabase.from("work_images").insert(imagePayload);
    if (error) throw new Error(error.message);
  }
}

export async function deleteWork(id: string): Promise<void> {
  const { error } = await getSupabase().from("works").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveReview(form: ReviewForm): Promise<void> {
  const { error } = await getSupabase().from("reviews").insert({
    name: form.name.trim(),
    location: form.location.trim(),
    message: form.message.trim(),
    rating: form.rating,
    instagram_link: form.instagramLink?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await getSupabase().from("reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function saveSettings(settings: SiteSettings): Promise<void> {
  const { error } = await getSupabase().from("site_settings").upsert({
    id: 1,
    slogan: settings.slogan.trim(),
    phone: settings.phone.trim(),
    instagram: settings.instagram.trim(),
    tiktok: settings.tiktok.trim(),
    address: settings.address.trim(),
    workshop_note: settings.workshopNote.trim(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function submitEstimate(form: EstimateForm): Promise<void> {
  const { error } = await getSupabase().from("estimate_requests").insert({
    name: form.name.trim(),
    phone: form.phone.trim(),
    location: form.location.trim(),
    category: form.category,
    size: form.size.trim(),
    material: form.material.trim(),
    message: form.message.trim(),
  });
  if (error) throw new Error(error.message);
}

export async function submitQuery(form: QueryForm): Promise<void> {
  const { error } = await getSupabase().from("queries").insert({
    name: form.name.trim(),
    phone: form.phone.trim(),
    category: form.category,
    message: form.message.trim(),
  });
  if (error) throw new Error(error.message);
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
