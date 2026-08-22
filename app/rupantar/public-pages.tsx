"use client";

import { ArrowLeft, ArrowRight, Check, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { brandAssets, categories } from "./data";
import { PhotoPlaceholder, WorkPhoto } from "./shared";
import type { Page, SiteSettings, Work } from "./types";

const whatsappUrl = `https://wa.me/9779745941799?text=${encodeURIComponent("Hello Gokul, I would like to discuss my interior project.")}`;

export function WorksPage({
  works,
  total,
  loading,
  filter,
  setFilter,
  onLoadMore,
  navigate,
  onWork,
}: {
  works: Work[];
  total: number;
  loading: boolean;
  filter: string;
  setFilter: (filter: string) => void;
  onLoadMore: () => void;
  navigate: (page: Page) => void;
  onWork: (id: string) => void;
}) {
  const visibleWorks = works;

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-[28px] sm:text-[36px] font-bold tracking-[-0.02em]">All Works</h1>
          <p className="text-[13px] text-zinc-500 mt-1">
            Crafted in Kathmandu • {total} projects
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
        {visibleWorks.map((work) => (
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
              <WorkPhoto image={work.images[0]} alt={work.title} />
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

      {visibleWorks.length < total && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="h-11 px-6 rounded-full border border-zinc-200 text-[13px] font-semibold hover:border-zinc-300 hover:bg-zinc-50 transition"
          >
            {loading ? "Loading..." : "Load More Works"}
          </button>
        </div>
      )}

      {visibleWorks.length === 0 && !loading && (
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
            <WorkPhoto image={work.images[0]} alt={work.title} aspect="aspect-[16/10]" label="Main Gallery Photo Coming Soon" eager sizes="(min-width: 1280px) 720px, (min-width: 1024px) 55vw, 100vw" widths={[480, 768, 1200, 1600]} />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            {Array.from({ length: 2 }, (_, index) => {
              const image = work.images[index + 1];
              return (
                <WorkPhoto key={image?.id ?? `slot-${index + 1}`} image={image} alt={`${work.title} ${index + 2}`} aspect="aspect-square" label={`Thumb ${index + 2}`} sizes="50vw" widths={[96, 160, 240, 320]} />
              );
            })}
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
                    <WorkPhoto image={item.images[0]} alt={item.title} aspect="aspect-square" label="" sizes="64px" widths={[96, 160]} />
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

export function AboutPage({ navigate, settings }: { navigate: (page: Page) => void; settings: SiteSettings }) {
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
                  alt="Gokul Kunwar Founder & Curator"
                  className="w-full h-full object-cover object-top"
                  style={{ imageRendering: "auto", filter: "contrast(1.06) brightness(1.03) saturate(1.06)" }}
                  loading="eager"
                  decoding="sync"
                />
              </div>
              <div className="max-w-[180px] space-y-0">
                <h3 className="font-heading font-bold text-[22px] md:text-[26px] leading-[1.05] tracking-[-0.02em] text-[#111111] whitespace-nowrap">
                  GOKUL KUNWAR
                </h3>
                <div className="h-[2px] w-8 bg-[#FF1A3D] mt-2 mb-1.5 rounded-full" />
                <p className="font-['Space_Grotesk'] text-[11px] uppercase tracking-[0.14em] font-medium text-zinc-500">
                  Founder &amp; Curator
                </p>
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <div className="hidden" />
              <div className="mt-2 font-heading font-bold text-[18px] leading-tight text-zinc-900">6+ Years</div>
              <div className="text-[12px] leading-5 text-zinc-600 mt-1 max-w-[220px]">
                Transforming homes across Kathmandu from design to fabrication by our local team.
              </div>
              <div className="mt-3 flex items-center gap-2">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whatsapp-icon-only"
                  aria-label="Message Gokul Kunwar on WhatsApp"
                  title="WhatsApp Gokul Kunwar"
                />
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-[15px] leading-7 text-zinc-600">
            <p>
              At Rupantar Homes By Gokul Kunwar, we believe a home shouldn’t just be designed on paper, it should
              be built with care, by people who take full ownership of it. That’s why our own skilled team manages
              every step ourselves: measurement, fabrication, installation, finishing.
            </p>
            <p>
              We offer Interior &amp; Architecture Services, House Construction, 3D Design, Modular Kitchens, and
              complete Interior Works, including wardrobes, hydraulic beds, TV cabinets, false ceilings,
              partitions, and custom furniture.
            </p>
            <p>One team, one responsibility, from your first design to the final finish.</p>
          </div>
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-5">
              <div className="font-heading font-semibold">Built Around Your Project</div>
              <div className="text-[13px] text-zinc-600 mt-1 leading-5">
                From first discussion to final installation, every project is handled with clear ownership,
                practical guidance, and a focus on delivering the right result for your space.
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-900 text-white p-5">
              <div className="font-heading font-semibold">Contact Direct</div>
              <div className="text-[13px] text-zinc-300 mt-1">
                Gokul Kunwar {settings.phone}. No middleman, direct pricing and warranty.
              </div>
            </div>
          </div>
          <div className="mt-8">
            <h3 className="font-heading font-semibold text-[16px]">What we promise</h3>
            <ul className="mt-3 space-y-2.5 text-[13px] text-zinc-600">
              {[
                "Factory finish with BWR ply and branded hardware",
                "Design preview before fabrication, no surprises",
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


function PublicTextPage({ title, children, navigate }: { title: string; children: ReactNode; navigate: (page: Page) => void }) {
  return <main className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16"><button onClick={() => navigate("home")} className="h-9 px-4 rounded-full border border-zinc-200 text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-zinc-50 mb-8"><ArrowLeft className="w-4 h-4" /> Back Home</button><div className="max-w-[800px]"><div className="inline-flex px-3 py-1 rounded-full bg-[#FFF0F2] text-[#FF1A3D] text-[11px] font-semibold uppercase tracking-wide">Rupantar Homes</div><h1 className="font-heading text-[32px] sm:text-[44px] font-bold leading-[1.05] mt-4 tracking-[-0.02em]">{title}</h1><div className="mt-7 space-y-10 text-[15px] leading-7 text-zinc-600">{children}</div></div></main>;
}

export function ContactPage({ navigate }: { navigate: (page: Page) => void }) {
  return <PublicTextPage title="Contact Rupantar Homes" navigate={navigate}><section className="space-y-5"><p>Have a project in mind or want to discuss your space directly?</p><p>Rupantar Homes handles Interior Design, Home Construction, Modular Kitchens, custom furniture, ceilings, partitions, and complete interior works.</p><p>For project discussions, estimates, site visits, or general questions, contact:</p><p className="whitespace-pre-line">Gokul Kunwar{"\n"}9745941799</p><p>You can call directly or contact through WhatsApp.</p></section><section className="pt-5"><h2 className="font-heading text-[28px] sm:text-[32px] font-bold leading-tight text-zinc-900">Frequently Asked Questions</h2><div className="mt-7 space-y-7"><div><h3 className="font-heading text-[16px] sm:text-[17px] font-semibold leading-tight text-zinc-900">What services does Rupantar Homes provide?</h3><p className="mt-2">Rupantar Homes provides Interior Design, Home Construction, 3D Design, Modular Kitchens, wardrobes, hydraulic beds, TV cabinets, false ceilings, partitions, custom furniture, and complete interior works.</p></div><div><h3 className="font-heading text-[16px] sm:text-[17px] font-semibold leading-tight text-zinc-900">Do you handle both interior design and home construction?</h3><p className="mt-2">Yes. Rupantar Homes works on both interior projects and complete home construction, depending on the project scope and requirements.</p></div><div><h3 className="font-heading text-[16px] sm:text-[17px] font-semibold leading-tight text-zinc-900">How can I get an estimate for my project?</h3><p className="mt-2">You can use the Estimate form on the website or contact Gokul Kunwar directly. Sharing your location, approximate measurements, requirements, and a clear photo of the space helps us understand the project better.</p></div><div><h3 className="font-heading text-[16px] sm:text-[17px] font-semibold leading-tight text-zinc-900">Can I send photos of my space before a site visit?</h3><p className="mt-2">Yes. You can upload a photo through the Estimate form or send project details directly. A site visit may still be required before final measurements, pricing, or execution.</p></div><div><h3 className="font-heading text-[16px] sm:text-[17px] font-semibold leading-tight text-zinc-900">Do you provide a design preview before work starts?</h3><p className="mt-2">Design previews can be provided as part of the project process where applicable. The exact design scope is confirmed based on the project requirements.</p></div><div><h3 className="font-heading text-[16px] sm:text-[17px] font-semibold leading-tight text-zinc-900">How do I contact Rupantar Homes directly?</h3><p className="mt-2">You can contact Gokul Kunwar at 9745941799 for project discussions, estimates, site visits, and general inquiries.</p></div></div></section></PublicTextPage>;
}

export function PrivacyPage({ navigate }: { navigate: (page: Page) => void }) {
  return <PublicTextPage title="Privacy Policy" navigate={navigate}><p>Rupantar Homes respects the privacy of visitors and clients who use this website.</p><section><h2 className="font-heading text-[24px] sm:text-[28px] font-bold leading-tight text-zinc-900">Information We Collect</h2><p className="mt-4">When you use our forms or contact us through the website, we may collect information you choose to provide, including:</p><ul className="mt-4 list-disc pl-5 space-y-2"><li>your name</li><li>phone number</li><li>location</li><li>project category</li><li>approximate project size</li><li>material preferences</li><li>project requirements or message</li><li>photos you upload for an estimate</li></ul><p className="mt-4">We only collect information that is necessary to respond to inquiries, understand project requirements, prepare estimates, or communicate about our services.</p></section><section><h2 className="font-heading text-[24px] sm:text-[28px] font-bold leading-tight text-zinc-900">How We Use Your Information</h2><p className="mt-4">Information submitted through the website may be used to:</p><ul className="mt-4 list-disc pl-5 space-y-2"><li>respond to your inquiry</li><li>contact you regarding your project</li><li>review uploaded space photos</li><li>understand project requirements</li><li>prepare an initial estimate</li><li>arrange further discussion or a site visit</li><li>maintain records related to inquiries and projects</li></ul><p className="mt-4">We do not sell your personal information.</p></section><section><h2 className="font-heading text-[24px] sm:text-[28px] font-bold leading-tight text-zinc-900">Uploaded Photos</h2><p className="mt-4">Photos uploaded through the Estimate form are provided for the purpose of understanding the space and project requirements.</p><p className="mt-4">Please upload only photos that you have permission to share.</p><p className="mt-4">Uploaded images may be stored and processed through the website's hosting, image-storage, and database services as necessary for the inquiry process.</p></section><section><h2 className="font-heading text-[24px] sm:text-[28px] font-bold leading-tight text-zinc-900">Third-Party Services</h2><p className="mt-4">The website may use third-party infrastructure and service providers for functions such as website hosting, form processing, database storage, image storage, and notifications.</p><p className="mt-4">These providers may process information only as necessary to provide those technical services.</p></section><section><h2 className="font-heading text-[24px] sm:text-[28px] font-bold leading-tight text-zinc-900">Data Security</h2><p className="mt-4">Reasonable technical measures are used to protect information submitted through the website. However, no internet-based system can guarantee absolute security.</p></section><section><h2 className="font-heading text-[24px] sm:text-[28px] font-bold leading-tight text-zinc-900">Data Retention</h2><p className="mt-4">Information may be retained for as long as reasonably necessary to respond to inquiries, manage project communication, maintain business records, or meet applicable legal obligations.</p></section><section><h2 className="font-heading text-[24px] sm:text-[28px] font-bold leading-tight text-zinc-900">Your Information</h2><p className="mt-4">If you want to ask about information you previously submitted through this website, you can contact Rupantar Homes directly.</p><p className="mt-3 whitespace-pre-line">Contact:{"\n"}Gokul Kunwar{"\n"}9745941799</p></section><section><h2 className="font-heading text-[24px] sm:text-[28px] font-bold leading-tight text-zinc-900">Changes to This Policy</h2><p className="mt-4">This Privacy Policy may be updated from time to time to reflect changes in the website, services, or business practices.</p></section><section className="pt-4"><h2 className="font-heading text-[28px] sm:text-[32px] font-bold leading-tight text-zinc-900">Terms &amp; Conditions</h2><div className="mt-3 space-y-3"><p>By using the Rupantar Homes website, you agree to the following basic terms.</p><p>Information on this website is provided for general information about Rupantar Homes and its services.</p><p>Any estimate provided before final measurements, site inspection, material selection, design approval, or scope confirmation may change.</p><p>Final project pricing, materials, specifications, payment terms, timeline, warranty terms, and responsibilities are confirmed separately between Rupantar Homes and the client before or during the project process.</p><p>Submitting an inquiry or Estimate form does not by itself create a construction, interior-design, or service contract.</p><p>Users are responsible for ensuring that information and images they submit are accurate and that they have permission to share any uploaded content.</p><p>Website content, project information, availability, services, and pricing may be updated when necessary.</p><p className="whitespace-pre-line">For questions regarding these terms, contact:{"\n"}Gokul Kunwar{"\n"}9745941799</p></div></section></PublicTextPage>;
}
