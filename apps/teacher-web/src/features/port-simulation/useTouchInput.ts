import { useSyncExternalStore } from "react";

const query = "(any-pointer: coarse)";
const subscribe = (changed: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
};
export function useTouchInput() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}
