import { useSyncExternalStore } from "react";

export type AvatarRenderer = "live2d" | "video" | "lam";
const key = "edu-avatar-renderer-v1";
const eventName = "edu-avatar-renderer-change";
let memory: AvatarRenderer | undefined;
export function getAvatarRenderer(): AvatarRenderer {
  try {
    const saved = localStorage.getItem(key);
    if (saved === "live2d" || saved === "video" || saved === "lam") return saved;
  } catch { /* Private browsing can disable storage. */ }
  return memory ?? "live2d";
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
