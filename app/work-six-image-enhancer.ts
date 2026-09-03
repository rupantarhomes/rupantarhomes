import { loadPublicWorkBySlug } from "./rupantar/repository";
import { parseRoute } from "./rupantar/routes";
import type { WorkImage } from "./rupantar/types";

const style = document.createElement("style");
style.dataset.rhWorkSixImageEnhancer = "true";
style.textContent = `
  .rh-admin-work-image-grid {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    grid-template-rows: repeat(3, minmax(96px, 112px)) !important;
    gap: 10px !important;
  }

  .rh-admin-work-image-grid > * {
    grid-row: auto !important;
    grid-column: auto !important;
    aspect-ratio: auto !important;
    min-width: 0;
    min-height: 96px;
    max-height: 112px;
    cursor: pointer;
  }

  .rh-admin-work-image-grid > * > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .rh-admin-work-image-grid > *:focus-visible {
    outline: 2px solid rgba(255, 26, 61, 0.7);
    outline-offset: 2px;
  }

  .rh-work-stack-gallery {
    margin-top: 24px;
  }

  .rh-work-stack-stage {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    margin: 0 0 var(--rh-stack-depth, 0px);
    border: 0;
    padding: 0;
    background: transparent;
    cursor: zoom-in;
    text-align: left;
  }

  .rh-work-stack-card {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border: 1px solid rgba(24, 24, 27, 0.18);
    border-radius: 22px;
    background: #f4f4f5;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    transform: translateY(var(--rh-stack-offset, 0px)) scale(var(--rh-stack-scale, 1));
    transform-origin: top center;
    transition: transform 220ms ease, box-shadow 220ms ease;
  }

  .rh-work-stack-card img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .rh-work-stack-stage:hover .rh-work-stack-card:first-child {
    transform: translateY(0) scale(1.003);
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.11);
  }

  .rh-work-stack-count {
    position: absolute;
    right: 14px;
    bottom: 14px;
    z-index: 30;
    min-height: 30px;
    padding: 0 11px;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(17, 17, 17, 0.78);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.01em;
    backdrop-filter: blur(10px);
  }

  .rh-work-lightbox {
    position: fixed;
    inset: 0;
    z-index: 2147483600;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(8, 8, 10, 0.94);
    padding: max(18px, env(safe-area-inset-top, 0px)) max(18px, env(safe-area-inset-right, 0px)) max(18px, env(safe-area-inset-bottom, 0px)) max(18px, env(safe-area-inset-left, 0px));
    touch-action: pan-y;
  }

  .rh-work-lightbox__image {
    display: block;
    max-width: min(92vw, 1400px);
    max-height: 86vh;
    width: auto;
    height: auto;
    object-fit: contain;
    border-radius: 14px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
    user-select: none;
    -webkit-user-drag: none;
  }

  .rh-work-lightbox__close,
  .rh-work-lightbox__arrow {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(12px);
    transition: background 180ms ease, transform 180ms ease;
  }

  .rh-work-lightbox__close:hover,
  .rh-work-lightbox__arrow:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .rh-work-lightbox__close {
    top: max(16px, env(safe-area-inset-top, 0px));
    right: max(16px, env(safe-area-inset-right, 0px));
    width: 42px;
    height: 42px;
    border-radius: 9999px;
    font-size: 24px;
    line-height: 1;
  }

  .rh-work-lightbox__arrow {
    top: 50%;
    width: 46px;
    height: 46px;
    border-radius: 9999px;
    transform: translateY(-50%);
    font-size: 28px;
    line-height: 1;
  }

  .rh-work-lightbox__arrow--previous { left: max(16px, env(safe-area-inset-left, 0px)); }
  .rh-work-lightbox__arrow--next { right: max(16px, env(safe-area-inset-right, 0px)); }

  .rh-work-lightbox__counter {
    position: absolute;
    left: 50%;
    bottom: max(18px, env(safe-area-inset-bottom, 0px));
    transform: translateX(-50%);
    min-height: 32px;
    padding: 0 13px;
    border-radius: 9999px;
    display: inline-flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.14);
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    backdrop-filter: blur(12px);
  }

  @media (max-width: 639px) {
    .rh-admin-work-image-grid {
      grid-template-rows: repeat(3, minmax(92px, 106px)) !important;
      gap: 8px !important;
    }

    .rh-admin-work-image-grid > * {
      min-height: 92px;
      max-height: 106px;
    }

    .rh-work-stack-card {
      border-radius: 18px;
    }

    .rh-work-stack-count {
      right: 10px;
      bottom: 10px;
    }

    .rh-work-lightbox {
      padding: max(12px, env(safe-area-inset-top, 0px)) max(10px, env(safe-area-inset-right, 0px)) max(12px, env(safe-area-inset-bottom, 0px)) max(10px, env(safe-area-inset-left, 0px));
    }

    .rh-work-lightbox__image {
      max-width: 96vw;
      max-height: 80vh;
      border-radius: 10px;
    }

    .rh-work-lightbox__arrow {
      width: 40px;
      height: 40px;
      font-size: 24px;
      background: rgba(17, 17, 17, 0.5);
    }

    .rh-work-lightbox__arrow--previous { left: max(8px, env(safe-area-inset-left, 0px)); }
    .rh-work-lightbox__arrow--next { right: max(8px, env(safe-area-inset-right, 0px)); }
  }
`;
document.head.appendChild(style);

