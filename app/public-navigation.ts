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
  window.addEventListener("popstate", onHistoryRoute, { capture: true });
  window.addEventListener("pageshow", onHistoryRoute);
  resetPublicRouteScroll();

  return () => {
    window.removeEventListener("popstate", onHistoryRoute, { capture: true });
    window.removeEventListener("pageshow", onHistoryRoute);
  };
}
