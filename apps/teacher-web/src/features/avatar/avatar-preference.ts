import { live2dModels, type Live2DCharacter } from "./live2d-models";
import { useSyncExternalStore } from "react";

export type AvatarRenderer = "live2d" | "video" | "lam";
const key = "edu-avatar-renderer-v1";
const eventName = "edu-avatar-renderer-change";
let memory: AvatarRenderer | undefined;
export function getAvatarRenderer(): AvatarRenderer {
  try {
    const saved = localStorage.getItem(key);
    // Retired LAM preferences resolve to Xiaomai without loading its GPU runtime.
    if (saved === "lam") return "live2d";
    if (saved === "live2d" || saved === "video") return saved;
  } catch { /* Private browsing can disable storage. */ }
  return memory === "video" ? "video" : "live2d";
}
export function setAvatarRenderer(value: AvatarRenderer) {
  memory = value;
  try { localStorage.setItem(key, value); } catch { /* Keep the in-memory choice. */ }
  window.dispatchEvent(new Event(eventName));
}
function subscribe(callback: () => void) {
  window.addEventListener(eventName, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener("storage", callback);
  };
}
export function useAvatarRenderer() {
  return useSyncExternalStore(subscribe, getAvatarRenderer, () => "live2d" as const);
}

export type AvatarFraming = "bust" | "portrait";
let framingMemory: AvatarFraming = "bust";
function getAvatarFraming(): AvatarFraming {
  try { const value = localStorage.getItem("edu-avatar-framing-v1"); if (value === "bust" || value === "portrait") return value; } catch { /* Storage is optional. */ }
  return framingMemory;
}
export function setAvatarFraming(value: AvatarFraming) {
  framingMemory = value;
  try { localStorage.setItem("edu-avatar-framing-v1", value); } catch { /* Keep the in-memory choice. */ }
  window.dispatchEvent(new Event(eventName));
}
export function useAvatarFraming() {
  return useSyncExternalStore(subscribe, getAvatarFraming, () => "bust" as const);
}

export function getLive2DCharacter(): Live2DCharacter {
  // Xiaomai is the only released Live2D character. Old Haru/Natori/Hiyori
  // choices must also migrate, including their voice, on classroom/study entry.
  return "xiaomai";
}
export function setLive2DCharacter(_value: Live2DCharacter) {
  try { localStorage.setItem("edu-live2d-character-v1", "xiaomai"); } catch { /* Storage is optional. */ }
  window.dispatchEvent(new Event(eventName));
}
export function useLive2DCharacter() {
  return useSyncExternalStore(subscribe, getLive2DCharacter, () => "xiaomai" as const);
}
export function getAvatarVoice(): "default" | "natori" | "hiyori" {
  const character = getLive2DCharacter();
  return getAvatarRenderer() === "live2d" ? live2dModels[character].voice : "default";
}
