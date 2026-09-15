type CriticalBootstrap = {
  read: (key: string) => Promise<unknown> | undefined;
  warmPath: (pathname: string, speculative?: boolean) => void;
};

type BootstrapWindow = Window & typeof globalThis & {
  __RUPANTAR_HOME_BOOTSTRAP__?: Promise<unknown>;
  __RUPANTAR_PUBLIC_BOOTSTRAP__?: CriticalBootstrap;
};

type WorkImage = { url?: unknown };
type Work = { title?: unknown; slug?: unknown; category?: unknown; images?: unknown };
type Blog = { title?: unknown; slug?: unknown };

type NetworkConnection = { saveData?: boolean; effectiveType?: string; downlink?: number };
type NetworkNavigator = Navigator & { connection?: NetworkConnection; mozConnection?: NetworkConnection; webkitConnection?: NetworkConnection };

const bootstrapWindow = window as BootstrapWindow;
const routeReads = new Map<string, Promise<unknown>>();
const warmedMedia = new Set<string>();
const knownWorks = new Map<string, Work>();
const knownBlogs = new Map<string, Blog>();
const moduleReads = new Map<string, Promise<unknown>>();
const publicFreshnessMs = 30_000;
const persistentStorageKey = "rupantar-public-snapshots-v2";

const worksKey = (category: string) => `works:page:${category}:0`;
const workKey = (category: string, slug: string) => `works:detail:${category}:${slug}`;
const blogKey = (slug: string) => `blogs:detail:${slug}`;
const linkedWorkKey = (slug: string) => `works:blog:${slug}`;

const categoryPaths = new Map([
  ["Architecture", "/works/architect"],
  ["Interior", "/works/interior"],
  ["Modular Kitchen", "/works/modular-kitchen"],
  ["TV Cabinet", "/works/tv-cabinet"],
  ["Wardrobe", "/works/wardrobe"],
  ["Hydraulic Bed", "/works/hydraulic-bed"],
  ["False Ceiling", "/works/false-ceiling"],
  ["Parqueting", "/works/parqueting"],
  ["Railing", "/works/railing"],
  ["Home Construction", "/works/home-construction"],
]);

function networkProfile() {
  const networkNavigator = navigator as NetworkNavigator;
  const connection = networkNavigator.connection ?? networkNavigator.mozConnection ?? networkNavigator.webkitConnection;
  const effectiveType = String(connection?.effectiveType ?? "").toLowerCase();
  const saveData = connection?.saveData === true;
  const constrained = saveData || effectiveType === "slow-2g" || effectiveType === "2g";
  const slow = constrained || effectiveType === "3g"
    || (typeof connection?.downlink === "number" && connection.downlink > 0 && connection.downlink < 1.5);
  return { saveData, constrained, slow };
}

function deliveryUrl(sourceUrl: string, width: number) {
  if (!sourceUrl.startsWith("https://res.cloudinary.com/") || !sourceUrl.includes("/image/upload/")) return sourceUrl;
  return sourceUrl.replace("/image/upload/", `/image/upload/c_limit,w_${width}/f_auto/q_auto:good/`);
}

function preloadResponsive(sourceUrl: unknown, sizes: string, widths: readonly number[], priority: "high" | "auto" | "low") {
  if (typeof sourceUrl !== "string" || !sourceUrl.startsWith("https://res.cloudinary.com/")) return;
  const key = `${sourceUrl}|${sizes}|${widths.join(",")}`;
  if (warmedMedia.has(key)) return;
  warmedMedia.add(key);
  const image = new Image();
  image.decoding = "async";
  image.fetchPriority = priority;
  image.sizes = sizes;
  image.srcset = widths.map((width) => `${deliveryUrl(sourceUrl, width)} ${width}w`).join(", ");
  image.src = deliveryUrl(sourceUrl, widths[widths.length - 1] ?? 768);
  image.onload = () => { void image.decode().catch(() => undefined); };
  image.onerror = () => warmedMedia.delete(key);
}

function firstImage(work: Work): WorkImage | undefined {
  return Array.isArray(work.images) ? work.images[0] as WorkImage | undefined : undefined;
}

function rememberWork(work: unknown) {
  if (!work || typeof work !== "object") return;
  const value = work as Work;
  if (typeof value.title !== "string" || typeof value.slug !== "string" || typeof value.category !== "string") return;
  knownWorks.set(value.title, value);
  const key = workKey(value.category, value.slug);
  if (!routeReads.has(key)) routeReads.set(key, Promise.resolve(value));
}