let activeLightboxCleanup: (() => void) | null = null;

function openLightbox(images: WorkImage[], startIndex = 0) {
  const usable = images.filter((image) => Boolean(image?.url));
  if (!usable.length) return;

  activeLightboxCleanup?.();

  let index = Math.max(0, Math.min(startIndex, usable.length - 1));
  let pointerStartX: number | null = null;
  const previousBodyOverflow = document.body.style.overflow;

  const overlay = document.createElement("div");
  overlay.className = "rh-work-lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Work image viewer");

  const image = document.createElement("img");
  image.className = "rh-work-lightbox__image";
  image.draggable = false;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "rh-work-lightbox__close";
  close.setAttribute("aria-label", "Close image viewer");
  close.textContent = "×";

  const previous = document.createElement("button");
  previous.type = "button";
  previous.className = "rh-work-lightbox__arrow rh-work-lightbox__arrow--previous";
  previous.setAttribute("aria-label", "Previous image");
  previous.textContent = "‹";

  const next = document.createElement("button");
  next.type = "button";
  next.className = "rh-work-lightbox__arrow rh-work-lightbox__arrow--next";
  next.setAttribute("aria-label", "Next image");
  next.textContent = "›";

  const counter = document.createElement("div");
  counter.className = "rh-work-lightbox__counter";

  const render = () => {
    const current = usable[index];
    image.src = current.url;
    image.alt = current.altText || `Work image ${index + 1}`;
    counter.textContent = `${index + 1} / ${usable.length}`;
    previous.hidden = usable.length <= 1;
    next.hidden = usable.length <= 1;
  };

  const move = (direction: -1 | 1) => {
    index = (index + direction + usable.length) % usable.length;
    render();
  };

  const cleanup = () => {
    if (!overlay.isConnected) return;
    window.removeEventListener("keydown", onKeyDown);
    overlay.remove();
    document.body.style.overflow = previousBodyOverflow;
    activeLightboxCleanup = null;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") cleanup();
    else if (event.key === "ArrowLeft") move(-1);
    else if (event.key === "ArrowRight") move(1);
  };

  close.addEventListener("click", cleanup);
  previous.addEventListener("click", () => move(-1));
  next.addEventListener("click", () => move(1));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) cleanup();
  });
  overlay.addEventListener("pointerdown", (event) => {
    pointerStartX = event.clientX;
  });
  overlay.addEventListener("pointerup", (event) => {
    if (pointerStartX == null) return;
    const delta = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(delta) < 42) return;
    move(delta > 0 ? -1 : 1);
  });
  overlay.addEventListener("pointercancel", () => {
    pointerStartX = null;
  });

  overlay.append(image, close, previous, next, counter);
  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
  window.addEventListener("keydown", onKeyDown);
  activeLightboxCleanup = cleanup;
  render();
  close.focus();
}

function decorateAdminWorkImages() {
  if (parseRoute(window.location.pathname).kind !== "admin") return;

  const headings = Array.from(document.querySelectorAll<HTMLElement>("h3"));
  const workEditorHeading = headings.find((heading) => {
    const text = heading.textContent?.trim();
    return text === "Add New Work" || text === "Edit Work";
  });
  const editor = workEditorHeading?.parentElement;
  if (!(editor instanceof HTMLElement)) return;

  const input = editor.querySelector<HTMLInputElement>('input[type="file"][accept*="image/jpeg"]');
  const uploadLabel = input?.closest("label");
  const grid = uploadLabel?.nextElementSibling;
  if (!(input instanceof HTMLInputElement) || !(grid instanceof HTMLElement)) return;

  grid.classList.add("rh-admin-work-image-grid");

  for (const slot of Array.from(grid.children)) {
    if (!(slot instanceof HTMLElement) || slot.dataset.rhWorkImageSlot === "true") continue;
    slot.dataset.rhWorkImageSlot = "true";
    slot.tabIndex = 0;
    slot.setAttribute("role", "button");

    const activate = (event?: Event) => {
      if (event?.target instanceof Element && event.target.closest("button")) return;
      const image = slot.querySelector<HTMLImageElement>("img");
      if (image?.src) {
        openLightbox([{ id: image.src, url: image.src, publicId: "", altText: image.alt, sortOrder: 0 }], 0);
      } else if (!input.disabled) {
        input.click();
      }
    };

    slot.addEventListener("click", activate);
    slot.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate(event);
    });
  }
}

