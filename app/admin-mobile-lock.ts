const adminViewportContent = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
const appleTitle = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
const appleStatusBar = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');

const defaultViewportContent = viewport?.getAttribute("content") || "width=device-width, initial-scale=1.0";
const defaultManifestHref = manifest?.getAttribute("href") || "/site.webmanifest";
const defaultAppleTitle = appleTitle?.getAttribute("content") || "Rupantar Homes";
const defaultAppleStatusBar = appleStatusBar?.getAttribute("content") || "black-translucent";
const defaultThemeColor = themeColor?.getAttribute("content") || "#111111";
const defaultDocumentTitle = document.title;

const style = document.createElement("style");
style.dataset.rhAdminMobileLock = "true";
style.textContent = `
  @media (max-width: 767px) {
    html.rh-admin-mobile-lock,
    body.rh-admin-mobile-lock {
      width: 100%;
      max-width: 100%;
      min-height: 100%;
      overflow-x: hidden !important;
      overscroll-behavior-x: none;
      -webkit-text-size-adjust: 100%;
      background: #fbfbfb !important;
    }

    body.rh-admin-mobile-lock {
      min-height: 100dvh;
    }

    body.rh-admin-mobile-lock #root,
    body.rh-admin-mobile-lock #root > * {
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    body.rh-admin-mobile-lock .rh-admin-shell {
      width: 100%;
      max-width: 100%;
      min-width: 0;
      min-height: 100dvh;
      overflow-x: hidden;
    }

    body.rh-admin-mobile-lock .rh-admin-header {
      width: 100%;
      max-width: 100%;
      padding-top: env(safe-area-inset-top, 0px);
      background: #fff;
    }

    body.rh-admin-mobile-lock .rh-admin-header-row,
    body.rh-admin-mobile-lock .rh-admin-header-left,
    body.rh-admin-mobile-lock .rh-admin-header-actions,
    body.rh-admin-mobile-lock .rh-admin-brand,
    body.rh-admin-mobile-lock .rh-admin-main {
      min-width: 0;
      max-width: 100%;
    }

    body.rh-admin-mobile-lock .rh-admin-header-row {
      min-height: 64px;
      height: auto !important;
      padding-top: 10px !important;
      padding-bottom: 10px !important;
      padding-left: max(12px, env(safe-area-inset-left, 0px)) !important;
      padding-right: max(12px, env(safe-area-inset-right, 0px)) !important;
      gap: 8px;
      align-items: center;
    }

    body.rh-admin-mobile-lock .rh-admin-header-left {
      gap: 8px !important;
      flex: 1 1 auto;
      overflow: hidden;
    }

    body.rh-admin-mobile-lock .rh-admin-brand {
      gap: 7px !important;
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
      max-width: 96px;
      flex: 1 1 auto;
    }

    body.rh-admin-mobile-lock .rh-admin-brand-copy > div:first-child {
      font-size: 13px !important;
      white-space: nowrap;
    }

    body.rh-admin-mobile-lock .rh-admin-brand-copy > div:last-child {
      font-size: 10px !important;
      white-space: nowrap;
    }

    body.rh-admin-mobile-lock .rh-admin-header-actions {
      gap: 5px !important;
      flex: 0 0 auto;
    }

    body.rh-admin-mobile-lock .rh-admin-view-site,
    body.rh-admin-mobile-lock .rh-admin-logout {
      display: inline-flex !important;
      width: auto !important;
      min-width: 0;
      height: 36px !important;
      min-height: 36px;
      padding: 0 10px !important;
      font-size: 11px !important;
      line-height: 1;
      white-space: nowrap;
      touch-action: manipulation;
    }

    body.rh-admin-mobile-lock .rh-admin-logout {
      gap: 5px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-logout svg {
      width: 13px !important;
      height: 13px !important;
      flex: 0 0 13px;
    }

    body.rh-admin-mobile-lock .rh-admin-tabs {
      width: 100%;
      max-width: 100%;
      padding-top: 8px !important;
      padding-bottom: 8px !important;
      padding-left: max(12px, env(safe-area-inset-left, 0px)) !important;
      padding-right: max(12px, env(safe-area-inset-right, 0px)) !important;
      overflow-x: auto !important;
      overflow-y: hidden !important;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
      -webkit-overflow-scrolling: touch;
      touch-action: pan-x;
      scroll-snap-type: x proximity;
    }

    body.rh-admin-mobile-lock .rh-admin-tabs::-webkit-scrollbar {
      display: none;
    }

    body.rh-admin-mobile-lock .rh-admin-tabs > button {
      flex: 0 0 auto;
      min-height: 36px;
      scroll-snap-align: center;
      touch-action: manipulation;
    }

    body.rh-admin-mobile-lock .rh-admin-main {
      width: 100%;
      padding-top: 24px !important;
      padding-bottom: calc(36px + env(safe-area-inset-bottom, 0px)) !important;
      padding-left: max(12px, env(safe-area-inset-left, 0px)) !important;
      padding-right: max(12px, env(safe-area-inset-right, 0px)) !important;
    }

    body.rh-admin-mobile-lock .rh-admin-main > * {
      width: 100%;
      max-width: 100%;
      min-width: 0;
    }

    body.rh-admin-mobile-lock input,
    body.rh-admin-mobile-lock select,
    body.rh-admin-mobile-lock textarea {
      max-width: 100%;
      min-width: 0;
      font-size: 16px !important;
      touch-action: manipulation;
    }

    body.rh-admin-mobile-lock button,
    body.rh-admin-mobile-lock a {
      touch-action: manipulation;
    }

    body.rh-admin-mobile-lock .rh-admin-main :is(h1, h2, h3, p),
    body.rh-admin-mobile-lock .rh-admin-main .rh-admin-wrap-text {
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: normal;
    }

    body.rh-admin-mobile-lock .rh-admin-main img,
    body.rh-admin-mobile-lock .rh-admin-main video,
    body.rh-admin-mobile-lock .rh-admin-main canvas {
      max-width: 100%;
      height: auto;
    }

    body.rh-admin-mobile-lock .rh-admin-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    }

    body.rh-admin-mobile-lock .rh-admin-recent-row {
      align-items: flex-start !important;
      gap: 10px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-recent-row > :first-child {
      min-width: 0;
      flex: 1 1 auto;
    }

    body.rh-admin-mobile-lock .rh-admin-recent-row > :first-child > * {
      overflow-wrap: anywhere;
    }

    body.rh-admin-mobile-lock .rh-admin-recent-row > :last-child {
      flex: 0 0 auto;
    }

    body.rh-admin-mobile-lock .rh-admin-work-row {
      flex-direction: column !important;
      align-items: stretch !important;
      justify-content: flex-start !important;
      gap: 10px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-work-primary {
      width: 100%;
      min-width: 0;
      align-items: flex-start !important;
    }

    body.rh-admin-mobile-lock .rh-admin-work-copy {
      width: 100%;
      min-width: 0;
      padding-top: 1px;
    }

    body.rh-admin-mobile-lock .rh-admin-work-title {
      width: 100%;
      max-width: none !important;
      white-space: normal !important;
      overflow: visible !important;
      text-overflow: clip !important;
      overflow-wrap: anywhere;
      line-height: 1.35;
    }

    body.rh-admin-mobile-lock .rh-admin-work-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      row-gap: 4px;
      line-height: 1.4;
    }

    body.rh-admin-mobile-lock .rh-admin-work-meta > span {
      max-width: 100%;
      overflow-wrap: anywhere;
    }

    body.rh-admin-mobile-lock .rh-admin-work-actions {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    body.rh-admin-mobile-lock .rh-admin-work-actions > button,
    body.rh-admin-mobile-lock .rh-admin-blog-actions > button,
    body.rh-admin-mobile-lock .rh-admin-review-actions > button {
      min-height: 36px;
    }

    body.rh-admin-mobile-lock .rh-admin-blog-header {
      flex-direction: column !important;
      align-items: stretch !important;
      gap: 12px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-blog-copy {
      width: 100%;
      min-width: 0;
    }

    body.rh-admin-mobile-lock .rh-admin-blog-copy h2,
    body.rh-admin-mobile-lock .rh-admin-blog-copy > div:last-child {
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    body.rh-admin-mobile-lock .rh-admin-blog-actions {
      width: 100%;
      justify-content: flex-end;
      flex-wrap: wrap;
    }

    body.rh-admin-mobile-lock .rh-admin-review-header {
      align-items: flex-start !important;
      flex-wrap: wrap;
      gap: 8px;
    }

    body.rh-admin-mobile-lock .rh-admin-review-header > :first-child {
      min-width: 0;
      flex: 1 1 180px;
      overflow-wrap: anywhere;
    }

    body.rh-admin-mobile-lock .rh-admin-review-actions {
      flex-wrap: wrap;
    }

    body.rh-admin-mobile-lock .rh-admin-page-leads a {
      max-width: 100%;
      flex-wrap: wrap;
      overflow-wrap: anywhere;
    }

    body.rh-admin-mobile-lock .rh-admin-page-leads article,
    body.rh-admin-mobile-lock .rh-admin-page-reviews > div,
    body.rh-admin-mobile-lock .rh-admin-page-settings > div,
    body.rh-admin-mobile-lock .rh-admin-page-works > div,
    body.rh-admin-mobile-lock .rh-admin-page-blogs > div {
      min-width: 0;
      max-width: 100%;
    }
  }

  @media (max-width: 359px) {
    body.rh-admin-mobile-lock .rh-admin-header-row {
      padding-left: max(8px, env(safe-area-inset-left, 0px)) !important;
      padding-right: max(8px, env(safe-area-inset-right, 0px)) !important;
      gap: 6px;
    }

    body.rh-admin-mobile-lock .rh-admin-brand {
      gap: 6px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-brand img {
      width: 34px !important;
      height: 34px !important;
      flex-basis: 34px;
    }

    body.rh-admin-mobile-lock .rh-admin-brand-copy {
      max-width: 76px;
    }

    body.rh-admin-mobile-lock .rh-admin-brand-copy > div:first-child {
      font-size: 12px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-brand-copy > div:last-child {
      font-size: 9px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-header-actions {
      gap: 4px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-view-site,
    body.rh-admin-mobile-lock .rh-admin-logout {
      height: 34px !important;
      min-height: 34px;
      padding-inline: 8px !important;
      font-size: 10px !important;
    }

    body.rh-admin-mobile-lock .rh-admin-logout svg {
      display: none;
    }

    body.rh-admin-mobile-lock .rh-admin-tabs,
    body.rh-admin-mobile-lock .rh-admin-main {
      padding-left: max(8px, env(safe-area-inset-left, 0px)) !important;
      padding-right: max(8px, env(safe-area-inset-right, 0px)) !important;
    }

    body.rh-admin-mobile-lock .rh-admin-stats {
      grid-template-columns: minmax(0, 1fr) !important;
    }
  }

  @media (display-mode: standalone) and (max-width: 767px) {
    body.rh-admin-mobile-lock .rh-admin-shell {
      min-height: 100dvh;
    }

    body.rh-admin-mobile-lock .rh-admin-main {
      padding-bottom: calc(44px + env(safe-area-inset-bottom, 0px)) !important;
    }
  }
`;
document.head.appendChild(style);

