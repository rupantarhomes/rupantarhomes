import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import { RupantarSite } from "./rupantar/site";
import { audioPart00 } from "./rupantar/audio-part-00";
import { audioPart01 } from "./rupantar/audio-part-01";
import { audioPart02 } from "./rupantar/audio-part-02";
import { audioPart03 } from "./rupantar/audio-part-03";

const root = document.getElementById("root");

if (!root) throw new Error("Rupantar Homes root element was not found.");

createRoot(root).render(
  <StrictMode>
    <RupantarSite />
  </StrictMode>,
);

function keepFounderLabelCurrent() {
  const update = () => {
    for (const element of document.querySelectorAll("span")) {
      if (element.textContent?.trim() !== "Est. 2019") continue;
      element.textContent = "GOKUL KUNWAR";
      element.classList.add("font-heading", "founder-inline-name");
    }
  };

  update();
  const observer = new MutationObserver(update);
  observer.observe(document.body, { childList: true, subtree: true });
}

function installBackgroundMusic() {
  const encoded = audioPart00 + audioPart01 + audioPart02 + audioPart03;
  const binary = window.atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

  const audioUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/webm; codecs=opus" }));
  const audio = new Audio(audioUrl);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.34;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "site-music-toggle";

  const updateButton = () => {
    const muted = audio.muted;
    button.setAttribute("aria-label", muted ? "Unmute background music" : "Mute background music");
    button.setAttribute("title", muted ? "Unmute music" : "Mute music");
    button.innerHTML = muted
      ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Zm4.5 4.5 5 5m0-5-5 5"/></svg><span>Music</span>`
      : `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M17.8 6a8 8 0 0 1 0 12"/></svg><span>Mute</span>`;
  };

  button.addEventListener("click", () => {
    audio.muted = !audio.muted;
    if (audio.paused) void audio.play().catch(() => undefined);
    updateButton();
  });

  document.body.appendChild(button);
  updateButton();

  const startAudio = () => {
    void audio.play().then(() => {
      updateButton();
      document.removeEventListener("pointerdown", startAudio);
      document.removeEventListener("keydown", startAudio);
    }).catch(() => undefined);
  };

  void audio.play().catch(() => {
    document.addEventListener("pointerdown", startAudio, { once: true });
    document.addEventListener("keydown", startAudio, { once: true });
  });

  window.addEventListener("beforeunload", () => URL.revokeObjectURL(audioUrl), { once: true });
}

const bootEnhancements = () => {
  keepFounderLabelCurrent();
  installBackgroundMusic();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootEnhancements, { once: true });
} else {
  bootEnhancements();
}
