import * as repository from "./repository";
import type { Work } from "./types";
import type { Blog } from "./blog";
import { loadLinkedWorkForBlog as fetchLinkedWork, type BlogLinkedWork } from "./blog-project-link";

// One document-local owner for public read freshness and in-flight requests.
// React refs are displayed snapshots; they do not decide request freshness.
export const publicFreshnessMs = 30_000;
type Entry = { value?: unknown; confirmedAt: number; revision: number; pending?: Promise<unknown> };

export class PublicReadCache {
  private entries = new Map<string, Entry>();
  private revision = 0;
  constructor(private now = Date.now, private capacity = 128) {}

  peek<T>(key: string): T | undefined { return this.entries.get(key)?.value as T | undefined; }
  fresh(key: string): boolean {
    const entry = this.entries.get(key);
    return !!entry && entry.value !== undefined && this.now() - entry.confirmedAt < publicFreshnessMs;
  }
  invalidate(prefix: string): void {
    for (const key of this.entries.keys()) if (key.startsWith(prefix)) this.entries.delete(key);
  }
  private trim(): void {
    for (const [key, entry] of this.entries) {
      if (this.entries.size <= this.capacity) break;
      if (!entry.pending) this.entries.delete(key);
    }
  }
  seed(key: string, value: unknown, revision: number): void {
    if ((this.entries.get(key)?.revision ?? -1) > revision) return;
    this.entries.set(key, { value, confirmedAt: this.now(), revision });
    this.trim();
  }
  read<T>(key: string, loader: () => Promise<T>, onStore?: (value: T, revision: number) => void): Promise<T> {
    const previous = this.entries.get(key);
    if (previous?.pending) return previous.pending as Promise<T>;
    if (this.fresh(key)) return Promise.resolve(previous!.value as T);
    const entry: Entry = { value: previous?.value, confirmedAt: previous?.confirmedAt ?? 0, revision: ++this.revision };
    const pending = Promise.resolve().then(loader).then((value) => {
      // A mutation or a newer confirmed list/detail supersedes this request.
      if (this.entries.get(key) !== entry) {
        const replacement = this.entries.get(key);
        if (replacement?.value !== undefined && replacement.revision > entry.revision) return replacement.value as T;
        const error = new Error("Public read superseded");
        error.name = "AbortError";
        throw error;
      }
      entry.value = value;
      entry.confirmedAt = this.now();
      onStore?.(value, entry.revision);
      return value;
    }).finally(() => {
      if (this.entries.get(key) === entry) {
        entry.pending = undefined;
        if (entry.value === undefined) this.entries.delete(key);
      }
      this.trim();
    });
    entry.pending = pending;
    this.entries.set(key, entry);
    return pending;
  }
}

const cache = new PublicReadCache();
const worksKey = (offset: number, category: string) => `works:page:${category}:${offset}`;
const workKey = (category: string, slug: string) => `works:detail:${category}:${slug}`;
const blogKey = (slug: string) => `blogs:detail:${slug}`;
const rememberWorks = (works: Work[], revision: number) => {
  for (const work of works) cache.seed(workKey(work.category, work.slug), work, revision);
};
const rememberBlogs = (blogs: Blog[], revision: number) => {
  for (const blog of blogs) cache.seed(blogKey(blog.slug), blog, revision);
};

export const publicContentIsFresh = () => cache.fresh("home");
export const publicBlogsAreFresh = () => cache.fresh("blogs:list");
export const publicWorksAreFresh = (offset: number, category: string) => cache.fresh(worksKey(offset, category));
export const peekPublicWorksPage = (offset: number, category: string) => cache.peek<repository.PublicWorksPage>(worksKey(offset, category));
export const peekPublicWork = (category: string, slug: string) => cache.peek<Work | null>(workKey(category, slug));
export const peekPublicBlog = (slug: string) => cache.peek<Blog | null>(blogKey(slug));
export const publicWorkIsFresh = (category: string, slug: string) => cache.fresh(workKey(category, slug));
export const publicBlogIsFresh = (slug: string) => cache.fresh(blogKey(slug));
export const peekLinkedWorkForBlog = (slug: string) => cache.peek<BlogLinkedWork | null>(`works:blog:${slug}`);

export function loadPublicContent() {
  return cache.read("home", repository.loadPublicContent, (content, revision) => rememberWorks(content.works, revision));
}
export function loadPublicWorksPage(offset = 0, limit = 12, category = "all") {
  // Admin requires a current complete collection, never the public cache.
  if (limit !== 12) return repository.loadPublicWorksPage(offset, limit, category);
  return cache.read(worksKey(offset, category), () => repository.loadPublicWorksPage(offset, limit, category),
    (page, revision) => rememberWorks(page.works, revision));
}
export function loadPublicWorkBySlug(category: string, slug: string) {
  return cache.read(workKey(category, slug), () => repository.loadPublicWorkBySlug(category, slug));
}
export function loadPublicBlogs() {
  return cache.read("blogs:list", repository.loadPublicBlogs, rememberBlogs);
}
export function loadPublicBlogBySlug(slug: string) {
  return cache.read(blogKey(slug), () => repository.loadPublicBlogBySlug(slug));
}
export function loadLinkedWorkForBlog(slug: string) {
  return cache.read(`works:blog:${slug}`, () => fetchLinkedWork(slug));
}
export function invalidatePublicWorks() { cache.invalidate("works:"); cache.invalidate("home"); }
export function invalidatePublicBlogs() { cache.invalidate("blogs:"); }
export function invalidatePublicContent() { cache.invalidate("home"); }
