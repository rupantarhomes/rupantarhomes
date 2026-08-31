const adminViewportContent = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
const defaultViewportContent = viewport?.getAttribute("content") || "width=device-width, initial-scale=1.0";

const style = document.createElement("style");
style.dataset.rhAdminMobileLock = "true";
style.textContent = `
  @media (max-width: 767px) {
    html.rh-admin-mobile-lock,
    body.rh-admin-mobile-lock {
      width: 100%;
      max-width: 100%;
      overflow-x: hidden !important;
      overscroll-behavior-x: none;
      touch-action: pan-y;
    }

    body.rh-admin-mobile-lock #root,
    body.rh-admin-mobile-lock #root > * {
      width: 100%;
      max-width: 100vw;
      min-width: 0;
      overflow-x: clip;
    }

    body.rh-admin-mobile-lock .rh-admin-shell,
    body.rh-admin-mobile-lock .rh-admin-main,
    body.rh-admin-mobile-lock .rh-admin-header-row,
    body.rh-admin-mobile-lock .rh-admin-header-left,
    body.rh-admin-mobile-lock .rh-admin-header-actions {
      min-width: 0;
      max-width: 100%;
    }

    body.rh-admin-mobile-lock .rh-admin-header-row {
      min-height: 64px;
      height: auto !important;
      padding: 10px 14px !important;
      gap: 10px;
      align-items: center;
    }

    body.rh-admin-mobile-lock .rh-admin-header-left {
      gap: 10px !important;
      flex: 1 1 auto;
      overflow: hidden;
    }

    body.rh-admin-mobile-lock .rh-admin-brand {
      gap: 8px !important;
      min-width: 0;
      flex: 1 1 auto;
    }

    body.rh-admin-mobile-lock .rh-admin-brand img {
      width: 38px !important;
      height: 38px !important;
      flex: 0 0 38px;
    }

    body.rh-admin-mobile-lock .rh-admin-brand-copy {
      min-width: 0;
    }

    body.rh-admin-mobile-lock .rh-admin-brand-copy > div:first-child {
      font-size: 13px !important;
      white-space: nowrap;
    }

    body.rh-admin-mobile-lock .rh-admin-brand-copy > div:last-child {
      font-size: 10px !important;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    body.rh-admin-mobile-lock .rh-admin-header-actions {
      gap: 6px !important;
      flex: 0 0 auto;
    }

    body.rh-admin-mobile-lock .rh-admin-view-site,
    body.rh-admin-mobile-lock .rh-admin-logout {
      display: inline-flex !important;
      height: 36px !important;
      min-height: 36px;
      padding: 0 12px !important;
      font-size: 12px !important;
      white-space: nowrap;
      touch-action: manipulation;
    }

    body.rh-admin-mobile-lock .rh-admin-logout svg {
      width: 14px !important;
      height: 14px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-tabs {
      width: 100%;
      max-width: 100vw;
      padding: 8px 14px !important;
      overflow-x: auto !important;
      overflow-y: hidden;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
    }

    body.rh-admin-mobile-lock .rh-admin-tabs::-webkit-scrollbar {
      display: none;
    }

    body.rh-admin-mobile-lock .rh-admin-main {
      padding: 22px 14px 32px !important;
      overflow-wrap: anywhere;
      word-break: normal;
    }

    body.rh-admin-mobile-lock .rh-admin-main :is(.grid, .flex) {
      min-width: 0;
    }

    body.rh-admin-mobile-lock .rh-admin-main > * {
      max-width: 100%;
      min-width: 0;
    }

    body.rh-admin-mobile-lock .rh-admin-main :is(article, form, section, div) {
      max-width: 100%;
    }

    body.rh-admin-mobile-lock .rh-admin-main :is(input, select, textarea) {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      font-size: 16px !important;
      touch-action: manipulation;
    }

    body.rh-admin-mobile-lock .rh-admin-main :is(button, a) {
      max-width: 100%;
      touch-action: manipulation;
    }

    body.rh-admin-mobile-lock .rh-admin-main :is(p, span, div, a, button, label) {
      overflow-wrap: anywhere;
    }

    body.rh-admin-mobile-lock img,
    body.rh-admin-mobile-lock video,
    body.rh-admin-mobile-lock canvas,
    body.rh-admin-mobile-lock svg {
      max-width: 100%;
    }

    body.rh-admin-mobile-lock .grid-cols-2 {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    body.rh-admin-mobile-lock .grid-cols-\[1\.6fr_1fr\] {
      grid-template-columns: minmax(0, 1.25fr) minmax(0, .9fr) !important;
    }
  }

  @media (max-width: 389px) {
    body.rh-admin-mobile-lock .rh-admin-header-row {
      padding-inline: 10px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-view-site,
    body.rh-admin-mobile-lock .rh-admin-logout {
      padding-inline: 9px !important;
      font-size: 11px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-logout svg {
      display: none;
    }

    body.rh-admin-mobile-lock .rh-admin-main {
      padding-inline: 10px !important;
    }
  }
`;
document.head.appendChild(style);

