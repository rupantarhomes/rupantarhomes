import { requireRuntimeEnv, type RuntimeEnv } from "../_lib/env";
import { fetchWithTimeout } from "../_lib/http";

type PublicWorkImageRow = {
  id?: unknown;
  work_id?: unknown;
  secure_url?: unknown;
  cloudinary_public_id?: unknown;
  alt_text?: unknown;
  sort_order?: unknown;
  width?: unknown;
  height?: unknown;
  byte_size?: unknown;
};

type PublicWorkRow = {
  id?: unknown;
  title?: unknown;
  slug?: unknown;
  category?: unknown;
  location?: unknown;
  short_description?: unknown;
  long_description?: unknown;
  featured?: unknown;
  blog_url?: unknown;
  work_images?: unknown;
};

type PublicReviewRow = { id?: unknown; name?: unknown; location?: unknown; message?: unknown; rating?: unknown; instagram_url?: unknown };
type PublicSettingsRow = { slogan?: unknown; phone?: unknown; instagram_url?: unknown; tiktok_url?: unknown; address?: unknown; workshop_note?: unknown };

const responseHeaders = {
  "Cache-Control": "public, max-age=30, s-maxage=30",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
} as const;

function text(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function mapImage(row: PublicWorkImageRow) {
  return {
    id: text(row.id),
    workId: text(row.work_id),
    url: text(row.secure_url),
    publicId: text(row.cloudinary_public_id),
    altText: text(row.alt_text),
    sortOrder: number(row.sort_order) ?? 0,
    width: number(row.width),
    height: number(row.height),
    bytes: number(row.byte_size),
  };
}

function mapWork(row: PublicWorkRow) {
  const images = Array.isArray(row.work_images)
    ? (row.work_images as PublicWorkImageRow[]).map(mapImage).sort((left, right) => left.sortOrder - right.sortOrder)
    : [];
  return {
    id: text(row.id),
    title: text(row.title),
    slug: text(row.slug),
    category: text(row.category),
    location: text(row.location),
    shortDesc: text(row.short_description),
    longDesc: text(row.long_description),
    featured: row.featured === true,
    blogUrl: text(row.blog_url) || undefined,
    images,
  };
}

function mapReview(row: PublicReviewRow) {
  return {
    id: text(row.id), name: text(row.name), location: text(row.location), message: text(row.message),
    rating: number(row.rating) ?? 5, instagramLink: text(row.instagram_url) || undefined,
  };
}

function mapSettings(row: PublicSettingsRow) {
  return {
    slogan: text(row.slogan), phone: text(row.phone), instagram: text(row.instagram_url),
    tiktok: text(row.tiktok_url), address: text(row.address), workshopNote: text(row.workshop_note),
  };
}

async function fetchHomeWorks(env: RuntimeEnv): Promise<Response> {
  const runtime = requireRuntimeEnv(env);
  const url = new URL(`${runtime.SUPABASE_URL}/rest/v1/works`);
  url.searchParams.set("select", "id,title,slug,category,location,short_description,long_description,featured,blog_url,work_images(id,work_id,secure_url,cloudinary_public_id,alt_text,sort_order,width,height,byte_size)");
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("work_images.order", "sort_order.asc");
  url.searchParams.set("limit", "6");

  const reviewsUrl = new URL(`${runtime.SUPABASE_URL}/rest/v1/reviews`);
  reviewsUrl.searchParams.set("select", "id,name,location,message,rating,instagram_url");
  reviewsUrl.searchParams.set("order", "created_at.desc");
  const settingsUrl = new URL(`${runtime.SUPABASE_URL}/rest/v1/site_settings`);
  settingsUrl.searchParams.set("select", "slogan,phone,instagram_url,tiktok_url,address,workshop_note");
  settingsUrl.searchParams.set("id", "eq.1");
  settingsUrl.searchParams.set("limit", "1");
  const init = { headers: { apikey: runtime.SUPABASE_PUBLISHABLE_KEY, Accept: "application/json" } };
  const [worksResponse, reviewsResponse, settingsResponse] = await Promise.all([
    fetchWithTimeout(url, init, 4_000),
    fetchWithTimeout(reviewsUrl, init, 4_000),
    fetchWithTimeout(settingsUrl, init, 4_000),
  ]);
  if (!worksResponse.ok || !reviewsResponse.ok || !settingsResponse.ok) {
    throw new Error(`Public Home query returned ${worksResponse.status}/${reviewsResponse.status}/${settingsResponse.status}`);
  }
  const [rows, reviewRows, settingsRows] = await Promise.all([worksResponse.json(), reviewsResponse.json(), settingsResponse.json()]);
  if (!Array.isArray(rows)) throw new Error("Public Home query returned an invalid payload");
  if (!Array.isArray(reviewRows) || !Array.isArray(settingsRows) || !settingsRows[0]) throw new Error("Public Home shell returned an invalid payload");
  const works = (rows as PublicWorkRow[]).map(mapWork).filter((work) => work.id && work.title && work.slug && work.category);
  const reviews = (reviewRows as PublicReviewRow[]).map(mapReview).filter((review) => review.id && review.name && review.message);
  return Response.json({ works, reviews, settings: mapSettings(settingsRows[0] as PublicSettingsRow), confirmedAt: Date.now() }, { headers: responseHeaders });
}

export const onRequestGet: PagesFunction<RuntimeEnv> = async ({ request, env, waitUntil }) => {
  const cache = (caches as CacheStorage & { default: Cache }).default;
  const cacheKey = new Request(new URL("/api/public-home", request.url), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const response = await fetchHomeWorks(env);
    waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  } catch (error) {
    console.error("Public Home bootstrap failed", error);
    return Response.json({ works: [], confirmedAt: Date.now() }, {
      status: 503,
      headers: { ...responseHeaders, "Cache-Control": "no-store" },
    });
  }
};
