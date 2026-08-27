import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("hero uses the eight-image dissolve slideshow without changing hero geometry", async () => {
  const source = await readFile(new URL("../app/rupantar/home-page.tsx", import.meta.url), "utf8");
  const required = [
    "const heroSlides", "new window.Image()", "setHeroSlideIndex(nextIndex)",
    "2000", "opacity 800ms ease-in-out", "data-hero-background=\"true\"",
    "position: \"absolute\"", "inset: 0", "width: \"100%\"",
    "height: \"100%\"", "objectFit: \"cover\"",
    "background: \"rgba(0, 0, 0, 0.38)\"",
    "min-height: calc(100vh - 201px)", "min-height: calc(100vh - 261px)",
    "const mobileHeroMedia = \"(max-width: 639px)\"", "<picture", "<source",
    "media={mobileHeroMedia}", "srcSet={slide.mobile}", "src={slide.desktop}",
    "window.matchMedia(mobileHeroMedia).matches", "image.src = nextSource",
  ];
  for (const value of required) assert.equal(source.includes(value), true, value);
  const desktopPaths = Array.from(source.matchAll(/desktop: "(\/hero-real-(\d)-v2\.webp)"/g));
  const mobilePaths = Array.from(source.matchAll(/mobile: "(\/hero-real-(\d)-mobile\.webp)"/g));
  assert.deepEqual(desktopPaths.map((match) => match[1]), Array.from({ length: 8 }, (_, index) => `/hero-real-${index + 1}-v2.webp`));
  assert.deepEqual(mobilePaths.map((match) => match[1]), Array.from({ length: 8 }, (_, index) => `/hero-real-${index + 1}-mobile.webp`));
  assert.deepEqual(desktopPaths.map((match) => match[2]), mobilePaths.map((match) => match[2]));
  assert.equal(source.includes("<video"), false);
  assert.equal(source.includes("rupantar-hero-loop-web.mp4"), false);
  assert.equal(source.includes("heroVideo"), false);
});
