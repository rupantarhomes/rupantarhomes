const WORK_CARD_CLASS = "rh-work-card";
const MEDIA_SHELL_CLASS = "rh-work-media-shell";
const MEDIA_SLOT_CLASS = "rh-work-media-slot";
const LOCATION_SOURCE_CLASS = "rh-work-location-source";
const LOCATION_OVERLAY_CLASS = "rh-work-location";
const DETAIL_IMAGE_CLASS = "rh-work-detail-image";

function activateCardMediaSlot(mediaSlot: HTMLElement, card: HTMLElement, body: HTMLElement) {
  if (mediaSlot.dataset.rhCardMediaReady === "true") return;
  mediaSlot.dataset.rhCardMediaReady = "true";
  mediaSlot.style.cursor = "pointer";
  mediaSlot.setAttribute("role", "button");
  mediaSlot.setAttribute("tabindex", "0");
  mediaSlot.setAttribute("aria-label", "Open project details");

  const openProject = () => {
    if (card.getAttribute("role") === "button") {
      card.click();
      return;
    }

    const viewDetailsButton = Array.from(body.querySelectorAll<HTMLButtonElement>("button")).find((button) =>
      button.textContent?.includes("View Details"),
    );
    viewDetailsButton?.click();
  };

  mediaSlot.addEventListener("click", (event) => {
    event.stopPropagation();
    openProject();
  });

  mediaSlot.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    openProject();
  });
}

function enhanceWorkCards() {
  const mediaShells = document.querySelectorAll<HTMLElement>("article > .p-3, [role='button'] > .p-3");

  mediaShells.forEach((mediaShell) => {
    const card = mediaShell.parentElement;
    const body = mediaShell.nextElementSibling as HTMLElement | null;
    const mediaSlot = mediaShell.firstElementChild as HTMLElement | null;
    if (!card || !body || !mediaSlot) return;

    const locationIcon = body.querySelector<SVGElement>(".lucide-map-pin");
    const locationSource = locationIcon?.parentElement as HTMLElement | null;
    if (!locationSource) return;

    card.classList.add(WORK_CARD_CLASS);
    mediaShell.classList.add(MEDIA_SHELL_CLASS);
    mediaSlot.classList.add(MEDIA_SLOT_CLASS);
    locationSource.classList.add(LOCATION_SOURCE_CLASS);
    activateCardMediaSlot(mediaSlot, card, body);

    const locationText = locationSource.textContent?.trim() ?? "";
    const existingOverlay = mediaSlot.querySelector<HTMLElement>(`:scope > .${LOCATION_OVERLAY_CLASS}`);

    if (!locationText) {
      existingOverlay?.remove();
      return;
    }

    if (existingOverlay?.dataset.locationText === locationText) return;
    existingOverlay?.remove();

    const overlay = locationSource.cloneNode(true) as HTMLElement;
    overlay.removeAttribute("class");
    overlay.classList.add(LOCATION_OVERLAY_CLASS);
    overlay.dataset.locationText = locationText;
    overlay.setAttribute("aria-label", `Project location: ${locationText}`);
    mediaSlot.appendChild(overlay);
  });
}

function isWorkDetailPage(main: HTMLElement) {
  const text = main.textContent ?? "";
  return text.includes("Back to Works") && text.includes("Project Overview");
}

function detailGalleryImages() {
  const mains = Array.from(document.querySelectorAll<HTMLElement>("main"));
  const detailMain = mains.find(isWorkDetailPage);
  if (!detailMain) return [] as HTMLImageElement[];

  const layout = Array.from(detailMain.children).find((child) => {
    return child instanceof HTMLElement && child.classList.contains("grid") && child.textContent?.includes("Project Overview");
  }) as HTMLElement | undefined;
  const galleryColumn = layout?.firstElementChild as HTMLElement | null;
  if (!galleryColumn) return [] as HTMLImageElement[];

  return Array.from(galleryColumn.querySelectorAll<HTMLImageElement>("img"))
    .filter((image) => !image.closest("[data-native-work-gallery]"));
}