let publicGalleryKey = "";
let publicGalleryRequest = 0;

async function decoratePublicWorkGallery() {
  const route = parseRoute(window.location.pathname);
  if (route.kind !== "work-detail") {
    publicGalleryKey = "";
    return;
  }

  const key = `${route.category}/${route.slug}`;
  const heading = document.querySelector<HTMLElement>("main h1");
  if (!heading) return;

  const oldMain = heading.nextElementSibling;
  const oldThumbs = oldMain?.nextElementSibling;
  if (!(oldMain instanceof HTMLElement)) return;

  const existing = oldMain.parentElement?.querySelector<HTMLElement>('[data-rh-work-stack-gallery="true"]');
  if (existing && publicGalleryKey === key) return;

  const requestId = ++publicGalleryRequest;
  const work = await loadPublicWorkBySlug(route.category, route.slug).catch((error) => {
    console.error("Unable to enhance Work gallery", error);
    return null;
  });
  if (requestId !== publicGalleryRequest || !work || parseRoute(window.location.pathname).kind !== "work-detail") return;

  const images = work.images.filter((image) => Boolean(image.url)).slice(0, 6);
  if (!images.length) return;

  oldMain.parentElement?.querySelector('[data-rh-work-stack-gallery="true"]')?.remove();

  const gallery = document.createElement("div");
  gallery.className = "rh-work-stack-gallery";
  gallery.dataset.rhWorkStackGallery = "true";

  const stage = document.createElement("button");
  stage.type = "button";
  stage.className = "rh-work-stack-stage";
  stage.setAttribute("aria-label", `Open ${work.title} image gallery`);
  const depth = Math.max(0, images.length - 1) * 14;
  stage.style.setProperty("--rh-stack-depth", `${depth}px`);

  const behind = images.slice(1).reverse();
  behind.forEach((imageData, reverseIndex) => {
    const originalIndex = images.length - 1 - reverseIndex;
    const card = document.createElement("span");
    card.className = "rh-work-stack-card";
    card.style.zIndex = String(10 - originalIndex);
    card.style.setProperty("--rh-stack-offset", `${originalIndex * 14}px`);
    card.style.setProperty("--rh-stack-scale", String(1 - originalIndex * 0.006));

    const img = document.createElement("img");
    img.src = imageData.url;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    card.appendChild(img);
    stage.appendChild(card);
  });

  const front = document.createElement("span");
  front.className = "rh-work-stack-card";
  front.style.zIndex = "20";
  front.style.setProperty("--rh-stack-offset", "0px");
  front.style.setProperty("--rh-stack-scale", "1");

  const frontImage = document.createElement("img");
  frontImage.src = images[0].url;
  frontImage.alt = images[0].altText || work.title;
  frontImage.loading = "eager";
  frontImage.decoding = "async";
  front.appendChild(frontImage);
  stage.appendChild(front);

  if (images.length > 1) {
    const count = document.createElement("span");
    count.className = "rh-work-stack-count";
    count.textContent = `${images.length} photos`;
    stage.appendChild(count);
  }

  stage.addEventListener("click", () => openLightbox(images, 0));
  gallery.appendChild(stage);
  oldMain.before(gallery);
  oldMain.hidden = true;
  oldMain.dataset.rhOriginalWorkGallery = "true";
  if (oldThumbs instanceof HTMLElement && oldThumbs.classList.contains("grid")) {
    oldThumbs.hidden = true;
    oldThumbs.dataset.rhOriginalWorkGallery = "true";
  }
  publicGalleryKey = key;
}

function syncEnhancements() {
  decorateAdminWorkImages();
  void decoratePublicWorkGallery();
}

const originalPushState = window.history.pushState;
window.history.pushState = function (data: unknown, unused: string, url?: string | URL | null) {
  originalPushState.call(window.history, data, unused, url);
  publicGalleryRequest += 1;
  publicGalleryKey = "";
  window.requestAnimationFrame(syncEnhancements);
};

const originalReplaceState = window.history.replaceState;
window.history.replaceState = function (data: unknown, unused: string, url?: string | URL | null) {
  originalReplaceState.call(window.history, data, unused, url);
  publicGalleryRequest += 1;
  publicGalleryKey = "";
  window.requestAnimationFrame(syncEnhancements);
};

window.addEventListener("popstate", () => {
  publicGalleryRequest += 1;
  publicGalleryKey = "";
  window.requestAnimationFrame(syncEnhancements);
});

const observer = new MutationObserver(() => syncEnhancements());
observer.observe(document.documentElement, { childList: true, subtree: true });

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", syncEnhancements, { once: true });
} else {
  syncEnhancements();
}
