const FACEBOOK_URL = "https://www.facebook.com/rupantarbygokulkunwar";
const FACEBOOK_MARKER = "data-rh-facebook-link";

function facebookIcon() {
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
  link.href = FACEBOOK_URL;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute(FACEBOOK_MARKER, "true");
  link.setAttribute("aria-label", "Facebook");
  link.appendChild(facebookIcon());

  if (labelled) {
    link.className = "rh-facebook-connect h-11 px-6 rounded-full bg-white border border-zinc-200 text-[13px] font-medium flex items-center gap-2 hover:border-[#FF1A3D]/30 transition";
    link.append(document.createTextNode("Facebook"));
  } else {
    link.className = "rh-facebook-footer w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:border-[#FF1A3D]/50 transition";
  }

  return link;
}

function enhanceConnectWithUs() {
  const heading = Array.from(document.querySelectorAll<HTMLElement>("h3")).find(
    (element) => element.textContent?.trim() === "Connect With Us",
  );
  const section = heading?.closest("section");
  if (!section) return;

  const actions = Array.from(section.querySelectorAll<HTMLElement>("div")).find((element) => {
    const links = Array.from(element.children).filter((child) => child instanceof HTMLAnchorElement) as HTMLAnchorElement[];
    return links.some((link) => link.href.includes("instagram")) && links.some((link) => link.href.includes("tiktok"));
  });
  if (!actions) return;

  actions.classList.add("rh-social-actions");
  if (!actions.querySelector(`[${FACEBOOK_MARKER}]`)) actions.appendChild(createFacebookLink(true));
}

function enhanceFooter() {
  const footer = document.querySelector("footer");
  if (!footer) return;

  const socialLinks = Array.from(footer.querySelectorAll<HTMLElement>("div")).find((element) => {
    const links = Array.from(element.children).filter((child) => child instanceof HTMLAnchorElement) as HTMLAnchorElement[];
    return links.some((link) => link.href.includes("instagram")) && links.some((link) => link.href.includes("tiktok"));
  });
  if (!socialLinks) return;

  socialLinks.classList.add("rh-footer-social-links");
  if (!socialLinks.querySelector(`[${FACEBOOK_MARKER}]`)) socialLinks.appendChild(createFacebookLink(false));
}

function enhance() {
  enhanceConnectWithUs();
  enhanceFooter();
}

export function initSocialLinksEnhancements() {
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  };

  schedule();
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
}
