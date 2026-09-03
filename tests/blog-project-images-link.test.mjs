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

test("keeps desktop Blog spacing while giving mobile and the linked project card more breathing room", async () => {
  const source = await read("../app/rupantar/blog-pages.tsx");

  assert.match(source, /pt-\[4\.75rem\] pb-14 sm:py-16/);
  assert.match(source, /<div aria-hidden="true" style=\{\{ height: "64px" \}\} \/>/);
  assert.match(source, /className="w-full rounded-\[1\.75rem\]/);
  assert.match(source, /p-6 sm:p-7/);
  assert.doesNotMatch(source, /max-w-\[640px\]/);
});

test("does not change the existing Work-to-Blog project story contract", async () => {
  const source = await read("../app/rupantar/public-pages.tsx");

  assert.match(source, /rupantarBlogSlugFromUrl\(work\.blogUrl\)/);
  assert.match(source, /loadPublicBlogBySlug\(blogSlug\)/);
  assert.match(source, /Project Story/);
  assert.match(source, /href=\{work\.blogUrl\}/);
});
