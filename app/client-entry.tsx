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
  try {
    const encoded = audioPart00 + audioPart01 + audioPart02 + audioPart03;
    const binary = window.atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);

    const audioUrl = URL.createObjectURL(new Blob([bytes], { type: "audio/webm" }));
    const audio = document.createElement("audio");
    audio.src = audioUrl;
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.5;
    audio.muted = true;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("aria-hidden", "true");
    audio.style.display = "none";
    document.body.appendChild(audio);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "site-music-toggle";

    const soundIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Zm4.5 3.5a5 5 0 0 1 0 7M17.8 6a8 8 0 0 1 0 12"/></svg>`;
    const mutedIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Zm4.5 4.5 5 5m0-5-5 5"/></svg>`;
    const playIcon = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7-11-7Z"/></svg>`;

    let unlocked = false;

    const updateButton = () => {
      if (!unlocked || audio.paused) {
        button.setAttribute("aria-label", "Play background music");
        button.setAttribute("title", "Play music");
        button.innerHTML = `${playIcon}<span>Play Music</span>`;
        return;
      }

      if (audio.muted) {
        button.setAttribute("aria-label", "Unmute background music");
        button.setAttribute("title", "Unmute music");
        button.innerHTML = `${mutedIcon}<span>Sound Off</span>`;
        return;
      }

      button.setAttribute("aria-label", "Mute background music");
      button.setAttribute("title", "Mute music");
      button.innerHTML = `${soundIcon}<span>Mute</span>`;
    };

    const unlockSound = () => {
      audio.muted = false;
      const playPromise = audio.play();
      if (playPromise) {
        void playPromise.then(() => {
          unlocked = true;
          updateButton();
          removeUnlockListeners();
        }).catch((error) => {
          console.warn("Background music could not start after interaction", error);
          audio.muted = true;
          unlocked = false;
          updateButton();
        });
      }
    };

    const unlockFromGesture = () => {
      if (unlocked && !audio.paused) return;
      unlockSound();
    };

    const removeUnlockListeners = () => {
      document.removeEventListener("pointerdown", unlockFromGesture, true);
      document.removeEventListener("click", unlockFromGesture, true);
      document.removeEventListener("touchend", unlockFromGesture, true);
      document.removeEventListener("keydown", unlockFromGesture, true);
    };

    button.addEventListener("click", (event) => {
      event.stopPropagation();

      if (!unlocked || audio.paused) {
        unlockSound();
        return;
      }

      audio.muted = !audio.muted;
      updateButton();
    });

    audio.addEventListener("playing", updateButton);
    audio.addEventListener("pause", updateButton);
    audio.addEventListener("volumechange", updateButton);
    audio.addEventListener("error", () => {
      button.disabled = true;
      button.setAttribute("aria-label", "Music unavailable");
      button.setAttribute("title", "Music unavailable");
      button.innerHTML = `${playIcon}<span>Music unavailable</span>`;
      console.error("Background music media error", audio.error);
    });

    document.body.appendChild(button);
    updateButton();

    // Browsers consistently allow muted autoplay. Keep the track running muted,
    // then reveal the sound on the first genuine user gesture.
    void audio.play().then(() => {
      updateButton();
    }).catch((error) => {
      console.warn("Muted background music autoplay was blocked", error);
      updateButton();
    });

    document.addEventListener("pointerdown", unlockFromGesture, true);
    document.addEventListener("click", unlockFromGesture, true);
    document.addEventListener("touchend", unlockFromGesture, true);
    document.addEventListener("keydown", unlockFromGesture, true);

    window.addEventListener(
      "beforeunload",
      () => {
        removeUnlockListeners();
        audio.pause();
        URL.revokeObjectURL(audioUrl);
      },
      { once: true },
    );
  } catch (error) {
    console.error("Unable to initialize background music", error);
  }
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
