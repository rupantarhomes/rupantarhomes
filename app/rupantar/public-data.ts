import * as repository from "./repository";
import type { Work } from "./types";
import type { Blog } from "./blog";
import { loadLinkedWorkForBlog as fetchLinkedWork, type BlogLinkedWork } from "./blog-project-link";

// One document-local owner for public read freshness and in-flight requests.
// React refs are displayed snapshots; they do not decide request freshness.
export const publicFreshnessMs = 30_000;
type Entry = { value?: unknown; confirmedAt: number; revision: number; pending?: Promise<unknown> };

type CriticalBootstrap = { read: (key: string) => Promise<unknown> | undefined };
type CriticalBootstrapWindow = Window & typeof globalThis & { __RUPANTAR_PUBLIC_BOOTSTRAP__?: CriticalBootstrap };

function preparedRead<T>(key: string, fallback: () => Promise<T>): Promise<T> {
  const prepared = (window as CriticalBootstrapWindow).__RUPANTAR_PUBLIC_BOOTSTRAP__?.read(key);
  if (!prepared) return fallback();
  return prepared.then((value) => value as T).catch(() => fallback());
}

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
  restore(key: string, value: unknown, confirmedAt: number): void {
    this.entries.set(key, { value, confirmedAt, revision: 0 });
    this.trim();
  }
  prime<T>(key: string, value: T, onStore?: (value: T, revision: number) => void): void {
    const revision = ++this.revision;
    this.seed(key, value, revision);
    onStore?.(value, revision);
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
const persistentStorageKey = "rupantar-public-snapshots-v2";
const maximumPersistentAgeMs = 7 * 24 * 60 * 60 * 1000;
type PersistentEntry = { value: unknown; confirmedAt: number };
let persistentEntries: Record<string, PersistentEntry> = {};
const worksKey = (offset: number, category: string) => `works:page:${category}:${offset}`;
const workKey = (category: string, slug: string) => `works:detail:${category}:${slug}`;
const blogKey = (slug: string) => `blogs:detail:${slug}`;

function validImage(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const image = value as Record<string, unknown>;
  return typeof image.id === "string" && typeof image.url === "string" && image.url.startsWith("https://res.cloudinary.com/")
    && typeof image.publicId === "string" && typeof image.sortOrder === "number";
}

function validWork(value: unknown): value is Work {
  if (!value || typeof value !== "object") return false;
  const work = value as Record<string, unknown>;
  return ["id", "title", "slug", "category", "location", "shortDesc", "longDesc"].every((key) => typeof work[key] === "string")
    && typeof work.featured === "boolean" && Array.isArray(work.images) && work.images.every(validImage);
}

function validBlog(value: unknown): value is Blog {
  if (!value || typeof value !== "object") return false;
  const blog = value as Record<string, unknown>;
  return ["id", "title", "slug", "body", "category", "createdAt", "updatedAt"].every((key) => typeof blog[key] === "string");
}

function validLinkedWork(value: unknown): value is BlogLinkedWork | null {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  const work = value as Record<string, unknown>;
  return ["id", "title", "slug", "category"].every((key) => typeof work[key] === "string");
}

function validPersistentValue(key: string, value: unknown): boolean {
  if (key.startsWith("works:page:")) {
    if (!value || typeof value !== "object") return false;
    const page = value as Record<string, unknown>;
    return Array.isArray(page.works) && page.works.every(validWork) && Number.isSafeInteger(page.total);
  }
  if (key.startsWith("works:detail:")) return value === null || validWork(value);
  if (key.startsWith("works:blog:")) return validLinkedWork(value);
  if (key === "blogs:list") return Array.isArray(value) && value.every(validBlog);
  if (key.startsWith("blogs:detail:")) return value === null || validBlog(value);
  return false;
}

function writePersistentEntries(): void {
  try { window.localStorage.setItem(persistentStorageKey, JSON.stringify(persistentEntries)); } catch { /* optional acceleration */ }
}

function persist(key: string, value: unknown): void {
  if (!validPersistentValue(key, value)) return;
  persistentEntries[key] = { value, confirmedAt: Date.now() };
  const ordered = Object.entries(persistentEntries).sort((left, right) => right[1].confirmedAt - left[1].confirmedAt).slice(0, 64);
  persistentEntries = Object.fromEntries(ordered);
  writePersistentEntries();
}

function removePersistent(prefix: string): void {
  let changed = false;
  for (const key of Object.keys(persistentEntries)) {
    if (!key.startsWith(prefix)) continue;
    delete persistentEntries[key];
    changed = true;
  }
  if (changed) writePersistentEntries();
}

try {
  const parsed = JSON.parse(window.localStorage.getItem(persistentStorageKey) ?? "{}");
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    for (const [key, raw] of Object.entries(parsed as Record<string, unknown>)) {
      if (!raw || typeof raw !== "object") continue;
      const entry = raw as Record<string, unknown>;
      if (typeof entry.confirmedAt !== "number" || Date.now() - entry.confirmedAt > maximumPersistentAgeMs) continue;
      if (!validPersistentValue(key, entry.value)) continue;
      persistentEntries[key] = { value: entry.value, confirmedAt: entry.confirmedAt };
      cache.restore(key, entry.value, entry.confirmedAt);
    }
  }
} catch { /* storage is unavailable or corrupt; memory cache remains authoritative */ }

