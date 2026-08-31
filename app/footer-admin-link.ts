function ensureFooterAdminLink() {
  const footer = document.querySelector("footer");
  if (!footer || footer.querySelector('[data-rh-footer-admin-link="true"]')) return;

  const bottomBar = footer.querySelector(".border-t.border-gray-800 > div");
  if (!(bottomBar instanceof HTMLElement)) return;

  const link = document.createElement("a");
  link.href = "/admin";
  link.textContent = "000";
  link.dataset.rhFooterAdminLink = "true";
  link.setAttribute("aria-label", "Open admin portal");
  link.style.marginLeft = "12px";
  link.style.color = "#71717a";
  link.style.fontSize = "10px";
  link.style.lineHeight = "1";
  link.style.textDecoration = "none";
  link.style.transition = "color 160ms ease";
  link.addEventListener("mouseenter", () => { link.style.color = "#ffffff"; });
  link.addEventListener("mouseleave", () => { link.style.color = "#71717a"; });

  bottomBar.appendChild(link);
}

const observer = new MutationObserver(ensureFooterAdminLink);
observer.observe(document.body, { childList: true, subtree: true });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureFooterAdminLink, { once: true });
} else {
  ensureFooterAdminLink();
}
