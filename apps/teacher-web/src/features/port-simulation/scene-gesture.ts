type PointerSample = Pick<PointerEvent, "pointerId" | "clientX" | "clientY" | "button">;

/** A pinch, canceled pointer or rotation can never finish as an object tap. */
export function createSceneGesture() {
  const pointers = new Set<number>();
  let candidate: PointerSample | null = null;
  const move = (event: PointerSample) => {
    if (candidate?.pointerId === event.pointerId && Math.hypot(event.clientX - candidate.clientX, event.clientY - candidate.clientY) >= 7) candidate = null;
  };
  return {
    down(event: PointerSample) {
      pointers.add(event.pointerId);
      candidate = pointers.size === 1 && event.button === 0 ? event : null;
      return pointers.size === 1;
    },
    move,
    up(event: PointerSample) {
      move(event);
      const tap = candidate?.pointerId === event.pointerId && pointers.size === 1 && event.button === 0;
      pointers.delete(event.pointerId);
      candidate = null;
      return tap;
    },
    cancel(event: Pick<PointerEvent, "pointerId">) {
      pointers.delete(event.pointerId);
      candidate = null;
    },
  };
}
