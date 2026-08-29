import "./home-brand-refinement.css";

const homePath = () => window.location.pathname === "/" || window.location.pathname === "";

function normalizedText(value: string | null | undefined): string {
  return (value || "").replace(/[“”"']/g, "").replace(/\s+/g, " ").trim();
}

function isBrandReadyReview(message: string): boolean {
  const text = normalizedText(message);
  const words = text.split(" ").filter(Boolean);
  const alphanumeric = text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const uniqueCharacters = new Set(alphanumeric).size;
  const obviousRepeat = alphanumeric.length >= 8 && uniqueCharacters <= 2;

  return !obviousRepeat && text.length >= 45 && words.length >= 7;
}

function refineRecentWorks() {
  const section = document.querySelector<HTMLElement>(".min-h-screen.bg-white.text-zinc-950 main > section:first-child");
  if (!section) return;

  const cards = Array.from(section.querySelectorAll<HTMLElement>(".rh-work-card"));
  let visibleCount = 0;

  for (const card of cards) {
    const hasPlaceholder = Boolean(card.querySelector(".rh-work-media-slot.border-dashed, .border-dashed"));
    card.dataset.rhBrandReady = hasPlaceholder ? "false" : "true";
    if (!hasPlaceholder) visibleCount += 1;
  }

  section.dataset.rhVisibleWorks = String(visibleCount);
}

function refineReviews() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h3")).find(
    (element) => element.textContent?.trim() === "Real Homes, Real Reviews",
  );
  const section = heading?.closest<HTMLElement>("section");
  if (!section) return;

  section.classList.add("rh-brand-review-section");
  const cards = Array.from(section.querySelectorAll<HTMLElement>(".rh-review-card"));
  let curatedCount = 0;

  for (const card of cards) {
    const quote = card.querySelector<HTMLElement>(".rh-review-quote");
    const ready = isBrandReadyReview(quote?.textContent || "") && curatedCount < 3;
    card.dataset.rhBrandReady = ready ? "true" : "false";
    if (ready) curatedCount += 1;
  }

  section.dataset.rhCuratedCount = String(curatedCount);
}

function refineFooterCopy() {
  const footer = document.querySelector("footer");
  if (!footer) return;

  const leaves = Array.from(footer.querySelectorAll<HTMLElement>("span, div, p"));
  const rights = leaves.find((element) => {
    const text = element.textContent?.trim() || "";
    return element.children.length === 0 && text.includes("All Right Reserved");
  });

  if (rights) {
    rights.textContent = rights.textContent?.replace("All Right Reserved", "All Rights Reserved") || "All Rights Reserved • Rupantar Homes by Gokul Kunwar";
  }
}

function applyBrandRefinement() {
  const isHome = homePath();
  document.documentElement.classList.toggle("rh-brand-home", isHome);
  if (!isHome) return;

  refineRecentWorks();
  refineReviews();
  refineFooterCopy();
}

let scheduled = false;
function scheduleBrandRefinement() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyBrandRefinement();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleBrandRefinement, { once: true });
} else {
  scheduleBrandRefinement();
}

const root = document.getElementById("root");
if (root) {
  const observer = new MutationObserver(scheduleBrandRefinement);
  observer.observe(root, { childList: true, subtree: true });
}

window.addEventListener("popstate", scheduleBrandRefinement);
