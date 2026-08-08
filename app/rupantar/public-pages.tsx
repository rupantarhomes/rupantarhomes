"use client";

import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react";
import { brandAssets, categories } from "./data";
import { PhotoPlaceholder } from "./shared";
import type { Page, Work } from "./types";

export function WorksPage({
  works,
  filter,
  setFilter,
  navigate,
  onWork,
}: {
  works: Work[];
  filter: string;
  setFilter: (filter: string) => void;
  navigate: (page: Page) => void;
  onWork: (id: string) => void;
}) {
  const filtered = filter === "all" ? works : works.filter((work) => work.category === filter);

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-[28px] sm:text-[36px] font-bold tracking-[-0.02em]">All Works</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Crafted at our Kathmandu workshop • {works.length} projects
          </p>
        </div>
        <button
          onClick={() => navigate("home")}
          className="h-9 px-4 rounded-full border border-zinc-200 text-[13px] font-medium flex items-center gap-1.5 hover:bg-zinc-50"
        >
          <ArrowLeft className="w-4 h-4" /> Back Home
        </button>
      </div>

      <div className="flex gap-2 overflow-auto pb-2 scrollbar-none">
        <button
          onClick={() => setFilter("all")}
          className={`h-9 px-5 rounded-full text-[13px] font-medium whitespace-nowrap border transition ${
            filter === "all"
              ? "bg-[#FF1A3D] text-white border-[#FF1A3D]"
              : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300"
          }`}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            onClick={() => setFilter(category.slug)}
            className={`h-9 px-5 rounded-full text-[13px] font-medium whitespace-nowrap border transition ${
              filter === category.slug
                ? "bg-[#FF1A3D] text-white border-[#FF1A3D]"
                : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mt-8">
        {filtered.map((work) => (
          <div
            key={work.id}
            onClick={() => onWork(work.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onWork(work.id);
            }}
            role="button"
            tabIndex={0}
            className="group cursor-pointer bg-white border border-zinc-100 rounded-[1.5rem] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition"
          >
            <div className="p-3">
              <PhotoPlaceholder />
            </div>
            <div className="px-5 pb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#FFF0F2] text-[#FF1A3D] font-semibold uppercase">
                  {work.category.replace("-", " ")}
                </span>
                {work.featured && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#FF1A3D] text-white font-semibold">
                    Featured
                  </span>
                )}
              </div>
              <div className="font-heading font-semibold text-[16px]">{work.title}</div>
              <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {work.location}
              </div>
              <div className="text-[13px] text-zinc-600 mt-2 line-clamp-2">{work.shortDesc}</div>
              <div className="mt-4 text-[13px] font-semibold flex items-center gap-1 group-hover:text-[#FF1A3D]">
                View Details <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <PhotoPlaceholder aspect="aspect-[16/9]" label="No works in this category yet" />
          <p className="text-[13px] text-zinc-500 mt-4">Add works from Admin → Manage Works</p>
        </div>
      )}
    </main>
  );
}

export function WorkDetailPage({
  work,
  works,
  navigate,
  onWork,
  onEstimate,
}: {
  work: Work;
  works: Work[];
  navigate: (page: Page) => void;
  onWork: (id: string) => void;
  onEstimate: () => void;
}) {
  const related = works.filter((item) => item.category === work.category && item.id !== work.id);

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <button
        onClick={() => navigate("works")}
        className="h-9 px-4 rounded-full border border-zinc-200 text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-zinc-50 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Works
      </button>
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-[11px] px-3 py-1 rounded-full bg-[#FFF0F2] text-[#FF1A3D] font-semibold uppercase tracking-wide">
              {work.category.replace("-", " ")}
            </span>
            <span className="text-[12px] text-zinc-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {work.location}
            </span>
            {work.featured && (
              <span className="text-[11px] px-3 py-1 rounded-full bg-[#FF1A3D] text-white font-semibold">
                Featured
              </span>
            )}
          </div>
          <h1 className="font-heading text-[26px] sm:text-[34px] font-bold leading-[1.05] tracking-[-0.02em]">
            {work.title}
          </h1>
          <div className="mt-6">
            <PhotoPlaceholder aspect="aspect-[16/10]" label="Main Gallery Photo Coming Soon" />
          </div>
          <div className="grid grid-cols-4 gap-3 mt-3">
            {[1, 2, 3, 4].map((number) => (
              <PhotoPlaceholder key={number} aspect="aspect-square" label={`Thumb ${number}`} />
            ))}
          </div>
        </div>

        <div className="lg:sticky lg:top-[96px] h-fit">
          <div className="bg-white border border-zinc-100 rounded-[1.75rem] p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
            <h3 className="font-heading font-bold text-[16px]">Project Overview</h3>
            <p className="text-[14px] leading-6 text-zinc-600 mt-3">{work.shortDesc}</p>
            <div className="mt-5 pt-5 border-t border-zinc-100">
              <h4 className="font-semibold text-[13px] uppercase tracking-wide text-zinc-900">Details</h4>
              <p className="text-[13px] leading-6 text-zinc-600 mt-2">{work.longDesc}</p>
            </div>
            <button
              onClick={onEstimate}
              className="mt-6 w-full h-12 rounded-full bg-[#FF1A3D] text-white font-semibold text-[14px] flex items-center justify-center gap-2"
            >
              Get Similar Estimate <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-6">
            <h4 className="font-heading font-semibold text-[14px] mb-3">Related Works</h4>
            <div className="space-y-3">
              {related.slice(0, 2).map((item) => (
                <button
                  key={item.id}
                  onClick={() => onWork(item.id)}
                  className="w-full text-left flex gap-3 p-3 rounded-2xl border border-zinc-100 hover:border-zinc-200 bg-white transition"
                >
                  <div className="w-16 h-16 shrink-0">
                    <PhotoPlaceholder aspect="aspect-square" label="" />
                  </div>
                  <div>
                    <div className="font-medium text-[13px] leading-tight line-clamp-2">{item.title}</div>
                    <div className="text-[11px] text-zinc-500 mt-1">{item.location}</div>
                  </div>
                </button>
              ))}
              {related.length === 0 && <div className="text-[12px] text-zinc-500">No related works yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function AboutPage({ navigate }: { navigate: (page: Page) => void }) {
  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <button
        onClick={() => navigate("home")}
        className="h-9 px-4 rounded-full border border-zinc-200 text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-zinc-50 mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Back Home
      </button>
      <div className="max-w-[760px]">
        <div>
          <div className="inline-flex px-3 py-1 rounded-full bg-[#FFF0F2] text-[#FF1A3D] text-[11px] font-semibold uppercase tracking-wide">
            About Rupantar Homes
          </div>
          <h1 className="font-heading text-[30px] sm:text-[38px] font-bold leading-[1.05] mt-4 tracking-[-0.02em]">
            Transforming space <br /> Inspiring lives
          </h1>
          <div className="mt-8 flex gap-6 md:gap-8 items-start p-2 md:p-3 -mx-2">
            <div className="shrink-0 flex flex-col gap-4">
              <div className="w-32 h-32 sm:w-40 sm:h-40 md:w-40 md:h-40 rounded-2xl overflow-hidden shadow-lg border-2 border-white ring-1 ring-zinc-200 bg-white">
                <img
                  src={brandAssets.founder}
                  alt="Gokul Kunwar Founder & Craftsman"
                  className="w-full h-full object-cover object-top"
                  style={{ imageRendering: "auto", filter: "contrast(1.06) brightness(1.03) saturate(1.06)" }}
                  loading="eager"
                  decoding="sync"
                />
              </div>
              <div className="max-w-[180px] space-y-0">
                <h3 className="font-bold text-[22px] md:text-[26px] leading-[1.05] tracking-[-0.02em] text-[#111111] whitespace-nowrap" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  GOKUL KUNWAR
                </h3>
                <div className="h-[2px] w-8 bg-[#FF1A3D] mt-2 mb-1.5 rounded-full" />
                <p className="font-['Space_Grotesk'] text-[11px] uppercase tracking-[0.14em] font-medium text-zinc-500">
                  Founder &amp; Craftsman
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="hidden" />
              <div className="mt-2 font-heading font-bold text-[18px] leading-tight text-zinc-900">6+ Years</div>
              <div className="text-[12px] leading-5 text-zinc-600 mt-1 max-w-[220px]">
                Transforming Homes Across Kathmandu from design to fabrication at our Kathmandu workshop.
              </div>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
                <span className="h-6 px-2.5 rounded-full bg-zinc-900 text-white inline-flex items-center font-medium">Est. 2019</span>
                <span>• Workshop Direct</span>
              </div>
            </div>
          </div>
          <p className="text-[15px] leading-7 text-zinc-600 mt-6">
            Rupantar Homes By Gokul Kunwar was started with one simple belief “”. We don’t just show renders,
            we build it ourselves at our Kathmandu workshop. From modular kitchens to hydraulic beds, every
            piece is measured, fabricated and installed by our own team.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-5">
              <div className="font-heading font-semibold">Our Workshop</div>
              <div className="text-[13px] text-zinc-600 mt-1 leading-5">
                Neupane Chowk Kathmandu Site No.2 Kathmandu. Visit by appointment to see live samples,
                laminates and hardware.
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-900 text-white p-5">
              <div className="font-heading font-semibold">Contact Direct</div>
              <div className="text-[13px] text-zinc-300 mt-1">
                Gokul Kunwar 9745941799. No middleman, workshop direct pricing and warranty.
              </div>
            </div>
          </div>
          <div className="mt-8">
            <h3 className="font-heading font-semibold text-[16px]">What we promise</h3>
            <ul className="mt-3 space-y-2.5 text-[13px] text-zinc-600">
              {[
                "Factory finish with BWR ply and branded hardware",
                "3D design before fabrication, no surprises",
                "Clean installation, on time handover",
              ].map((promise) => (
                <li key={promise} className="flex gap-2">
                  <Check className="w-4 h-4 text-[#FF1A3D] mt-0.5" /> {promise}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
