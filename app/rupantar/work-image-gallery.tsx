import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { WorkPhoto } from "./shared";
import type { WorkImage } from "./types";
import "./work-image-gallery.css";

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
  const close = useRef(onClose);
  close.current = onClose;
  const lastIndex = images.length - 1;
  const selectedIndex = Math.max(0, Math.min(index, lastIndex));
  const move = (direction: number) => setIndex((current) => Math.max(0, Math.min(current + direction, lastIndex)));

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
    // Keep the rest of the application out of the modal's keyboard/accessibility tree.
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
        }}>
        <WorkPhoto key={images[selectedIndex].id} image={images[selectedIndex]} alt={title} aspect="rh-native-work-viewer-photo" eager sizes="100vw" widths={[480, 768, 1200, 1920]} />
      </div>
      {images.length > 1 && <>
        <button type="button" className="rh-native-work-prev" aria-label="Previous image" disabled={selectedIndex === 0} onClick={() => move(-1)}><ArrowLeft size={22} /></button>
        <button type="button" className="rh-native-work-next" aria-label="Next image" disabled={selectedIndex === lastIndex} onClick={() => move(1)}><ArrowRight size={22} /></button>
      </>}
      <div className="rh-native-work-counter" aria-live="polite" aria-atomic="true">{selectedIndex + 1} / {images.length}</div>
    </div>, document.body,
  );
}

export function WorkImageGallery({ images, title }: { images: WorkImage[]; title: string }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  if (!images.length) return <WorkPhoto alt={title} aspect="aspect-square" label="Main Gallery Photo Coming Soon" />;
  const first = images[0];
  const aspectRatio = first.width && first.height ? `${first.width} / ${first.height}` : "16 / 10";
  return (
    <div data-native-work-gallery className="rh-native-work-gallery" style={{ paddingBottom: (images.length - 1) * 10 }}>
      <div className="rh-native-work-stack" style={{ aspectRatio }}>
        {images.slice(1).map((image, index) => (
          <div key={image.id} className="rh-native-work-rear" aria-hidden="true"
            style={{ inset: `0 ${(index + 1) * 5}px`, transform: `translateY(${(index + 1) * 10}px)`, zIndex: images.length - index - 1 }}>
            <WorkPhoto image={image} alt={title} aspect="rh-native-work-stack-photo" sizes="160px" widths={[96, 160, 240]} />
          </div>
        ))}
        <button type="button" className="rh-native-work-front" style={{ zIndex: images.length }} aria-label={`Open ${title} image gallery`} onClick={() => setSelectedIndex(0)}>
          <WorkPhoto key={first.id} image={first} alt={title} aspect="rh-native-work-stack-photo" eager sizes="(min-width: 1024px) 520px, 100vw" widths={[480, 768, 1200, 1600]} />
        </button>
      </div>
      {selectedIndex !== null && <WorkImageViewer images={images} title={title} initialIndex={selectedIndex} onClose={() => setSelectedIndex(null)} />}
    </div>
  );
}
