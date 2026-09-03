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

test("Work project stories resolve the current Blog title without duplicating title data", async () => {
  const [blog, publicPages, admin, workTypes, workBlogMigration] = await Promise.all([
    read("app/rupantar/blog.ts"),
    read("app/rupantar/public-pages.tsx"),
    read("app/rupantar/admin.tsx"),
    read("app/rupantar/types.ts"),
    read("supabase/migrations/20260829093000_add_work_project_blog_url.sql"),
  ]);

  assert.match(blog, /rupantarBlogSlugFromUrl/);
  assert.match(blog, /rupantarhomes\.com/);
  assert.match(blog, /www\.rupantarhomes\.com/);
  assert.match(blog, /segments\.length !== 2 \|\| segments\[0\] !== "blog"/);
  assert.match(blog, /resolveRupantarBlogUrl/);

  assert.match(publicPages, /loadPublicBlogBySlug/);
  assert.match(publicPages, /rupantarBlogSlugFromUrl\(work\.blogUrl\)/);
  assert.match(publicPages, /setProjectBlogTitle\(blog\?\.title \?\? null\)/);
  assert.match(publicPages, /\{projectBlogTitle\}<\/h3>/);
  assert.doesNotMatch(publicPages, /A Detail Blog for this Project/);

  assert.match(admin, /resolveRupantarBlogUrl\(projectBlogUrl, blogs\)/);
  assert.match(admin, /Linked blog:/);
  assert.match(admin, /No existing Rupantar Homes blog matches this URL\./);
  assert.match(admin, /This URL is not a valid Rupantar Homes blog link\./);

  assert.doesNotMatch(workTypes, /blogTitle/);
  assert.doesNotMatch(workBlogMigration, /blog_title/i);
});


test("Blog article keeps approved card typography while adding outer breathing room", async () => {
  const [pages, editorial] = await Promise.all([
    read("app/rupantar/blog-pages.tsx"),
    read("app/editorial-pages.css"),
  ]);
  const [indexPage, articlePage] = pages.split("export function BlogArticlePage");

  assert.doesNotMatch(indexPage, /rh-blog-article|rh-blog-project-images/);
  assert.match(articlePage, /className="rh-blog-article max-w-\[800px\]"/);
  assert.match(articlePage, /linkedWork &&/);
  assert.doesNotMatch(articlePage, /rh-blog-project-images/);
  assert.match(articlePage, /style=\{\{ marginTop: "64px" \}\}/);
  assert.match(articlePage, /className="mt-12 w-full rounded-\[1\.75rem\][\s\S]*?p-6 sm:p-7/);
  assert.match(articlePage, /text-\[18px\] sm:text-\[20px\]/);
  assert.match(articlePage, /text-\[13px\] leading-6/);
  assert.match(articlePage, /text-\[12px\] font-semibold/);
  assert.match(articlePage, /href=\{workPath\(linkedWork\)\}/);

  assert.match(editorial, /@media \(max-width: 639px\) \{[\s\S]*?\.rh-blog-article \{[\s\S]*?padding-top: 32px/);
});
