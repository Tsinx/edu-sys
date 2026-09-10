import { MathUtils, Vector3, type Curve } from "three";

/** Playback timestamps come from the classroom snapshot, so reconnects and pauses
 * resolve to the same point without a second animation clock or React timer. */
export interface GlobeVoyageMotion {
  routeId: string;
  durationMs: number;
  elapsedMs: number;
  startedAt: number | null;
}

export function voyageProgress(motion: GlobeVoyageMotion, now: number) {
  const elapsed = motion.elapsedMs + (motion.startedAt === null
    ? 0 : Math.max(0, now - motion.startedAt));
  // Hold briefly at departure and arrival. Progress is distance along the route.
  const t = MathUtils.clamp((elapsed / Math.max(1, motion.durationMs) - 0.04) / 0.92, 0, 1);
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function sampleVoyageFrame(curve: Curve<Vector3>, motion: GlobeVoyageMotion, now: number) {
  const progress = voyageProgress(motion, now);
  const position = curve.getPointAt(progress);
  const outward = position.clone().normalize();
  // Symmetric look-ahead also preserves the arrival heading at progress = 1.
  const forward = curve.getPointAt(Math.min(1, progress + 0.0005))
    .sub(curve.getPointAt(Math.max(0, progress - 0.0005)));
  forward.addScaledVector(outward, -forward.dot(outward));
  if (forward.lengthSq() < 1e-16) {
    forward.set(0, 1, 0).addScaledVector(outward, -outward.y);
    if (forward.lengthSq() < 1e-16) forward.set(1, 0, 0);
  }
  forward.normalize();
  return {
    progress,
    position,
    forward,
    coordinate: {
      latitude: MathUtils.radToDeg(Math.asin(MathUtils.clamp(outward.y, -1, 1))),
      longitude: MathUtils.radToDeg(Math.atan2(-outward.z, outward.x))
    }
  };
}
