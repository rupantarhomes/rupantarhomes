import { requireRuntimeEnv, type RuntimeEnv } from "../_lib/env";
import { fetchWithTimeout } from "../_lib/http";

const baseHeaders = {
  "Cache-Control": "public, max-age=30, s-maxage=30, stale-while-revalidate=86400",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
} as const;

const workSelect = "id,title,slug,category,location,short_description,long_description,featured,blog_url,work_images(id,work_id,secure_url,cloudinary_public_id,alt_text,sort_order,width,height,byte_size)";
const blogSelect = "id,title,slug,body,category,created_at,updated_at";

function text(value: unknown): string { return typeof value === "string" ? value : value == null ? "" : String(value); }
function number(value: unknown): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }

function mapImage(value: unknown) {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { id: text(row.id), workId: text(row.work_id), url: text(row.secure_url), publicId: text(row.cloudinary_public_id),
    altText: text(row.alt_text), sortOrder: number(row.sort_order) ?? 0, width: number(row.width), height: number(row.height), bytes: number(row.byte_size) };
}

function mapWork(value: unknown) {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const images = Array.isArray(row.work_images) ? row.work_images.map(mapImage).sort((a, b) => a.sortOrder - b.sortOrder) : [];
  return { id: text(row.id), title: text(row.title), slug: text(row.slug), category: text(row.category), location: text(row.location),
    shortDesc: text(row.short_description), longDesc: text(row.long_description), featured: row.featured === true,
    blogUrl: text(row.blog_url), images };
}

function mapBlog(value: unknown) {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { id: text(row.id), title: text(row.title), slug: text(row.slug), body: text(row.body), category: text(row.category),
    createdAt: text(row.created_at), updatedAt: text(row.updated_at) };
}

function integer(value: string | null, fallback: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? Math.min(parsed, maximum) : fallback;
}

function safeSegment(value: string | null): string {
  const normalized = (value ?? "").trim();
  if (!normalized || normalized.length > 160 || !/^[a-z0-9-]+$/i.test(normalized)) throw new Error("Invalid public content key");
  return normalized;
}

function blogUrlCandidates(slug: string): string[] {
  const path = `/blog/${slug}`;
  return [
    `https://rupantarhomes.com${path}`,
    `https://rupantarhomes.com${path}/`,
    `https://www.rupantarhomes.com${path}`,
    `https://www.rupantarhomes.com${path}/`,
  ];
}

async function supabaseJson(env: RuntimeEnv, url: URL, count = false): Promise<{ data: unknown; total?: number }> {
  const runtime = requireRuntimeEnv(env);
  const response = await fetchWithTimeout(url, { headers: {
    apikey: runtime.SUPABASE_PUBLISHABLE_KEY,
    Accept: "application/json",
    ...(count ? { Prefer: "count=exact" } : {}),
  } }, 5_000);
  if (!response.ok) throw new Error(`Public content origin returned ${response.status}`);
  const contentRange = response.headers.get("content-range") ?? "";
  const totalValue = Number(contentRange.split("/")[1]);
  return { data: await response.json(), total: Number.isSafeInteger(totalValue) ? totalValue : undefined };
}

