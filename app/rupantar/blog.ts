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
