"use client";

import { CheckCircle2, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { deleteCloudinaryImages, maximumWorkImages, uploadWorkImages } from "./cloudinary";
import {
  emptyEstimate,
  emptyQuery,
  emptyReview,
  emptyWork,
  initialReviews,
  initialSettings,
  initialWorks,
} from "./data";
import { HomePage } from "./home-page";
import {
  deleteReview,
  deleteWork,
  getCurrentAdminSession,
  loadAdminStats,
  loadLeads,
  loadPublicContent,
  loadPublicWorksPage,
  saveReview,
  saveSettings,
  saveWork,
  signInAdmin,
  signOutAdmin,
  submitEstimate,
  submitQuery,
  updateLeadStatus,
} from "./repository";
import { PublicFooter, PublicHeader, TopBar } from "./shared";
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

const AdminLogin = lazy(() => import("./admin").then((module) => ({ default: module.AdminLogin })));
const AdminPortal = lazy(() => import("./admin").then((module) => ({ default: module.AdminPortal })));
const AboutPage = lazy(() => import("./public-pages").then((module) => ({ default: module.AboutPage })));
const WorkDetailPage = lazy(() => import("./public-pages").then((module) => ({ default: module.WorkDetailPage })));
const WorksPage = lazy(() => import("./public-pages").then((module) => ({ default: module.WorksPage })));

function PageLoader() {
  return <div className="min-h-[40vh]" aria-busy="true" aria-label="Loading page" />;
}

const publicPages: Page[] = ["home", "works", "work-detail", "about"];

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function RupantarSite() {
  const [page, setPage] = useState<Page>("home");
  const [filter, setFilter] = useState("all");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [works, setWorks] = useState<Work[]>(initialWorks);
  const [worksTotal, setWorksTotal] = useState(initialWorks.length);
  const [worksLoading, setWorksLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [estimate, setEstimate] = useState(emptyEstimate);
  const [query, setQuery] = useState(emptyQuery);
  const [workForm, setWorkForm] = useState<WorkForm>(emptyWork);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReview);
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [adminStats, setAdminStats] = useState<AdminStats>({ queries: 0, estimates: 0 });
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [estimateBusy, setEstimateBusy] = useState(false);
  const [queryBusy, setQueryBusy] = useState(false);
  const [estimateSaved, setEstimateSaved] = useState(false);

  const refreshContent = useCallback(async () => {
    const content = await loadPublicContent();
    setWorks(content.works);
    setReviews(content.reviews);
    setSettings(content.settings);
  }, []);

  const loadWorks = async (category: string, offset: number) => {
    setWorksLoading(true);
    try {
      const result = await loadPublicWorksPage(offset, 12, category);
      setWorksTotal(result.total);
      setWorks((current) => offset === 0 ? result.works : [...current, ...result.works]);
    } finally {
      setWorksLoading(false);
    }
  };

  const refreshAdminStats = useCallback(async () => {
    try {
      setAdminStats(await loadAdminStats());
    } catch (error) {
      console.error("Unable to load admin totals", error);
    }
  }, []);

  const refreshLeads = useCallback(async () => {
    try {
      setLeads(await loadLeads());
    } catch (error) {
      console.error("Unable to load leads", error);
    }
  }, []);

  useEffect(() => {
    document.title = "Rupantar Homes";
    let active = true;

    void refreshContent().catch((error) => {
      if (active) console.error("Unable to load website content", error);
    });
    void getCurrentAdminSession().then((session) => {
      if (!active || !session) return;
      setIsAdmin(true);
      void Promise.all([refreshAdminStats(), refreshLeads()]);
    });

    return () => {
      active = false;
    };
  }, [refreshAdminStats, refreshContent, refreshLeads]);

  const navigate = (nextPage: Page) => {
    if (nextPage.startsWith("admin-") && nextPage !== "admin-login" && !isAdmin) {
      setPage("admin-login");
    } else {
      setPage(nextPage);
      if (nextPage.startsWith("admin-") && nextPage !== "admin-login") {
        void refreshContent().catch((error) => console.error("Unable to refresh admin content", error));
        void refreshLeads();
        if (nextPage === "admin-dashboard") void refreshAdminStats();
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToEstimate = () => {
    if (page !== "home") {
      setPage("home");
      window.setTimeout(
        () => document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        150,
      );
      return;
    }
    document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openCategory = (category: string) => {
    setFilter(category);
    setPage("works");
    void loadWorks(category, 0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openWork = (id: string) => {
    setSelectedWorkId(id);
    navigate("work-detail");
  };

  const selectedWork = works.find((work) => work.id === selectedWorkId) || works[0];

  const persistedDraftImageIds = () =>
    new Set(
      (editingWorkId ? works.find((work) => work.id === editingWorkId)?.images ?? [] : []).map(
        (image) => image.publicId,
      ),
    );

  const draftImagePublicIds = () => {
    const persisted = persistedDraftImageIds();
    return (Array.isArray(workForm.images) ? workForm.images : [])
      .map((image) => image.publicId)
      .filter((publicId) => publicId && !persisted.has(publicId));
  };

  const handleLogin = async (email: string, password: string) => {
    setLoginBusy(true);
    setLoginError("");
    try {
      await signInAdmin(email, password);
      setIsAdmin(true);
      await Promise.all([refreshContent(), refreshAdminStats(), refreshLeads()]);
      setPage("admin-dashboard");
      window.scrollTo({ top: 0 });
    } catch (error) {
      setLoginError(messageFrom(error));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    setAdminBusy(true);
    try {
      await deleteCloudinaryImages(draftImagePublicIds());
      await signOutAdmin();
      setEditingWorkId(null);
      setWorkForm(emptyWork);
      setIsAdmin(false);
      setLeads([]);
      setAdminStats({ queries: 0, estimates: 0 });
      setPage("home");
    } catch (error) {
      window.alert(`Logout stopped: ${messageFrom(error)}`);
    } finally {
      setAdminBusy(false);
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: LeadStatus) => {
    setAdminBusy(true);
    try {
      await updateLeadStatus(id, status);
      await refreshLeads();
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleSaveWork = async () => {
    const title = trimmed(workForm.title);
    const slug = trimmed(workForm.slug);
    if (!title || !slug) {
      window.alert("Title and Slug required");
      return;
    }

    const previous = editingWorkId ? works.find((work) => work.id === editingWorkId) : undefined;
    const newlyUploaded = draftImagePublicIds();
    const retained = new Set((Array.isArray(workForm.images) ? workForm.images : []).map((image) => image.publicId));
    const removed = previous?.images.filter((image) => !retained.has(image.publicId)).map((image) => image.publicId) ?? [];

    setAdminBusy(true);
    try {
      try {
        await saveWork(workForm, editingWorkId);
      } catch (saveError) {
        try {
          await deleteCloudinaryImages(newlyUploaded);
          const cleaned = new Set(newlyUploaded);
          setWorkForm((current) => ({
            ...current,
            images: (Array.isArray(current.images) ? current.images : [])
              .filter((image) => !cleaned.has(image.publicId))
              .map((image, sortOrder) => ({ ...image, sortOrder })),
          }));
        } catch (cleanupError) {
          console.error("Unable to clean up images after a failed work save", cleanupError);
          window.alert(`${messageFrom(saveError)} The new images could not be cleaned up automatically; keep this form open and try saving again.`);
          return;
        }
        window.alert(messageFrom(saveError));
        return;
      }

      setEditingWorkId(null);
      setWorkForm(emptyWork);
      try {
        await refreshContent();
      } catch (refreshError) {
        console.error("Work saved but content refresh failed", refreshError);
        window.alert("The work was saved, but the page could not refresh. Reload the page to see the latest content.");
      }
      try {
        await deleteCloudinaryImages(removed);
      } catch (cleanupError) {
        console.error("Work saved but removed Cloudinary images could not be cleaned up", cleanupError);
        window.alert("The work was saved, but one or more removed images still need Cloudinary cleanup.");
      }
    } finally {
      setAdminBusy(false);
    }
  };

  const editWork = (work: Work) => {
    setWorkForm({
      title: work.title,
      slug: work.slug,
      category: work.category,
      location: work.location,
      shortDesc: work.shortDesc,
      longDesc: work.longDesc,
      featured: work.featured,
      images: work.images,
    });
    setEditingWorkId(work.id);
    navigate("admin-works");
  };

  const handleDeleteWork = async (id: string) => {
    if (!window.confirm("Delete this work?")) return;
    setAdminBusy(true);
    try {
      let deletedImagePublicIds: string[];
      try {
        deletedImagePublicIds = await deleteWork(id);
      } catch (deleteError) {
        window.alert(messageFrom(deleteError));
        return;
      }
      try {
        await refreshContent();
      } catch (refreshError) {
        console.error("Work deleted but content refresh failed", refreshError);
        window.alert("The work was deleted, but the page could not refresh. Reload the page to update the list.");
      }
      try {
        await deleteCloudinaryImages(deletedImagePublicIds);
      } catch (cleanupError) {
        console.error("Work deleted but Cloudinary cleanup failed", cleanupError);
        window.alert("The work was deleted from the website, but one or more images still need Cloudinary cleanup.");
      }
    } finally {
      setAdminBusy(false);
    }
  };

  const cancelWork = async () => {
    setAdminBusy(true);
    try {
      await deleteCloudinaryImages(draftImagePublicIds());
      setEditingWorkId(null);
      setWorkForm(emptyWork);
    } catch (error) {
      window.alert(`Cancel stopped: ${messageFrom(error)}`);
    } finally {
      setAdminBusy(false);
    }
  };

  const handleUploadImages = async (files: File[]) => {
    if (!files.length) return;
    const currentImageCount = Array.isArray(workForm.images) ? workForm.images.length : 0;
    const remainingImageSlots = maximumWorkImages - currentImageCount;
    if (remainingImageSlots <= 0) {
      window.alert(`A work can include up to ${maximumWorkImages} images.`);
      return;
    }
    if (files.length > remainingImageSlots) {
      window.alert(`You can add ${remainingImageSlots} more image${remainingImageSlots === 1 ? "" : "s"} to this work.`);
      return;
    }
    setUploadingImages(true);
    try {
      const uploaded = await uploadWorkImages(files);
      setWorkForm((current) => ({
        ...current,
        images: [...(Array.isArray(current.images) ? current.images : []), ...uploaded].map((image, index) => ({ ...image, sortOrder: index })),
      }));
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveWorkImage = async (index: number) => {
    const images = Array.isArray(workForm.images) ? workForm.images : [];
    const image = images[index];
    if (!image) return;

    const persisted = persistedDraftImageIds().has(image.publicId);
    setUploadingImages(true);
    try {
      if (!persisted) await deleteCloudinaryImages([image.publicId]);
      setWorkForm((current) => ({
        ...current,
        images: (Array.isArray(current.images) ? current.images : [])
          .filter((candidate) => candidate.publicId !== image.publicId)
          .map((candidate, sortOrder) => ({ ...candidate, sortOrder })),
      }));
    } catch (error) {
      window.alert(`Image removal stopped: ${messageFrom(error)}`);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSaveReview = async () => {
    if (!trimmed(reviewForm.name) || !trimmed(reviewForm.message)) {
      window.alert("Name and message required");
      return;
    }
    setAdminBusy(true);
    try {
      await saveReview(reviewForm);
      setReviewForm(emptyReview);
      await refreshContent();
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("Delete this review?")) return;
    setAdminBusy(true);
    try {
      await deleteReview(id);
      await refreshContent();
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleSaveSettings = async () => {
    setAdminBusy(true);
    try {
      await saveSettings(settings);
      await refreshContent();
      window.alert("Settings saved.");
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const handleEstimate = async () => {
    setEstimateBusy(true);
    try {
      await submitEstimate(estimate);
      setEstimate(emptyEstimate);
      setEstimateSaved(true);
      if (isAdmin) await Promise.all([refreshAdminStats(), refreshLeads()]);
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setEstimateBusy(false);
    }
  };

  const handleQuery = async () => {
    setQueryBusy(true);
    try {
      await submitQuery(query);
      setQuery(emptyQuery);
      if (isAdmin) await Promise.all([refreshAdminStats(), refreshLeads()]);
      window.alert("Query sent successfully.");
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setQueryBusy(false);
    }
  };

  const publicPage = publicPages.includes(page);

  if (page === "admin-login") {
    return (
      <Suspense fallback={<PageLoader />}><AdminLogin navigate={navigate} onLogin={handleLogin} error={loginError} busy={loginBusy} /></Suspense>
    );
  }

  if (page.startsWith("admin-")) {
    if (!isAdmin) {
      return <Suspense fallback={<PageLoader />}><AdminLogin navigate={navigate} onLogin={handleLogin} error={loginError} busy={loginBusy} /></Suspense>;
    }
    return (
      <Suspense fallback={<PageLoader />}><AdminPortal
        page={page}
        navigate={navigate}
        onLogout={handleLogout}
        works={works}
        workForm={workForm}
        setWorkForm={setWorkForm}
        editingWorkId={editingWorkId}
        onSaveWork={handleSaveWork}
        onEditWork={editWork}
        onDeleteWork={handleDeleteWork}
        onCancelWork={cancelWork}
        onUploadImages={handleUploadImages}
        onRemoveWorkImage={handleRemoveWorkImage}
        uploadingImages={uploadingImages}
        leads={leads}
        onUpdateLeadStatus={handleUpdateLeadStatus}
        reviewForm={reviewForm}
        setReviewForm={setReviewForm}
        reviews={reviews}
        onSaveReview={handleSaveReview}
        onDeleteReview={handleDeleteReview}
        settings={settings}
        setSettings={setSettings}
        onSaveSettings={handleSaveSettings}
        adminStats={adminStats}
        busy={adminBusy}
      /></Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-950">
      {publicPage && <TopBar settings={settings} />}
      {publicPage && <PublicHeader page={page} navigate={navigate} onCategory={openCategory} onEstimate={goToEstimate} />}

      {page === "home" && (
        <HomePage
          works={works}
          reviews={reviews}
          settings={settings}
          estimate={estimate}
          setEstimate={setEstimate}
          query={query}
          setQuery={setQuery}
          navigate={navigate}
          onEstimate={goToEstimate}
          onCategory={openCategory}
          onWork={openWork}
          onSubmitEstimate={handleEstimate}
          onSubmitQuery={handleQuery}
          estimateBusy={estimateBusy}
          queryBusy={queryBusy}
        />
      )}
      {page === "works" && <Suspense fallback={<PageLoader />}><WorksPage works={works} total={worksTotal} loading={worksLoading} filter={filter} setFilter={(next) => { setFilter(next); void loadWorks(next, 0); }} onLoadMore={() => void loadWorks(filter, works.length)} navigate={navigate} onWork={openWork} /></Suspense>}
      {page === "work-detail" && selectedWork && (
        <Suspense fallback={<PageLoader />}><WorkDetailPage
          work={selectedWork}
          works={works}
          navigate={navigate}
          onWork={openWork}
          onEstimate={goToEstimate}
        /></Suspense>
      )}
      {page === "about" && <Suspense fallback={<PageLoader />}><AboutPage navigate={navigate} settings={settings} /></Suspense>}

      {publicPage && <PublicFooter navigate={navigate} onCategory={openCategory} onEstimate={goToEstimate} settings={settings} />}

      {estimateSaved && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true" aria-label="Estimate request sent">
          <div className="relative w-full max-w-[420px] rounded-[2rem] bg-white p-8 text-center shadow-[0_24px_70px_rgba(0,0,0,0.2)]">
            <button
              type="button"
              onClick={() => setEstimateSaved(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-500 hover:text-zinc-900"
              aria-label="Close success message"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="mt-5 font-heading text-[24px] font-bold">Request Received</h3>
            <p className="mt-2 text-[13px] leading-6 text-zinc-600">
              Thank you. Your estimate request was sent successfully. Rupantar Homes will contact you soon.
            </p>
            <button
              type="button"
              onClick={() => setEstimateSaved(false)}
              className="mt-6 h-11 w-full rounded-full bg-[#FF1A3D] text-[14px] font-semibold text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

