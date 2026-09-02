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
  deleteLead,
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
  type PublicWorksPage,
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

const loadAdmin = () => import("./admin");
const loadPublicPages = () => import("./public-pages");
const loadBlogPages = () => import("./blog-pages");

const AdminLogin = lazy(() => loadAdmin().then((module) => ({ default: module.AdminLogin })));
const AdminPortal = lazy(() => loadAdmin().then((module) => ({ default: module.AdminPortal })));
const AboutPage = lazy(() => loadPublicPages().then((module) => ({ default: module.AboutPage })));
const ContactPage = lazy(() => loadPublicPages().then((module) => ({ default: module.ContactPage })));
const PrivacyPage = lazy(() => loadPublicPages().then((module) => ({ default: module.PrivacyPage })));
const InteriorDesignPage = lazy(() => loadPublicPages().then((module) => ({ default: module.InteriorDesignPage })));
const WorkDetailPage = lazy(() => loadPublicPages().then((module) => ({ default: module.WorkDetailPage })));
const WorksPage = lazy(() => loadPublicPages().then((module) => ({ default: module.WorksPage })));
const BlogIndexPage = lazy(() => loadBlogPages().then((module) => ({ default: module.BlogIndexPage })));
const BlogArticlePage = lazy(() => loadBlogPages().then((module) => ({ default: module.BlogArticlePage })));

function PageLoader() {
  return <div className="min-h-[40vh]" aria-busy="true" aria-label="Loading page" />;
}

const publicPages: Page[] = ["home", "works", "work-detail", "about", "contact", "privacy", "interior-design", "blog", "blog-detail"];
const adminWorksLimit = 1000;

type BrowserRoute = ReturnType<typeof parseRoute>;

function prefetchPublicPageModules() {
  void loadPublicPages();
  void loadBlogPages();
}

