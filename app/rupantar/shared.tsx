"use client";

import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Check,
  ChefHat,
  CircleUserRound,
  Fence,
  House,
  Image as ImageIcon,
  Instagram,
  Layers3,
  MapPin,
  Menu,
  Monitor,
  Music2,
  PanelTop,
  PanelsTopLeft,
  PencilRuler,
  Phone,
  X,
} from "lucide-react";
import { useState } from "react";
import { brandAssets, categories } from "./data";
import type { Page, SiteSettings, WorkImage } from "./types";

export const whatsappUrl = `https://wa.me/9779745941799?text=${encodeURIComponent("Hello Rupantar Homes, I would like to discuss my interior project.")}`;
export const callUrl = "tel:+9779745941799";

export const categoryIcons = {
  architect: PencilRuler,
  "modular-kitchen": ChefHat,
  "tv-cabinet": Monitor,
  wardrobe: PanelsTopLeft,
  "hydraulic-bed": BedDouble,
  "false-ceiling": PanelTop,
  parqueting: Layers3,
  railing: Fence,
  "home-construction": House,
} as const;

export function PhotoPlaceholder({
  aspect = "aspect-[4/3]",
  label = "Photo Coming Soon",
}: {
  aspect?: string;
  label?: string;
}) {
  return (
    <div
      className={`${aspect} w-full bg-[#F8F8F8] border border-dashed border-zinc-200 rounded-[1.25rem] flex flex-col items-center justify-center gap-2.5 text-zinc-400 select-none`}
    >
      <div className="w-9 h-9 rounded-full bg-white border border-zinc-200 flex items-center justify-center">
        <ImageIcon className="w-4 h-4" />
      </div>
      <span className="text-[11px] tracking-wide font-medium uppercase">{label}</span>
    </div>
  );
}

export function WorkPhoto({
  image,
  alt,
  aspect = "aspect-[4/3]",
  label = "Photo Coming Soon",
  eager = false,
}: {
  image?: WorkImage;
  alt: string;
  aspect?: string;
  label?: string;
  eager?: boolean;
}) {
  if (!image) return <PhotoPlaceholder aspect={aspect} label={label} />;
  return (
    <div className={`${aspect} w-full rounded-[1.25rem] overflow-hidden bg-[#F8F8F8]`}>
      <img
        src={image.url}
        alt={image.altText || alt}
        className="w-full h-full object-cover"
        loading={eager ? "eager" : "lazy"}
      />
    </div>
  );
}

export function TopBar({ settings }: { settings: SiteSettings }) {
  return (
    <div className="w-full bg-black text-white border-b-[2px] border-[#FF1A3D]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[36px] flex items-center justify-between text-[11px] sm:text-xs tracking-wide">
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden sm:flex items-center gap-1.5 opacity-80">
            <MapPin className="w-3.5 h-3.5" /> {settings.address}
          </span>
          <span className="flex sm:hidden items-center gap-1.5 opacity-80">Kathmandu</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={callUrl}
            className="flex items-center gap-1.5 font-medium hover:text-[#FF1A3D] transition"
            aria-label={`Call Rupantar Homes at ${settings.phone}`}
          >
            <Phone className="w-3.5 h-3.5 text-[#FF1A3D]" /> {settings.phone}
          </a>
        </div>
      </div>
    </div>
  );
}

export function PublicHeader({
  page,
  navigate,
  onEstimate,
  isAdmin,
}: {
  page: Page;
  navigate: (page: Page) => void;
  onEstimate: () => void;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);

  const go = (next: Page) => {
    navigate(next);
    setOpen(false);
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-zinc-100">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        <button onClick={() => go("home")} className="flex items-center gap-3" aria-label="Rupantar Homes home">
          <img src={brandAssets.logo} alt="Rupantar Homes" className="w-11 h-11 rounded-xl object-cover shadow-sm" style={{ borderRadius: "12px" }} />
          <div className="text-left leading-none">
            <div className="font-['Space_Grotesk'] font-bold tracking-[-0.02em] text-[16px] text-zinc-900">Rupantar Homes</div>
            <div className="text-[10px] tracking-[0.12em] uppercase text-zinc-500 mt-[2px] font-medium">By Gokul Kunwar</div>
          </div>
        </button>

        <div className="hidden lg:flex items-center gap-8">
          <button onClick={() => go("home")} className={`text-[14px] font-medium transition ${page === "home" ? "text-[#FF1A3D]" : "text-zinc-700 hover:text-[#FF1A3D]"}`}>Home</button>
          <button onClick={() => go("works")} className={`text-[14px] font-medium transition ${page === "works" ? "text-[#FF1A3D]" : "text-zinc-700 hover:text-[#FF1A3D]"}`}>Works</button>
          <button
            onClick={() => {
              go("home");
              window.setTimeout(() => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }), 100);
            }}
            className="text-[14px] font-medium text-zinc-700 hover:text-[#FF1A3D] transition"
          >
            Services
          </button>
          <button onClick={() => go("about")} className={`text-[14px] font-medium transition ${page === "about" ? "text-[#FF1A3D]" : "text-zinc-700 hover:text-[#FF1A3D]"}`}>About</button>
          <button onClick={() => go(isAdmin ? "admin-dashboard" : "admin-login")} className="text-[14px] font-medium text-zinc-700 hover:text-[#FF1A3D] transition flex items-center gap-1">
            <CircleUserRound className="w-4 h-4" /> Admin
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={onEstimate} className="hidden sm:inline-flex h-10 px-6 rounded-full bg-[#FF1A3D] text-white text-[13px] font-semibold tracking-wide items-center gap-2 shadow-[0_8px_24px_rgba(255,26,61,0.24)] hover:brightness-[0.95] transition">
            Get Estimate <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={() => setOpen((value) => !value)} className="lg:hidden w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center" aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-zinc-100 bg-white px-4 py-4 space-y-1">
          {[
            { label: "Home", page: "home" as Page },
            { label: "Works", page: "works" as Page },
            { label: "About", page: "about" as Page },
            { label: isAdmin ? "Dashboard" : "Admin Login", page: (isAdmin ? "admin-dashboard" : "admin-login") as Page },
          ].map((item) => (
            <button key={item.page} onClick={() => go(item.page)} className="w-full text-left py-3 px-4 rounded-2xl text-[14px] font-medium hover:bg-zinc-50">{item.label}</button>
          ))}
          <button
            onClick={() => {
              setOpen(false);
              onEstimate();
            }}
            className="w-full mt-2 h-11 rounded-full bg-[#FF1A3D] text-white font-semibold"
          >
            Get Estimate
          </button>
        </div>
      )}
    </nav>
  );
}

