import { rupantarBlogSlugFromUrl } from "./blog";
import { initialWorks } from "./data";
import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { Work } from "./types";

export type BlogLinkedWork = Pick<Work, "id" | "title" | "slug" | "category">;

function linkedWork(work: Pick<Work, "id" | "title" | "slug" | "category">): BlogLinkedWork {
  return { id: work.id, title: work.title, slug: work.slug, category: work.category };
}

function blogUrlCandidates(slug: string): string[] {
  const encodedSlug = encodeURIComponent(slug);
  const path = `/blog/${encodedSlug}`;
  return [
    `https://rupantarhomes.com${path}`,
    `https://rupantarhomes.com${path}/`,
    `https://www.rupantarhomes.com${path}`,
    `https://www.rupantarhomes.com${path}/`,
  ];
}

export async function loadLinkedWorkForBlog(blogSlug: string): Promise<BlogLinkedWork | null> {
  const slug = blogSlug.trim();
  if (!slug) return null;

  if (!isSupabaseConfigured) {
    const work = initialWorks.find((item) => rupantarBlogSlugFromUrl(item.blogUrl) === slug);
    return work ? linkedWork(work) : null;
  }

  const { data, error } = await getSupabase()
    .from("works")
    .select("id,title,slug,category,blog_url")
    .in("blog_url", blogUrlCandidates(slug))
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || rupantarBlogSlugFromUrl(data.blog_url) !== slug) return null;

  return {
    id: String(data.id),
    title: data.title,
    slug: data.slug,
    category: data.category,
  };
}