function prefetchPublicRoute(page: Page) {
  if (page === "blog" || page === "blog-detail") {
    void loadBlogPages();
  } else if (publicPages.includes(page) && page !== "home") {
    void loadPublicPages();
  }
}

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
  const initialRouteIsAdmin = initialRoute.kind === "admin";
  const initialWorksState = initialRouteUsesWorks || initialRouteIsAdmin ? [] : initialWorks;
  const [page, setPage] = useState<Page>(() => pageForRoute(initialRoute));
  const [filter, setFilter] = useState(() => initialRoute.kind === "works" || initialRoute.kind === "work-detail" ? initialRoute.category : "all");
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [works, setWorks] = useState<Work[]>(initialWorksState);
  const [worksTotal, setWorksTotal] = useState(initialRouteUsesWorks || initialRouteIsAdmin ? 0 : initialWorks.length);
  const [worksLoading, setWorksLoading] = useState(initialRoute.kind === "works");
  const [reviews, setReviews] = useState<Review[]>(initialReviews);
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState<Blog | null>(null);
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
  const worksPageCacheRef = useRef(new Map<string, PublicWorksPage>());
  const worksPageRequestsRef = useRef(new Map<string, Promise<PublicWorksPage>>());
  const worksCacheVersionRef = useRef(0);
  const adminWorksRequestIdRef = useRef(0);
  const contentRequestIdRef = useRef(0);
  const leadsRequestIdRef = useRef(0);
  const blogsRef = useRef(blogs);
  const blogsLoadedRef = useRef(false);
  const blogsRequestIdRef = useRef(0);
  const routeRequestIdRef = useRef(0);
  const persistedDraftImageIdsRef = useRef(new Set<string>());
  const loginMutationRef = useRef(false);
  const adminMutationRef = useRef(false);
  const uploadMutationRef = useRef(false);
  const estimateMutationRef = useRef(false);
  const queryMutationRef = useRef(false);

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

    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(prefetchPublicPageModules);
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    const timer = window.setTimeout(prefetchPublicPageModules, 150);
    return () => window.clearTimeout(timer);
  }, []);

  const invalidateWorksCaches = () => {
    worksCacheVersionRef.current += 1;
    worksPageCacheRef.current.clear();
    worksPageRequestsRef.current.clear();
    worksRequestIdRef.current += 1;
  };

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
    const requestId = ++contentRequestIdRef.current;
    worksCacheVersionRef.current += 1;
    worksPageCacheRef.current.clear();
    worksPageRequestsRef.current.clear();
    const content = await loadPublicContent();
    if (requestId !== contentRequestIdRef.current) return;
    setReviews(content.reviews);
    setSettings(content.settings);
    homeWorksRef.current = content.works;

    const route = parseRoute(window.location.pathname);
    if (route.kind !== "home") return;

    worksRequestIdRef.current += 1;
    worksRef.current = content.works;
    worksLoadedRef.current = true;
    setWorks(content.works);
    setWorksTotal(content.works.length);
    setWorksLoading(false);
  }, []);

  const refreshAdminWorks = useCallback(async () => {
    const requestId = ++adminWorksRequestIdRef.current;
    const result = await loadPublicWorksPage(0, adminWorksLimit, "all");
    if (requestId !== adminWorksRequestIdRef.current) return;
    worksRef.current = result.works;
    worksLoadedRef.current = true;
    setWorks(result.works);
    setWorksTotal(result.total);
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

  const refreshLeads = useCallback(async () => {
    const requestId = ++leadsRequestIdRef.current;
    try {
      const result = await loadLeads();
      if (requestId !== leadsRequestIdRef.current) return;
      setLeads(result.leads);
      setLeadsHasMore(result.hasMore);
      setLeadsNextBefore(result.nextBefore);
    } catch (error) {
      if (requestId === leadsRequestIdRef.current) console.error("Unable to load leads", error);
    }
  }, []);

  const loadWorks = useCallback(async (category: string, offset: number, clearCurrent = false) => {
    const requestId = ++worksRequestIdRef.current;
    const cacheKey = `${category}:${offset}`;
    const cached = worksPageCacheRef.current.get(cacheKey);

    if (cached) {
      const nextWorks = offset === 0 ? cached.works : [...worksRef.current, ...cached.works];
      worksRef.current = nextWorks;
      worksLoadedRef.current = true;
      setWorksTotal(cached.total);
      setWorks(nextWorks);
      setWorksLoading(false);
      return;
    }

    if (clearCurrent) {
      worksRef.current = [];
      setWorks([]);
      setWorksTotal(0);
    }
    setWorksLoading(true);
    const cacheVersion = worksCacheVersionRef.current;
    let request = worksPageRequestsRef.current.get(cacheKey);
    if (!request) {
      request = loadPublicWorksPage(offset, 12, category);
      worksPageRequestsRef.current.set(cacheKey, request);
    }
    try {
      const result = await request;
      if (cacheVersion === worksCacheVersionRef.current) worksPageCacheRef.current.set(cacheKey, result);
      if (requestId !== worksRequestIdRef.current) return;
      const nextWorks = offset === 0 ? result.works : [...worksRef.current, ...result.works];
      worksRef.current = nextWorks;
      worksLoadedRef.current = true;
      setWorksTotal(result.total);
      setWorks(nextWorks);
    } finally {
      if (worksPageRequestsRef.current.get(cacheKey) === request) worksPageRequestsRef.current.delete(cacheKey);
      if (requestId === worksRequestIdRef.current) setWorksLoading(false);
    }
  }, []);

  const applyBrowserRoute = useCallback(async () => {
    const routeRequestId = ++routeRequestIdRef.current;
    const isCurrentRoute = () => routeRequestId === routeRequestIdRef.current;
    const route = parseRoute(window.location.pathname);

    if (route.kind === "home") {
      setSelectedWork(null);
      setSelectedBlog(null);
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
      setSelectedBlog(null);
      if (!blogsLoadedRef.current) await refreshBlogs();
      return;
    }
    if (route.kind === "blog-detail") {
      setPage("blog-detail");
      const cachedBlog = blogsRef.current.find((item) => item.slug === route.slug);
      if (cachedBlog) {
        setSelectedBlog(cachedBlog);
        return;
      }
      const blog = await loadPublicBlogBySlug(route.slug);
      if (!isCurrentRoute()) return;
      if (!blog) {
        setSelectedBlog(null);
        setPage("blog");
        if (!blogsLoadedRef.current) await refreshBlogs();
        return;
      }
      const nextBlogs = [blog, ...blogsRef.current.filter((item) => item.id !== blog.id)];
      blogsRef.current = nextBlogs;
      setBlogs(nextBlogs);
      setSelectedBlog(blog);
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
      setSelectedWork(null);
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
      setSelectedWork(cachedWork);
      return;
    }

    const work = await loadPublicWorkBySlug(route.category, route.slug);
    if (!isCurrentRoute()) return;
    if (!work) {
      setSelectedWork(null);
      setPage("works");
      await loadWorks(route.category, 0, true);
      return;
    }
    setSelectedWork(work);
    const nextWorks = [work, ...worksRef.current.filter((item) => item.id !== work.id)];
    worksRef.current = nextWorks;
    worksLoadedRef.current = true;
    setWorks(nextWorks);
  }, [loadWorks, refreshBlogs]);

  const refreshAdminStats = useCallback(async () => {
    try {
      setAdminStats(await loadAdminStats());
    } catch (error) {
      console.error("Unable to load admin totals", error);
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
      void Promise.allSettled([refreshAdminWorks(), refreshContent(), refreshAdminStats(), refreshLeads(), refreshBlogs()]);
    });

    const onPopState = () => void applyBrowserRoute().catch((error) => console.error("Unable to apply browser route", error));
    window.addEventListener("popstate", onPopState);
    return () => {
      active = false;
      window.removeEventListener("popstate", onPopState);
    };
  }, [applyBrowserRoute, refreshAdminStats, refreshAdminWorks, refreshBlogs, refreshContent, refreshLeads]);

  const pushPath = (path: string) => {
    if (window.location.pathname !== path) window.history.pushState(null, "", path);
  };

  const navigate = (nextPage: Page) => {
    routeRequestIdRef.current += 1;
    prefetchPublicRoute(nextPage);
    if (nextPage.startsWith("admin-")) pushPath("/admin");
    else pushPath(pagePath(nextPage));

    if (nextPage.startsWith("admin-") && nextPage !== "admin-login" && !isAdmin) {
      setPage("admin-login");
    } else {
      if (nextPage === "home") {
        setSelectedWork(null);
        setSelectedBlog(null);
        restoreHomeWorks();
      }
      setPage(nextPage);
      if (nextPage === "blog") {
        setSelectedBlog(null);
        if (!blogsLoadedRef.current) void refreshBlogs().catch((error) => console.error("Unable to load blog", error));
      }
      if (nextPage === "works") {
        setSelectedWork(null);
        const categoryChanged = filter !== "all";
        setFilter("all");
        void loadWorks("all", 0, categoryChanged);
      }
      if (nextPage === "admin-dashboard") void refreshAdminStats();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToEstimate = () => {
    routeRequestIdRef.current += 1;
    if (page !== "home") {
      pushPath("/");
      setSelectedWork(null);
      setSelectedBlog(null);
      restoreHomeWorks();
      setPage("home");
      window.setTimeout(
        () => document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth", block: "start" }),
        150,
      );
      return;
    }
    document.getElementById("estimate")?.scrollIntoView({ behavior: "smooth" });
  };

  const openCategory = (category: string) => {
    routeRequestIdRef.current += 1;
    prefetchPublicRoute("works");
    pushPath(categoryPath(category));
    setSelectedWork(null);
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
    blogsRequestIdRef.current += 1;
    prefetchPublicRoute("blog-detail");
    pushPath(blogArticlePath(blog.slug));
    setSelectedBlog(blog);
    setPage("blog-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openWork = (id: string) => {
    const work = worksRef.current.find((item) => item.id === id);
    if (!work) return;
    routeRequestIdRef.current += 1;
    worksRequestIdRef.current += 1;
    prefetchPublicRoute("work-detail");
    pushPath(workPath(work));
    setSelectedWork(work);
    setPage("work-detail");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const persistedDraftImageIds = () => new Set(persistedDraftImageIdsRef.current);

  const draftImagePublicIds = () => {
    const persisted = persistedDraftImageIds();
    return (Array.isArray(workForm.images) ? workForm.images : [])
      .map((image) => image.publicId)
      .filter((publicId) => publicId && !persisted.has(publicId));
  };

  const handleLogin = async (email: string, password: string) => {
    if (loginMutationRef.current) return;
    loginMutationRef.current = true;
    setLoginBusy(true);
    setLoginError("");
    try {
      await signInAdmin(email, password);
      setIsAdmin(true);
      setPage("admin-dashboard");
      window.scrollTo({ top: 0 });
      void Promise.allSettled([refreshAdminWorks(), refreshContent(), refreshAdminStats(), refreshLeads(), refreshBlogs()]);
    } catch (error) {
      setLoginError(messageFrom(error));
    } finally {
      loginMutationRef.current = false;
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    if (adminMutationRef.current) return;
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      await deleteCloudinaryImages(draftImagePublicIds());
      await signOutAdmin();
      persistedDraftImageIdsRef.current = new Set();
      setEditingWorkId(null);
      setWorkForm(emptyWork);
      setIsAdmin(false);
      setLeads([]);
      setAdminStats({ queries: 0, estimates: 0 });
      window.location.assign("/");
    } catch (error) {
      window.alert(`Logout stopped: ${messageFrom(error)}`);
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: LeadStatus) => {
    if (adminMutationRef.current) return;
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      await updateLeadStatus(id, status);
      leadsRequestIdRef.current += 1;
      setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, status, updatedAt: new Date().toISOString() } : lead));
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm("Delete this lead?")) return;
    if (adminMutationRef.current) return;
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      await deleteLead(id);
      leadsRequestIdRef.current += 1;
      setLeads((current) => current.filter((lead) => lead.id !== id));
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const handleSaveWork = async () => {
    if (adminMutationRef.current) return;
    const title = trimmed(workForm.title);
    const slug = trimmed(workForm.slug);
    if (!title || !slug) {
      window.alert("Title and Slug required");
      return;
    }

    adminMutationRef.current = true;
    const editingId = editingWorkId;
    const newlyUploaded = draftImagePublicIds();
    const retained = new Set((Array.isArray(workForm.images) ? workForm.images : []).map((image) => image.publicId));
    const removed = Array.from(persistedDraftImageIdsRef.current).filter((publicId) => !retained.has(publicId));

    setAdminBusy(true);
    try {
      let savedWork: Work;
      try {
        savedWork = await saveWork(workForm, editingId);
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

      adminWorksRequestIdRef.current += 1;
      contentRequestIdRef.current += 1;
      invalidateWorksCaches();
      const currentWorks = worksRef.current;
      const existingIndex = currentWorks.findIndex((work) => work.id === savedWork.id);
      const nextWorks = existingIndex >= 0
        ? currentWorks.map((work) => work.id === savedWork.id ? savedWork : work)
        : [savedWork, ...currentWorks];
      worksRef.current = nextWorks;
      worksLoadedRef.current = true;
      setWorks(nextWorks);
      setWorksTotal((current) => existingIndex >= 0 ? current : current + 1);

      const currentHome = homeWorksRef.current;
      const homeIndex = currentHome.findIndex((work) => work.id === savedWork.id);
      if (homeIndex >= 0) {
        homeWorksRef.current = currentHome.map((work) => work.id === savedWork.id ? savedWork : work);
      } else if (!editingId) {
        homeWorksRef.current = [savedWork, ...currentHome].slice(0, 6);
      }

      if (selectedWork?.id === savedWork.id) setSelectedWork(savedWork);
      persistedDraftImageIdsRef.current = new Set();
      setEditingWorkId(null);
      setWorkForm(emptyWork);

      void refreshContent().catch((refreshError) => {
        console.error("Work saved but public content reconciliation failed", refreshError);
      });
      try {
        await deleteCloudinaryImages(removed);
      } catch (cleanupError) {
        console.error("Work saved but removed Cloudinary images could not be cleaned up", cleanupError);
        window.alert("The work was saved, but one or more removed images still need Cloudinary cleanup.");
      }
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const editWork = (work: Work) => {
    persistedDraftImageIdsRef.current = new Set(work.images.map((image) => image.publicId));
    setWorkForm({
      title: work.title,
      slug: work.slug,
      category: work.category,
      location: work.location,
      shortDesc: work.shortDesc,
      longDesc: work.longDesc,
      featured: work.featured,
      blogUrl: work.blogUrl ?? "",
      images: work.images,
    });
    setEditingWorkId(work.id);
    navigate("admin-works");
  };

  const handleDeleteWork = async (id: string) => {
    if (!window.confirm("Delete this work?")) return;
    if (adminMutationRef.current) return;
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      let deletedImagePublicIds: string[];
      try {
        deletedImagePublicIds = await deleteWork(id);
      } catch (deleteError) {
        window.alert(messageFrom(deleteError));
        return;
      }

      adminWorksRequestIdRef.current += 1;
      contentRequestIdRef.current += 1;
      invalidateWorksCaches();
      const nextWorks = worksRef.current.filter((work) => work.id !== id);
      worksRef.current = nextWorks;
      setWorks(nextWorks);
      setWorksTotal((current) => Math.max(0, current - 1));
      homeWorksRef.current = homeWorksRef.current.filter((work) => work.id !== id);
      if (selectedWork?.id === id) setSelectedWork(null);

      if (editingWorkId === id) {
        persistedDraftImageIdsRef.current = new Set();
        setEditingWorkId(null);
        setWorkForm(emptyWork);
      }
      void refreshContent().catch((refreshError) => {
        console.error("Work deleted but public content reconciliation failed", refreshError);
      });
      try {
        await deleteCloudinaryImages(deletedImagePublicIds);
      } catch (cleanupError) {
        console.error("Work deleted but Cloudinary cleanup failed", cleanupError);
        window.alert("The work was deleted from the website, but one or more images still need Cloudinary cleanup.");
      }
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const cancelWork = async () => {
    if (adminMutationRef.current) return;
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      await deleteCloudinaryImages(draftImagePublicIds());
      persistedDraftImageIdsRef.current = new Set();
      setEditingWorkId(null);
      setWorkForm(emptyWork);
    } catch (error) {
      window.alert(`Cancel stopped: ${messageFrom(error)}`);
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const handleUploadImages = async (files: File[]) => {
    if (!files.length || uploadMutationRef.current) return;
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
    uploadMutationRef.current = true;
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
      uploadMutationRef.current = false;
      setUploadingImages(false);
    }
  };

  const handleRemoveWorkImage = async (index: number) => {
    if (uploadMutationRef.current) return;
    const images = Array.isArray(workForm.images) ? workForm.images : [];
    const image = images[index];
    if (!image) return;

    uploadMutationRef.current = true;
    const persisted = persistedDraftImageIdsRef.current.has(image.publicId);
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
      uploadMutationRef.current = false;
      setUploadingImages(false);
    }
  };

  const handleSaveBlog = async () => {
    if (adminMutationRef.current) return;
    if (!trimmed(blogForm.title) || !trimmed(blogForm.body)) {
      window.alert("Title and body are required.");
      return;
    }
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      const savedBlog = await saveBlog(blogForm, editingBlogId);
      blogsRequestIdRef.current += 1;
      const existingIndex = blogsRef.current.findIndex((blog) => blog.id === savedBlog.id);
      const nextBlogs = existingIndex >= 0
        ? blogsRef.current.map((blog) => blog.id === savedBlog.id ? savedBlog : blog)
        : [savedBlog, ...blogsRef.current];
      blogsRef.current = nextBlogs;
      blogsLoadedRef.current = true;
      setBlogs(nextBlogs);
      setBlogsLoaded(true);
      if (selectedBlog?.id === savedBlog.id) setSelectedBlog(savedBlog);
      setBlogForm(emptyBlogForm);
      setEditingBlogId(null);
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const editBlog = (blog: Blog) => {
    setEditingBlogId(blog.id);
    setBlogForm({ title: blog.title, category: blog.category, body: blog.body });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelBlog = () => {
    setEditingBlogId(null);
    setBlogForm(emptyBlogForm);
  };

  const handleDeleteBlog = async (id: string) => {
    if (!window.confirm("Delete this article?")) return;
    if (adminMutationRef.current) return;
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      await deleteBlog(id);
      blogsRequestIdRef.current += 1;
      if (editingBlogId === id) cancelBlog();
      const nextBlogs = blogsRef.current.filter((blog) => blog.id !== id);
      blogsRef.current = nextBlogs;
      setBlogs(nextBlogs);
      if (selectedBlog?.id === id) setSelectedBlog(null);
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const handleSaveReview = async () => {
    if (adminMutationRef.current) return;
    if (!trimmed(reviewForm.name) || !trimmed(reviewForm.message)) {
      window.alert("Name and message required");
      return;
    }
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      const savedReview = await saveReview(reviewForm);
      contentRequestIdRef.current += 1;
      setReviews((current) => [savedReview, ...current.filter((review) => review.id !== savedReview.id)]);
      setReviewForm(emptyReview);
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("Delete this review?")) return;
    if (adminMutationRef.current) return;
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      await deleteReview(id);
      contentRequestIdRef.current += 1;
      setReviews((current) => current.filter((review) => review.id !== id));
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const handleSaveSettings = async () => {
    if (adminMutationRef.current) return;
    adminMutationRef.current = true;
    setAdminBusy(true);
    try {
      const savedSettings = await saveSettings(settings);
      contentRequestIdRef.current += 1;
      setSettings(savedSettings);
      window.alert("Settings saved.");
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      adminMutationRef.current = false;
      setAdminBusy(false);
    }
  };

  const handleEstimate = async () => {
    if (estimateMutationRef.current) return;
    estimateMutationRef.current = true;
    setEstimateBusy(true);
    try {
      await submitEstimate(estimate);
      setEstimate(emptyEstimate);
      setEstimateSaved(true);
      if (isAdmin) void Promise.all([refreshAdminStats(), refreshLeads()]);
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      estimateMutationRef.current = false;
      setEstimateBusy(false);
    }
  };

  const handleQuery = async () => {
    if (queryMutationRef.current) return;
    queryMutationRef.current = true;
    setQueryBusy(true);
    try {
      await submitQuery(query);
      setQuery(emptyQuery);
      setEstimateSaved(true);
      if (isAdmin) void Promise.all([refreshAdminStats(), refreshLeads()]);
    } catch (error) {
      window.alert(messageFrom(error));
    } finally {
      queryMutationRef.current = false;
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
        onDeleteLead={handleDeleteLead}
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
      {publicPage && <PublicHeader page={page} navigate={navigate} onCategory={openCategory} onEstimate={goToEstimate} onPublicNavigationIntent={prefetchPublicRoute} />}

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

      {publicPage && <PublicFooter navigate={navigate} onCategory={openCategory} onEstimate={goToEstimate} settings={settings} onPublicNavigationIntent={prefetchPublicRoute} />}

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
                fontFamily: '\"Space Grotesk\", sans-serif',
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
