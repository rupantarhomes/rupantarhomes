"use client";

import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Phone,
  Settings,
  Star,
  Upload,
  Users,
} from "lucide-react";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { maximumWorkImages } from "./cloudinary";
import { brandAssets, categories, emptyWork } from "./data";
import { getSupabase } from "./supabase";
import type {
  AdminStats,
  Lead,
  LeadStatus,
  Page,
  Review,
  ReviewForm,
  SiteSettings,
  Work,
  WorkForm,
} from "./types";

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
  onSaveWork: () => void | Promise<void>;
  onEditWork: (work: Work) => void;
  onDeleteWork: (id: string) => void | Promise<void>;
  onCancelWork: () => void | Promise<void>;
  onUploadImages: (files: File[]) => Promise<void>;
  onRemoveWorkImage: (index: number) => Promise<void>;
  uploadingImages: boolean;
  leads: Lead[];
  onUpdateLeadStatus: (id: string, status: LeadStatus) => Promise<void>;
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
  { page: "admin-leads" as Page, label: "Leads", icon: Users },
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
        {page === "admin-leads" && <AdminLeads {...props} />}
        {page === "admin-reviews" && <AdminReviews {...props} />}
        {page === "admin-settings" && <AdminSettings {...props} />}
      </div>
    </div>
  );
}