function lightboxImageUrl(source: string) {
  try {
    const url = new URL(source, window.location.href);
    if (url.hostname !== "res.cloudinary.com") return url.toString();
    url.pathname = url.pathname.replace(
      /\/image\/upload\/c_limit,w_\d+\/f_auto\/q_auto:good\//,
      "/image/upload/c_limit,w_2000/f_auto/q_auto:good/",
    );
    return url.toString();
  } catch {
    return source;
  }
}

type LightboxController = {
  open: (index: number) => void;
};

let lightboxController: LightboxController | null = null;

function getLightboxController(): LightboxController {
  if (lightboxController) return lightboxController;

  const overlay = document.createElement("div");
  overlay.className = "rh-work-lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Project image viewer");
  overlay.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.className = "rh-work-lightbox-image";
  image.alt = "";

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "rh-work-lightbox-close";
  closeButton.setAttribute("aria-label", "Close image viewer");
  closeButton.textContent = "×";

  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.className = "rh-work-lightbox-nav rh-work-lightbox-prev";
  previousButton.setAttribute("aria-label", "Previous image");
  previousButton.textContent = "‹";

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "rh-work-lightbox-nav rh-work-lightbox-next";
  nextButton.setAttribute("aria-label", "Next image");
  nextButton.textContent = "›";

  const counter = document.createElement("div");
  counter.className = "rh-work-lightbox-counter";

  const stage = document.createElement("div");
  stage.className = "rh-work-lightbox-stage";
  stage.append(image, counter);
  overlay.append(closeButton, previousButton, stage, nextButton);
  document.body.appendChild(overlay);

  let currentIndex = 0;
  let sources: HTMLImageElement[] = [];
  let previousBodyOverflow = "";

  const render = () => {
    const current = sources[currentIndex];
    if (!current) return;
    image.src = lightboxImageUrl(current.currentSrc || current.src);
    image.alt = current.alt || "Project image";
    counter.textContent = `${currentIndex + 1} / ${sources.length}`;
    const multiple = sources.length > 1;
    previousButton.hidden = !multiple;
    nextButton.hidden = !multiple;
    counter.hidden = !multiple;
  };

  const close = () => {
    if (!overlay.classList.contains("is-open")) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = previousBodyOverflow;
    image.removeAttribute("src");
  };

  const move = (direction: number) => {
    if (sources.length < 2) return;
    currentIndex = (currentIndex + direction + sources.length) % sources.length;
    render();
  };

  closeButton.addEventListener("click", close);
  previousButton.addEventListener("click", () => move(-1));
  nextButton.addEventListener("click", () => move(1));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  document.addEventListener("keydown", (event) => {
    if (!overlay.classList.contains("is-open")) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  });

  lightboxController = {
    open(index) {
      sources = detailGalleryImages();
      if (!sources.length) return;
      currentIndex = Math.max(0, Math.min(index, sources.length - 1));
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      overlay.classList.add("is-open");
      overlay.setAttribute("aria-hidden", "false");
      render();
      closeButton.focus({ preventScroll: true });
    },
  };

  return lightboxController;
}

function enhanceWorkDetailGallery() {
  const images = detailGalleryImages();
  if (!images.length) return;
  const controller = getLightboxController();

  images.forEach((image, index) => {
    const slot = image.parentElement;
    if (!(slot instanceof HTMLElement) || slot.dataset.rhLightboxReady === "true") return;

    slot.dataset.rhLightboxReady = "true";
    slot.style.cursor = "zoom-in";
    slot.setAttribute("role", "button");
    slot.setAttribute("tabindex", "0");
    slot.setAttribute("aria-label", `${image.alt || "Project image"}. Open full image.`);
    image.classList.add(DETAIL_IMAGE_CLASS);
    image.removeAttribute("role");
    image.removeAttribute("tabindex");

    slot.addEventListener("click", () => controller.open(index));
    slot.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      controller.open(index);
    });
  });
}

function enhance() {
  enhanceWorkCards();
  enhanceWorkDetailGallery();
}

export function initWorkMediaEnhancements() {
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      enhance();
    });
  };

  schedule();

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
}
