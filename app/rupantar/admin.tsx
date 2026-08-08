"use client";

import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Settings,
  Star,
  Upload,
} from "lucide-react";
import { useState, type Dispatch, type SetStateAction } from "react";
import { brandAssets, categories, emptyWork } from "./data";
import type { AdminStats, Page, Review, ReviewForm, SiteSettings, Work, WorkForm } from "./types";

export function AdminLogin({
  navigate,
  onLogin,
  error,
  busy,
}: {
  navigate: (page: Page) => void;
  onLogin: (email: string, password: string) => Promise<void>;
  error: string;
  busy: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-[#fbfbfb] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px] bg-white border border-zinc-100 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)] p-8">
        <button
          onClick={() => navigate("home")}
          className="text-[12px] text-zinc-500 flex items-center gap-1 hover:text-zinc-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to site
        </button>
        <div className="flex flex-col items-center text-center">
          <img
            src={brandAssets.logo}
            alt="logo"
            className="w-14 h-14 rounded-xl object-cover"
            style={{ borderRadius: "12px" }}
          />
          <h2 className="font-heading font-bold text-[22px] mt-4">Admin Login</h2>
          <p className="text-[12px] text-zinc-500 mt-1">Authorized accounts only</p>
        </div>
        <form
          className="mt-7 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onLogin(email, password);
          }}
        >
          <input
            placeholder="Email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full h-11 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]"
          />
          <input
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full h-11 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]"
          />
          {error && <div className="text-[11px] text-[#FF1A3D] text-center" role="alert">{error}</div>}
          <button
            type="submit"
            disabled={busy}
            className="w-full h-11 rounded-full bg-[#FF1A3D] text-white font-semibold text-[14px] shadow-[0_8px_20px_rgba(255,26,61,0.25)]"
          >
            {busy ? "Signing in..." : "Login"}
          </button>
        </form>
        <div className="mt-6 text-[11px] text-zinc-500 text-center">
          Your session is protected by Supabase authentication.
        </div>
      </div>
    </div>
  );
}

type AdminPortalProps = {
  page: Page;
  navigate: (page: Page) => void;
  onLogout: () => void | Promise<void>;
  works: Work[];
  workForm: WorkForm;
  setWorkForm: Dispatch<SetStateAction<WorkForm>>;
  editingWorkId: string | null;
  onSaveWork: () => void;
  onEditWork: (work: Work) => void;
  onDeleteWork: (id: string) => void;
  onCancelWork: () => void;
  onUploadImages: (files: File[]) => Promise<void>;
  uploadingImages: boolean;
  reviews: Review[];
  reviewForm: ReviewForm;
  setReviewForm: Dispatch<SetStateAction<ReviewForm>>;
  onSaveReview: () => void;
  onDeleteReview: (id: string) => void;
  settings: SiteSettings;
  setSettings: Dispatch<SetStateAction<SiteSettings>>;
  onSaveSettings: () => Promise<void>;
  adminStats: AdminStats;
  busy: boolean;
};

const adminTabs = [
  { page: "admin-dashboard" as Page, label: "Dashboard", icon: LayoutDashboard },
  { page: "admin-works" as Page, label: "Works", icon: FileText },
  { page: "admin-reviews" as Page, label: "Reviews", icon: Star },
  { page: "admin-settings" as Page, label: "Settings", icon: Settings },
];

