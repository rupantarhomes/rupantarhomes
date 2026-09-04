"use client";

import { useEffect, useState } from "react";

export function BrandIntro({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(enabled);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealDelay = reduceMotion ? 180 : 1500;
    const removeDelay = reduceMotion ? 320 : 2500;

    const revealTimer = window.setTimeout(() => setLeaving(true), revealDelay);
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