function isAdminPath() {
  return window.location.pathname === "/admin";
}

function decorateAdminShell() {
  if (!isAdminPath()) return;

  const rootChild = document.querySelector<HTMLElement>("#root > div");
  if (!rootChild) return;
  rootChild.classList.add("rh-admin-shell");

  const stickyHeader = Array.from(rootChild.children).find(
    (element): element is HTMLElement => element instanceof HTMLElement && element.classList.contains("sticky"),
  );
  if (!stickyHeader) return;

  const headerRow = stickyHeader.firstElementChild;
  if (headerRow instanceof HTMLElement) {
    headerRow.classList.add("rh-admin-header-row");
    const rowChildren = Array.from(headerRow.children);
    if (rowChildren[0] instanceof HTMLElement) {
      rowChildren[0].classList.add("rh-admin-header-left");
      const leftChildren = Array.from(rowChildren[0].children);
      if (leftChildren[0] instanceof HTMLElement) {
        leftChildren[0].classList.add("rh-admin-brand");
        const brandChildren = Array.from(leftChildren[0].children);
        if (brandChildren[1] instanceof HTMLElement) brandChildren[1].classList.add("rh-admin-brand-copy");
      }
    }
    if (rowChildren[1] instanceof HTMLElement) {
      rowChildren[1].classList.add("rh-admin-header-actions");
      const actionButtons = Array.from(rowChildren[1].querySelectorAll<HTMLButtonElement>("button"));
      const viewSite = actionButtons.find((button) => button.textContent?.trim() === "View Site");
      const logout = actionButtons.find((button) => button.textContent?.includes("Logout"));
      if (viewSite) viewSite.classList.add("rh-admin-view-site");
      if (logout) logout.classList.add("rh-admin-logout");
    }
  }

  const tabs = stickyHeader.children.item(1);
  if (tabs instanceof HTMLElement) tabs.classList.add("rh-admin-tabs");

  const main = stickyHeader.nextElementSibling;
  if (main instanceof HTMLElement) main.classList.add("rh-admin-main");
}

function syncAdminMobileLock() {
  const locked = isAdminPath();
  document.documentElement.classList.toggle("rh-admin-mobile-lock", locked);
  document.body.classList.toggle("rh-admin-mobile-lock", locked);

  if (viewport) {
    viewport.setAttribute("content", locked ? adminViewportContent : defaultViewportContent);
  }

  if (locked) requestAnimationFrame(decorateAdminShell);
}

const originalPushState = window.history.pushState;
window.history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
  originalPushState.call(window.history, data, unused, url);
  syncAdminMobileLock();
};

const originalReplaceState = window.history.replaceState;
window.history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
  originalReplaceState.call(window.history, data, unused, url);
  syncAdminMobileLock();
};

const observer = new MutationObserver(() => {
  if (isAdminPath()) decorateAdminShell();
});
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener("popstate", syncAdminMobileLock);
window.addEventListener("pageshow", syncAdminMobileLock);
syncAdminMobileLock();