export function PublicFooter({
  navigate,
  onCategory,
  onEstimate,
  settings,
}: {
  navigate: (page: Page) => void;
  onCategory: (category: string) => void;
  onEstimate: () => void;
  settings: SiteSettings;
}) {
  return (
    <footer className="mt-16 bg-[#111111] text-[#FEFEFE]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
        <div>
          <div className="flex items-center gap-3">
            <img src={brandAssets.logo} alt="Rupantar Homes" className="w-14 h-14 rounded-xl object-cover shadow-sm ring-1 ring-white/10" style={{ borderRadius: "12px" }} />
            <div>
              <div className="font-heading font-bold text-[15px] leading-none text-[#FEFEFE]">Rupantar Homes</div>
              <div className="text-[11px] text-zinc-400 mt-1 leading-4">{settings.slogan}</div>
            </div>
          </div>
          <a href={callUrl} className="mt-5 text-[13px] text-zinc-300 flex items-center gap-2 hover:text-white transition" aria-label={`Call Rupantar Homes at ${settings.phone}`}>
            <Phone className="w-5 h-5 text-[#FF1A3D] shrink-0 transition-transform hover:scale-110" />
            {settings.phone}
          </a>
          <div className="mt-2 text-[12px] text-zinc-400 leading-5">{settings.address}</div>
        </div>

        <div>
          <div className="font-heading font-semibold text-[13px] uppercase tracking-wide text-[#FEFEFE]">Categories</div>
          <div className="mt-4 grid grid-cols-1 gap-2.5">
            {categories.map((category) => (
              <button key={category.slug} onClick={() => onCategory(category.slug)} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D] transition">{category.name}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="font-heading font-semibold text-[13px] uppercase tracking-wide text-[#FEFEFE]">Quick Links</div>
          <div className="mt-4 flex flex-col gap-2.5">
            <button onClick={() => navigate("home")} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">Home</button>
            <button onClick={() => navigate("works")} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">All Works</button>
            <button onClick={() => navigate("about")} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">About Us</button>
            <button onClick={onEstimate} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">Get Estimate</button>
            <button onClick={() => navigate("admin-login")} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">Admin Login</button>
          </div>
        </div>

        <div>
          <div className="font-heading font-semibold text-[13px] uppercase tracking-wide text-[#FEFEFE]">Social Links</div>
          <div className="mt-4 space-y-4 text-[13px] text-zinc-400">
            <div className="flex gap-2">
              <a href={settings.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:border-[#FF1A3D]/50 transition"><Instagram className="w-4 h-4" /></a>
              <a href={settings.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-9 h-9 rounded-full bg-[#FEFEFE] text-[#111111] flex items-center justify-center hover:bg-white transition"><Music2 className="w-4 h-4" /></a>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${settings.address} in Google Maps`}
              className="inline-flex h-10 items-center gap-2.5 rounded-full bg-[#FEFEFE] px-4 text-[12px] font-semibold text-[#111111] transition hover:bg-white"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
                <path fill="#EA4335" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Z" />
                <path fill="#4285F4" d="M12 5.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z" />
                <path fill="#34A853" d="M6.15 12.82C7.92 16.65 12 22 12 22s1.68-1.86 3.36-4.23l-3.6-5.04a3.75 3.75 0 0 1-5.61.09Z" />
                <path fill="#FBBC04" d="M17.86 5.22 14.5 8.58a3.75 3.75 0 0 1-2.74 4.15l3.6 5.04C17.3 15.03 19 11.72 19 9c0-1.38-.4-2.67-1.14-3.78Z" />
              </svg>
              Google Maps
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-gray-800">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between text-[11px] text-zinc-400">
          <span>© {new Date().getFullYear()} Rupantar Homes By Gokul Kunwar. All rights reserved.</span>
          <span className="hidden sm:inline">Crafted with red #FF1A3D • Kathmandu Nepal</span>
        </div>
      </div>
    </footer>
  );
}

export { ArrowLeft, ArrowRight, Check, Instagram, MapPin, Music2, Phone };
