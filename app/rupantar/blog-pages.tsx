"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { blogCategories, blogExcerpt, type Blog, type BlogCategory } from "./blog";
import { loadLinkedWorkForBlog, type BlogLinkedWork } from "./blog-project-link";
import { workPath } from "./routes";
import type { Page } from "./types";

function isInteractiveTarget(target: EventTarget) {
  return target instanceof Element && Boolean(target.closest("button, a, input, select, textarea, label"));
}

export function BlogIndexPage({ blogs, loading, navigate, onBlog }: { blogs: Blog[]; loading: boolean; navigate: (page: Page) => void; onBlog: (id: string) => void }) {
  const [category, setCategory] = useState<"all" | BlogCategory>("all");
  const visibleBlogs = useMemo(() => category === "all" ? blogs : blogs.filter((blog) => blog.category === category), [blogs, category]);

  const openCard = (event: ReactMouseEvent<HTMLElement>, id: string) => {
    if (isInteractiveTarget(event.target)) return;
    onBlog(id);
  };

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16" aria-busy={loading}>
      <div className="max-w-[800px]">
        <h1 className="font-heading text-[40px] sm:text-[54px] font-bold leading-[1.02] tracking-[-0.04em]">Blog</h1>
        <p className="mt-4 max-w-[720px] text-[15px] leading-7 text-zinc-600">Practical guidance for planning homes, interiors, and construction projects.</p>
        <div className="mt-8 flex flex-wrap gap-2">
          <button onClick={() => setCategory("all")} className={`h-9 px-4 rounded-full text-[13px] font-medium transition ${category === "all" ? "bg-[#FF1A3D] text-white" : "border border-zinc-200 text-zinc-700 hover:border-[#FF1A3D]"}`}>All</button>
          {blogCategories.map((item) => <button key={item.value} onClick={() => setCategory(item.value)} className={`h-9 px-4 rounded-full text-[13px] font-medium transition ${category === item.value ? "bg-[#FF1A3D] text-white" : "border border-zinc-200 text-zinc-700 hover:border-[#FF1A3D]"}`}>{item.label}</button>)}
        </div>
        <div className="mt-14 divide-y divide-zinc-200/80 border-t border-zinc-200/80">
          {visibleBlogs.map((blog) => (
            <article
              key={blog.id}
              role="button"
              tabIndex={0}
              aria-label={`Read ${blog.title}`}
              onClick={(event) => openCard(event, blog.id)}
              onKeyDown={(event) => {
                if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
                event.preventDefault();
                onBlog(blog.id);
              }}
              className="py-12 sm:py-14 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1A3D]/30"
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FF1A3D]">{blogCategories.find((item) => item.value === blog.category)?.label}</div>
              <h2 className="mt-3 font-heading text-[26px] sm:text-[34px] font-bold leading-[1.1] tracking-[-0.03em]">{blog.title}</h2>
              <p className="mt-4 max-w-[760px] text-[15px] leading-7 text-zinc-600">{blogExcerpt(blog.body)}</p>
              <button onClick={() => onBlog(blog.id)} className="mt-6 inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-900 transition-colors duration-200 hover:text-[#FF1A3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1A3D]/40">Read Article <ArrowRight className="w-4 h-4" /></button>
            </article>
          ))}
          {!loading && visibleBlogs.length === 0 && <p className="py-12 text-[15px] text-zinc-500">No articles published yet.</p>}
        </div>
        <button onClick={() => navigate("home")} className="mt-12 inline-flex items-center gap-1.5 text-[13px] text-zinc-600 transition-colors duration-200 hover:text-[#FF1A3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1A3D]/40"><ArrowLeft className="w-4 h-4" /> Back to Home</button>
      </div>
    </main>
  );
}

export function BlogArticlePage({ blog, navigate }: { blog: Blog; navigate: (page: Page) => void }) {
  const label = blogCategories.find((item) => item.value === blog.category)?.label ?? blog.category;
  const paragraphs = blog.body.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const [linkedWork, setLinkedWork] = useState<BlogLinkedWork | null>(null);

  useEffect(() => {
    let active = true;
    setLinkedWork(null);
    void loadLinkedWorkForBlog(blog.slug)
      .then((work) => {
        if (active) setLinkedWork(work);
      })
      .catch((error) => {
        console.error("Unable to resolve Blog project images", error);
        if (active) setLinkedWork(null);
      });
    return () => {
      active = false;
    };
  }, [blog.slug]);

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-[4.75rem] pb-14 sm:py-16">
      <article className="rh-blog-article max-w-[800px]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#FF1A3D]">{label}</div>
        <h1 className="mt-3 font-heading text-[40px] sm:text-[56px] leading-[1.04] font-bold tracking-[-0.045em]">{blog.title}</h1>
        <div className="mt-9 space-y-6 text-[16px] leading-7 sm:leading-8 text-zinc-700">{paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
        {linkedWork && (
          <>
            <div aria-hidden="true" style={{ height: "64px" }} />
            <aside
              className="w-full rounded-[1.75rem] border border-zinc-100 bg-[#fffdfa] p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
              aria-label="Linked project images"
            >
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FF1A3D]">Project Images</div>
              <h2 className="mt-2 font-heading text-[18px] sm:text-[20px] font-bold leading-tight text-zinc-950">{linkedWork.title}</h2>
              <p className="mt-3 text-[13px] leading-6 text-zinc-600">See the completed project and its full image gallery.</p>
              <a href={workPath(linkedWork)} className="mt-6 inline-flex h-10 items-center gap-2 rounded-full bg-[#FF1A3D] px-5 text-[12px] font-semibold text-white transition hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1A3D]/40 focus-visible:ring-offset-2">
                View Project Images <ArrowRight className="w-4 h-4" />
              </a>
            </aside>
          </>
        )}
        <button onClick={() => navigate("blog")} className="mt-12 inline-flex items-center gap-1.5 text-[13px] text-zinc-600 transition-colors duration-200 hover:text-[#FF1A3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF1A3D]/40"><ArrowLeft className="w-4 h-4" /> Back to Blog</button>
      </article>
    </main>
  );
}
