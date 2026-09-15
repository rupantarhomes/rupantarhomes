"use client";

import { useEffect, useState } from "react";

export function BrandIntro({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(enabled);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const bootstrap = document.getElementById("brand-intro-bootstrap");
    if (!enabled) {
      bootstrap?.remove();
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealDelay = 1_800;
    const removeDelay = revealDelay + (reduceMotion ? 40 : 1_040);

    const revealTimer = window.setTimeout(() => {
      bootstrap?.classList.add("brand-intro--leaving");
      setLeaving(true);
    }, revealDelay);
    const removeTimer = window.setTimeout(() => {
      bootstrap?.remove();
      setVisible(false);
    }, removeDelay);

    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(removeTimer);
    };
  }, [enabled]);

  if (!visible || (typeof document !== "undefined" && document.getElementById("brand-intro-bootstrap"))) return null;

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
    </div>
  );
}
