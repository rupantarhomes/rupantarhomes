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

test("Blog article uses original editorial title/body typography while keeping scoped spacing", async () => {
  const [pages, styles, editorial] = await Promise.all([
    read("app/rupantar/blog-pages.tsx"),
    read("app/rupantar/blog-article.css"),
    read("app/editorial-pages.css"),
  ]);
  const [indexPage, articlePage] = pages.split("export function BlogArticlePage");

  assert.doesNotMatch(indexPage, /rh-blog-article-page|rh-blog-project-card/);
  assert.match(articlePage, /className="rh-blog-article max-w-\[800px\]"/);
  assert.match(articlePage, /className="rh-blog-project-card w-full/);
  assert.doesNotMatch(articlePage, /rh-blog-project-card[^\n]*border border-zinc-100/);
  assert.doesNotMatch(articlePage, /aria-hidden="true" style=\{\{ height:/);
  assert.match(articlePage, /href=\{workPath\(linkedWork\)\}/);

  assert.match(styles, /\.rh-blog-article \{[\s\S]*?padding-top: 0 !important/);
  assert.doesNotMatch(styles, /\.rh-blog-article-title\s*\{/);
  assert.doesNotMatch(styles, /\.rh-blog-article-body\s*\{/);
  assert.match(styles, /\.rh-blog-project-card \{[\s\S]*?margin-top: 64px !important/);
  assert.match(styles, /\.rh-blog-project-eyebrow \{[\s\S]*?font-size: 11px !important/);
  assert.match(styles, /\.rh-blog-project-title \{[\s\S]*?font-size: 22px !important/);
  assert.match(styles, /\.rh-blog-project-description \{[\s\S]*?font-size: 14px !important/);
  assert.match(styles, /\.rh-blog-project-link \{[\s\S]*?font-size: 13px !important/);
  assert.match(styles, /@media \(max-width: 639px\) \{[\s\S]*?\.rh-blog-article-page \{[\s\S]*?padding-top: 40px !important/);
  assert.match(styles, /@media \(max-width: 639px\) \{[\s\S]*?\.rh-blog-project-title \{[\s\S]*?font-size: 20px !important/);

  assert.match(editorial, /main\.max-w-\\\[1280px\\\] > article\.max-w-\\\[800px\\\] > h1 \{[\s\S]*?font-size: 38px;[\s\S]*?line-height: 1\.12;[\s\S]*?letter-spacing: -0\.028em;/);
  assert.match(editorial, /main\.max-w-\\\[1280px\\\] > article\.max-w-\\\[800px\\\] > h1 \+ div \{[\s\S]*?font-size: 15px;[\s\S]*?line-height: 1\.72;/);
  assert.match(editorial, /@media \(max-width: 639px\) \{[\s\S]*?main\.max-w-\\\[1280px\\\] > article\.max-w-\\\[800px\\\] > h1 \{[\s\S]*?font-size: 30px;[\s\S]*?line-height: 1\.16;/);
});
