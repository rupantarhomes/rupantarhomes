import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./editorial-pages.css";
import "./work-media-enhancer.css";
import "./social-links-enhancer.css";
import "./premium-architectural-theme.css";
import "./public-display-typography.css";
import "./review-cards-enhancer.css";
import "./review-cards-mobile-opt.css";
import "./recent-works-unified-covers.css";
import "./recent-works-location-badge.css";
import "./recent-works-mobile-readable.css";
import "./public-handover-guard.css";
import { BrandIntro } from "./rupantar/brand-intro";
import { SiteErrorBoundary } from "./rupantar/error-boundary";
import { RupantarSite } from "./rupantar/site";
import { initPublicRouteScroll } from "./public-navigation";

const root = document.getElementById("root");

if (!root) throw new Error("Rupantar Homes root element was not found.");

const brandIntroSessionKey = "rupantar-brand-intro-seen";
let showBrandIntro = false;

try {
  showBrandIntro = window.sessionStorage.getItem(brandIntroSessionKey) !== "1";
  if (showBrandIntro) window.sessionStorage.setItem(brandIntroSessionKey, "1");
} catch {
  showBrandIntro = true;
}

createRoot(root).render(
  <StrictMode>
    <SiteErrorBoundary>
      <RupantarSite />
      <SiteErrorBoundary fallback={null}>
        <BrandIntro enabled={showBrandIntro} />
      </SiteErrorBoundary>
    </SiteErrorBoundary>
  </StrictMode>,
);

initPublicRouteScroll();

function initPublicCopyNormalization() {
  if (window.location.pathname.startsWith("/admin")) return;
  const publicRoot = document.getElementById("root");
  if (!publicRoot) return;

  const replacements: Array<[RegExp, string]> = [
    [/\b8 core services\b/gi, "3 core services"],
    [/\b9 core services\b/gi, "3 core services"],
    [/Follow Rupantar Homes on Instagram & TikTok\./gi, "Follow Rupantar Homes on Instagram, TikTok & Facebook."],
    [/\b3D sample\b/gi, "design preview"],
    [/\b3D design\b/gi, "design preview"],
    [/\b3D visualization\b/gi, "design preview"],
    [/\b3D\b/gi, "design"],
    [/\bWorkshop Direct\b/gi, "Direct Service"],
    [/\bworkshop direct\b/gi, "direct"],
    [/\bKathmandu workshop\b/gi, "Kathmandu studio"],
    [/\bworkshop\b/gi, "studio"],
    [/3 core services from our Kathmandu studio\. Click any card to see works\./gi, "3 core services. Click any card to see works."],
    [/Factory finish at Kathmandu studio\. Clean install in 7-21 days\./gi, "Proper Finishing. Clean installation."],
  ];
  const relevantText = /(?:\b(?:3D|workshop)\b|core services|Instagram & TikTok)/i;

  const normalizeText = (node: Node) => {
    if (!node.textContent || node.parentElement?.closest("script, style, textarea")) return;
    let next = node.textContent;
    for (const [pattern, replacement] of replacements) next = next.replace(pattern, replacement);
    if (next !== node.textContent) node.textContent = next;
  };

  const normalizeNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      normalizeText(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node !== publicRoot) return;
    if (!relevantText.test(node.textContent ?? "")) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    for (let current = walker.nextNode(); current; current = walker.nextNode()) normalizeText(current);
  };

  normalizeNode(publicRoot);

  let frame = 0;
  const pending = new Set<Node>();
  const observer = new MutationObserver((mutations) => {
    if (window.location.pathname.startsWith("/admin")) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) pending.add(node);
    }
    if (frame || pending.size === 0) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      for (const node of pending) normalizeNode(node);
      pending.clear();
    });
  });

  observer.observe(publicRoot, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPublicCopyNormalization, { once: true });
} else {
  initPublicCopyNormalization();
}
