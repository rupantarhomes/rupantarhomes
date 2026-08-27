/*
 * Rupantar Homes — Navigation Precision V1
 * Public navigation enhancement only. No data, form, media, auth or backend behavior.
 */

const estimateSelector = "#estimate";
const maxEstimateFrames = 90;

function scrollEstimateWhenReady(frame = 0): void {
  const estimate = document.querySelector<HTMLElement>(estimateSelector);
  if (estimate) {
    estimate.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (frame >= maxEstimateFrames) return;
  window.requestAnimationFrame(() => scrollEstimateWhenReady(frame + 1));
}

function isGetEstimateControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest("button, a");
  if (!control) return false;
  return control.textContent?.replace(/\s+/g, " ").trim().toLowerCase().startsWith("get estimate") ?? false;
}

function handleEstimateIntent(event: MouseEvent): void {
  if (!isGetEstimateControl(event.target)) return;

  // On the home page the existing React handler already scrolls directly.
  // From another route, begin checking on the next render frame instead of
  // relying on an arbitrary timer for the home page to mount.
  if (window.location.pathname !== "/") {
    window.requestAnimationFrame(() => scrollEstimateWhenReady());
  }
}

export function initNavigationPrecision(): void {
  document.addEventListener("click", handleEstimateIntent, true);
}

initNavigationPrecision();