export function AdminPortal(props: AdminPortalProps) {
  const { page, navigate, onLogout } = props;

  return (
    <div className="min-h-screen bg-[#fbfbfb]">
      <div className="sticky top-0 z-40 bg-white border-b border-zinc-100">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <img
                src={brandAssets.logo}
                alt="logo"
                className="w-11 h-11 rounded-xl object-cover"
                style={{ borderRadius: "12px" }}
              />
              <div className="leading-none">
                <div className="font-heading font-bold text-[14px]">Admin</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Rupantar Homes</div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              {adminTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.page}
                    onClick={() => navigate(tab.page)}
                    className={`h-8 px-3.5 rounded-full text-[12px] font-medium flex items-center gap-1.5 border transition ${
                      page === tab.page
                        ? "bg-[#FF1A3D] text-white border-[#FF1A3D]"
                        : "bg-white border-zinc-200 text-zinc-700 hover:border-zinc-300"
                    }`}
                  >
                    <Icon className="w-4 h-4" /> {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("home")}
              className="hidden sm:inline-flex h-10 px-5 rounded-full bg-white border border-[#111111] text-[#111111] text-[14px] font-['Space_Grotesk'] font-medium tracking-[-0.01em] items-center justify-center hover:bg-zinc-50 transition"
            >
              View Site
            </button>
            <button
              onClick={onLogout}
              className="h-10 px-5 rounded-full bg-[#111111] text-white text-[14px] font-['Space_Grotesk'] font-medium tracking-[-0.01em] flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </div>
        </div>
        <div className="md:hidden border-t border-zinc-100 px-4 py-2 flex gap-2 overflow-auto">
          {adminTabs.map((tab) => (
            <button
              key={tab.page}
              onClick={() => navigate(tab.page)}
              className={`h-8 px-3.5 rounded-full text-[12px] font-medium border whitespace-nowrap ${
                page === tab.page
                  ? "bg-[#FF1A3D] text-white border-[#FF1A3D]"
                  : "bg-white border-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {page === "admin-dashboard" && <AdminDashboard {...props} />}
        {page === "admin-works" && <AdminWorks {...props} />}
        {page === "admin-reviews" && <AdminReviews {...props} />}
        {page === "admin-settings" && <AdminSettings {...props} />}
      </div>
    </div>
  );
}

function AdminDashboard({ works, navigate, adminStats }: AdminPortalProps) {
  const stats = [
    { label: "Total Works", value: works.length, icon: FileText },
    { label: "Featured", value: works.filter((work) => work.featured).length, icon: Star },
    { label: "Queries", value: adminStats.queries, icon: MessageCircle },
    { label: "Estimates", value: adminStats.estimates, icon: FileText },
  ];

  return (
    <>
      <h1 className="font-heading text-[24px] font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-[#FFF0F2] text-[#FF1A3D] flex items-center justify-center mb-3">
                <Icon className="w-4 h-4" />
              </div>
              <div className="text-[22px] font-bold font-heading leading-none">{stat.value}</div>
              <div className="text-[12px] text-zinc-500 mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>
      <div className="mt-8 grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-white border border-zinc-100 rounded-[1.5rem] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold">Recent Works</h3>
            <button onClick={() => navigate("admin-works")} className="h-8 px-3 rounded-full bg-[#FF1A3D] text-white text-[12px] font-medium">Manage Works</button>
          </div>
          <div className="space-y-2">
            {works.slice(0, 5).map((work) => (
              <div key={work.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100">
                <div>
                  <div className="text-[13px] font-medium">{work.title}</div>
                  <div className="text-[11px] text-zinc-500">{work.category} • {work.location}</div>
                </div>
                {work.featured && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF1A3D] text-white">Featured</span>}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-zinc-100 rounded-[1.5rem] p-6">
          <h3 className="font-heading font-semibold mb-4">Quick Actions</h3>
          <div className="grid gap-3">
            <button onClick={() => navigate("admin-works")} className="h-11 rounded-full border border-zinc-200 text-[13px] font-medium hover:bg-zinc-50">+ Add New Work</button>
            <button onClick={() => navigate("admin-reviews")} className="h-11 rounded-full border border-zinc-200 text-[13px] font-medium hover:bg-zinc-50">+ Add Review</button>
            <button onClick={() => navigate("admin-settings")} className="h-11 rounded-full border border-zinc-200 text-[13px] font-medium hover:bg-zinc-50">Edit Settings</button>
            <button onClick={() => navigate("home")} className="h-11 rounded-full bg-zinc-900 text-white text-[13px] font-medium">View Site</button>
          </div>
        </div>
      </div>
    </>
  );
}

function AdminWorks({
  works,
  workForm,
  setWorkForm,
  editingWorkId,
  onSaveWork,
  onEditWork,
  onDeleteWork,
  onCancelWork,
  onUploadImages,
  uploadingImages,
  busy,
}: AdminPortalProps) {
  const slugify = (value: string) =>
    value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-[22px] font-bold">Manage Works</h1>
        <div className="text-[12px] text-zinc-500">{works.length} total</div>
      </div>
      <div className="mt-6 grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="bg-white border border-zinc-100 rounded-[1.5rem] p-6 shadow-sm h-fit lg:sticky lg:top-[88px]">
          <h3 className="font-heading font-semibold text-[14px] mb-4">{editingWorkId ? "Edit Work" : "Add New Work"}</h3>
          <div className="space-y-3">
            <input
              value={workForm.title}
              onChange={(event) => {
                const title = event.target.value;
                setWorkForm((current) => ({
                  ...current,
                  title,
                  slug: current.slug === slugify(current.title) || current.slug === "" ? slugify(title) : current.slug,
                }));
              }}
              placeholder="Title"
              className="w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]"
            />
            <input value={workForm.slug} onChange={(event) => setWorkForm((value) => ({ ...value, slug: event.target.value }))} placeholder="Slug auto from title" className="w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
            <select value={workForm.category} onChange={(event) => setWorkForm((value) => ({ ...value, category: event.target.value }))} className="w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] bg-white">
              {categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}
            </select>
            <input value={workForm.location} onChange={(event) => setWorkForm((value) => ({ ...value, location: event.target.value }))} placeholder="Location" className="w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
            <input value={workForm.shortDesc} onChange={(event) => setWorkForm((value) => ({ ...value, shortDesc: event.target.value }))} placeholder="Short Description" className="w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
            <textarea value={workForm.longDesc} onChange={(event) => setWorkForm((value) => ({ ...value, longDesc: event.target.value }))} placeholder="Long Description" rows={3} className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D] resize-none" />
            <div className="grid grid-cols-1 gap-3">
              <label className="border border-dashed border-zinc-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 text-zinc-400 cursor-pointer hover:border-[#FF1A3D]/40">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  multiple
                  className="hidden"
                  disabled={uploadingImages}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = "";
                    void onUploadImages(files);
                  }}
                />
                <Upload className="w-5 h-5" />
                <span className="text-[11px]">{uploadingImages ? "Converting and uploading..." : "Upload JPEG / PNG Photos"}</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: Math.max(4, workForm.images.length) }, (_, index) => {
                  const image = workForm.images[index];
                  return image ? (
                    <div key={image.id} className="relative border border-zinc-200 rounded-xl aspect-square overflow-hidden">
                      <img src={image.url} alt={image.altText || workForm.title} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove image"
                        onClick={() => setWorkForm((current) => ({
                          ...current,
                          images: current.images.filter((_, imageIndex) => imageIndex !== index).map((item, sortOrder) => ({ ...item, sortOrder })),
                        }))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 text-white text-[13px] leading-none"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div key={`slot-${index}`} className="border border-dashed border-zinc-200 rounded-xl aspect-square flex items-center justify-center text-zinc-300"><ImageIcon className="w-4 h-4" /></div>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-[13px] mt-1">
              <input type="checkbox" checked={workForm.featured} onChange={(event) => setWorkForm((value) => ({ ...value, featured: event.target.checked }))} className="rounded" /> Featured on Home
            </label>
            <div className="flex gap-2">
              <button disabled={busy || uploadingImages} onClick={onSaveWork} className="flex-1 h-10 rounded-full bg-[#FF1A3D] text-white text-[13px] font-semibold disabled:opacity-60">{busy ? "Saving..." : editingWorkId ? "Update Work" : "Save Work"}</button>
              {editingWorkId && <button onClick={onCancelWork} className="h-10 px-4 rounded-full border border-zinc-200 text-[13px]">Cancel</button>}
            </div>
          </div>
        </div>
        <div className="bg-white border border-zinc-100 rounded-[1.5rem] p-4 sm:p-6">
          <div className="space-y-3">
            {works.map((work) => (
              <div key={work.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-zinc-100 hover:border-zinc-200 transition">
                <div className="flex gap-3 items-center min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-dashed border-zinc-200 flex items-center justify-center shrink-0 overflow-hidden">
                    {work.images[0] ? <img src={work.images[0].url} alt={work.images[0].altText || work.title} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-zinc-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate max-w-[180px] sm:max-w-[260px]">{work.title}</div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                      <span>{work.category}</span>
                      {work.featured && <span className="px-1.5 py-0.5 rounded-full bg-[#FF1A3D] text-white text-[9px]">Featured</span>}
                      <span>• {work.location}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => onEditWork(work)} className="h-7 px-3 rounded-full bg-zinc-900 text-white text-[11px]">Edit</button>
                  <button onClick={() => onDeleteWork(work.id)} className="h-7 px-3 rounded-full border border-zinc-200 text-[11px]">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AdminReviews({ reviews, reviewForm, setReviewForm, onSaveReview, onDeleteReview, busy }: AdminPortalProps) {
  return (
    <>
      <h1 className="font-heading text-[22px] font-bold">Manage Reviews</h1>
      <div className="mt-6 grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <div className="bg-white border border-zinc-100 rounded-[1.5rem] p-6 h-fit">
          <h3 className="font-heading font-semibold text-[14px] mb-4">Add Review</h3>
          <div className="space-y-3">
            <input value={reviewForm.name} onChange={(event) => setReviewForm((value) => ({ ...value, name: event.target.value }))} placeholder="Name" className="w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
            <input value={reviewForm.location} onChange={(event) => setReviewForm((value) => ({ ...value, location: event.target.value }))} placeholder="Location" className="w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
            <textarea value={reviewForm.message} onChange={(event) => setReviewForm((value) => ({ ...value, message: event.target.value }))} placeholder="Message" rows={3} className="w-full px-4 py-3 rounded-2xl border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D] resize-none" />
            <div className="flex items-center gap-2">
              <span className="text-[12px]">Rating</span>
              <select value={reviewForm.rating} onChange={(event) => setReviewForm((value) => ({ ...value, rating: Number(event.target.value) }))} className="h-8 px-3 rounded-full border border-zinc-200 text-[12px] bg-white">
                {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
              </select>
            </div>
            <input value={reviewForm.instagramLink || ""} onChange={(event) => setReviewForm((value) => ({ ...value, instagramLink: event.target.value }))} placeholder="Instagram Video Link (paste URL)" className="w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
            <button disabled={busy} onClick={onSaveReview} className="w-full h-10 rounded-full bg-[#FF1A3D] text-white text-[13px] font-semibold disabled:opacity-60">{busy ? "Saving..." : "Save Review"}</button>
          </div>
        </div>
        <div className="bg-white border border-zinc-100 rounded-[1.5rem] p-6">
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 rounded-2xl border border-zinc-100">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-[13px]">{review.name} • {review.location}</div>
                  <div className="flex">{Array.from({ length: review.rating }).map((_, index) => <Star key={index} className="w-3 h-3 fill-[#FF1A3D] text-[#FF1A3D]" />)}</div>
                </div>
                <div className="text-[12px] text-zinc-600 mt-2 leading-5">{review.message}</div>
                <div className="mt-3 flex gap-2"><button onClick={() => onDeleteReview(review.id)} className="h-7 px-3 rounded-full border border-zinc-200 text-[11px]">Delete</button></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AdminSettings({ settings, setSettings, onSaveSettings, busy }: AdminPortalProps) {
  return (
    <>
      <h1 className="font-heading text-[22px] font-bold">Settings</h1>
      <div className="mt-6 max-w-[720px] bg-white border border-zinc-100 rounded-[1.5rem] p-6">
        <div className="grid gap-4">
          <SettingField label="Slogan" value={settings.slogan} onChange={(slogan) => setSettings((value) => ({ ...value, slogan }))} />
          <SettingField label="Phone" value={settings.phone} onChange={(phone) => setSettings((value) => ({ ...value, phone }))} />
          <div className="grid sm:grid-cols-2 gap-4">
            <SettingField label="Instagram URL" value={settings.instagram} onChange={(instagram) => setSettings((value) => ({ ...value, instagram }))} />
            <SettingField label="TikTok URL" value={settings.tiktok} onChange={(tiktok) => setSettings((value) => ({ ...value, tiktok }))} />
          </div>
          <SettingField label="Address" value={settings.address} onChange={(address) => setSettings((value) => ({ ...value, address }))} />
          <SettingField label="Workshop Note" value={settings.workshopNote} onChange={(workshopNote) => setSettings((value) => ({ ...value, workshopNote }))} />
          <button disabled={busy} onClick={onSaveSettings} className="mt-2 h-11 rounded-full bg-[#FF1A3D] text-white font-semibold text-[13px] disabled:opacity-60">{busy ? "Saving..." : "Save Settings"}</button>
        </div>
      </div>
    </>
  );
}

function SettingField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-[12px] font-medium text-zinc-700">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
    </div>
  );
}

export function resetWorkForm(setWorkForm: Dispatch<SetStateAction<WorkForm>>) {
  setWorkForm(emptyWork);
}