function isAdminPath() {
  return window.location.pathname === "/admin" || window.location.pathname === "/admin/";
}

function setAdminPageClass(main: HTMLElement) {
  const pageClasses = [
    "rh-admin-page-dashboard",
    "rh-admin-page-works",
    "rh-admin-page-blogs",
    "rh-admin-page-leads",
    "rh-admin-page-reviews",
    "rh-admin-page-settings",
  ];
  main.classList.remove(...pageClasses);

  const heading = main.querySelector("h1")?.textContent?.trim();
  if (heading === "Dashboard") main.classList.add("rh-admin-page-dashboard");
  if (heading === "Manage Works") main.classList.add("rh-admin-page-works");
  if (heading === "Manage Blog") main.classList.add("rh-admin-page-blogs");
  if (heading === "Leads") main.classList.add("rh-admin-page-leads");
  if (heading === "Manage Reviews") main.classList.add("rh-admin-page-reviews");
  if (heading === "Settings") main.classList.add("rh-admin-page-settings");
}

function decorateDashboard(main: HTMLElement) {
  const stats = main.querySelector<HTMLElement>(".grid.grid-cols-2");
  if (stats) stats.classList.add("rh-admin-stats");

  const recentHeading = Array.from(main.querySelectorAll<HTMLElement>("h3")).find(
    (element) => element.textContent?.trim() === "Recent Leads",
  );
  const panel = recentHeading?.parentElement?.parentElement;
  const list = panel?.children.item(1);
  if (!(list instanceof HTMLElement)) return;

  for (const row of Array.from(list.children)) {
    if (row instanceof HTMLElement && row.children.length >= 2) row.classList.add("rh-admin-recent-row");
  }
}

