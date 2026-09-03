import { deleteCloudinaryImages } from "./rupantar/cloudinary";
import { claimExpiredCloudinaryDrafts, loadPublicBlogs, loadPublicWorksPage } from "./rupantar/repository";
import { parseRoute } from "./rupantar/routes";
import { getSupabase, isSupabaseConfigured } from "./rupantar/supabase";

const expiredSessionKey = "rupantar-admin-session-expired";
const adminVerificationIntervalMs = 5 * 60 * 1000;
const publicRecoveryProbeDelayMs = 5000;

let adminSessionWasValid = false;
let adminVerificationRunning = false;
let staleDraftCleanupRunning = false;
let publicProbeTimer: number | null = null;
let publicProbeGeneration = 0;

function isAdminPath(): boolean {
  return parseRoute(window.location.pathname).kind === "admin";
}

function rememberExpiredSession(): void {
  try {
    window.sessionStorage.setItem(expiredSessionKey, "1");
  } catch {
    // The login page still reloads correctly when session storage is blocked.
  }
}

function redirectExpiredAdminSession(): void {
  rememberExpiredSession();
  window.location.replace("/admin");
}

function showExpiredSessionNotice(): void {
  if (!isAdminPath()) return;
  let expired = false;
  try {
    expired = window.sessionStorage.getItem(expiredSessionKey) === "1";
    if (expired) window.sessionStorage.removeItem(expiredSessionKey);
  } catch {
    return;
  }
  if (!expired) return;
  window.setTimeout(() => {
    window.alert("Your admin session expired or access was revoked. Please log in again.");
  }, 0);
}

async function cleanupExpiredWorkDrafts(): Promise<void> {
  if (!isAdminPath() || staleDraftCleanupRunning) return;
  staleDraftCleanupRunning = true;
  try {
    const publicIds = await claimExpiredCloudinaryDrafts();
    if (publicIds.length) await deleteCloudinaryImages(publicIds);
  } catch (error) {
    console.error("Unable to reconcile stale Work image drafts", error);
  } finally {
    staleDraftCleanupRunning = false;
  }
}

async function verifyOpenAdminSession(): Promise<void> {
  if (!isSupabaseConfigured || !isAdminPath() || adminVerificationRunning) return;
  adminVerificationRunning = true;
  try {
    const supabase = getSupabase();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    const session = sessionData.session;
    if (!session) {
      if (adminSessionWasValid) redirectExpiredAdminSession();
      return;
    }

    const { data: admin, error: adminError } = await supabase
      .from("admin_users")
      .select("user_id,is_active")
      .eq("user_id", session.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (adminError) throw adminError;
    if (!admin) {
      adminSessionWasValid = true;
      await supabase.auth.signOut();
      redirectExpiredAdminSession();
      return;
    }

    adminSessionWasValid = true;
    void cleanupExpiredWorkDrafts();
  } catch (error) {
    // A temporary network/provider failure must not be treated as revoked access.
    console.error("Unable to verify the open Admin session", error);
  } finally {
    adminVerificationRunning = false;
  }
}

function dismissPublicRecovery(): void {
  document.querySelector('[data-rh-runtime-recovery="true"]')?.remove();
}

function showPublicRecovery(label: string): void {
  if (document.querySelector('[data-rh-runtime-recovery="true"]')) return;
  const overlay = document.createElement("div");
  overlay.dataset.rhRuntimeRecovery = "true";
  overlay.setAttribute("role", "alert");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    background: "rgba(255,255,255,0.96)",
  });

  const card = document.createElement("div");
  Object.assign(card.style, {
    width: "min(560px,100%)",
    border: "1px solid #f4f4f5",
    borderRadius: "24px",
    background: "#ffffff",
    padding: "28px",
    boxShadow: "0 24px 70px rgba(0,0,0,0.10)",
    textAlign: "center",
  });

  const title = document.createElement("div");
  title.textContent = `Unable to load ${label}`;
  Object.assign(title.style, { fontSize: "20px", fontWeight: "700", color: "#18181b" });

  const message = document.createElement("p");
  message.textContent = "The saved content is still protected, but this request did not finish correctly. Retry to load the latest data.";
  Object.assign(message.style, { margin: "10px 0 0", fontSize: "14px", lineHeight: "1.6", color: "#52525b" });

  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "Retry";
  retry.onclick = () => window.location.reload();
  Object.assign(retry.style, {
    marginTop: "20px",
    height: "40px",
    padding: "0 22px",
    border: "0",
    borderRadius: "999px",
    background: "#ff1a3d",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
  });

  card.append(title, message, retry);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

async function probePublicRoute(generation: number): Promise<void> {
  if (generation !== publicProbeGeneration) return;
  const route = parseRoute(window.location.pathname);
  try {
    if (route.kind === "works") {
      const emptyPlaceholder = document.body.textContent?.includes("Add works from Admin → Manage Works") ?? false;
      if (!emptyPlaceholder) return;
      await loadPublicWorksPage(0, 1, route.category);
    } else if (route.kind === "blog") {
      const main = document.querySelector("main[aria-busy='true']");
      if (!main) return;
      await loadPublicBlogs();
    } else {
      dismissPublicRecovery();
      return;
    }
    if (generation === publicProbeGeneration) dismissPublicRecovery();
  } catch (error) {
    if (generation !== publicProbeGeneration) return;
    console.error("Public content recovery probe failed", error);
    showPublicRecovery(route.kind === "blog" ? "articles" : "projects");
  }
}

function schedulePublicRecoveryProbe(): void {
  publicProbeGeneration += 1;
  const generation = publicProbeGeneration;
  if (publicProbeTimer !== null) window.clearTimeout(publicProbeTimer);
  dismissPublicRecovery();
  publicProbeTimer = window.setTimeout(() => {
    publicProbeTimer = null;
    void probePublicRoute(generation);
  }, publicRecoveryProbeDelayMs);
}

function installRouteRecoveryWatch(): void {
  const originalPushState = window.history.pushState;
  window.history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
    originalPushState.call(window.history, data, unused, url);
    schedulePublicRecoveryProbe();
    void verifyOpenAdminSession();
  };

  const originalReplaceState = window.history.replaceState;
  window.history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
    originalReplaceState.call(window.history, data, unused, url);
    schedulePublicRecoveryProbe();
    void verifyOpenAdminSession();
  };

  window.addEventListener("popstate", schedulePublicRecoveryProbe);
  window.addEventListener("pageshow", schedulePublicRecoveryProbe);
}

function installAdminSessionWatch(): void {
  if (!isSupabaseConfigured) return;
  const supabase = getSupabase();
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (session && isAdminPath()) {
      adminSessionWasValid = true;
      void cleanupExpiredWorkDrafts();
      return;
    }
    if (event !== "SIGNED_OUT" || !adminSessionWasValid) return;
    window.setTimeout(() => {
      if (isAdminPath()) redirectExpiredAdminSession();
    }, 350);
  });

  const verifyWhenVisible = () => {
    if (document.visibilityState === "visible") void verifyOpenAdminSession();
  };
  window.addEventListener("focus", verifyWhenVisible);
  document.addEventListener("visibilitychange", verifyWhenVisible);
  window.setInterval(() => void verifyOpenAdminSession(), adminVerificationIntervalMs);
  window.addEventListener("pagehide", () => data.subscription.unsubscribe(), { once: true });
}

showExpiredSessionNotice();
installRouteRecoveryWatch();
installAdminSessionWatch();
void verifyOpenAdminSession();
schedulePublicRecoveryProbe();
