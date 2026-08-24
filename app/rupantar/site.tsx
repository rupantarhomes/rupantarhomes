"use client";

import { CheckCircle2, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { emptyBlogForm, type Blog, type BlogForm } from "./blog";
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
  deleteBlog,
  deleteReview,
  deleteWork,
  getCurrentAdminSession,
  loadAdminStats,
  loadPublicBlogBySlug,
  loadPublicBlogs,
  loadLeads,
  loadPublicContent,
  loadPublicWorksPage,
  loadPublicWorkBySlug,
  saveBlog,
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
import { blogArticlePath, categoryPath, pagePath, parseRoute, workPath } from "./routes";
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
const ContactPage = lazy(() => import("./public-pages").then((module) => ({ default: module.ContactPage })));
const PrivacyPage = lazy(() => import("./public-pages").then((module) => ({ default: module.PrivacyPage })));
const InteriorDesignPage = lazy(() => import("./public-pages").then((module) => ({ default: module.InteriorDesignPage })));
const WorkDetailPage = lazy(() => import("./public-pages").then((module) => ({ default: module.WorkDetailPage })));
const WorksPage = lazy(() => import("./public-pages").then((module) => ({ default: module.WorksPage })));
const BlogIndexPage = lazy(() => import("./blog-pages").then((module) => ({ default: module.BlogIndexPage })));
const BlogArticlePage = lazy(() => import("./blog-pages").then((module) => ({ default: module.BlogArticlePage })));

function PageLoader() {
  return <div className="min-h-[40vh]" aria-busy="true" aria-label="Loading page" />;
}

const publicPages: Page[] = ["home", "works", "work-detail", "about", "contact", "privacy", "interior-design", "blog", "blog-detail"];

type BrowserRoute = ReturnType<typeof parseRoute>;

function pageForRoute(route: BrowserRoute): Page {
  if (route.kind === "about") return "about";
  if (route.kind === "contact") return "contact";
  if (route.kind === "privacy") return "privacy";
  if (route.kind === "blog") return "blog";
  if (route.kind === "blog-detail") return "blog-detail";
  if (route.kind === "admin") return "admin-login";
  if (route.kind === "interior-design") return "interior-design";
  if (route.kind === "works") return "works";
  if (route.kind === "work-detail") return "work-detail";
  return "home";
}

function initialBrowserRoute(): BrowserRoute {
  return typeof window === "undefined" ? { kind: "home" } : parseRoute(window.location.pathname);
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function RupantarSite() {
  const initialRoute = initialBrowserRoute();
  const initialRouteUsesWorks = initialRoute.kind === "works" || initialRoute.kind === "work-detail";
  const initialWorksState = initialRouteUsesWorks ? [] : initialWorks;
  const [page, setPage] = useState<Page>(() => pageForRoute(initialRoute));
  const [filter, setFilter] = useState(() => initialRoute.kind === "works" || initialRoute.kind === "work-detail" ? initialRoute.category : "all");
  const [selectedWorkId, setSelectedWorkId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [works, setWorks] = useState<Work[]>(initialWorksState);
  const [worksTotal, setWorksTotal] = useState(initialRouteUsesWorks ? 0 : initialWorks.length);
  const [worksLoading, setWorksLoading] = useState(initialRoute.kind === "works");
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const [selectedBlogId, setSelectedBlogId] = useState<string | null>(null);
  const [blogForm, setBlogForm] = useState<BlogForm>(emptyBlogForm);
  const [editingBlogId, setEditingBlogId] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsHasMore, setLeadsHasMore] = useState(false);
  const [leadsNextBefore, setLeadsNextBefore] = useState("");
  const [leadsLoadingOlder, setLeadsLoadingOlder] = useState(false);
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

  const homeWorksRef = useRef<Work[]>(initialWorks);
  const worksRef = useRef(works);
  const worksLoadedRef = useRef(false);
  const worksRequestIdRef = useRef(0);
  const blogsRef = useRef(blogs);
  const blogsLoadedRef = useRef(false);
  const blogsRequestIdRef = useRef(0);
  const routeRequestIdRef = useRef(0);

  useEffect(() => {
    worksRef.current = works;
  }, [works]);

  useEffect(() => {
    blogsRef.current = blogs;
  }, [blogs]);

  useEffect(() => {
    if (!estimateSaved) return;
    const timer = window.setTimeout(() => setEstimateSaved(false), 5000);
    return () => window.clearTimeout(timer);
  }, [estimateSaved]);

  useEffect(() => {
    if (parseRoute(window.location.pathname).kind === "admin") return;

    const idleWindow = window as typeof window & {
      requestIdleCallback?: (callback: () => void) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const prefetchPublicPages = () => {
      void import("./public-pages");
      void import("./blog-pages");
    };

    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(prefetchPublicPages);
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(prefetchPublicPages, 150);
    return () => window.clearTimeout(timer);
  }, []);

  const restoreHomeWorks = () => {
    worksRequestIdRef.current += 1;
    const homeWorks = homeWorksRef.current;
    worksRef.current = homeWorks;
    worksLoadedRef.current = true;
    setWorks(homeWorks);
    setWorksTotal(homeWorks.length);
    setWorksLoading(false);
  };

  const refreshContent = useCallback(async () => {
    const content = await loadPublicContent();
    setReviews(content.reviews);
    setSettings(content.settings);
    homeWorksRef.current = content.works;

    const route = parseRoute(window.location.pathname);
    if (route.kind !== "home" && route.kind !== "admin") return;

    worksRequestIdRef.current += 1;
    worksRef.current = content.works;
    worksLoadedRef.current = true;
    setWorks(content.works);
    setWorksTotal(content.works.length);
    setWorksLoading(false);
  }, []);

  const refreshBlogs = useCallback(async () => {
    const requestId = ++blogsRequestIdRef.current;
    setBlogsLoading(true);
    try {
      const nextBlogs = await loadPublicBlogs();
      if (requestId !== blogsRequestIdRef.current) return;
      blogsRef.current = nextBlogs;
      blogsLoadedRef.current = true;
      setBlogs(nextBlogs);
      setBlogsLoaded(true);
    } finally {
      if (requestId === blogsRequestIdRef.current) setBlogsLoading(false);
    }
  }, []);

  const loadWorks = useCallback(async (category: string, offset: number, clearCurrent = false) => {
    const requestId = ++worksRequestIdRef.current;
    if (clearCurrent) {
      worksRef.current = [];
      setWorks([]);
      setWorksTotal(0);
    }
    setWorksLoading(true);
    try {
      const result = await loadPublicWorksPage(offset, 12, category);
      if (requestId !== worksRequestIdRef.current) return;
      const nextWorks = offset === 0 ? result.works : [...worksRef.current, ...result.works];
      worksRef.current = nextWorks;
      worksLoadedRef.current = true;
      setWorksTotal(result.total);
      setWorks(nextWorks);
    } finally {
      if (requestId === worksRequestIdRef.current) setWorksLoading(false);
    }
  }, []);

  const applyBrowserRoute = useCallback(async () => {
    const routeRequestId = ++routeRequestIdRef.current;
    const isCurrentRoute = () => routeRequestId === routeRequestIdRef.current;
    const route = parseRoute(window.location.pathname);

    if (route.kind === "home") {
      restoreHomeWorks();
      setPage("home");
      return;
    }
    if (route.kind === "about") {
      setPage("about");
      return;
    }
    if (route.kind === "contact") {
      setPage("contact");
      return;
    }
    if (route.kind === "privacy") {
      setPage("privacy");
      return;
    }
    if (route.kind === "blog") {
      setPage("blog");
      setSelectedBlogId(null);
      if (!blogsLoadedRef.current) await refreshBlogs();
      return;
    }
    if (route.kind === "blog-detail") {
      setPage("blog-detail");
      const cachedBlog = blogsRef.current.find((item) => item.slug === route.slug);
      if (cachedBlog) {
        setSelectedBlogId(cachedBlog.id);
        return;
      }
      const blog = await loadPublicBlogBySlug(route.slug);
      if (!isCurrentRoute()) return;
      if (!blog) {
        setSelectedBlogId(null);
        setPage("blog");
        if (!blogsLoadedRef.current) await refreshBlogs();
        return;
      }
      const nextBlogs = [blog, ...blogsRef.current.filter((item) => item.id !== blog.id)];
      blogsRef.current = nextBlogs;
      setBlogs(nextBlogs);
      setSelectedBlogId(blog.id);
      return;
    }
    if (route.kind === "admin") {
      setPage("admin-login");
      return;
    }
    if (route.kind === "interior-design") {
      setPage("interior-design");
      return;
    }
    if (route.kind === "works") {
      setFilter(route.category);
      setPage("works");
      await loadWorks(route.category, 0, true);
      return;
    }

    setFilter(route.category);
    setPage("work-detail");
    const cachedWork = worksLoadedRef.current
      ? worksRef.current.find((item) => item.category === route.category && item.slug === route.slug)
      : undefined;
    if (cachedWork) {
      setSelectedWorkId(cachedWork.id);
      return;
    }

    const work = await loadPublicWorkBySlug(route.category, route.slug);
    if (!isCurrentRoute()) return;
    if (!work) {
      setSelectedWorkId(null);
      setPage("works");
      await loadWorks(route.category, 0, true);
      return;
    }
    const nextWorks = [work, ...worksRef.current.filter((item) => item.id !== work.id)];
    worksRef.current = nextWorks;
    worksLoadedRef.current = true;
    setWorks(nextWorks);
    setSelectedWorkId(work.id);
  }, [loadWorks, refreshBlogs]);

  const refreshAdminStats = useCallback(async () => {
    try {
      setAdminStats(await loadAdminStats());
    } catch (error) {
      console.error("Unable to load admin totals", error);
    }
  }, []);

  const refreshLeads = useCallback(async () => {
    try {
      const result = await loadLeads();
      setLeads(result.leads);
      setLeadsHasMore(result.hasMore);
      setLeadsNextBefore(result.nextBefore);
    } catch (error) {
      console.error("Unable to load leads", error);
    }
  }, []);

  const loadOlderLeads = async () => {
    if (!leadsHasMore || !leadsNextBefore || leadsLoadingOlder) return;
    setLeadsLoadingOlder(true);
    try {
      const result = await loadLeads(leadsNextBefore);
      setLeads((current) => [...current, ...result.leads.filter((lead) => !current.some((item) => item.id === lead.id))]);
      setLeadsHasMore(result.hasMore);
      setLeadsNextBefore(result.nextBefore);
    } catch (error) {
      console.error("Unable to load older leads", error);
    } finally {
      setLeadsLoadingOlder(false);
    }
  };

  useEffect(() => {
    document.title = "Rupantar Homes";
    let active = true;
    const startupRoute = parseRoute(window.location.pathname);

    void applyBrowserRoute().catch((error) => {
      if (active) console.error("Unable to apply website route", error);
    });

    if (startupRoute.kind === "home") {
      void refreshContent().catch((error) => {
        if (active) console.error("Unable to load website content", error);
      });
    } else if (startupRoute.kind !== "admin") {
      void loadPublicContent()
        .then((content) => {
          if (!active) return;
          setReviews(content.reviews);
          setSettings(content.settings);
          homeWorksRef.current = content.works;
          if (parseRoute(window.location.pathname).kind === "home") {
            worksRequestIdRef.current += 1;
            worksRef.current = content.works;
            worksLoadedRef.current = true;
            setWorks(content.works);
            setWorksTotal(content.works.length);
            setWorksLoading(false);
          }
        })
        .catch((error) => {
          if (active) console.error("Unable to load website shell content", error);
        });
    }

    void getCurrentAdminSession().then((session) => {
      if (!active || !session) return;
      setIsAdmin(true);
      if (parseRoute(window.location.pathname).kind === "admin") setPage("admin-dashboard");
      void Promise.all([refreshAdminStats(), refreshLeads(), refreshBlogs()]);
    });

    const onPopState = () => void applyBrowserRoute().catch((error) => console.error("Unable to apply browser route", error));
    window.addEventListener("popstate", onPopState);
    return () => {
      active = false;
      window.removeEventListener("popstate", onPopState);
    };
  }, [applyBrowserRoute, refreshAdminStats, refreshBlogs, refreshContent, refreshLeads]);

  const pushPath = (path: string) => {
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
  };

  const navigate = (nextPage: Page) => {
    routeRequestIdRef.current += 1;
    if (nextPage.startsWith("admin-")) pushPath("/admin");
    else pushPath(pagePath(nextPage));

    if (nextPage.startsWith("admin-") && nextPage !== "admin-login" && !isAdmin) {
      setPage("admin-login");
    } else {
      if (nextPage === "home") restoreHomeWorks();
      setPage(nextPage);
      if (nextPage === "blog") {
        setSelectedBlogId(null);
        if (!blogsLoadedRef.current) void refreshBlogs().catch((error) => console.error("Unable to load blog", error));
      }
      if (nextPage === "works") {
        const categoryChanged = filter !== "all";
        setFilter("all");
        void loadWorks("all", 0, categoryChanged);
      }
      if (nextPage.startsWith("admin-") && nextPage !== "admin-login") {
        void refreshContent().catch((error) => console.error("Unable to refresh admin content", error));
        void refreshLeads();
        void refreshBlogs();
        if (nextPage === "admin-dashboard") void refreshAdminStats();
      }
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToEstimate = () => {
    routeRequestIdRef.current += 1;
    if (page !== "home") {
      pushPath("/");
      restoreHomeWorks();
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
    routeRequestIdRef.current += 1;
    pushPath(categoryPath(category));
    const categoryChanged = category !== filter;
    setFilter(category);
    setPage("works");
    void loadWorks(category, 0, categoryChanged);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openBlog = (id: string) => {
    const blog = blogsRef.current.find((item) => item.id === id);
    if (!blog) return;
    routeRequestIdRef.current += 1;
    pushPath(blogArticlePath(blog.slug));
    setSelectedBlogId(id);
    setPage("blog-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openWork = (id: string) => {
    const work = worksRef.current.find((item) => item.id === id);
    if (!work) return;
    routeRequestIdRef.current += 1;
    pushPath(workPath(work));
    setSelectedWorkId(id);
    setPage("work-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const selectedWork = works.find((work) => work.id === selectedWorkId);
  const selectedBlog = blogs.find((blog) => blog.id === selectedBlogId);

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
      await Promise.all([refreshContent(), refreshAdminStats(), refreshLeads(), refreshBlogs()]);
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
      pushPath("/");
      restoreHomeWorks();
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

  const handleSaveBlog = async () => { if (!trimmed(blogForm.title) || !trimmed(blogForm.body)) { window.alert("Title and body are required."); return; } setAdminBusy(true); try { await saveBlog(blogForm, editingBlogId); setBlogForm(emptyBlogForm); setEditingBlogId(null); await refreshBlogs(); } catch (error) { window.alert(messageFrom(error)); } finally { setAdminBusy(false); } };
  const editBlog = (blog: Blog) => { setEditingBlogId(blog.id); setBlogForm({ title: blog.title, category: blog.category, body: blog.body }); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const cancelBlog = () => { setEditingBlogId(null); setBlogForm(emptyBlogForm); };
  const handleDeleteBlog = async (id: string) => { if (!window.confirm("Delete this article?")) return; setAdminBusy(true); try { await deleteBlog(id); if (editingBlogId === id) cancelBlog(); await refreshBlogs(); } catch (error) { window.alert(messageFrom(error)); } finally { setAdminBusy(false); } };

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
      setEstimateSaved(true);
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
        blogs={blogs}
        blogForm={blogForm}
        setBlogForm={setBlogForm}
        editingBlogId={editingBlogId}
        onSaveBlog={handleSaveBlog}
        onEditBlog={editBlog}
        onDeleteBlog={handleDeleteBlog}
        onCancelBlog={cancelBlog}
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
        leadsHasMore={leadsHasMore}
        leadsLoadingOlder={leadsLoadingOlder}
        onLoadOlderLeads={loadOlderLeads}
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
      {page === "blog" && <Suspense fallback={<PageLoader />}><BlogIndexPage blogs={blogs} loading={!blogsLoaded || blogsLoading} navigate={navigate} onBlog={openBlog} /></Suspense>}
      {page === "blog-detail" && (selectedBlog ? <Suspense fallback={<PageLoader />}><BlogArticlePage blog={selectedBlog} navigate={navigate} /></Suspense> : <PageLoader />)}
      {page === "works" && <Suspense fallback={<PageLoader />}><WorksPage works={works} total={worksTotal} loading={worksLoading} filter={filter} setFilter={openCategory} onLoadMore={() => void loadWorks(filter, works.length)} navigate={navigate} onWork={openWork} /></Suspense>}
      {page === "work-detail" && (selectedWork ? (
        <Suspense fallback={<PageLoader />}><WorkDetailPage
          work={selectedWork}
          works={works}
          navigate={navigate}
          onWork={openWork}
          onEstimate={goToEstimate}
        /></Suspense>
      ) : <PageLoader />)}
      {page === "about" && <Suspense fallback={<PageLoader />}><AboutPage navigate={navigate} settings={settings} /></Suspense>}
      {page === "contact" && <Suspense fallback={<PageLoader />}><ContactPage navigate={navigate} /></Suspense>}
      {page === "privacy" && <Suspense fallback={<PageLoader />}><PrivacyPage navigate={navigate} /></Suspense>}
      {page === "interior-design" && <Suspense fallback={<PageLoader />}><InteriorDesignPage navigate={navigate} onCategory={openCategory} /></Suspense>}

      {publicPage && <PublicFooter navigate={navigate} onCategory={openCategory} onEstimate={goToEstimate} settings={settings} />}

      {estimateSaved && typeof document !== "undefined" && createPortal(
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2147483647,
            width: "100vw",
            height: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxSizing: "border-box",
            padding: "16px",
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.98)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              boxSizing: "border-box",
              borderRadius: "32px",
              border: "1px solid #f4f4f5",
              background: "#ffffff",
              padding: "32px 24px",
              boxShadow: "0 24px 80px rgba(0, 0, 0, 0.12)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: '"Space Grotesk", sans-serif',
                fontSize: "clamp(20px, 2vw, 24px)",
                fontWeight: 600,
                lineHeight: 1.45,
                letterSpacing: "-0.01em",
                color: "#18181b",
              }}
            >
              Your form has been submitted. Mr. Gokul will connect with you in a few hours.
            </p>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
