import { useCallback, useEffect, useState } from 'react';
import { NARRATION_VOLUME_STORAGE, readNarrationVolume } from './NarrationSpeech';
const volumeEvent = 'edu:narration-volume';
/** Share one output level between page narration and the classroom composer. */
export function useNarrationVolume() {
  const [volume, update] = useState(readNarrationVolume);
  useEffect(() => {
    const changed = () => update(readNarrationVolume());
    const local = (event: Event) => { const value = (event as CustomEvent<number>).detail; if (Number.isFinite(value)) update(Math.max(0, Math.min(500, value))); };
    const stored = (event: StorageEvent) => { if (event.key === NARRATION_VOLUME_STORAGE || event.key === null) changed(); };
    window.addEventListener(volumeEvent, local); window.addEventListener('storage', stored);
    return () => { window.removeEventListener(volumeEvent, local); window.removeEventListener('storage', stored); };
  }, []);
  const setVolume = useCallback((value: number) => {
    const bounded = Number.isFinite(value) ? Math.max(0, Math.min(500, value)) : 200;
    update(bounded);
    try { localStorage.setItem(NARRATION_VOLUME_STORAGE, String(bounded)); } catch { /* Playback still works without storage. */ }
    window.dispatchEvent(new CustomEvent(volumeEvent, { detail: bounded }));
  }, []);
  return [volume, setVolume] as const;
}
