"use client";

import { useEffect, useState } from "react";
import { AdminLogin, AdminPortal } from "./admin";
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
import { PublicFooter, PublicHeader, TopBar } from "./shared";
import type { Page, Review, ReviewForm, SiteSettings, Work, WorkForm } from "./types";

const publicPages: Page[] = ["home", "works", "work-detail", "about"];

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function RupantarSite() {
  const [page, setPage] = useState<Page>("home");
  const [filter, setFilter] = useState("all");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [works, setWorks] = useState<Work[]>(() => readStored("rupantar_works", initialWorks));
  const [reviews, setReviews] = useState<Review[]>(() => readStored("rupantar_reviews", initialReviews));
  const [estimate, setEstimate] = useState(emptyEstimate);
  const [query, setQuery] = useState(emptyQuery);
  const [workForm, setWorkForm] = useState<WorkForm>(emptyWork);
  const [editingWorkId, setEditingWorkId] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState<ReviewForm>(emptyReview);
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);

  useEffect(() => {
    document.title = "Rupantar Homes";
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("rupantar_works", JSON.stringify(works));
    } catch {
      return;
    }
  }, [works]);

  useEffect(() => {
    try {
      window.localStorage.setItem("rupantar_reviews", JSON.stringify(reviews));
    } catch {
      return;
    }
  }, [reviews]);

  const navigate = (nextPage: Page) => {
    setPage(nextPage);
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

  const saveWork = () => {
    if (!workForm.title.trim() || !workForm.slug.trim()) {
      window.alert("Title and Slug required");
      return;
    }

    if (editingWorkId) {
      setWorks((items) =>
        items.map((work) => (work.id === editingWorkId ? { ...work, ...workForm, id: editingWorkId } : work)),
      );
      setEditingWorkId(null);
    } else {
      setWorks((items) => [
        {
          id: `w${Date.now()}`,
          title: workForm.title,
          slug: workForm.slug,
          category: workForm.category,
          location: workForm.location || "Kathmandu",
          shortDesc: workForm.shortDesc || "Custom designed space",
          longDesc: workForm.longDesc || "Detailed project description coming soon. Crafted at Rupantar workshop.",
          featured: workForm.featured,
        },
        ...items,
      ]);
    }
    setWorkForm(emptyWork);
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
    });
    setEditingWorkId(work.id);
    navigate("admin-works");
  };

  const deleteWork = (id: string) => {
    if (!window.confirm("Delete this work?")) return;
    setWorks((items) => items.filter((work) => work.id !== id));
  };

  const cancelWork = () => {
    setEditingWorkId(null);
    setWorkForm(emptyWork);
  };

  const saveReview = () => {
    if (!reviewForm.name.trim()) {
      window.alert("Name required");
      return;
    }
    setReviews((items) => [{ id: `r${Date.now()}`, ...reviewForm }, ...items]);
    setReviewForm(emptyReview);
  };

  const publicPage = publicPages.includes(page);

  if (page === "admin-login") {
    return (
      <AdminLogin
        navigate={navigate}
        onLogin={() => {
          setIsAdmin(true);
          navigate("admin-dashboard");
        }}
      />
    );
  }

  if (page.startsWith("admin-")) {
    return (
      <AdminPortal
        page={page}
        navigate={navigate}
        onLogout={() => {
          setIsAdmin(false);
          navigate("home");
        }}
        works={works}
        workForm={workForm}
        setWorkForm={setWorkForm}
        editingWorkId={editingWorkId}
        onSaveWork={saveWork}
        onEditWork={editWork}
        onDeleteWork={deleteWork}
        onCancelWork={cancelWork}
        reviews={reviews}
        reviewForm={reviewForm}
        setReviewForm={setReviewForm}
        onSaveReview={saveReview}
        onDeleteReview={(id) => setReviews((items) => items.filter((review) => review.id !== id))}
        settings={settings}
        setSettings={setSettings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-['Inter'] antialiased selection:bg-[#FF1A3D] selection:text-white">
      {publicPage && (
        <>
          <TopBar />
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
      {page === "about" && <AboutPage navigate={navigate} />}

      {publicPage && (
        <PublicFooter
          navigate={navigate}
          onCategory={openCategory}
          onEstimate={goToEstimate}
          settings={settings}
        />
      )}
    </div>
  );
}
