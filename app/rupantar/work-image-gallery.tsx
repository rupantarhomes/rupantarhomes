import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WorkPhoto } from "./shared";
import type { WorkImage } from "./types";
import "./work-image-gallery.css";

const pageGalleryWidths = [480, 768, 1200, 1600] as const;
const viewerGalleryWidths = [480, 768, 1200, 1920] as const;
const galleryPreloadCache = new Set<string>();
const galleryPreloaders = new Map<string, HTMLImageElement>();

type IdleWindow = Window & typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

type NetworkNavigator = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
};

function galleryDeliveryUrl(sourceUrl: string, width: number): string {
  try {
    const url = new URL(sourceUrl);
    const uploadMarker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(uploadMarker);
    if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || markerIndex < 0) return sourceUrl;
    const beforeUpload = url.pathname.slice(0, markerIndex + uploadMarker.length);
    const uploadedAsset = url.pathname.slice(markerIndex + uploadMarker.length);
    url.pathname = `${beforeUpload}c_limit,w_${width}/f_auto/q_auto:good/${uploadedAsset}`;
    return url.toString();
  } catch {
    return sourceUrl;
  }
}

function preloadGalleryImage(image: WorkImage, sizes: string, widths: readonly number[]) {
  const fallbackWidth = widths[widths.length - 1] ?? 768;
  const srcSet = widths.map((width) => `${galleryDeliveryUrl(image.url, width)} ${width}w`).join(", ");
  const cacheKey = `${image.url}|${sizes}|${srcSet}`;
  if (galleryPreloadCache.has(cacheKey)) return;

  galleryPreloadCache.add(cacheKey);
  const preload = new Image();
  preload.decoding = "async";
  preload.fetchPriority = "low";
  preload.sizes = sizes;
  preload.srcset = srcSet;
  preload.src = galleryDeliveryUrl(image.url, fallbackWidth);
  galleryPreloaders.set(cacheKey, preload);

  preload.onload = () => {
    void preload.decode().catch(() => undefined).finally(() => galleryPreloaders.delete(cacheKey));
  };
  preload.onerror = () => {
    galleryPreloaders.delete(cacheKey);
    galleryPreloadCache.delete(cacheKey);
  };
}

function useGalleryPreload(images: WorkImage[], activeIndex: number, sizes: string, widths: readonly number[]) {
  useEffect(() => {
    if (typeof window === "undefined" || images.length < 2) return;

    const connection = (navigator as NetworkNavigator).connection;
    const constrained = connection?.saveData === true || connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g";
    const unique = (indices: number[]) => [...new Set(indices)].filter((index) => index >= 0 && index < images.length && index !== activeIndex);
    const nearby = unique(constrained ? [activeIndex + 1] : [activeIndex + 1, activeIndex - 1, activeIndex + 2]);
    nearby.forEach((index) => preloadGalleryImage(images[index], sizes, widths));
    if (constrained) return;

    const remaining = images.map((_, index) => index).filter((index) => index !== activeIndex && !nearby.includes(index));
    if (!remaining.length) return;

    const idleWindow = window as IdleWindow;
    let idleHandle: number | undefined;
    const timer = window.setTimeout(() => {
      const loadRemaining = () => remaining.forEach((index) => preloadGalleryImage(images[index], sizes, widths));
      if (idleWindow.requestIdleCallback) idleHandle = idleWindow.requestIdleCallback(loadRemaining, { timeout: 1200 });
      else loadRemaining();
    }, 900);

    return () => {
      window.clearTimeout(timer);
      if (idleHandle !== undefined) idleWindow.cancelIdleCallback?.(idleHandle);
    };
  }, [activeIndex, images, sizes, widths]);
}

