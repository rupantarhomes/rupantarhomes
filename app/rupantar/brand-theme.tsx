"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type BrandTheme = "light" | "dark";

const themeStorageKey = "rupantar-theme";
const themeChangeEvent = "rupantar-theme-change";

function currentTheme(): BrandTheme {
  return document.documentElement.dataset.rhTheme === "dark" ? "dark" : "light";
}

function applyTheme(theme: BrandTheme, persist = true) {
  const root = document.documentElement;
  root.dataset.rhTheme = theme;
  root.style.colorScheme = theme === "dark" ? "dark" : "light";

  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor) themeColor.content = theme === "dark" ? "#151412" : "#111111";

  if (persist) {
    try { window.localStorage.setItem(themeStorageKey, theme); }
    catch { /* Storage restrictions should never block the theme control. */ }
  }

  window.dispatchEvent(new CustomEvent(themeChangeEvent, { detail: theme }));
}

function ThemeToggle({ placement }: { placement: "public" | "admin" | "login" }) {
  const [theme, setTheme] = useState<BrandTheme>(() => currentTheme());

  useEffect(() => {
    const sync = () => setTheme(currentTheme());
    window.addEventListener(themeChangeEvent, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(themeChangeEvent, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const nextTheme: BrandTheme = theme === "dark" ? "light" : "dark";
  const label = theme === "dark" ? "Switch to light theme" : "Switch to charcoal theme";

  return (
    <button
      type="button"
      className={`rh-theme-toggle rh-theme-toggle--${placement}`}
      data-rh-theme-toggle={placement}
      aria-label={label}
      title={label}
      onClick={() => applyTheme(nextTheme)}
    >
      {theme === "dark" ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  );
}

function publicHeaderTarget(): HTMLElement | null {
  const menu = document.querySelector<HTMLElement>(
    'nav button[aria-label="Open menu"], nav button[aria-label="Close menu"]',
  );
  return menu?.parentElement ?? null;
}

function adminHeaderTarget(): HTMLElement | null {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("button"));
  const logout = buttons.find((button) => button.textContent?.trim().includes("Logout"));
  return logout?.parentElement ?? null;
}

export function BrandThemeControls() {
  const [publicTarget, setPublicTarget] = useState<HTMLElement | null>(null);
  const [adminTarget, setAdminTarget] = useState<HTMLElement | null>(null);
  const [showLoginToggle, setShowLoginToggle] = useState(false);

  useEffect(() => {
    let frame = 0;
    const syncTargets = () => {
      frame = 0;
      const nextPublicTarget = publicHeaderTarget();
      const nextAdminTarget = adminHeaderTarget();
      setPublicTarget((current) => current === nextPublicTarget ? current : nextPublicTarget);
      setAdminTarget((current) => current === nextAdminTarget ? current : nextAdminTarget);
      setShowLoginToggle(window.location.pathname.startsWith("/admin") && !nextAdminTarget);
    };

    const scheduleSync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(syncTargets);
    };

    syncTargets();
    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.getElementById("root") ?? document.body, { childList: true, subtree: true });
    window.addEventListener("popstate", scheduleSync);

    return () => {
      observer.disconnect();
      window.removeEventListener("popstate", scheduleSync);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      {publicTarget && createPortal(<ThemeToggle placement="public" />, publicTarget)}
      {adminTarget && createPortal(<ThemeToggle placement="admin" />, adminTarget)}
      {showLoginToggle && createPortal(<ThemeToggle placement="login" />, document.body)}
    </>
  );
}
