"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { blogCategories, blogExcerpt, type Blog, type BlogCategory } from "./blog";
import type { Page } from "./types";

export function BlogIndexPage({ blogs, navigate, onBlog }: { blogs: Blog[]; navigate: (page: Page) => void; onBlog: (id: string) => void }) {
  const [category, setCategory] = useState<"all" | BlogCategory>("all");
  const visibleBlogs = useMemo(() => category === "all" ? blogs : blogs.filter((blog) => blog.category === category), [blogs, category]);

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
      <div className="max-w-[800px]">
        <h1 className="font-heading text-[40px] sm:text-[54px] font-bold leading-[1.02] tracking-[-0.04em]">Blog</h1>
        <p className="mt-4 max-w-[720px] text-[15px] leading-7 text-zinc-600">Practical guidance for planning homes, interiors, and construction projects.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <button onClick={() => setCategory("all")} className={`h-9 px-4 rounded-full text-[13px] font-medium transition ${category === "all" ? "bg-[#FF1A3D] text-white" : "border border-zinc-200 text-zinc-700 hover:border-[#FF1A3D]"}`}>All</button>
          {blogCategories.map((item) => <button key={item.value} onClick={() => setCategory(item.value)} className={`h-9 px-4 rounded-full text-[13px] font-medium transition ${category === item.value ? "bg-[#FF1A3D] text-white" : "border border-zinc-200 text-zinc-700 hover:border-[#FF1A3D]"}`}>{item.label}</button>)}
        </div>
        <div className="mt-14 divide-y divide-zinc-200/80 border-t border-zinc-200/80">
          {visibleBlogs.map((blog) => (
            <article key={blog.id} className="py-12 sm:py-14">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FF1A3D]">{blogCategories.find((item) => item.value === blog.category)?.label}</div>
              <h2 className="mt-3 font-heading text-[26px] sm:text-[34px] font-bold leading-[1.1] tracking-[-0.03em]">{blog.title}</h2>
              <p className="mt-4 max-w-[760px] text-[15px] leading-7 text-zinc-600">{blogExcerpt(blog.body)}</p>
              <button onClick={() => onBlog(blog.id)} className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900 transition-colors duration-200 hover:text-[#FF1A3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1A3D]/40">Read Article <ArrowRight className="w-4 h-4" /></button>
            </article>
          ))}
          {visibleBlogs.length === 0 && <p className="py-12 text-[15px] text-zinc-500">No articles published yet.</p>}
        </div>
        <button onClick={() => navigate("home")} className="mt-12 inline-flex items-center gap-1.5 text-[13px] text-zinc-600 transition-colors duration-200 hover:text-[#FF1A3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1A3D]/40"><ArrowLeft className="w-4 h-4" /> Back to Home</button>
      </div>
    </main>
  );
}

export function BlogArticlePage({ blog, navigate }: { blog: Blog; navigate: (page: Page) => void }) {
  const label = blogCategories.find((item) => item.value === blog.category)?.label ?? blog.category;
  const paragraphs = blog.body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
      <article className="max-w-[800px]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FF1A3D]">{label}</div>
        <h1 className="mt-3 font-heading text-[40px] sm:text-[56px] leading-[1.04] font-bold tracking-[-0.045em]">{blog.title}</h1>
        <div className="mt-9 space-y-6 text-[16px] leading-7 sm:leading-8 text-zinc-700">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        <button onClick={() => navigate("blog")} className="mt-12 inline-flex items-center gap-1.5 text-[13px] text-zinc-600 transition-colors duration-200 hover:text-[#FF1A3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1A3D]/40"><ArrowLeft className="w-4 h-4" /> Back to Blog</button>
      </article>
    </main>
  );
}
