const themeStorageKey = "rupantar-theme";
const charcoalTheme = "charcoal";
const lightTheme = "light";
const transitionClass = "rh-theme-changing";
const transitionMs = 220;

type RupantarTheme = typeof charcoalTheme | typeof lightTheme;

const moonIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20.2 15.25A8.2 8.2 0 0 1 8.75 3.8a8.65 8.65 0 1 0 11.45 11.45Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

const sunIcon = `
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="1.8"/>
    <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.72 5.28l-1.42 1.42M6.7 17.3l-1.42 1.42M18.72 18.72l-1.42-1.42M6.7 6.7 5.28 5.28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`;

function activeTheme(): RupantarTheme {
  return document.documentElement.dataset.rhTheme === charcoalTheme ? charcoalTheme : lightTheme;
}

function setThemeColor(theme: RupantarTheme) {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta) meta.content = theme === charcoalTheme ? "#151412" : "#111111";
}

function updateToggle(button: HTMLButtonElement) {
  const charcoal = activeTheme() === charcoalTheme;
  button.innerHTML = charcoal ? sunIcon : moonIcon;
  button.setAttribute("aria-label", charcoal ? "Switch to light theme" : "Switch to charcoal theme");
  button.setAttribute("title", charcoal ? "Light theme" : "Charcoal theme");
  button.setAttribute("aria-pressed", charcoal ? "true" : "false");
}

function updateAllToggles() {
  document.querySelectorAll<HTMLButtonElement>("[data-rh-theme-toggle]").forEach(updateToggle);
}

function persistTheme(theme: RupantarTheme) {
  try {
    if (theme === charcoalTheme) window.localStorage.setItem(themeStorageKey, charcoalTheme);
    else window.localStorage.removeItem(themeStorageKey);
  } catch {
    // Restricted storage still receives the active theme for this page lifetime.
  }
}

function applyTheme(theme: RupantarTheme, persist = false, animate = false) {
  const html = document.documentElement;
  if (animate) {
    html.classList.add(transitionClass);
    window.setTimeout(() => html.classList.remove(transitionClass), transitionMs + 40);
  }
  html.dataset.rhTheme = theme;
  setThemeColor(theme);
  if (persist) persistTheme(theme);
  updateAllToggles();
}

function toggleTheme() {
  const next: RupantarTheme = activeTheme() === charcoalTheme ? lightTheme : charcoalTheme;
  applyTheme(next, true, true);
}

function createToggle() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "rh-theme-toggle";
  button.dataset.rhThemeToggle = "true";
  button.addEventListener("click", toggleTheme);
  updateToggle(button);
  return button;
}

function publicThemeHost(): HTMLElement | null {
  const menu = document.querySelector<HTMLButtonElement>(
    'nav button[aria-label="Open menu"], nav button[aria-label="Close menu"]',
  );
  return menu?.parentElement ?? null;
}

function adminThemeHost(): { host: HTMLElement; before: HTMLElement } | null {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const logout = buttons.find((button) => button.textContent?.trim().includes("Logout"));
  if (!logout?.parentElement) return null;
  return { host: logout.parentElement, before: logout };
}

function placeToggle(button: HTMLButtonElement) {
  const adminRoute = window.location.pathname.startsWith("/admin");
  if (adminRoute) {
    const admin = adminThemeHost();
    if (admin) {
      button.classList.remove("rh-theme-toggle--floating");
      if (button.parentElement !== admin.host || button.nextElementSibling !== admin.before) {
        admin.host.insertBefore(button, admin.before);
      }
      return;
    }
    button.classList.add("rh-theme-toggle--floating");
    if (button.parentElement !== document.body) document.body.appendChild(button);
    return;
  }

  const host = publicThemeHost();
  if (host) {
    button.classList.remove("rh-theme-toggle--floating");
    const menu = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Open menu"], button[aria-label="Close menu"]',
    );
    if (button.parentElement !== host || button.nextElementSibling !== menu) host.insertBefore(button, menu);
    return;
  }

  button.classList.add("rh-theme-toggle--floating");
  if (button.parentElement !== document.body) document.body.appendChild(button);
}

export function initRupantarTheme() {
  applyTheme(activeTheme(), false, false);

  const button = createToggle();
  let frame = 0;
  const schedulePlacement = () => {
    if (frame) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      placeToggle(button);
      updateToggle(button);
    });
  };

  schedulePlacement();
  const root = document.getElementById("root");
  const observer = new MutationObserver(schedulePlacement);
  if (root) observer.observe(root, { childList: true, subtree: true });

  window.addEventListener("popstate", schedulePlacement);
  window.addEventListener("storage", (event) => {
    if (event.key !== themeStorageKey) return;
    applyTheme(event.newValue === charcoalTheme ? charcoalTheme : lightTheme, false, false);
  });

  return () => {
    observer.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    button.remove();
  };
}