function decorateWorks(main: HTMLElement) {
  const editButtons = Array.from(main.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) => button.textContent?.trim() === "Edit",
  );

  for (const editButton of editButtons) {
    const actions = editButton.parentElement;
    const row = actions?.parentElement;
    const primary = row?.firstElementChild;
    const copy = primary?.children.item(1);
    if (!(actions instanceof HTMLElement) || !(row instanceof HTMLElement) || !(primary instanceof HTMLElement) || !(copy instanceof HTMLElement)) continue;

    row.classList.add("rh-admin-work-row");
    primary.classList.add("rh-admin-work-primary");
    copy.classList.add("rh-admin-work-copy");
    actions.classList.add("rh-admin-work-actions");

    const title = copy.children.item(0);
    const meta = copy.children.item(1);
    if (title instanceof HTMLElement) title.classList.add("rh-admin-work-title");
    if (meta instanceof HTMLElement) meta.classList.add("rh-admin-work-meta");
  }
}

function decorateBlogs(main: HTMLElement) {
  for (const article of Array.from(main.querySelectorAll("article"))) {
    const header = article.firstElementChild;
    if (!(header instanceof HTMLElement)) continue;
    const copy = header.firstElementChild;
    const actions = header.lastElementChild;
    header.classList.add("rh-admin-blog-header");
    if (copy instanceof HTMLElement) copy.classList.add("rh-admin-blog-copy");
    if (actions instanceof HTMLElement) actions.classList.add("rh-admin-blog-actions");
  }
}

