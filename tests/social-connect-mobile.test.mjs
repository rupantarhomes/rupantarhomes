import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const home = fs.readFileSync(new URL("../app/rupantar/home-page.tsx", import.meta.url), "utf8");
const social = fs.readFileSync(new URL("../app/social-links-enhancer.css", import.meta.url), "utf8");

test("Connect With Us keeps all three social actions inside the mobile card", () => {
  assert.match(home, /<h3[^>]*>Connect With Us<\/h3>/);
  assert.match(home, /settings\.instagram[\s\S]*Instagram[\s\S]*settings\.tiktok[\s\S]*TikTok[\s\S]*<FacebookConnectLink \/>/);
  assert.match(social, /@media \(max-width: 639px\)[\s\S]*section\[class~="py-10"\]\[class~="sm:py-12"\][\s\S]*grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(social, /max-width: 100%[\s\S]*justify-content: center[\s\S]*white-space: nowrap[\s\S]*overflow: hidden/);
  assert.match(social, /> a > svg,[\s\S]*width: 15px !important[\s\S]*height: 15px !important[\s\S]*flex: 0 0 15px/);
});

test("extra-small phones keep Facebook visible instead of allowing horizontal clipping", () => {
  assert.match(social, /@media \(max-width: 359px\)[\s\S]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(social, /> a:last-child[\s\S]*grid-column: 1 \/ -1/);
});
