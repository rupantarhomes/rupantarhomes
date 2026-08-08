"use client";

import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Check,
  ChefHat,
  CircleUserRound,
  Fence,
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
import type { Page, SiteSettings } from "./types";

export const categoryIcons = {
  "interior-designing": PencilRuler,
  "modular-kitchen": ChefHat,
  "tv-cabinet": Monitor,
  wardrobe: PanelsTopLeft,
  "hydraulic-bed": BedDouble,
  "false-ceiling": PanelTop,
  parqueting: Layers3,
  railing: Fence,
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

export function TopBar() {
  return (
    <div className="w-full bg-black text-white border-b-[2px] border-[#FF1A3D]">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[36px] flex items-center justify-between text-[11px] sm:text-xs tracking-wide">
        <div className="flex items-center gap-3 sm:gap-5">
          <span className="hidden sm:flex items-center gap-1.5 opacity-80">
            <MapPin className="w-3.5 h-3.5" /> Kathmandu, Nepal
          </span>
          <span className="flex sm:hidden items-center gap-1.5 opacity-80">
            Kathmandu Workshop
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden" />
          <a
            href="tel:9745941799"
            className="flex items-center gap-1.5 font-medium hover:text-[#FF1A3D] transition"
          >
            <Phone className="w-3.5 h-3.5" /> 9745941799
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
        <button
          onClick={() => go("home")}
          className="flex items-center gap-3"
          aria-label="Rupantar Homes home"
        >
          <img
            src={brandAssets.logo}
            alt="Rupantar Homes"
            className="w-11 h-11 rounded-xl object-cover shadow-sm"
            style={{ borderRadius: "12px" }}
          />
          <div className="text-left leading-none">
            <div className="font-['Space_Grotesk'] font-bold tracking-[-0.02em] text-[16px] text-zinc-900">
              Rupantar Homes
            </div>
            <div className="text-[10px] tracking-[0.12em] uppercase text-zinc-500 mt-[2px] font-medium">
              By Gokul Kunwar
            </div>
          </div>
        </button>

        <div className="hidden lg:flex items-center gap-8">
          <button
            onClick={() => go("home")}
            className={`text-[14px] font-medium transition ${page === "home" ? "text-[#FF1A3D]" : "text-zinc-700 hover:text-[#FF1A3D]"}`}
          >
            Home
          </button>
          <button
            onClick={() => go("works")}
            className={`text-[14px] font-medium transition ${page === "works" ? "text-[#FF1A3D]" : "text-zinc-700 hover:text-[#FF1A3D]"}`}
          >
            Works
          </button>
          <button
            onClick={() => {
              go("home");
              window.setTimeout(
                () => document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }),
                100,
              );
            }}
            className="text-[14px] font-medium text-zinc-700 hover:text-[#FF1A3D] transition"
          >
            Services
          </button>
          <button
            onClick={() => go("about")}
            className={`text-[14px] font-medium transition ${page === "about" ? "text-[#FF1A3D]" : "text-zinc-700 hover:text-[#FF1A3D]"}`}
          >
            About
          </button>
          <button
            onClick={() => go(isAdmin ? "admin-dashboard" : "admin-login")}
            className="text-[14px] font-medium text-zinc-700 hover:text-[#FF1A3D] transition flex items-center gap-1"
          >
            <CircleUserRound className="w-4 h-4" /> Admin
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onEstimate}
            className="hidden sm:inline-flex h-10 px-6 rounded-full bg-[#FF1A3D] text-white text-[13px] font-semibold tracking-wide items-center gap-2 shadow-[0_8px_24px_rgba(255,26,61,0.24)] hover:brightness-[0.95] transition"
          >
            Get Estimate <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpen((value) => !value)}
            className="lg:hidden w-10 h-10 rounded-full bg-zinc-900 text-white flex items-center justify-center"
            aria-label={open ? "Close menu" : "Open menu"}
          >
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
            {
              label: isAdmin ? "Dashboard" : "Admin Login",
              page: (isAdmin ? "admin-dashboard" : "admin-login") as Page,
            },
          ].map((item) => (
            <button
              key={item.page}
              onClick={() => go(item.page)}
              className="w-full text-left py-3 px-4 rounded-2xl text-[14px] font-medium hover:bg-zinc-50"
            >
              {item.label}
            </button>
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
            <img
              src={brandAssets.logo}
              alt="Rupantar Homes"
              className="w-14 h-14 rounded-xl object-cover shadow-sm ring-1 ring-white/10"
              style={{ borderRadius: "12px" }}
            />
            <div>
              <div className="font-heading font-bold text-[15px] leading-none text-[#FEFEFE]">
                Rupantar Homes
              </div>
              <div className="text-[11px] text-zinc-400 mt-1 leading-4">
                Transforming Spaces Inspiring Lives
              </div>
            </div>
          </div>
          <div className="mt-5 text-[13px] text-zinc-300 flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#FF1A3D]" /> 9745941799
          </div>
          <div className="mt-2 text-[12px] text-zinc-400 leading-5">Kathmandu, Nepal</div>
        </div>

        <div>
          <div className="font-heading font-semibold text-[13px] uppercase tracking-wide text-[#FEFEFE]">
            Categories
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5">
            {categories.map((category) => (
              <button
                key={category.slug}
                onClick={() => onCategory(category.slug)}
                className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D] transition"
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="font-heading font-semibold text-[13px] uppercase tracking-wide text-[#FEFEFE]">
            Quick Links
          </div>
          <div className="mt-4 flex flex-col gap-2.5">
            <button onClick={() => navigate("home")} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">
              Home
            </button>
            <button onClick={() => navigate("works")} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">
              All Works
            </button>
            <button onClick={() => navigate("about")} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">
              About Us
            </button>
            <button onClick={onEstimate} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">
              Get Estimate
            </button>
            <button onClick={() => navigate("admin-login")} className="text-left text-[13px] text-zinc-400 hover:text-[#FF1A3D]">
              Admin Login
            </button>
          </div>
        </div>

        <div>
          <div className="font-heading font-semibold text-[13px] uppercase tracking-wide text-[#FEFEFE]">
            Contact
          </div>
          <div className="mt-4 space-y-2 text-[13px] text-zinc-400">
            <div>Phone: 9745941799</div>
            <div>Address: Kathmandu, Nepal</div>
            <div className="flex gap-2 mt-3">
              <a
                href={settings.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:border-[#FF1A3D]/50 transition"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={settings.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
                className="w-9 h-9 rounded-full bg-[#FEFEFE] text-[#111111] flex items-center justify-center hover:bg-white transition"
              >
                <Music2 className="w-4 h-4" />
              </a>
            </div>
            <div className="mt-5 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900">
              <iframe
                src="https://www.openstreetmap.org/export/embed.html?bbox=85.25%2C27.65%2C85.40%2C27.75&layer=mapnik&marker=27.7172%2C85.3240"
                title="Rupantar Homes location map"
                style={{ width: "100%", height: "240px", border: 0, borderRadius: "16px" }}
                loading="lazy"
              />
            </div>
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