function rememberBlog(blog: unknown) {
  if (!blog || typeof blog !== "object") return;
  const value = blog as Blog;
  if (typeof value.title !== "string" || typeof value.slug !== "string") return;
  knownBlogs.set(value.title, value);
  const key = blogKey(value.slug);
  if (!routeReads.has(key)) routeReads.set(key, Promise.resolve(value));
}

function storedFresh(key: string): unknown | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(persistentStorageKey) ?? "{}");
    const entry = parsed && typeof parsed === "object" ? parsed[key] : undefined;
    if (!entry || typeof entry !== "object" || typeof entry.confirmedAt !== "number") return undefined;
    if (Date.now() - entry.confirmedAt >= publicFreshnessMs) return undefined;
    return entry.value;
  } catch {
    return undefined;
  }
}

async function edgeJson(path: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6_000);
  try {
    const response = await fetch(path, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new Error(`Critical bootstrap returned ${response.status}`);
    return response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function warmModule(kind: string, speculative: boolean) {
  if (speculative && networkProfile().slow) return;
  const publicKinds = new Set(["works", "work-detail", "interior-design", "about", "contact", "privacy"]);
  if (publicKinds.has(kind) && !moduleReads.has("public")) {
    moduleReads.set("public", import("./rupantar/public-pages"));
  }
  if ((kind === "blog" || kind === "blog-detail") && !moduleReads.has("blog")) {
    moduleReads.set("blog", import("./rupantar/blog-pages"));
  }
}

function warmWorkMedia(work: Work, speculative: boolean) {
  const image = firstImage(work);
  if (!image) return;
  const profile = networkProfile();
  if (speculative && profile.constrained) return;
  preloadResponsive(image.url, "(min-width: 1024px) 520px, 100vw", [480, 768, 1200, 1600], "high");
  if (!speculative && !profile.constrained && Array.isArray(work.images) && work.images[1]) {
    preloadResponsive((work.images[1] as WorkImage).url, "(min-width: 1024px) 520px, 100vw", [480, 768, 1200, 1600], "auto");
  }
}

function warmWorksMedia(works: unknown[], speculative: boolean) {
  const profile = networkProfile();
  if (speculative && profile.constrained) return;
  const desktop = window.matchMedia?.("(min-width: 1024px)").matches === true;
  const tablet = window.matchMedia?.("(min-width: 640px)").matches === true;
  const count = profile.constrained ? 1 : profile.slow ? 1 : desktop ? 3 : tablet ? 2 : 1;
  works.slice(0, count).forEach((work, index) => {
    if (!work || typeof work !== "object") return;
    const image = firstImage(work as Work);
    if (!image) return;
    preloadResponsive(image.url,
      "(min-width: 1280px) 389px, (min-width: 1024px) calc((100vw - 112px) / 3), (min-width: 640px) calc((100vw - 68px) / 2), calc(100vw - 56px)",
      [320, 480, 768], index === 0 ? "high" : "auto");
  });
}

function parsePath(pathname: string) {
  const segments = pathname.split("/").filter(Boolean).map((segment) => {
    try { return decodeURIComponent(segment); } catch { return segment; }
  });
  if (!segments.length) return { kind: "home" } as const;
  if (segments.length === 1 && ["about", "contact", "privacy"].includes(segments[0])) return { kind: segments[0] };
  if (segments.length === 1 && segments[0] === "blog") return { kind: "blog" } as const;
  if (segments.length === 2 && segments[0] === "blog") return { kind: "blog-detail", slug: segments[1] } as const;
  if (segments[0] === "works") {
    if (segments.length === 2 && segments[1] === "interior-design") return { kind: "interior-design" } as const;
    if (segments.length === 1) return { kind: "works", category: "all" } as const;
    if (segments.length === 2) return { kind: "works", category: segments[1] } as const;
    if (segments.length === 3) return { kind: "work-detail", category: segments[1], slug: segments[2] } as const;
  }
  return { kind: "other" } as const;
}

function warmWorks(category: string, speculative: boolean) {
  const key = worksKey(category);
  if (routeReads.has(key)) return routeReads.get(key)!;
  const stored = storedFresh(key);
  if (stored && typeof stored === "object" && Array.isArray((stored as { works?: unknown[] }).works)) {
    const page = stored as { works: unknown[] };
    page.works.forEach(rememberWork);
    warmWorksMedia(page.works, speculative);
    const ready = Promise.resolve(stored);
    routeReads.set(key, ready);
    return ready;
  }
  const request = edgeJson(`/api/public-content?resource=works&offset=0&limit=12&category=${encodeURIComponent(category)}`)
    .then((payload) => {
      const works = payload && typeof payload === "object" && Array.isArray(payload.works) ? payload.works : [];
      works.forEach(rememberWork);
      warmWorksMedia(works, speculative);
      return payload;
    })
    .catch((error) => { routeReads.delete(key); throw error; });
  routeReads.set(key, request);
  return request;
}

function warmWork(category: string, slug: string, speculative: boolean) {
  const key = workKey(category, slug);
  const known = routeReads.get(key);
  if (known) {
    void known.then((work) => { if (work && typeof work === "object") warmWorkMedia(work as Work, speculative); }).catch(() => undefined);
    return known;
  }
  const stored = storedFresh(key);
  if (stored !== undefined) {
    rememberWork(stored);
    if (stored && typeof stored === "object") warmWorkMedia(stored as Work, speculative);
    const ready = Promise.resolve(stored);
    routeReads.set(key, ready);
    return ready;
  }
  const request = edgeJson(`/api/public-content?resource=work&category=${encodeURIComponent(category)}&slug=${encodeURIComponent(slug)}`)
    .then((payload) => {
      const work = payload && typeof payload === "object" && Object.hasOwn(payload, "work") ? payload.work : null;
      rememberWork(work);
      if (work && typeof work === "object") warmWorkMedia(work as Work, speculative);
      return work;
    })
    .catch((error) => { routeReads.delete(key); throw error; });
  routeReads.set(key, request);
  return request;
}

function warmBlogs() {
  const key = "blogs:payload";
  if (routeReads.has(key)) return routeReads.get(key)!;
  const stored = storedFresh("blogs:list");
  if (Array.isArray(stored)) {
    stored.forEach(rememberBlog);
    const ready = Promise.resolve({ blogs: stored, linkedWorks: {} });
    routeReads.set(key, ready);
    routeReads.set("blogs:list", Promise.resolve(stored));
    return ready;
  }
  const request = edgeJson("/api/public-content?resource=blogs")
    .then((payload) => {
      const blogs = payload && typeof payload === "object" && Array.isArray(payload.blogs) ? payload.blogs : [];
      blogs.forEach(rememberBlog);
      routeReads.set("blogs:list", Promise.resolve(blogs));
      const linkedWorks = payload && typeof payload === "object" && payload.linkedWorks && typeof payload.linkedWorks === "object" ? payload.linkedWorks : {};
      for (const [slug, work] of Object.entries(linkedWorks)) routeReads.set(linkedWorkKey(slug), Promise.resolve(work));
      return payload;
    })
    .catch((error) => { routeReads.delete(key); throw error; });
  routeReads.set(key, request);
  return request;
}

function warmBlog(slug: string) {
  const detailKey = blogKey(slug);
  const known = routeReads.get(detailKey);
  if (known) return known;
  const stored = storedFresh(detailKey);
  if (stored !== undefined) {
    rememberBlog(stored);
    const linked = storedFresh(linkedWorkKey(slug));
    if (linked !== undefined) routeReads.set(linkedWorkKey(slug), Promise.resolve(linked));
    const ready = Promise.resolve(stored);
    routeReads.set(detailKey, ready);
    return ready;
  }
  const request = edgeJson(`/api/public-content?resource=blog&slug=${encodeURIComponent(slug)}`)
    .then((payload) => {
      const blog = payload && typeof payload === "object" && Object.hasOwn(payload, "blog") ? payload.blog : null;
      const linkedWork = payload && typeof payload === "object" && Object.hasOwn(payload, "linkedWork") ? payload.linkedWork : undefined;
      rememberBlog(blog);
      if (linkedWork !== undefined) routeReads.set(linkedWorkKey(slug), Promise.resolve(linkedWork));
      return blog;
    })
    .catch((error) => { routeReads.delete(detailKey); throw error; });
  routeReads.set(detailKey, request);
  return request;
}

function warmPath(pathname: string, speculative = false) {
  if (!pathname || pathname.startsWith("/admin")) return;
  const route = parsePath(pathname);
  warmModule(route.kind, speculative);
  if (speculative && networkProfile().slow) return;
  if (route.kind === "works") void warmWorks(route.category, speculative).catch(() => undefined);
  if (route.kind === "work-detail") void warmWork(route.category, route.slug, speculative).catch(() => undefined);
  if (route.kind === "blog") void warmBlogs().catch(() => undefined);
  if (route.kind === "blog-detail") void warmBlog(route.slug).catch(() => undefined);
}

function workFromCard(card: Element): Work | undefined {
  const label = card.getAttribute("aria-label")?.replace(/^View\s+/, "").trim();
  if (label && knownWorks.has(label)) return knownWorks.get(label);
  const text = card.textContent ?? "";
  for (const [title, work] of knownWorks) if (text.includes(title)) return work;
  return undefined;
}

function blogFromCard(card: Element): Blog | undefined {
  const label = card.getAttribute("aria-label")?.replace(/^Read\s+/, "").trim();
  if (label && knownBlogs.has(label)) return knownBlogs.get(label);
  const text = card.textContent ?? "";
  for (const [title, blog] of knownBlogs) if (text.includes(title)) return blog;
  return undefined;
}

function intentPath(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest<HTMLAnchorElement>("a[href]");
  if (anchor) {
    try {
      const url = new URL(anchor.href, location.href);
      if (url.origin === location.origin) return url.pathname;
    } catch { /* ignore malformed href */ }
  }
  const button = target.closest<HTMLButtonElement>("button");
  const label = button?.textContent?.replace(/\s+/g, " ").trim() ?? "";
  if (categoryPaths.has(label)) return categoryPaths.get(label)!;
  if (["All", "All Works", "View All", "View Works"].includes(label)) return "/works";
  if (label === "Blog") return "/blog";
  return null;
}

function warmIntent(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const path = intentPath(target);
  if (path) warmPath(path, true);
  const workCard = target.closest(".rh-work-card");
  if (workCard) {
    const warmCard = () => {
      const work = workFromCard(workCard);
      if (work && typeof work.category === "string" && typeof work.slug === "string") {
        warmPath(`/works/${encodeURIComponent(work.category)}/${encodeURIComponent(work.slug)}`, true);
      }
    };
    warmCard();
    const route = parsePath(location.pathname);
    if (route.kind === "works") void routeReads.get(worksKey(route.category))?.then(warmCard).catch(() => undefined);
    if (route.kind === "home") void bootstrapWindow.__RUPANTAR_HOME_BOOTSTRAP__?.then(warmCard).catch(() => undefined);
  }
  const blogCard = target.closest('article[role="button"]');
  if (blogCard) {
    const warmCard = () => {
      const blog = blogFromCard(blogCard);
      if (blog && typeof blog.slug === "string") warmPath(`/blog/${encodeURIComponent(blog.slug)}`, true);
    };
    warmCard();
    void routeReads.get("blogs:payload")?.then(warmCard).catch(() => undefined);
  }
}

bootstrapWindow.__RUPANTAR_PUBLIC_BOOTSTRAP__ = {
  read: (key) => routeReads.get(key),
  warmPath,
};

void bootstrapWindow.__RUPANTAR_HOME_BOOTSTRAP__?.then((payload) => {
  if (!payload || typeof payload !== "object" || !Array.isArray((payload as { works?: unknown[] }).works)) return;
  (payload as { works: unknown[] }).works.forEach(rememberWork);
}).catch(() => undefined);

const nativePushState = history.pushState.bind(history);
history.pushState = ((...args: Parameters<History["pushState"]>) => {
  nativePushState(...args);
  warmPath(location.pathname, false);
}) as History["pushState"];
const nativeReplaceState = history.replaceState.bind(history);
history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
  nativeReplaceState(...args);
  warmPath(location.pathname, false);
}) as History["replaceState"];

window.addEventListener("popstate", () => warmPath(location.pathname, false));
document.addEventListener("pointerover", (event) => warmIntent(event.target), { passive: true });
document.addEventListener("pointerdown", (event) => warmIntent(event.target), { passive: true });
document.addEventListener("focusin", (event) => warmIntent(event.target));

warmPath(location.pathname, false);
