"use client";

import {
  ArrowRight,
  Check,
  ImageUp,
  Instagram,
  MapPin,
  Music2,
  Phone,
  Ruler,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { categories } from "./data";
import { categoryIcons, WorkPhoto } from "./shared";
import type {
  EstimateForm,
  Page,
  QueryForm,
  Review,
  SiteSettings,
  Work,
} from "./types";

type HomePageProps = {
  works: Work[];
  reviews: Review[];
  settings: SiteSettings;
  estimate: EstimateForm;
  setEstimate: Dispatch<SetStateAction<EstimateForm>>;
  query: QueryForm;
  setQuery: Dispatch<SetStateAction<QueryForm>>;
  navigate: (page: Page) => void;
  onEstimate: () => void;
  onCategory: (category: string) => void;
  onWork: (id: string) => void;
  onSubmitEstimate: () => Promise<void>;
  onSubmitQuery: () => Promise<void>;
  estimateBusy: boolean;
  queryBusy: boolean;
};

const morphWords = ["Spaces", "Kitchens", "Wardrobes", "Ceilings", "Homes", "Interiors"];
const workSteps = [
  { step: "01", icon: ImageUp, title: "Send Photo", desc: "Share site photos, video & measurements on WhatsApp. Get instant budget range." },
  { step: "02", icon: Ruler, title: "Home Visit, Samples & 3D", desc: "We visit, show laminates, ply, handles. You get 3D design & final quote." },
  { step: "03", icon: ShieldCheck, title: "Fabrication & Install", desc: "Factory finish at Kathmandu workshop. Clean install in 7-21 days." },
] as const;
const maximumAttachmentBytes = 10 * 1024 * 1024;
const acceptedAttachmentTypes = new Set(["image/jpeg", "image/png"]);
const whatsappUrl = `https://wa.me/9779745941799?text=${encodeURIComponent("Hello Rupantar Homes, I would like to discuss my interior project.")}`;

function acceptedPhoto(file: File | undefined): File | null {
  if (!file) return null;
  if (!acceptedAttachmentTypes.has(file.type)) {
    window.alert("Please choose a JPG or PNG photo.");
    return null;
  }
  if (file.size > maximumAttachmentBytes) {
    window.alert("Photo must be 10MB or smaller.");
    return null;
  }
  return file;
}

export function HomePage({
  works,
  reviews,
  settings,
  estimate,
  setEstimate,
  query,
  setQuery,
  navigate,
  onEstimate,
  onCategory,
  onWork,
  onSubmitEstimate,
  onSubmitQuery,
  estimateBusy,
  queryBusy,
}: HomePageProps) {
  const featured = works.filter((work) => work.featured).slice(0, 3);
  const [wordIndex, setWordIndex] = useState(0);
  const [morphing, setMorphing] = useState(false);
  const [heroVideoRequested, setHeroVideoRequested] = useState(false);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setMorphing(true);
      window.setTimeout(() => {
        setWordIndex((value) => (value + 1) % morphWords.length);
        setMorphing(false);
      }, 320);
    }, 2600);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setHeroVideoRequested(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!heroVideoRequested) return;

    const video = heroVideoRef.current;
    if (!video) return;

    let cancelled = false;

    const handlePlaying = () => {
      if (!cancelled) {
        setHeroVideoReady(true);
      }
    };

    const tryPlay = () => {
      if (cancelled) return;
      const maybePromise = video.play();
      if (maybePromise && typeof maybePromise.then === "function") {
        void maybePromise.catch(() => {});
      }
    };

    video.addEventListener("playing", handlePlaying);
    video.load();

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      tryPlay();
      return () => {
        cancelled = true;
        video.removeEventListener("playing", handlePlaying);
      };
    }

    const handleCanPlay = () => {
      tryPlay();
    };

    video.addEventListener("canplay", handleCanPlay, { once: true });

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("playing", handlePlaying);
    };
  }, [heroVideoRequested]);

  return (
    <>
      <section style={{ position: "relative", isolation: "isolate" }}>
        <div
          aria-hidden="true"
          data-hero-background="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            overflow: "hidden",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <img
            src="/rupantar-hero-poster.webp"
            alt=""
            loading="eager"
            decoding="async"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          {heroVideoRequested && (
            <video
              ref={heroVideoRef}
              autoPlay
              loop
              muted
              playsInline
              controls={false}
              preload="none"
              aria-hidden="true"
              tabIndex={-1}
              onError={() => setHeroVideoReady(false)}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                opacity: heroVideoReady ? 1 : 0,
                transition: "opacity 300ms ease",
                zIndex: 1,
              }}
            >
              <source src="/rupantar-hero-loop-web.mp4" type="video/mp4" />
            </video>
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: "rgba(0, 0, 0, 0.38)",
              zIndex: 2,
            }}
          />
        </div>
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10 sm:pt-20 sm:pb-16 min-h-[30vh] sm:min-h-[56vh] md:min-h-[72vh] grid lg:grid-cols-[1.15fr_0.85fr] gap-6 sm:gap-8 items-start">
        <div style={{ position: "relative", zIndex: 3 }}>
          <div className="inline-flex items-center gap-2 text-[#FF1A3D] text-[11px] font-semibold tracking-wide uppercase mt-2 sm:mt-0">
            <Sparkles className="w-3.5 h-3.5" /> Kathmandu
          </div>
          <div className="hidden" />
          <h2
            className="font-heading font-semibold text-[22px] sm:text-[26px] leading-tight mt-6 sm:mt-4"
            style={{ color: "#FFFFFF" }}
          >
            Transforming{" "}
            <span
              id="morph-word"
              className={`inline-block text-[#FF1A3D] transition-all duration-500 ${morphing ? "morph-out" : "morph-in"}`}
            >
              {morphWords[wordIndex]}
            </span>{" "}
            <br /> Inspiring Lives
          </h2>
          <p
            className="mt-4 text-[15px] leading-6 max-w-[520px]"
            style={{ color: "rgba(255, 255, 255, 0.88)" }}
          >
            We craft interiors, kitchens, wardrobes &amp; ceilings from our Kathmandu workshop.
            Send a photo, get a 3D sample and factory finish installation.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={onEstimate}
              className="h-12 px-7 rounded-full bg-[#FF1A3D] text-white font-semibold text-[14px] flex items-center gap-2 shadow-[0_10px_28px_rgba(255,26,61,0.25)] hover:brightness-95 transition"
            >
              Start Your Project <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("works")}
              className="h-12 px-7 rounded-full bg-white border border-zinc-200 text-zinc-900 font-medium text-[14px] flex items-center gap-2 hover:bg-zinc-50 transition"
            >
              View Works
            </button>
          </div>
          <div
            className="mt-8 flex items-center gap-6 text-[12px]"
            style={{ color: "rgba(255, 255, 255, 0.82)" }}
          >
            {["Site Visit", "Design Preview", "Factory Finish"].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-[#FF1A3D]" /> {item}
              </span>
            ))}
          </div>
        </div>
        </div>
      </section>

    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
      <section className="py-4 sm:py-16">
        <div className="flex items-center justify-between mb-3 sm:mb-7">
          <h3 className="font-heading text-[18px] sm:text-[30px] font-bold">Recent Works</h3>
          <button
            onClick={() => navigate("works")}
            className="h-9 px-5 rounded-full border border-zinc-200 text-[13px] font-medium hover:bg-zinc-50 flex items-center gap-1.5"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-5 sm:gap-6">
          {featured.map((work) => (
            <article
              key={work.id}
              className="group bg-white border border-zinc-100 rounded-[1.5rem] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] transition"
            >
              <div className="p-3">
                <WorkPhoto image={work.images[0]} alt={work.title} />
              </div>
              <div className="px-5 pb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#FFF0F2] text-[#FF1A3D] font-semibold uppercase tracking-wide">
                    {work.category.replace("-", " ")}
                  </span>
                  {work.featured && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-[#FF1A3D] text-white font-semibold">Featured</span>
                  )}
                </div>
                <div className="font-heading font-semibold text-[16px] leading-tight">{work.title}</div>
                <div className="text-[12px] text-zinc-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {work.location}
                </div>
                <div className="text-[13px] text-zinc-600 mt-2.5 leading-5 line-clamp-2">{work.shortDesc}</div>
                <button
                  onClick={() => onWork(work.id)}
                  className="mt-4 text-[13px] font-semibold flex items-center gap-1 hover:text-[#FF1A3D] transition"
                >
                  View Details <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="services" className="py-12 sm:py-16 border-t border-zinc-100">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-[11px] tracking-[0.18em] uppercase font-semibold text-[#FF1A3D]">What We Do</div>
            <h3 className="font-heading text-[28px] sm:text-[32px] font-bold mt-1">Crafted for Nepali Homes</h3>
          </div>
          <div className="hidden sm:block text-[13px] text-zinc-500 max-w-[320px] text-right">
            8 core services from our Kathmandu workshop. Click any card to see works.
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {categories.map((category) => {
            const Icon = categoryIcons[category.slug as keyof typeof categoryIcons];
            return (
              <button
                key={category.slug}
                onClick={() => onCategory(category.slug)}
                className="text-left group bg-white border border-zinc-100 rounded-[1.5rem] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.06)] hover:border-zinc-200 transition-all"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#FFF0F2] text-[#FF1A3D] flex items-center justify-center mb-4 group-hover:scale-105 transition">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-heading font-semibold text-[15px] text-zinc-900">{category.name}</div>
                <div className="text-[12.5px] leading-5 text-zinc-500 mt-1.5 line-clamp-2">{category.desc}</div>
                <div className="mt-4 text-[12px] font-medium text-zinc-900 flex items-center gap-1 group-hover:text-[#FF1A3D] transition">
                  View Works <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section id="estimate" className="py-12 sm:py-20">
        <div className="rounded-[2rem] bg-zinc-900 text-white overflow-hidden grid lg:grid-cols-[0.9fr_1.1fr] relative">
          <div className="p-7 sm:p-10 lg:p-12">
            <div className="inline-flex px-3 py-1 rounded-full bg-white/10 text-[11px] tracking-wide font-medium">Dedicated Estimate</div>
            <h3 className="font-heading text-[28px] sm:text-[34px] font-bold leading-[1.05] mt-4">
              Why Upload Your <span className="text-[#FF1A3D]">Space Photo?</span>
            </h3>
            <ul className="mt-8 space-y-5">
              {[
                { title: "Accurate Quote in 2 Hours", desc: "We measure from your photos & video, no guesswork." },
                { title: "Free 3D Preview", desc: "See materials, colors and lights before fabrication." },
                { title: "Workshop Visit Sample", desc: "Touch laminates, ply and hardware at Kathmandu." },
              ].map((item) => (
                <li key={item.title} className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#FF1A3D] flex items-center justify-center shrink-0 mt-0.5"><Check className="w-4 h-4" /></div>
                  <div>
                    <div className="font-medium text-[14px]">{item.title}</div>
                    <div className="text-[12.5px] text-zinc-400 mt-1 leading-5">{item.desc}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-10 p-4 rounded-2xl bg-white/5 border border-white/10 flex gap-3 items-start">
              <ImageUp className="w-5 h-5 text-[#FF1A3D] mt-0.5" />
              <div className="text-[12px] leading-5 text-zinc-300">
                Tip: Upload a clear wide-angle photo of your space and include the approximate measurement below. We respond on WhatsApp same day.
              </div>
            </div>
          </div>

          <form
            className="bg-white text-zinc-900 p-6 sm:p-8 lg:p-10 rounded-t-[2rem] lg:rounded-l-none lg:rounded-r-[2rem] rounded-b-[2rem] lg:rounded-bl-none m-2 lg:m-0"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmitEstimate();
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-heading font-bold text-[18px]">Send Estimate Request</h4>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-[#FFF0F2] text-[#FF1A3D] font-semibold">Fast Reply</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input required autoComplete="name" value={estimate.name} onChange={(event) => setEstimate((value) => ({ ...value, name: event.target.value }))} placeholder="Full Name *" className="h-11 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D] focus:ring-2 focus:ring-[#FF1A3D]/10" />
              <input required type="tel" autoComplete="tel" value={estimate.phone} onChange={(event) => setEstimate((value) => ({ ...value, phone: event.target.value }))} placeholder="Phone 9745xxxxxx *" className="h-11 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D] focus:ring-2 focus:ring-[#FF1A3D]/10" />
              <input required value={estimate.location} onChange={(event) => setEstimate((value) => ({ ...value, location: event.target.value }))} placeholder="Location e.g. Kathmandu *" className="h-11 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D] focus:ring-2 focus:ring-[#FF1A3D]/10 sm:col-span-2" />
              <select required value={estimate.category} onChange={(event) => setEstimate((value) => ({ ...value, category: event.target.value }))} className="h-11 px-4 rounded-full border border-zinc-200 text-[13px] bg-white outline-none focus:border-[#FF1A3D]">
                {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
              </select>
              <input required value={estimate.size} onChange={(event) => setEstimate((value) => ({ ...value, size: event.target.value }))} placeholder="Approx Size (e.g. 10x12 ft) *" className="h-11 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
              <input required value={estimate.material} onChange={(event) => setEstimate((value) => ({ ...value, material: event.target.value }))} placeholder="Material Preference *" className="h-11 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D] sm:col-span-2" />
              <label
                className="sm:col-span-2 relative border-2 border-dashed border-zinc-200 rounded-2xl p-5 flex flex-col items-center justify-center text-zinc-400 gap-2 hover:border-[#FF1A3D]/30 transition cursor-pointer overflow-hidden bg-[#FEFEFE]"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const attachment = acceptedPhoto(event.dataTransfer.files[0]);
                  if (attachment) setEstimate((value) => ({ ...value, attachment }));
                }}
              >
                <input
                  required={!estimate.attachment}
                  type="file"
                  accept="image/jpeg,image/png,.jpg,.jpeg,.png"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Upload a required JPG or PNG space photo"
                  onChange={(event) => {
                    const attachment = acceptedPhoto(event.target.files?.[0]);
                    if (attachment) setEstimate((value) => ({ ...value, attachment }));
                    event.target.value = "";
                  }}
                />
                <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-center"><Upload className="w-5 h-5 text-zinc-700" /></div>
                {estimate.attachment ? (
                  <>
                    <span className="text-[12px] font-semibold text-green-600">✓ {estimate.attachment.name}</span>
                    <span className="text-[11px] text-green-600">{(estimate.attachment.size / 1024).toFixed(0)}KB • Click to change</span>
                  </>
                ) : (
                  <>
                    <span className="text-[12px] font-semibold text-zinc-700">Drag &amp; Drop Photo or <span className="text-[#FF1A3D]">Click to Upload</span> *</span>
                    <span className="text-[11px]">JPG, PNG up to 10MB</span>
                  </>
                )}
                </label>
                <textarea required value={estimate.message} onChange={(event) => setEstimate((value) => ({ ...value, message: event.target.value }))} placeholder="Message / Requirements *" rows={3} maxLength={4000} className="sm:col-span-2 w-full px-4 py-3 rounded-2xl border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D] resize-none" />
            </div>
            <button type="submit" disabled={estimateBusy} className="mt-6 w-full h-12 rounded-full bg-[#FF1A3D] text-white font-semibold text-[14px] flex items-center justify-center gap-2 hover:brightness-95 transition disabled:opacity-60">
              {estimateBusy ? "Sending..." : "Send Estimate Request"} <ArrowRight className="w-4 h-4" />
            </button>
            <div className="mt-3 text-[11px] text-zinc-500 text-center">All fields are required • Fast response • No spam</div>
          </form>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-zinc-50 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 rounded-[2rem]">
        <div className="max-w-[1280px] mx-auto">
          <div className="text-center max-w-[640px] mx-auto">
            <h3 className="font-heading text-[26px] sm:text-[30px] font-bold">How We Work</h3>
            <p className="text-[14px] text-zinc-500 mt-2">Transparent 3-step process from photo to final handover.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 sm:gap-6 mt-10">
            {workSteps.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="bg-white rounded-[1.5rem] border border-zinc-100 p-6 shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-2xl bg-zinc-900 text-white flex items-center justify-center"><Icon className="w-5 h-5" /></div>
                    <span className="font-heading font-bold text-[28px] text-zinc-200">{item.step}</span>
                  </div>
                  <div className="font-heading font-semibold text-[16px]">{item.title}</div>
                  <div className="text-[13px] leading-6 text-zinc-600 mt-2">{item.desc}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-zinc-200 text-[12px] text-zinc-600">
              <MapPin className="w-4 h-4 text-[#FF1A3D]" /> {settings.workshopNote} – {settings.address}
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16">
        <div className="flex items-end justify-between mb-7">
          <div>
            <div className="text-[11px] tracking-[0.18em] uppercase font-semibold text-[#FF1A3D]">Client Reviews</div>
            <h3 className="font-heading text-[26px] sm:text-[30px] font-bold mt-1">Real Homes, Real Reviews</h3>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-[12px] font-medium"><Star className="w-4 h-4 fill-[#FF1A3D] text-[#FF1A3D]" /> 4.9 average from 80+ homes</div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-[1.5rem] border border-zinc-100 p-5 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="hidden" />
              <div className="flex gap-0.5 mb-2">{Array.from({ length: review.rating }).map((_, index) => <Star key={index} className="w-3.5 h-3.5 fill-[#FF1A3D] text-[#FF1A3D]" />)}</div>
              <div className="text-[13px] leading-5 text-zinc-700 line-clamp-4">“{review.message}”</div>
              <div className="mt-4 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[11px] font-semibold">{review.name[0]}</div>
                <div><div className="text-[12px] font-semibold leading-none">{review.name}</div><div className="text-[11px] text-zinc-500 mt-1">{review.location}</div></div>
              </div>
              <a href={review.instagramLink || "#"} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex h-7 px-3 rounded-full bg-[#FFF0F2] text-[#FF1A3D] text-[11px] font-medium items-center hover:bg-[#FF1A3D] hover:text-white transition">View Review →</a>
            </div>
          ))}
        </div>
      </section>

      <section className="py-10 sm:py-12">
        <div className="rounded-[2rem] bg-[#FFF0F2] border border-[#FF1A3D]/10 p-7 sm:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h3 className="font-heading text-[22px] sm:text-[24px] font-bold">Connect With Us</h3>
            <p className="text-[13px] text-zinc-600 mt-1.5 max-w-[420px]">Daily site updates, before-after reels and material tips. Follow Rupantar Homes on Instagram &amp; TikTok.</p>
          </div>
          <div className="flex gap-3">
            <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="h-11 px-6 rounded-full bg-white border border-zinc-200 text-[13px] font-medium flex items-center gap-2 hover:border-[#FF1A3D]/30 transition"><Instagram className="w-4 h-4" /> Instagram</a>
            <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" className="h-11 px-6 rounded-full bg-zinc-900 text-white text-[13px] font-medium flex items-center gap-2 hover:opacity-90 transition"><Music2 className="w-4 h-4" /> TikTok</a>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 border-t border-zinc-100">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-8 sm:gap-10 items-start">
          <div>
            <h3 className="font-heading text-[28px] font-bold leading-tight">Have a Query?</h3>
            <p className="text-[14px] text-zinc-600 mt-3 leading-6 max-w-[380px]">Tell us about your space, budget and timeline. We reply on WhatsApp within 2 hours during work hours.</p>
            <div className="mt-8 space-y-3">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex gap-3 text-[13px] hover:text-[#FF1A3D] transition">
                <div className="w-8 h-8 rounded-full bg-[#FFF0F2] text-[#FF1A3D] flex items-center justify-center"><Phone className="w-4 h-4" /></div>
                <span>{settings.phone} – Gokul Kunwar</span>
              </a>
              <div className="flex gap-3 text-[13px]"><div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center"><MapPin className="w-4 h-4" /></div> {settings.address}</div>
            </div>
          </div>
          <form
            className="bg-white border border-zinc-100 rounded-[1.75rem] p-6 sm:p-7 shadow-[0_12px_40px_rgba(0,0,0,0.05)]"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmitQuery();
            }}
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <input required value={query.name} onChange={(event) => setQuery((value) => ({ ...value, name: event.target.value }))} placeholder="Your Name *" className="h-11 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
              <input required type="tel" value={query.phone} onChange={(event) => setQuery((value) => ({ ...value, phone: event.target.value }))} placeholder="Phone *" className="h-11 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
              <select required value={query.category} onChange={(event) => setQuery((value) => ({ ...value, category: event.target.value }))} className="sm:col-span-2 h-11 px-4 rounded-full border border-zinc-200 text-[13px] bg-white outline-none focus:border-[#FF1A3D]">
                {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
              </select>
              <textarea required value={query.message} onChange={(event) => setQuery((value) => ({ ...value, message: event.target.value }))} placeholder="Your message... *" rows={4} maxLength={4000} className="sm:col-span-2 w-full px-4 py-3 rounded-2xl border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D] resize-none" />
            </div>
            <button type="submit" disabled={queryBusy} className="mt-5 w-full h-12 rounded-full bg-[#FF1A3D] text-white font-semibold text-[14px] disabled:opacity-60">{queryBusy ? "Sending..." : "Send Query"}</button>
            <div className="mt-3 text-[11px] text-zinc-500 text-center">All fields are required • Fast response • No spam</div>
          </form>
        </div>
      </section>
    </main>
    </>
  );
}

