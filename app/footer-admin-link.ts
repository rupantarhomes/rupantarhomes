function ensureFooterAdminLink() {
  const footer = document.querySelector("footer");
  if (!footer || footer.querySelector('[data-rh-footer-admin-link="true"]')) return;

  const bottomBar = footer.querySelector(".border-t.border-gray-800 > div");
  if (!(bottomBar instanceof HTMLElement)) return;

  const separator = document.createElement("span");
  separator.textContent = "•";
  separator.dataset.rhFooterAdminSeparator = "true";
  separator.style.margin = "0 8px";
  separator.style.color = "#a1a1aa";

  const link = document.createElement("a");
  link.href = "/admin";
  link.textContent = "000";
  link.dataset.rhFooterAdminLink = "true";
  link.setAttribute("aria-label", "Open admin portal");
  link.style.color = "#a1a1aa";
  link.style.fontSize = "11px";
  link.style.lineHeight = "1";
  link.style.textDecoration = "none";
  link.style.transition = "color 160ms ease";
  link.addEventListener("mouseenter", () => { link.style.color = "#ffffff"; });
  link.addEventListener("mouseleave", () => { link.style.color = "#a1a1aa"; });

  bottomBar.append(separator, link);
}

const observer = new MutationObserver(ensureFooterAdminLink);
observer.observe(document.body, { childList: true, subtree: true });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureFooterAdminLink, { once: true });
} else {
  ensureFooterAdminLink();
}
