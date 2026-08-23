import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./editorial-pages.css";
import "./work-media-enhancer.css";
import { BrandIntro } from "./rupantar/brand-intro";
import { RupantarSite } from "./rupantar/site";
import { initWorkMediaEnhancements } from "./rupantar/work-media-enhancer";

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
    <RupantarSite />
    <BrandIntro enabled={showBrandIntro} />
  </StrictMode>,
);

initWorkMediaEnhancements();

function normalizeVisibleCopy() {
  const replacements: Array<[RegExp, string]> = [
    [/\b8 core services\b/gi, "9 core services"],
    [/\b3D sample\b/gi, "design preview"],
    [/\b3D design\b/gi, "design preview"],
    [/\b3D visualization\b/gi, "design preview"],
    [/\b3D\b/gi, "design"],
    [/\bWorkshop Direct\b/gi, "Direct Service"],
    [/\bworkshop direct\b/gi, "direct"],
    [/\bKathmandu workshop\b/gi, "Kathmandu studio"],
    [/\bworkshop\b/gi, "studio"],
  ];

  const normalizeNode = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const parent = node.parentElement;
      if (parent?.closest("script, style, textarea")) return;

      let next = node.textContent;
      for (const [pattern, replacement] of replacements) next = next.replace(pattern, replacement);
      if (next !== node.textContent) node.textContent = next;
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE && node !== document.body) return;
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
      normalizeNode(current);
      current = walker.nextNode();
    }
  };

  normalizeNode(document.body);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) normalizeNode(node);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", normalizeVisibleCopy, { once: true });
} else {
  normalizeVisibleCopy();
}
