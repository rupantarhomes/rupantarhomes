import type { Review, SiteSettings, Work } from "./types";

export type HomeBootstrap = { works: Work[]; reviews: Review[]; settings: SiteSettings; confirmedAt: number };
type BootstrapWindow = Window & typeof globalThis & {
  __RUPANTAR_HOME_BOOTSTRAP__?: Promise<unknown>;
};

const storageKey = "rupantar-home-bootstrap-v1";
const maximumStoredAgeMs = 24 * 60 * 60 * 1000;

function validImage(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const image = value as Record<string, unknown>;
  return typeof image.id === "string" && typeof image.url === "string" && image.url.startsWith("https://res.cloudinary.com/")
    && typeof image.publicId === "string" && typeof image.altText === "string" && typeof image.sortOrder === "number";
}

function validWork(value: unknown): value is Work {
  if (!value || typeof value !== "object") return false;
  const work = value as Record<string, unknown>;
  return typeof work.id === "string" && typeof work.title === "string" && typeof work.slug === "string"
    && typeof work.category === "string" && typeof work.location === "string" && typeof work.shortDesc === "string"
    && typeof work.longDesc === "string" && typeof work.featured === "boolean" && Array.isArray(work.images)
    && work.images.every(validImage);
}

function validReview(value: unknown): value is Review {
  if (!value || typeof value !== "object") return false;
  const review = value as Record<string, unknown>;
  return typeof review.id === "string" && typeof review.name === "string" && typeof review.location === "string"
    && typeof review.message === "string" && typeof review.rating === "number";
}

function validSettings(value: unknown): value is SiteSettings {
  if (!value || typeof value !== "object") return false;
  const settings = value as Record<string, unknown>;
  return ["slogan", "phone", "instagram", "tiktok", "address", "workshopNote"].every((key) => typeof settings[key] === "string");
}

function parseHomeBootstrap(value: unknown): HomeBootstrap | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.works) || candidate.works.length > 6 || !candidate.works.every(validWork)) return null;
  if (!Array.isArray(candidate.reviews) || !candidate.reviews.every(validReview) || !validSettings(candidate.settings)) return null;
  if (typeof candidate.confirmedAt !== "number" || !Number.isFinite(candidate.confirmedAt)) return null;
  return { works: candidate.works, reviews: candidate.reviews, settings: candidate.settings, confirmedAt: candidate.confirmedAt };
}

export function storedHomeContent(): HomeBootstrap | null {
  try {
    const parsed = parseHomeBootstrap(JSON.parse(window.localStorage.getItem(storageKey) ?? "null"));
    if (!parsed || Date.now() - parsed.confirmedAt > maximumStoredAgeMs) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function earlyHomeContent(): Promise<HomeBootstrap> {
  const bootstrapWindow = window as BootstrapWindow;
  const request = bootstrapWindow.__RUPANTAR_HOME_BOOTSTRAP__
    ?? fetch("/api/public-home", { headers: { Accept: "application/json" } }).then((response) => {
      if (!response.ok) throw new Error(`Public Home bootstrap returned ${response.status}`);
      return response.json();
    });
  const parsed = parseHomeBootstrap(await request);
  if (!parsed) throw new Error("Public Home bootstrap was invalid");
  try { window.localStorage.setItem(storageKey, JSON.stringify(parsed)); } catch { /* memory-only fallback */ }
  return parsed;
}
