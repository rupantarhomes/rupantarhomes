import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("resolves Blog project images from the existing Work blog URL only", async () => {
  const source = await read("../app/rupantar/blog-project-link.ts");

  assert.match(source, /loadLinkedWorkForBlog/);
  assert.match(source, /\.from\("works"\)/);
  assert.match(source, /\.select\("id,title,slug,category,blog_url"\)/);
  assert.match(source, /\.in\("blog_url", blogUrlCandidates\(slug\)\)/);
  assert.match(source, /rupantarBlogSlugFromUrl\(data\.blog_url\) !== slug/);
  assert.doesNotMatch(source, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|\.rpc\(/);
});

test("shows the reverse project card only when a linked Work resolves", async () => {
  const source = await read("../app/rupantar/blog-pages.tsx");

  assert.match(source, /loadLinkedWorkForBlog\(blog\.slug\)/);
  assert.match(source, /\{linkedWork && \(/);
  assert.match(source, /Project Images/);
  assert.match(source, /View Project Images/);
  assert.match(source, /href=\{workPath\(linkedWork\)\}/);
  assert.match(source, /See the completed project and its full image gallery\./);
  assert.match(source, /setLinkedWork\(null\)/);
});

test("dedicated Blog article uses one scoped layout contract", async () => {
  const [source, styles] = await Promise.all([
    read("../app/rupantar/blog-pages.tsx"),
    read("../app/rupantar/blog-article.css"),
  ]);

  assert.match(source, /import "\.\/blog-article\.css"/);
  assert.match(source, /rh-blog-article-page/);
  assert.match(source, /rh-blog-project-card/);
  assert.doesNotMatch(source, /aria-hidden="true" style=\{\{ height:/);
  assert.doesNotMatch(source, /max-w-\[640px\]/);

  assert.match(styles, /\.rh-blog-article \{[\s\S]*?max-width: 800px !important[\s\S]*?padding-top: 0 !important/);
  assert.match(styles, /\.rh-blog-article-title \{[\s\S]*?font-size: 38px !important/);
  assert.match(styles, /\.rh-blog-article-body \{[\s\S]*?font-size: 15px !important/);
  assert.match(styles, /\.rh-blog-project-card \{[\s\S]*?margin-top: 64px !important/);
  assert.match(styles, /\.rh-blog-project-eyebrow \{[\s\S]*?font-size: 11px !important/);
  assert.match(styles, /\.rh-blog-project-title \{[\s\S]*?font-size: 22px !important/);
  assert.match(styles, /\.rh-blog-project-description \{[\s\S]*?font-size: 14px !important/);
  assert.match(styles, /\.rh-blog-project-link \{[\s\S]*?font-size: 13px !important/);
  assert.match(styles, /@media \(max-width: 639px\) \{[\s\S]*?\.rh-blog-article-page \{[\s\S]*?padding-top: 40px !important/);
  assert.match(styles, /@media \(max-width: 639px\) \{[\s\S]*?\.rh-blog-article \{[\s\S]*?padding-top: 0 !important/);
  assert.match(styles, /@media \(max-width: 639px\) \{[\s\S]*?\.rh-blog-article-title \{[\s\S]*?font-size: 30px !important/);
  assert.match(styles, /@media \(max-width: 639px\) \{[\s\S]*?\.rh-blog-article-body \{[\s\S]*?font-size: 15px !important/);
  assert.match(styles, /@media \(max-width: 639px\) \{[\s\S]*?\.rh-blog-project-card \{[\s\S]*?margin-top: 56px !important/);
  assert.match(styles, /@media \(max-width: 639px\) \{[\s\S]*?\.rh-blog-project-title \{[\s\S]*?font-size: 20px !important/);
});

test("does not change the existing Work-to-Blog project story contract", async () => {
  const source = await read("../app/rupantar/public-pages.tsx");

  assert.match(source, /rupantarBlogSlugFromUrl\(work\.blogUrl\)/);
  assert.match(source, /loadPublicBlogBySlug\(blogSlug\)/);
  assert.match(source, /Project Story/);
  assert.match(source, /href=\{work\.blogUrl\}/);
});