const rememberWorks = (works: Work[], revision: number) => {
  for (const work of works) {
    const key = workKey(work.category, work.slug);
    cache.seed(key, work, revision);
    persist(key, work);
  }
};
const rememberBlogs = (blogs: Blog[], revision: number) => {
  for (const blog of blogs) {
    const key = blogKey(blog.slug);
    cache.seed(key, blog, revision);
    persist(key, blog);
  }
};

export const publicContentIsFresh = () => cache.fresh("home");
export const publicBlogsAreFresh = () => cache.fresh("blogs:list");
export const peekPublicBlogs = () => cache.peek<Blog[]>("blogs:list");
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
export function primePublicContent(content: Awaited<ReturnType<typeof repository.loadPublicContent>>) {
  cache.prime("home", content, (value, revision) => rememberWorks(value.works, revision));
}
export function loadPublicWorksPage(offset = 0, limit = 12, category = "all") {
  // Admin requires a current complete collection, never the public cache.
  if (limit !== 12) return repository.loadPublicWorksPage(offset, limit, category);
  const key = worksKey(offset, category);
  return cache.read(key, () => preparedRead(key, () => repository.loadPublicWorksPage(offset, limit, category)),
    (page, revision) => { rememberWorks(page.works, revision); if (offset === 0) persist(key, page); });
}
export function loadPublicWorkBySlug(category: string, slug: string) {
  const key = workKey(category, slug);
  return cache.read(key, () => preparedRead(key, () => repository.loadPublicWorkBySlug(category, slug)), (work) => persist(key, work));
}
export function loadPublicBlogs() {
  return cache.read("blogs:list", async () => {
    const payload = await preparedRead<repository.PublicBlogsPayload>("blogs:payload", async () =>
      typeof repository.loadPublicBlogsPayload === "function"
        ? repository.loadPublicBlogsPayload()
        : { blogs: await repository.loadPublicBlogs(), linkedWorks: {} });
    for (const [slug, work] of Object.entries(payload.linkedWorks)) {
      cache.prime(`works:blog:${slug}`, work, (value) => persist(`works:blog:${slug}`, value));
    }
    return payload.blogs;
  }, (blogs, revision) => { rememberBlogs(blogs, revision); persist("blogs:list", blogs); });
}
export function loadPublicBlogBySlug(slug: string) {
  const key = blogKey(slug);
  return cache.read(key, () => preparedRead(key, async () => {
    const payload = typeof repository.loadPublicBlogPayload === "function"
      ? await repository.loadPublicBlogPayload(slug)
      : { blog: await repository.loadPublicBlogBySlug(slug) };
    if (Object.hasOwn(payload, "linkedWork")) {
      cache.prime(`works:blog:${slug}`, payload.linkedWork ?? null, (value) => persist(`works:blog:${slug}`, value));
    }
    return payload.blog;
  }), (blog) => persist(key, blog));
}
export function loadLinkedWorkForBlog(slug: string) {
  const key = `works:blog:${slug}`;
  return cache.read(key, () => preparedRead(key, () => fetchLinkedWork(slug)), (work) => persist(key, work));
}
export function invalidatePublicWorks() { cache.invalidate("works:"); cache.invalidate("home"); removePersistent("works:"); }
export function invalidatePublicBlogs() { cache.invalidate("blogs:"); removePersistent("blogs:"); }
export function invalidatePublicContent() { cache.invalidate("home"); }
