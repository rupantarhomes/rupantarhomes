"use client";

import { useEffect, useState } from "react";

export function BrandIntro({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(enabled);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove("brand-intro-pending");
    if (!enabled) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const blankDelay = 400;
    const revealDuration = reduceMotion ? 0 : 700;
    const holdDuration = 1_800;
    const exitDuration = reduceMotion ? 40 : 1_000;
    const exitDelay = blankDelay + revealDuration + holdDuration;
    const removeDelay = exitDelay + exitDuration;

    const revealTimer = window.setTimeout(() => setLeaving(true), exitDelay);
    const removeTimer = window.setTimeout(() => setVisible(false), removeDelay);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(removeTimer);
    };
  }, [enabled]);

  if (!visible) return null;

  return (
    <div
      className={`brand-intro${leaving ? " brand-intro--leaving" : ""}`}
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <div className="brand-intro__glow" />
      <div className="brand-intro__content">
        <div className="brand-intro__mark-wrap">
          <img
            src="/assets/rupantar-logo.jpg"
            alt=""
            className="brand-intro__mark"
          />
        </div>
        <div className="brand-intro__name">Rupantar Homes</div>
        <div className="brand-intro__slogan">Transforming Spaces Inspiring Lives</div>
      </div>
      <div className="brand-intro__edge" />
    </div>
  );
}