function AdminDashboard({ works, leads, navigate, adminStats }: AdminPortalProps) {
  const stats = [
    { label: "Total Works", value: works.length, icon: FileText },
    { label: "New Leads", value: leads.filter((lead) => lead.status === "new").length, icon: Users },
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
            <h3 className="font-heading font-semibold">Recent Leads</h3>
            <button onClick={() => navigate("admin-leads")} className="h-8 px-3 rounded-full bg-[#FF1A3D] text-white text-[12px] font-medium">View Leads</button>
          </div>
          <div className="space-y-2">
            {leads.slice(0, 5).map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-xl border border-zinc-100">
                <div>
                  <div className="text-[13px] font-medium">{lead.name}</div>
                  <div className="text-[11px] text-zinc-500">{lead.phone} • {lead.location}</div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${lead.status === "new" ? "bg-[#FF1A3D] text-white" : "bg-zinc-100 text-zinc-600"}`}>{lead.status}</span>
              </div>
            ))}
            {!leads.length && <div className="text-[12px] text-zinc-500">No estimate leads yet.</div>}
          </div>
        </div>
        <div className="bg-white border border-zinc-100 rounded-[1.5rem] p-6">
          <h3 className="font-heading font-semibold mb-4">Quick Actions</h3>
          <div className="grid gap-3">
            <button onClick={() => navigate("admin-leads")} className="h-11 rounded-full border border-zinc-200 text-[13px] font-medium hover:bg-zinc-50">View New Leads</button>
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

function normalizeWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("977")) return digits;
  if (digits.startsWith("0")) return `977${digits.slice(1)}`;
  return `977${digits}`;
}

function leadWhatsAppUrl(lead: Lead): string {
  const message = encodeURIComponent(`Hello ${lead.name}, thank you for contacting Rupantar Homes. We are reviewing your request.`);
  return `https://wa.me/${normalizeWhatsAppNumber(lead.phone)}?text=${message}`;
}

const seenLeadsStorageKey = "rupantar-admin-seen-leads";

function AdminLeads({ leads, onUpdateLeadStatus, busy }: AdminPortalProps) {
  const [deletedLeadIds, setDeletedLeadIds] = useState<Set<string>>(() => new Set());
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [firstViewLeadIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = JSON.parse(window.localStorage.getItem(seenLeadsStorageKey) ?? "[]");
      const seen = new Set<string>(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
      return new Set(leads.filter((lead) => lead.status === "new" && !seen.has(lead.id)).map((lead) => lead.id));
    } catch {
      return new Set(leads.filter((lead) => lead.status === "new").map((lead) => lead.id));
    }
  });
  const visibleLeads = leads.filter((lead) => !deletedLeadIds.has(lead.id));
  const visibleLeadIdsKey = visibleLeads.map((lead) => lead.id).join("|");
  const isEstimateLead = (lead: Lead) => Boolean(
    lead.referenceImageUrl || lead.location || lead.approximateArea || lead.materialPreference,
  );
  const estimateLeads = visibleLeads.filter(isEstimateLead);
  const websiteQueries = visibleLeads.filter((lead) => !isEstimateLead(lead));

  useEffect(() => {
    if (typeof window === "undefined" || !visibleLeads.length) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem(seenLeadsStorageKey) ?? "[]");
      const seen = new Set<string>(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
      visibleLeads.forEach((lead) => seen.add(lead.id));
      window.localStorage.setItem(seenLeadsStorageKey, JSON.stringify(Array.from(seen)));
    } catch {
      // The NEW marker is optional if browser storage is unavailable.
    }
  }, [visibleLeadIdsKey]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  };

  const deleteLead = async (lead: Lead) => {
    if (!window.confirm(`Delete the lead from ${lead.name}?`)) return;
    setDeletingLeadId(lead.id);
    try {
      const supabase = getSupabase() as any;
      const { data, error } = await supabase
        .from("leads")
        .delete()
        .eq("id", lead.id)
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error(error?.message ?? "The lead could not be deleted.");
      setDeletedLeadIds((current) => {
        const next = new Set(current);
        next.add(lead.id);
        return next;
      });
      const index = leads.findIndex((item) => item.id === lead.id);
      if (index >= 0) leads.splice(index, 1);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "The lead could not be deleted.");
    } finally {
      setDeletingLeadId(null);
    }
  };

  const contactLinks = (lead: Lead) => (
    <div className="mt-4 flex flex-wrap items-center gap-2.5">
      <a
        href={leadWhatsAppUrl(lead)}
        target="_blank"
        rel="noopener noreferrer"
        className="min-h-10 px-4 py-2 rounded-full border border-zinc-200 bg-white text-[12px] font-semibold text-zinc-800 inline-flex items-center gap-2.5 hover:border-zinc-300 hover:bg-zinc-50 transition"
      >
        <svg viewBox="0 0 32 32" aria-hidden="true" className="w-4.5 h-4.5 shrink-0 fill-[#25D366]">
          <path d="M19.11 17.35c-.28-.14-1.65-.81-1.91-.91-.26-.1-.45-.14-.64.14-.19.28-.73.91-.89 1.1-.16.19-.33.21-.61.07-.28-.14-1.18-.43-2.24-1.38-.83-.74-1.39-1.65-1.55-1.93-.16-.28-.02-.43.12-.57.13-.13.28-.33.42-.49.14-.16.19-.28.28-.47.09-.19.05-.35-.02-.49-.07-.14-.64-1.54-.87-2.11-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.49.07-.75.35-.26.28-.99.97-.99 2.36 0 1.39 1.02 2.74 1.16 2.93.14.19 2 3.05 4.85 4.28.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.12.55-.08 1.65-.68 1.88-1.33.23-.65.23-1.21.16-1.33-.07-.12-.26-.19-.54-.33Z" />
          <path d="M16.02 3.2c-7.09 0-12.85 5.72-12.85 12.78 0 2.25.59 4.45 1.7 6.39L3.08 28.8l6.61-1.73a12.93 12.93 0 0 0 6.33 1.62h.01c7.08 0 12.84-5.73 12.84-12.79 0-3.41-1.34-6.62-3.76-9.03A12.77 12.77 0 0 0 16.02 3.2Zm0 23.33h-.01a10.76 10.76 0 0 1-5.48-1.5l-.39-.23-3.92 1.03 1.05-3.81-.25-.39a10.62 10.62 0 0 1-1.68-5.73c0-5.88 4.8-10.66 10.7-10.66 2.86 0 5.54 1.11 7.56 3.12a10.57 10.57 0 0 1 3.14 7.54c0 5.88-4.8 10.66-10.72 10.66Z" />
        </svg>
        <span>WhatsApp</span>
        <span className="text-zinc-500 font-medium">{lead.phone}</span>
      </a>
      <a
        href={`tel:${lead.phone}`}
        className="min-h-10 px-4 py-2 rounded-full border border-zinc-200 bg-white text-[12px] font-semibold text-zinc-800 inline-flex items-center gap-2.5 hover:border-[#FF1A3D]/40 hover:bg-[#FFF7F8] transition"
      >
        <Phone className="w-4 h-4 shrink-0 text-[#FF1A3D]" />
        <span>Call</span>
        <span className="text-zinc-500 font-medium">{lead.phone}</span>
      </a>
    </div>
  );

  const leadActions = (lead: Lead) => (
    <div className="flex flex-wrap items-center gap-3">
      <div className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <button
          type="button"
          disabled={busy || deletingLeadId === lead.id}
          onClick={() => void onUpdateLeadStatus(lead.id, "contacted")}
          className={`h-8 px-3.5 rounded-full text-[11px] font-semibold transition-all disabled:opacity-50 ${
            lead.status === "contacted"
              ? "bg-[#FF1A3D] text-white shadow-[0_4px_12px_rgba(255,26,61,0.22)]"
              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          }`}
        >
          Contacted
        </button>
        <button
          type="button"
          disabled={busy || deletingLeadId === lead.id}
          onClick={() => void onUpdateLeadStatus(lead.id, "closed")}
          className={`h-8 px-3.5 rounded-full text-[11px] font-semibold transition-all disabled:opacity-50 ${
            lead.status === "closed"
              ? "bg-[#FF1A3D] text-white shadow-[0_4px_12px_rgba(255,26,61,0.22)]"
              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          }`}
        >
          Closed
        </button>
      </div>
      <button
        type="button"
        disabled={busy || deletingLeadId === lead.id}
        onClick={() => void deleteLead(lead)}
        className="h-10 px-4 rounded-full border border-red-200 bg-white text-red-600 text-[12px] font-medium hover:bg-red-50 disabled:opacity-50 transition"
      >
        {deletingLeadId === lead.id ? "Deleting..." : "Delete"}
      </button>
    </div>
  );

  const leadHeader = (lead: Lead, kind: "Estimate Lead" | "Website Query") => (
    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 pb-6 border-b border-zinc-100">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className={`h-7 px-3 rounded-full inline-flex items-center text-[10px] uppercase tracking-[0.12em] font-bold ${
            kind === "Estimate Lead" ? "bg-[#FFF0F2] text-[#FF1A3D]" : "bg-zinc-100 text-zinc-600"
          }`}>{kind}</span>
          {firstViewLeadIds.has(lead.id) && (
            <span className="h-7 px-3 rounded-full bg-[#FF1A3D] text-white text-[10px] font-bold tracking-wide inline-flex items-center shadow-[0_4px_12px_rgba(255,26,61,0.2)]">NEW</span>
          )}
        </div>
        <div className="font-heading font-bold text-[20px] sm:text-[21px] mt-4 tracking-[-0.01em]">{lead.name}</div>
        <div className="text-[11px] text-zinc-500 mt-1.5">Submitted {formatDate(lead.createdAt)}</div>
        {contactLinks(lead)}
      </div>
      <div className="xl:pt-1">{leadActions(lead)}</div>
    </div>
  );

  return (
    <>
      <div>
        <h1 className="font-heading text-[22px] font-bold">Leads</h1>
        <div className="text-[12px] text-zinc-500 mt-1">Estimate requests and website queries are organized separately below.</div>
      </div>

      <section className="mt-8">
        <div className="flex items-center gap-3 mb-4 px-1">
          <h2 className="font-heading font-bold text-[17px]">Estimate Leads</h2>
          <span className="min-w-7 h-7 px-2 rounded-full bg-[#FFF0F2] text-[#FF1A3D] text-[11px] font-bold flex items-center justify-center">{estimateLeads.length}</span>
        </div>
        <div className="space-y-5">
          {estimateLeads.map((lead) => (
            <article key={lead.id} className="bg-white border border-zinc-100 rounded-[1.75rem] p-5 sm:p-7 lg:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.035)]">
              {leadHeader(lead, "Estimate Lead")}

              <div className="mt-6 grid sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
                <LeadField label="Service" value={lead.serviceRequired.replace(/-/g, " ")} />
                <LeadField label="Location" value={lead.location} />
                <LeadField label="Approx. Size" value={lead.approximateArea} />
                <LeadField label="Material Preference" value={lead.materialPreference} />
              </div>

              <div className="mt-5 rounded-2xl bg-zinc-50/80 border border-zinc-100 p-5 sm:p-6">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Message / Requirements</div>
                <div className="text-[13px] text-zinc-700 mt-2.5 leading-6 whitespace-pre-wrap">{lead.message || "—"}</div>
              </div>

              {lead.referenceImageUrl && (
                <div className="mt-5 flex justify-start">
                  <a
                    href={lead.referenceImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-full bg-zinc-900 text-white text-[12px] font-semibold inline-flex items-center gap-2.5 hover:bg-zinc-800 transition shadow-sm"
                  >
                    <ImageIcon className="w-4 h-4" /> View Photo
                  </a>
                </div>
              )}
            </article>
          ))}
          {!estimateLeads.length && (
            <div className="bg-white border border-zinc-100 rounded-[1.75rem] p-8 text-center text-[13px] text-zinc-500">No estimate leads yet.</div>
          )}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-3 mb-4 px-1">
          <h2 className="font-heading font-bold text-[17px]">Website Queries</h2>
          <span className="min-w-7 h-7 px-2 rounded-full bg-zinc-900 text-white text-[11px] font-bold flex items-center justify-center">{websiteQueries.length}</span>
        </div>
        <div className="space-y-5">
          {websiteQueries.map((lead) => (
            <article key={lead.id} className="bg-white border border-zinc-100 rounded-[1.75rem] p-5 sm:p-7 lg:p-8 shadow-[0_12px_36px_rgba(0,0,0,0.035)]">
              {leadHeader(lead, "Website Query")}

              <div className="mt-6 max-w-[420px]">
                <LeadField label="Service" value={lead.serviceRequired.replace(/-/g, " ")} />
              </div>

              <div className="mt-5 rounded-2xl bg-zinc-50/80 border border-zinc-100 p-5 sm:p-6">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.12em]">Message</div>
                <div className="text-[13px] text-zinc-700 mt-2.5 leading-6 whitespace-pre-wrap">{lead.message || "—"}</div>
              </div>
            </article>
          ))}
          {!websiteQueries.length && (
            <div className="bg-white border border-zinc-100 rounded-[1.75rem] p-8 text-center text-[13px] text-zinc-500">No website queries yet.</div>
          )}
        </div>
      </section>
    </>
  );
}

function LeadField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-h-[78px] p-4 rounded-2xl border border-zinc-100 bg-white flex flex-col justify-center">
      <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-400 font-bold">{label}</div>
      <div className="text-[13px] text-zinc-800 mt-1.5 capitalize leading-5">{value || "—"}</div>
    </div>
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
  onRemoveWorkImage,
  uploadingImages,
  busy,
}: AdminPortalProps) {
  const slugify = (value: string | null | undefined) =>
    (value ?? "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

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

            <div className="space-y-4 pt-2">
              <label
                className={`group relative flex flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all ${uploadingImages ? "border-[#FF1A3D]/30 bg-[#FFF0F2]" : "border-zinc-200 bg-[#fcfcfc] hover:border-[#FF1A3D]/40 hover:bg-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]"}`}
              >
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  multiple
                  className="hidden"
                  disabled={uploadingImages || (Array.isArray(workForm.images) ? workForm.images.length : 0) >= maximumWorkImages}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = "";
                    void onUploadImages(files);
                  }}
                />
                <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 shadow-sm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5 text-zinc-700" />
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-semibold text-zinc-900"><span className="text-[#FF1A3D]">Choose file</span> or drag &amp; drop</p>
                  <p className="text-[11px] text-zinc-500 leading-[1.4]">JPG, PNG up to 10MB • Up to {maximumWorkImages} photos<br />Auto converts to WebP (1920×1080)</p>
                </div>
                {uploadingImages ? (
                  <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#FF1A3D] text-white text-[11px] font-medium animate-pulse">Converting and uploading...</div>
                ) : (
                  <div className="mt-3 text-[10px] px-2.5 py-1 rounded-full bg-zinc-900 text-white font-medium">{Array.isArray(workForm.images) ? workForm.images.length : 0} photos added</div>
                )}
              </label>

              <div className="grid grid-cols-3 gap-2.5">
                {Array.from({ length: maximumWorkImages }, (_, index) => {
                  const image = Array.isArray(workForm.images) ? workForm.images[index] : undefined;
                  return image ? (
                    <div key={image.id} className="group relative border border-zinc-200 rounded-xl aspect-square overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow">
                      <img src={image.url} alt={image.altText || workForm.title} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        aria-label="Remove image"
                        disabled={busy || uploadingImages}
                        onClick={() => void onRemoveWorkImage(index)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/80 backdrop-blur text-white text-[14px] leading-none flex items-center justify-center hover:bg-[#FF1A3D] transition-all"
                      >×</button>
                    </div>
                  ) : (
                    <div key={`slot-${index}`} className="border border-dashed border-zinc-200 rounded-xl aspect-square flex flex-col items-center justify-center gap-1 text-zinc-300 bg-zinc-50/50">
                      <ImageIcon className="w-4 h-4" /><span className="text-[9px]">Empty</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <label className="flex items-center gap-2 text-[13px] mt-1">
              <input type="checkbox" checked={workForm.featured} onChange={(event) => setWorkForm((value) => ({ ...value, featured: event.target.checked }))} className="rounded" /> Featured on Home
            </label>
            <div className="flex gap-2">
              <button disabled={busy || uploadingImages} onClick={onSaveWork} className="flex-1 h-10 rounded-full bg-[#FF1A3D] text-white text-[13px] font-semibold disabled:opacity-60">{busy ? "Saving..." : editingWorkId ? "Update Work" : "Save Work"}</button>
              {editingWorkId && <button disabled={busy || uploadingImages} onClick={onCancelWork} className="h-10 px-4 rounded-full border border-zinc-200 text-[13px] disabled:opacity-60">Cancel</button>}
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
            <input type="url" value={reviewForm.instagramLink || ""} onChange={(event) => setReviewForm((value) => ({ ...value, instagramLink: event.target.value }))} placeholder="Instagram Video Link (paste URL)" className="w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
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
          <SettingField label="Phone" type="tel" value={settings.phone} onChange={(phone) => setSettings((value) => ({ ...value, phone }))} />
          <div className="grid sm:grid-cols-2 gap-4">
            <SettingField label="Instagram URL" type="url" value={settings.instagram} onChange={(instagram) => setSettings((value) => ({ ...value, instagram }))} />
            <SettingField label="TikTok URL" type="url" value={settings.tiktok} onChange={(tiktok) => setSettings((value) => ({ ...value, tiktok }))} />
          </div>
          <SettingField label="Address" value={settings.address} onChange={(address) => setSettings((value) => ({ ...value, address }))} />
          <SettingField label="Workshop Note" value={settings.workshopNote} onChange={(workshopNote) => setSettings((value) => ({ ...value, workshopNote }))} />
          <button disabled={busy} onClick={onSaveSettings} className="mt-2 h-11 rounded-full bg-[#FF1A3D] text-white font-semibold text-[13px] disabled:opacity-60">{busy ? "Saving..." : "Save Settings"}</button>
        </div>
      </div>
    </>
  );
}

function SettingField({ label, type = "text", value, onChange }: { label: string; type?: "text" | "tel" | "url"; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-[12px] font-medium text-zinc-700">{label}</label>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full h-10 px-4 rounded-full border border-zinc-200 text-[13px] outline-none focus:border-[#FF1A3D]" />
    </div>
  );
}

export function resetWorkForm(setWorkForm: Dispatch<SetStateAction<WorkForm>>) {
  setWorkForm(emptyWork);
}

