import { parseRoute } from "./rupantar/routes";

const brandHost = "rupantarhomes.com";

function normalizedHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function internalDetailPath(anchor: HTMLAnchorElement): string | null {
  if (anchor.target && anchor.target !== "_self") return null;
  if (anchor.hasAttribute("download")) return null;

  try {
    const url = new URL(anchor.href, window.location.href);
    const host = normalizedHost(url.hostname);
    const currentHost = normalizedHost(window.location.hostname);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (host !== currentHost && host !== brandHost) return null;

    const route = parseRoute(url.pathname);
    if (route.kind !== "blog-detail" && route.kind !== "work-detail") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function warmPublicChunks() {
  void import("./rupantar/public-pages").catch((error) => console.error("Unable to prefetch public pages", error));
  void import("./rupantar/blog-pages").catch((error) => console.error("Unable to prefetch blog pages", error));
}

type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

function initPublicPerformanceRuntime() {
  if (parseRoute(window.location.pathname).kind === "admin") return;

  const idleWindow = window as IdleWindow;
  let chunkTimer = 0;
  let idleHandle: number | undefined;
  const scheduleChunkWarm = () => {
    chunkTimer = window.setTimeout(() => {
      if (idleWindow.requestIdleCallback) idleHandle = idleWindow.requestIdleCallback(warmPublicChunks, { timeout: 2500 });
      else warmPublicChunks();
    }, 900);
  };
  if (document.readyState === "complete") scheduleChunkWarm();
  else window.addEventListener("load", scheduleChunkWarm, { once: true });

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest<HTMLAnchorElement>("a[href]");
    if (!anchor) return;
    const path = internalDetailPath(anchor);
    if (!path) return;

    event.preventDefault();
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== path) {
      window.history.pushState(null, "", path);
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  document.addEventListener("click", onClick, true);
  window.addEventListener("pagehide", () => {
    if (chunkTimer) window.clearTimeout(chunkTimer);
    if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
    window.removeEventListener("load", scheduleChunkWarm);
    document.removeEventListener("click", onClick, true);
  }, { once: true });
}

initPublicPerformanceRuntime();
