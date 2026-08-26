import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("blog routes and limits are isolated", async () => {
  const [routes, blog, migration] = await Promise.all([
    read("app/rupantar/routes.ts"),
    read("app/rupantar/blog.ts"),
    read("supabase/migrations/20260822124035_create_blogs.sql"),
  ]);
  assert.match(routes, /kind: "blog"/);
  assert.match(routes, /kind: "blog-detail"; slug: string/);
  assert.match(routes, /blogArticlePath/);
  assert.match(blog, /maximumBlogWords = 1200/);
  assert.match(migration, /create table public\.blogs/);
  assert.match(migration, /blogs_body_word_limit/);
  assert.match(migration, /enable row level security/);
});

test("blog remains text only", async () => {
  const [pages, admin, shared] = await Promise.all([
    read("app/rupantar/blog-pages.tsx"),
    read("app/rupantar/blog-admin.tsx"),
    read("app/rupantar/shared.tsx"),
  ]);
  assert.match(pages, /No articles published yet\./);
  assert.match(pages, /Read Article/);
  assert.doesNotMatch(pages, /<img|Cloudinary|upload/i);
  assert.match(admin, /maximumBlogWords/);
  assert.match(admin, /countBlogWords/);
  assert.match(shared, />Blog<\/button>/);
});
