interface FullscreenTarget {
  requestFullscreen?: () => Promise<void>;
}
interface FullscreenDocument {
  fullscreenElement: FullscreenTarget | null;
  exitFullscreen?: () => Promise<void>;
}

/** A rejected screen request must never silently become page fullscreen. */
export async function toggleScreenFullscreen(document: FullscreenDocument, target: FullscreenTarget) {
  if (document.fullscreenElement === target) {
    if (!document.exitFullscreen) throw new Error('Screen fullscreen exit is unavailable');
    await document.exitFullscreen();
  } else {
    if (!target.requestFullscreen) throw new Error('Screen fullscreen is unavailable');
    // Call immediately from the button gesture, without first awaiting unrelated work.
    await target.requestFullscreen();
  }
}
