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
    }

    body.rh-admin-mobile-lock #root {
      width: 100%;
      max-width: 100vw;
      overflow-x: clip;
    }

    body.rh-admin-mobile-lock #root > * {
      width: 100%;
      max-width: 100vw;
    }

    body.rh-admin-mobile-lock :is(input, select, textarea) {
      font-size: 16px !important;
    }

    body.rh-admin-mobile-lock img,
    body.rh-admin-mobile-lock video,
    body.rh-admin-mobile-lock canvas,
    body.rh-admin-mobile-lock svg {
      max-width: 100%;
    }
  }
`;
document.head.appendChild(style);

function isAdminPath() {
  return window.location.pathname === "/admin";
}

function syncAdminMobileLock() {
  const locked = isAdminPath();
  document.documentElement.classList.toggle("rh-admin-mobile-lock", locked);
  document.body.classList.toggle("rh-admin-mobile-lock", locked);

  if (viewport) {
    viewport.setAttribute("content", locked ? adminViewportContent : defaultViewportContent);
  }
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

window.addEventListener("popstate", syncAdminMobileLock);
window.addEventListener("pageshow", syncAdminMobileLock);
syncAdminMobileLock();
