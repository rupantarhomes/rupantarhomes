"use client";

import { useEffect, useState } from "react";

export function BrandIntro({ enabled }: { enabled: boolean }) {
  const [visible, setVisible] = useState(enabled);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealDelay = reduceMotion ? 250 : 980;
    const removeDelay = reduceMotion ? 500 : 1500