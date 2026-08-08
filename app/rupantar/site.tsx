"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminLogin, AdminPortal } from "./admin";
import { deleteCloudinaryImages, uploadWorkImages } from "./cloudinary";
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
import { AboutPage, WorkDetailPage, WorksPage } from "./public-pages";
import {
  deleteReview,
  deleteWork,
  getCurrentAdminSession,
  loadAdminStats,
  loadPublicContent,
  saveReview,
  saveSettings,
  saveWork,
  signInAdmin,
  signOutAdmin,
  submitEstimate,
  submitQuery,
} from "./repository";
import { PublicFooter, PublicHeader, TopBar } from "./shared";
import type { AdminStats, Page, Review, ReviewForm, SiteSettings, Work, WorkForm } from "./types";

const publicPages: Page[] = ["home", "works", "work-detail", "about"];

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function RupantarSite() {
  const [page, setPage] = useState<Page>("home");
  const [filter, setFilter] = useState("all");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [works, setWorks] = useState<Work[]>(initialWorks);
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
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

  const refreshContent = useCallback(async () => {
    const content = await loadPublicContent();
    setWorks(content.works);
    setReviews(content.reviews);
    setSettings(content.settings);
  }, []);

  const refreshAdminStats = useCallback(async () => {
    try {
      setAdminStats(await loadAdminStats());
    } catch (error) {
      console.error("Unable to load admin totals", error);
    }
  }, []);

  useEffect(() => {
    document.title = "Rupantar Homes";
    let active = true;

    // Initial remote hydration is the synchronization this effect is responsible for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshContent().catch((error) => {
      if (active) console.error("Unable to load website content", error);
    });
    void getCurrentAdminSession().then((session) => {
      if (!active || !session) return;
      setIsAdmin(true);
      void refreshAdminStats();
    });

    return () => {
      active = false;
    };
  }, [refreshAdminStats, refreshContent]);

  const navigate = (nextPage: Page) => {
    if (nextPage.startsWith("admin-") && nextPage !== "admin-login" && !isAdmin) {
      setPage("admin-login");
    } else {
      setPage(nextPage);
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
    navigate("works");
  };

  const openWork = (id: string) => {
    setSelectedWorkId(id);
    navigate("work-detail");
  };

  const selectedWork = works.find((work) => work.id === selectedWorkId) || works[0];

  const handleLogin = async (email: string, password: string) => {
    setLoginBusy(true);
    setLoginError("");
    try {
      await signInAdmin(email, password);
      setIsAdmin(true);
      await Promise.all([refreshContent(), refreshAdminStats()]);
      setPage("admin-dashboard");
      window.scrollTo({ top: 0 });
    } catch (error) {
      setLoginError(messageFrom(error));
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOutAdmin();
    setIsAdmin(false);
    setPage("home");
  };

  const handleSaveWork = async () => {
    if (!workForm.title.trim() || !workForm.slug.trim()) {
      window.alert("Title and Slug required");
      return;
    }

    setAdminBusy(true);
    try {
      const previous = editingWorkId ? works.find((work) => work.id === editingWorkId) : undefined;
      await saveWork(workForm, editingWorkId);
      const retained = new Set(workForm.images.map((image) => image.publicId));
      const removed = previous?.images.filter((image) => !retained.has(image.publicId)).map((image) => image.publicId) ?? [];
      if (removed.length) await deleteCloudinaryImages(removed);
      setEditingWorkId(null);
      setWorkForm(emptyWork);
      await refreshContent();
    } catch (error) {
      window.alert(messageFrom(error));
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
    const work = works.find((item) => item.id === id);
    setAdminBusy(true);
    try {
      await deleteCloudinaryImages(work?.images.map((image) => image.publicId) ?? []);
      await deleteWork(id);
      await refreshContent();
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setAdminBusy(false);
    }
  };

  const cancelWork = () => {
    setEditingWorkId(null);
    setWorkForm(emptyWork);
  };

  const handleUploadImages = async (files: File[]) => {
    if (!files.length) return;
    setUploadingImages(true);
    try {
      const uploaded = await uploadWorkImages(files);
      setWorkForm((current) => ({
        ...current,
        images: [...current.images, ...uploaded].map((image, index) => ({ ...image, sortOrder: index })),
      }));
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSaveReview = async () => {
    if (!reviewForm.name.trim() || !reviewForm.message.trim()) {
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
    if (!estimate.name.trim() || !estimate.phone.trim()) {
      window.alert("Name and phone required");
      return;
    }
    setEstimateBusy(true);
    try {
      await submitEstimate(estimate);
      setEstimate(emptyEstimate);
      window.alert("Estimate request sent successfully.");
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      setEstimateBusy(false);
    }
  };

  const handleQuery = async () => {
    if (!query.name.trim() || !query.phone.trim()) {
      window.alert("Name and phone required");
      return;
    }
    setQueryBusy(true);
    try {
      await submitQuery(query);
      setQuery(emptyQuery);
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
      <AdminLogin
        navigate={navigate}
        onLogin={handleLogin}
        error={loginError}
        busy={loginBusy}
      />
    );
  }

  if (page.startsWith("admin-")) {
    if (!isAdmin) {
      return <AdminLogin navigate={navigate} onLogin={handleLogin} error={loginError} busy={loginBusy} />;
    }
    return (
      <AdminPortal
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
        uploadingImages={uploadingImages}
        reviews={reviews}
        reviewForm={reviewForm}
        setReviewForm={setReviewForm}
        onSaveReview={handleSaveReview}
        onDeleteReview={handleDeleteReview}
        settings={settings}
        setSettings={setSettings}
        onSaveSettings={handleSaveSettings}
        adminStats={adminStats}
        busy={adminBusy}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-['Inter'] antialiased selection:bg-[#FF1A3D] selection:text-white">
      {publicPage && (
        <>
          <TopBar settings={settings} />
          <PublicHeader page={page} navigate={navigate} onEstimate={goToEstimate} isAdmin={isAdmin} />
        </>
      )}

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
      {page === "works" && (
        <WorksPage works={works} filter={filter} setFilter={setFilter} navigate={navigate} onWork={openWork} />
      )}
      {page === "work-detail" && selectedWork && (
        <WorkDetailPage
          work={selectedWork}
          works={works}
          navigate={navigate}
          onWork={openWork}
          onEstimate={goToEstimate}
        />
      )}
      {page === "about" && <AboutPage navigate={navigate} settings={settings} />}

      {publicPage && (
        <PublicFooter navigate={navigate} onCategory={openCategory} onEstimate={goToEstimate} settings={settings} />
      )}
    </div>
  );
}