export function WorkImageViewer({ images, title, initialIndex = 0, onClose }: {
  images: WorkImage[];
  title: string;
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.max(0, Math.min(initialIndex, images.length - 1)));
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const pointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const lastIndex = images.length - 1;
  const selectedIndex = Math.max(0, Math.min(index, lastIndex));
  const move = (direction: number) => setIndex((current) => Math.max(0, Math.min(current + direction, lastIndex)));
  useGalleryPreload(images, selectedIndex, "100vw", viewerGalleryWidths);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const scrollY = window.scrollY;
    const body = document.body;
    const saved = { position: body.style.position, top: body.style.top, width: body.style.width,
      overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbar > 0) body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`;
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const siblings = Array.from(body.children).filter((element): element is HTMLElement =>
      element instanceof HTMLElement && element !== dialogRef.current);
    const inertStates = siblings.map((element) => element.inert);
    siblings.forEach((element) => { element.inert = true; });
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close.current(); }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((current) => Math.max(0, Math.min(current + (event.key === "ArrowRight" ? 1 : -1), lastIndex)));
      }
      if (event.key === "Tab") {
        const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      siblings.forEach((element, i) => { element.inert = inertStates[i]; });
      Object.assign(body.style, saved);
      const scrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, scrollY);
      document.documentElement.style.scrollBehavior = scrollBehavior;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [lastIndex]);

  if (!images[selectedIndex]) return null;
  return createPortal(
    <div ref={dialogRef} className="rh-native-work-viewer" role="dialog" aria-modal="true" aria-label={`${title} image viewer`}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <button ref={closeRef} type="button" className="rh-native-work-close" aria-label="Close image viewer" onClick={onClose}><X size={22} /></button>
      <div className="rh-native-work-stage"
        onTouchStart={(event) => {
          touchStart.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
        }}
        onTouchCancel={() => { touchStart.current = null; }}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start || event.touches.length || !event.changedTouches[0]) return;
          const dx = event.changedTouches[0].clientX - start.x;
          const dy = event.changedTouches[0].clientY - start.y;
          if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") return;
          pointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          if (pointerStart.current?.id === event.pointerId) pointerStart.current = null;
        }}
        onPointerUp={(event) => {
          if (event.pointerType === "touch") return;
          const start = pointerStart.current;
          pointerStart.current = null;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5) move(dx < 0 ? 1 : -1);
        }}>
        <WorkPhoto key={images[selectedIndex].id} image={images[selectedIndex]} alt={title} aspect="rh-native-work-viewer-photo" eager sizes="100vw" widths={viewerGalleryWidths} />
      </div>
      {images.length > 1 && <>
        <div className="rh-native-work-dots rh-native-work-viewer-dots" role="group" aria-label="Choose gallery image">
          {images.map((image, dotIndex) => (
            <button key={image.id} type="button" className={`rh-native-work-dot${dotIndex === selectedIndex ? " is-active" : ""}`}
              aria-label={`View image ${dotIndex + 1} of ${images.length}`} aria-current={dotIndex === selectedIndex ? "true" : undefined}
              onClick={() => setIndex(dotIndex)} />
          ))}
        </div>
        <div className="rh-native-work-viewer-hint">Swipe to view more images</div>
      </>}
      <div className="rh-native-work-counter" aria-live="polite" aria-atomic="true">{selectedIndex + 1} / {images.length}</div>
    </div>, document.body,
  );
}

export function WorkImageGallery({ images, title }: { images: WorkImage[]; title: string }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const pageTouchStart = useRef<{ x: number; y: number } | null>(null);
  const pagePointerStart = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressOpenUntil = useRef(0);
  const lastIndex = images.length - 1;
  const currentPageIndex = images.length ? Math.max(0, Math.min(pageIndex, lastIndex)) : 0;
  useGalleryPreload(images, currentPageIndex, "(min-width: 1024px) 520px, 100vw", pageGalleryWidths);
  if (!images.length) return <WorkPhoto alt={title} aspect="aspect-square" label="Main Gallery Photo Coming Soon" />;
  const current = images[currentPageIndex];
  const movePage = (direction: number) => setPageIndex((active) => Math.max(0, Math.min(active + direction, lastIndex)));
  const finishPageSwipe = (dx: number, dy: number) => {
    if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      suppressOpenUntil.current = Date.now() + 350;
      movePage(dx < 0 ? 1 : -1);
    }
  };

  return (
    <div data-native-work-gallery className="rh-native-work-gallery">
      <div className="rh-native-work-stack"
        onTouchStart={(event) => {
          pageTouchStart.current = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
        }}
        onTouchCancel={() => { pageTouchStart.current = null; }}
        onTouchEnd={(event) => {
          const start = pageTouchStart.current;
          pageTouchStart.current = null;
          if (!start || event.touches.length || !event.changedTouches[0]) return;
          finishPageSwipe(event.changedTouches[0].clientX - start.x, event.changedTouches[0].clientY - start.y);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") return;
          pagePointerStart.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerCancel={(event) => {
          if (pagePointerStart.current?.id === event.pointerId) pagePointerStart.current = null;
        }}
        onPointerUp={(event) => {
          if (event.pointerType === "touch") return;
          const start = pagePointerStart.current;
          pagePointerStart.current = null;
          if (!start || start.id !== event.pointerId) return;
          finishPageSwipe(event.clientX - start.x, event.clientY - start.y);
        }}>
        <button type="button" className="rh-native-work-front" style={{ zIndex: images.length }} aria-label={`Open ${title} image gallery`} onClick={() => {
          if (Date.now() < suppressOpenUntil.current) return;
          setSelectedIndex(currentPageIndex);
        }}>
          <WorkPhoto key={current.id} image={current} alt={title} aspect="rh-native-work-stack-photo" eager sizes="(min-width: 1024px) 520px, 100vw" widths={pageGalleryWidths} />
        </button>
        {images.length > 1 && <div className="rh-native-work-dots rh-native-work-page-dots" role="group" aria-label="Choose gallery image">
          {images.map((image, dotIndex) => (
            <button key={image.id} type="button" className={`rh-native-work-dot${dotIndex === currentPageIndex ? " is-active" : ""}`}
              aria-label={`View image ${dotIndex + 1} of ${images.length}`} aria-current={dotIndex === currentPageIndex ? "true" : undefined}
              onClick={() => setPageIndex(dotIndex)} />
          ))}
        </div>}
      </div>
      {images.length > 1 && <div className="rh-native-work-swipe-hint">Swipe to view more images</div>}
      {selectedIndex !== null && <WorkImageViewer images={images} title={title} initialIndex={selectedIndex} onClose={() => setSelectedIndex(null)} />}
    </div>
  );
}
