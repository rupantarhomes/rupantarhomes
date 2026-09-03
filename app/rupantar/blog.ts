export const blogCategories = [
  { value: "architecture", label: "Architecture" },
  { value: "interior-design", label: "Interior Design" },
  { value: "home-construction", label: "Home Construction" },
] as const;
export type BlogCategory = (typeof blogCategories)[number]["value"];
export type Blog = { id: string; title: string; slug: string; body: string; category: BlogCategory; createdAt: string; updatedAt: string };
export type BlogForm = Pick<Blog, "title" | "body" | "category">;
export const maximumBlogWords = 1200;
export const emptyBlogForm: BlogForm = { title: "", category: "architecture", body: "" };
export function countBlogWords(value: string): number { const normalized = value.trim(); return normalized ? normalized.split(/\s+/).length : 0; }
export function slugifyBlogTitle(value: string): string { return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
export function blogExcerpt(value: string, maximumLength = 180): string { const normalized = value.replace(/\s+/g, " ").trim(); if (normalized.length <= maximumLength) return normalized; const truncated = normalized.slice(0, maximumLength).replace(/\s+\S*$/, "").trim(); return `${truncated || normalized.slice(0, maximumLength).trim()}…`; }

const rupantarBlogHosts = new Set(["rupantarhomes.com", "www.rupantarhomes.com"]);

export function rupantarBlogSlugFromUrl(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !rupantarBlogHosts.has(url.hostname.toLowerCase())
    ) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length !== 2 || segments[0] !== "blog") return null;

    let slug = segments[1];
    try {
      slug = decodeURIComponent(slug);
    } catch {
      return null;
    }
    return slug && !slug.includes("/") ? slug : null;
  } catch {
    return null;
  }
}

export function resolveRupantarBlogUrl(value: string | null | undefined, blogs: Blog[]): Blog | null {
  const slug = rupantarBlogSlugFromUrl(value);
  return slug ? blogs.find((blog) => blog.slug === slug) ?? null : null;
}
