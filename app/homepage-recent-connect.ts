import "./homepage-recent-connect.css";

const isHome = () => window.location.pathname === "/" || window.location.pathname === "";

const normalize = (value: string | null | undefined) =>
  (value || "").replace(/\s+/g, " ").trim().toLowerCase();

const CONNECT_PUBLIC_ID = "rupantar-homes/site/connect-with-us-bg.webp";

function findHeading(text: string): HTMLElement | null {
  const target = text.toLowerCase();
  return (
    Array.from(document.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6")).find(
      (element) => normalize(element.textContent) === target,
    ) || null
  );
}

function cloudinaryBase(): string | null {
  for (const image of Array.from(document.images)) {
    const source = image.currentSrc || image.src || "";
    const match = source.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)/i);
    if (match) return match[1];
  }
  return null;
}

function refineRecentWorksLabel() {
  const heading = findHeading("recent works");
  if (!heading) return;

  if (heading.textContent?.trim() !== "recent works") {
    heading.textContent = "recent works";
  }
  heading.classList.add("rh-recent-works-label");
}

function refineConnectImage() {
  const heading = findHeading("connect with us");
  const section = heading?.closest<HTMLElement>("section");
  if (!section) return;

  const base = cloudinaryBase();
  if (!base) return;

  const targetUrl = `${base}${CONNECT_PUBLIC_ID}`;
  const images = Array.from(section.querySelectorAll<HTMLImageElement>("img"));
  if (!images.length) return;

  const target = images
    .map((image, index) => {
      const rect = image.getBoundingClientRect();
      const classText = typeof image.className === "string" ? image.className : "";
      let score = rect.width * rect.height || image.naturalWidth * image.naturalHeight || 0;
      if (/\bobject-cover\b/.test(classText)) score += 1_000_000_000;
      if (/\babsolute\b/.test(classText)) score += 500_000_000;
      if (/\bw-full\b|\bh-full\b/.test(classText)) score += 250_000_000;
      return { image, index, score };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)[0]?.image;

  if (!target) return;
  if ((target.currentSrc || target.src || "").includes(CONNECT_PUBLIC_ID)) return;

  target.removeAttribute("srcset");
  target.removeAttribute("sizes");
  target.src = targetUrl;
}

function applyHomepageRefinement() {
  if (!isHome()) return;
  refineRecentWorksLabel();
  refineConnectImage();
}

let scheduled = false;
function scheduleHomepageRefinement() {
  if (scheduled || !isHome()) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    applyHomepageRefinement();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", scheduleHomepageRefinement, { once: true });
} else {
  scheduleHomepageRefinement();
}

const root = document.getElementById("root");
if (root) {
  new MutationObserver(scheduleHomepageRefinement).observe(root, {
    childList: true,
    subtree: true,
  });
}

window.addEventListener("popstate", scheduleHomepageRefinement);
