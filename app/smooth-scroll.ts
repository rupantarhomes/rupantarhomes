const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");

let animationFrame = 0;
let currentPosition = window.scrollY;
let targetPosition = window.scrollY;

function maximumScroll(): number {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

function cancelAnimation(): void {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  currentPosition = window.scrollY;
  targetPosition = window.scrollY;
}

function hasIndependentScroller(target: EventTarget | null): boolean {
  let element = target instanceof Element ? target : null;

  while (element && element !== document.documentElement) {
    const style = window.getComputedStyle(element);
    if (
      /(auto|scroll)/.test(style.overflowY) &&
      element.scrollHeight > element.clientHeight + 1
    ) {
      return true;
    }
    element = element.parentElement;
  }

  return false;
}

function animateScroll(): void {
  const distance = targetPosition - currentPosition;
  currentPosition += distance * 0.18;

  if (Math.abs(distance) < 0.5) {
    window.scrollTo(0, targetPosition);
    animationFrame = 0;
    return;
  }

  window.scrollTo(0, currentPosition);
  animationFrame = requestAnimationFrame(animateScroll);
}

function handleWheel(event: WheelEvent): void {
  if (
    event.defaultPrevented ||
    event.ctrlKey ||
    reducedMotion.matches ||
    !finePointer.matches ||
    hasIndependentScroller(event.target)
  ) {
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  if (target?.closest("input, textarea, select, [contenteditable='true']")) return;

  const multiplier = event.deltaMode === WheelEvent.DOM_DELTA_LINE
    ? 16
    : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
      ? window.innerHeight
      : 1;
  const delta = event.deltaY * multiplier;
  if (!delta) return;

  event.preventDefault();
  if (!animationFrame) {
    currentPosition = window.scrollY;
    targetPosition = window.scrollY;
  }
  targetPosition = Math.min(maximumScroll(), Math.max(0, targetPosition + delta));
  if (!animationFrame) animationFrame = requestAnimationFrame(animateScroll);
}

window.addEventListener("wheel", handleWheel, { passive: false });
window.addEventListener("resize", cancelAnimation, { passive: true });
window.addEventListener("mousedown", cancelAnimation, { passive: true });
window.addEventListener("touchstart", cancelAnimation, { passive: true });
window.addEventListener("keydown", cancelAnimation, { passive: true });
reducedMotion.addEventListener("change", cancelAnimation);
finePointer.addEventListener("change", cancelAnimation);


