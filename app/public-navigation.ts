export function resetPublicRouteScroll(): void {
  if (typeof window === "undefined") return;
  // Write all three positions synchronously. This prevents a painted frame at
  // the previous route's scroll offset on Safari before scrollTo is processed.
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

export function scrollEstimateWhenReady(frame = 0): void {
  if (typeof window === "undefined") return;
  const estimate = document.getElementById("estimate");
  if (estimate) {
    estimate.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  if (frame < 90) window.requestAnimationFrame(() => scrollEstimateWhenReady(frame + 1));
}

export function initPublicRouteScroll(): () => void {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin")) return () => undefined;
  if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";

  const onHistoryRoute = () => resetPublicRouteScroll();
  const onDedicatedLink = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
    if (!anchor || anchor.target || anchor.hasAttribute("download")) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || !/^\/(?:blog\/[^/]+|works\/[^/]+\/[^/]+)\/?$/.test(url.pathname)) return;
    event.preventDefault();
    window.history.pushState(null, "", url.pathname + url.search + url.hash);
    resetPublicRouteScroll();
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  window.addEventListener("popstate", onHistoryRoute, { capture: true });
  window.addEventListener("pageshow", onHistoryRoute);
  document.addEventListener("click", onDedicatedLink, { capture: true });
  resetPublicRouteScroll();

  return () => {
    window.removeEventListener("popstate", onHistoryRoute, { capture: true });
    window.removeEventListener("pageshow", onHistoryRoute);
    document.removeEventListener("click", onDedicatedLink, { capture: true });
  };
}
