import { ChevronLeft, ChevronRight } from "lucide-react";

const facebookUrl = "https://www.facebook.com/rupantarbygokulkunwar";

function FacebookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="w-4 h-4"><path fill="currentColor" d="M14 8h3V4h-3c-3.3 0-5 2-5 5v3H6v4h3v8h4v-8h3.5l.5-4H13V9c0-.7.3-1 1-1Z" /></svg>;
}

export function FacebookConnectLink() {
  return <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="rh-facebook-connect h-11 px-6 rounded-full bg-white border border-zinc-200 text-[13px] font-medium flex items-center gap-2 hover:border-[#FF1A3D]/30 transition"><FacebookIcon /> Facebook</a>;
}

export function FacebookFooterLink() {
  return <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="rh-facebook-footer w-9 h-9 rounded-full bg-white/10 border border-white/10 text-white flex items-center justify-center hover:border-[#FF1A3D]/50 transition"><FacebookIcon /></a>;
}

export function AdminFooterLink() {
  return <a href="/admin" aria-label="Open admin portal" className="text-[11px] leading-none text-zinc-400 no-underline transition-colors hover:text-white">000</a>;
}

export function ReviewControls() {
  const scroll = (event: React.MouseEvent<HTMLButtonElement>, direction: -1 | 1) => {
    const track = event.currentTarget.closest("section")?.querySelector<HTMLElement>(".rh-review-section .grid");
    const card = track?.querySelector<HTMLElement>(".rh-review-card");
    if (!track || !card) return;
    const styles = window.getComputedStyle(track);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "20") || 20;
    track.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: "smooth" });
  };
  return <span className="rh-review-controls" role="group" aria-label="Review carousel controls">
    <button type="button" className="rh-review-arrow" aria-label="Previous review" onClick={(event) => scroll(event, -1)}><ChevronLeft /></button>
    <button type="button" className="rh-review-arrow" aria-label="Next review" onClick={(event) => scroll(event, 1)}><ChevronRight /></button>
  </span>;
}