function decorateReviews(main: HTMLElement) {
  const deleteButtons = Array.from(main.querySelectorAll<HTMLButtonElement>("button")).filter(
    (button) => button.textContent?.trim() === "Delete",
  );

  for (const deleteButton of deleteButtons) {
    const actions = deleteButton.parentElement;
    const card = actions?.parentElement;
    const header = card?.firstElementChild;
    if (actions instanceof HTMLElement) actions.classList.add("rh-admin-review-actions");
    if (header instanceof HTMLElement) header.classList.add("rh-admin-review-header");
  }
}

let lastActiveTab = "";
function keepActiveTabVisible(tabs: HTMLElement) {
  const buttons = Array.from(tabs.querySelectorAll<HTMLButtonElement>("button"));
  const active = buttons.find((button) => button.className.includes("bg-[#FF1A3D]"));
  if (!active) return;

  const label = active.textContent?.trim() || "";
  if (!label || label === lastActiveTab) return;
  lastActiveTab = label;

  requestAnimationFrame(() => {
    const tabsRect = tabs.getBoundingClientRect();
    const buttonRect = active.getBoundingClientRect();
    if (buttonRect.left < tabsRect.left || buttonRect.right > tabsRect.right) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });
}

function decorateAdminShell() {
  if (!isAdminPath()) return;

  const rootChild = document.querySelector<HTMLElement>("#root > div");
  if (!rootChild) return;
  rootChild.classList.add("rh-admin-shell");

  const stickyHeader = Array.from(rootChild.children).find(
    (element): element is HTMLElement => element instanceof HTMLElement && element.classList.contains("sticky"),
  );

  if (stickyHeader) {
    stickyHeader.classList.add("rh-admin-header");
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
    if (tabs instanceof HTMLElement) {
      tabs.classList.add("rh-admin-tabs");
      keepActiveTabVisible(tabs);
    }

    const main = stickyHeader.nextElementSibling;
    if (main instanceof HTMLElement) {
      main.classList.add("rh-admin-main");
      setAdminPageClass(main);
      if (main.classList.contains("rh-admin-page-dashboard")) decorateDashboard(main);
      if (main.classList.contains("rh-admin-page-works")) decorateWorks(main);
      if (main.classList.contains("rh-admin-page-blogs")) decorateBlogs(main);
      if (main.classList.contains("rh-admin-page-reviews")) decorateReviews(main);
    }
  }
}

function syncInstallMetadata(locked: boolean) {
  if (manifest) manifest.setAttribute("href", locked ? "/admin.webmanifest" : defaultManifestHref);
  if (appleTitle) appleTitle.setAttribute("content", locked ? "Rupantar Admin" : defaultAppleTitle);
  if (appleStatusBar) appleStatusBar.setAttribute("content", locked ? "default" : defaultAppleStatusBar);
  if (themeColor) themeColor.setAttribute("content", locked ? "#fbfbfb" : defaultThemeColor);
  document.title = locked ? "Rupantar Admin" : defaultDocumentTitle;
}

function syncAdminMobileLock() {
  const locked = isAdminPath();
  document.documentElement.classList.toggle("rh-admin-mobile-lock", locked);
  document.body.classList.toggle("rh-admin-mobile-lock", locked);

  if (viewport) viewport.setAttribute("content", locked ? adminViewportContent : defaultViewportContent);
  syncInstallMetadata(locked);

  if (locked) requestAnimationFrame(decorateAdminShell);
  else lastActiveTab = "";
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