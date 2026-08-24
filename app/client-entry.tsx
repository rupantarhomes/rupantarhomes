import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import "./editorial-pages.css";
import "./work-media-enhancer.css";
import "./social-links-enhancer.css";
import "./admin-leads-enhancer.css";
import { BrandIntro } from "./rupantar/brand-intro";
import { RupantarSite } from "./rupantar/site";
import { initWorkMediaEnhancements } from "./rupantar/work-media-enhancer";
import { initAdminLeadsEnhancements } from "./rupantar/admin-leads-enhancer";

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
initAdminLeadsEnhancements();

const facebookUrl = "https://www.facebook.com/rupantarbygokulkunwar";

function createFacebookIcon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.classList.add("rh-facebook-icon");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("fill", "currentColor");
  path.setAttribute("d", "M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v8h4v-8h3.5l.5-4H13V9c0-.7.3-1 1-1Z");
  svg.appendChild(path);
  return svg;
}

function createFacebookLink(labelled: boolean) {
  const link = document.createElement("a");
  link.href = facebookUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.dataset.rhFacebookLink = labelled ? "connect" : "footer";
  link.setAttribute("aria-label", "Facebook");
  link.appendChild(createFacebookIcon());

  if (labelled) {
    link.className = "rh-facebook-connect h-11 px-6 rounded-full bg-white border border-zinc-200 text-[13px] font-medium flex items-center gap-2 hover:border-[#FF1A3D]/30 transition";
    link.append(document.createTextNode("Facebook"));
  } else {
    link.className = "rh-facebook-footer w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:border-[#FF1A3D]/50 transition";
  }

  return link;
}

function ensureFacebookLinks() {
  const connectHeading = Array.from(document.querySelectorAll<HTMLElement>("h3")).find(
    (element) => element.textContent?.trim() === "Connect With Us",
  );
  const connectPanel = connectHeading?.parentElement?.parentElement;
  const connectActions = connectPanel?.lastElementChild;

  if (connectActions instanceof HTMLElement) {
    connectActions.classList.add("rh-social-actions");
    if (!connectActions.querySelector('[data-rh-facebook-link="connect"]')) {
      connectActions.appendChild(createFacebookLink(true));
    }
  }

  const footer = document.querySelector("footer");
  if (footer) {
    const socialHeading = Array.from(footer.querySelectorAll<HTMLElement>("div")).find(
      (element) => element.textContent?.trim() === "Social Links" && element.children.length === 0,
    );
    const socialColumn = socialHeading?.parentElement;
    const socialBody = socialColumn?.children.item(1);
    const socialIcons = socialBody?.firstElementChild;

    if (socialIcons instanceof HTMLElement) {
      socialIcons.classList.add("rh-footer-social-links");
      if (!socialIcons.querySelector('[data-rh-facebook-link="footer"]')) {
        socialIcons.appendChild(createFacebookLink(false));
      }
    }
  }
}

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
    [/9 core services from our Kathmandu studio\. Click any card to see works\./gi, "9 core services. Click any card to see works."],
    [/Factory finish at Kathmandu studio\. Clean install in 7-21 days\./gi, "Proper Finishing. Clean installation."],
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

  const normalizeFooter = () => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const spans = Array.from(footer.querySelectorAll("span"));
    const location = spans.find((span) => span.textContent?.trim() === "Kathmandu Nepal");
    const separator = spans.find((span) => span.textContent?.trim() === "•" && span.parentElement?.textContent?.includes("All Right Reserved"));
    const rights = spans.find((span) => span.textContent?.trim() === "All Right Reserved - Rupantar Homes");

    if (location && rights) {
      location.textContent = "";
      if (separator) separator.textContent = "";
      rights.textContent = "All Right Reserved • Rupantar Homes by Gokul Kunwar";
    }
  };

  normalizeNode(document.body);
  normalizeFooter();
  ensureFacebookLinks();

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) normalizeNode(node);
    }
    normalizeFooter();
    ensureFacebookLinks();
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", normalizeVisibleCopy, { once: true });
} else {
  normalizeVisibleCopy();
}