async function fetchPublicContent(request: Request, env: RuntimeEnv): Promise<Response> {
  const runtime = requireRuntimeEnv(env);
  const input = new URL(request.url);
  const resource = input.searchParams.get("resource");
  const url = new URL(`${runtime.SUPABASE_URL}/rest/v1/${resource?.startsWith("blog") ? "blogs" : "works"}`);

  if (resource === "works") {
    const offset = integer(input.searchParams.get("offset"), 0, 10_000);
    const limit = Math.max(1, integer(input.searchParams.get("limit"), 12, 24));
    const category = input.searchParams.get("category") ?? "all";
    url.searchParams.set("select", workSelect);
    url.searchParams.set("order", "created_at.desc");
    url.searchParams.set("work_images.order", "sort_order.asc");
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("limit", String(limit));
    if (category !== "all") url.searchParams.set("category", `eq.${safeSegment(category)}`);
    const result = await supabaseJson(env, url, true);
    const rows = Array.isArray(result.data) ? result.data : [];
    return Response.json({ works: rows.map(mapWork), total: result.total ?? rows.length }, { headers: baseHeaders });
  }

  if (resource === "work") {
    const category = safeSegment(input.searchParams.get("category"));
    const slug = safeSegment(input.searchParams.get("slug"));
    url.searchParams.set("select", workSelect);
    url.searchParams.set("category", `eq.${category}`);
    url.searchParams.set("slug", `eq.${slug}`);
    url.searchParams.set("work_images.order", "sort_order.asc");
    url.searchParams.set("limit", "1");
    const result = await supabaseJson(env, url);
    const rows = Array.isArray(result.data) ? result.data : [];
    return Response.json({ work: rows[0] ? mapWork(rows[0]) : null }, { headers: baseHeaders });
  }

  if (resource === "blogs") {
    url.searchParams.set("select", blogSelect);
    url.searchParams.set("order", "created_at.desc");
    const worksUrl = new URL(`${runtime.SUPABASE_URL}/rest/v1/works`);
    worksUrl.searchParams.set("select", "id,title,slug,category,blog_url");
    worksUrl.searchParams.set("order", "id.asc");
    worksUrl.searchParams.set("blog_url", "not.is.null");
    const [result, worksResult] = await Promise.all([supabaseJson(env, url), supabaseJson(env, worksUrl)]);
    const rows = Array.isArray(result.data) ? result.data : [];
    const workRows = Array.isArray(worksResult.data) ? worksResult.data as Array<Record<string, unknown>> : [];
    const linkedWorks: Record<string, { id: string; title: string; slug: string; category: string } | null> = {};
    for (const blog of rows.map(mapBlog)) {
      const linked = workRows.find((row) => {
        try {
          const linkedUrl = new URL(text(row.blog_url));
          return linkedUrl.hostname.replace(/^www\./, "") === "rupantarhomes.com" && linkedUrl.pathname.replace(/\/+$/, "") === `/blog/${blog.slug}`;
        } catch { return false; }
      });
      linkedWorks[blog.slug] = linked ? { id: text(linked.id), title: text(linked.title), slug: text(linked.slug), category: text(linked.category) } : null;
    }
    return Response.json({ blogs: rows.map(mapBlog), linkedWorks }, { headers: baseHeaders });
  }

  if (resource === "blog") {
    const slug = safeSegment(input.searchParams.get("slug"));
    url.searchParams.set("select", blogSelect);
    url.searchParams.set("slug", `eq.${slug}`);
    url.searchParams.set("limit", "1");
    const worksUrl = new URL(`${runtime.SUPABASE_URL}/rest/v1/works`);
    worksUrl.searchParams.set("select", "id,title,slug,category,blog_url");
    worksUrl.searchParams.set("order", "id.asc");
    worksUrl.searchParams.set("blog_url", `in.(${blogUrlCandidates(slug).join(",")})`);
    worksUrl.searchParams.set("limit", "1");
    const [blogResult, worksResult] = await Promise.all([supabaseJson(env, url), supabaseJson(env, worksUrl)]);
    const blogRows = Array.isArray(blogResult.data) ? blogResult.data : [];
    const workRows = Array.isArray(worksResult.data) ? worksResult.data as Array<Record<string, unknown>> : [];
    const linked = workRows.find((row) => {
      try {
        const linkedUrl = new URL(text(row.blog_url));
        return linkedUrl.hostname.replace(/^www\./, "") === "rupantarhomes.com" && linkedUrl.pathname.replace(/\/+$/, "") === `/blog/${slug}`;
      } catch { return false; }
    });
    const linkedWork = linked ? { id: text(linked.id), title: text(linked.title), slug: text(linked.slug), category: text(linked.category) } : null;
    return Response.json({ blog: blogRows[0] ? mapBlog(blogRows[0]) : null, linkedWork }, { headers: baseHeaders });
  }

  return Response.json({ error: "Unsupported public content resource" }, { status: 400, headers: { ...baseHeaders, "Cache-Control": "no-store" } });
}

function cacheKey(request: Request, stale: boolean): Request {
  const url = new URL(request.url);
  if (stale) url.searchParams.set("__stale", "1");
  else url.searchParams.delete("__stale");
  return new Request(url, { method: "GET" });
}

async function store(cache: Cache, request: Request, response: Response): Promise<void> {
  const freshHeaders = new Headers(response.headers);
  freshHeaders.set("Cache-Control", "public, max-age=30, s-maxage=30");
  const staleHeaders = new Headers(response.headers);
  staleHeaders.set("Cache-Control", "public, max-age=0, s-maxage=86400");
  const body = await response.clone().arrayBuffer();
  await Promise.all([
    cache.put(cacheKey(request, false), new Response(body.slice(0), { status: response.status, headers: freshHeaders })),
    cache.put(cacheKey(request, true), new Response(body, { status: response.status, headers: staleHeaders })),
  ]);
}

function asStale(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=86400");
  headers.set("X-Rupantar-Stale", "1");
  return new Response(response.body, { status: response.status, headers });
}

export const onRequestGet: PagesFunction<RuntimeEnv> = async ({ request, env, waitUntil }) => {
  const cache = (caches as CacheStorage & { default: Cache }).default;
  const fresh = await cache.match(cacheKey(request, false));
  if (fresh) return fresh;
  const stale = await cache.match(cacheKey(request, true));
  if (stale) {
    waitUntil(fetchPublicContent(request, env).then((response) => store(cache, request, response))
      .catch((error) => console.error("Public content background refresh failed", error)));
    return asStale(stale);
  }
  try {
    const response = await fetchPublicContent(request, env);
    if (response.ok) waitUntil(store(cache, request, response));
    return response;
  } catch (error) {
    console.error("Public content request failed", error);
    return Response.json({ error: "Public content temporarily unavailable" }, { status: 503, headers: { ...baseHeaders, "Cache-Control": "no-store" } });
  }
};
