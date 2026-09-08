import {
  getPortManagementLessonSlidePosition,
  getPortManagementSlide,
  type PortManagementSlideSpec
} from "@edu/course-content";
import {
  SLIDE_ASPECT_RATIO,
  SLIDE_LOGICAL_HEIGHT,
  SLIDE_LOGICAL_WIDTH,
  type AvatarCueClip,
  type AvatarCueState,
  type SlideFrame,
  type StudySession
} from "@edu/contracts";

function compactSlideSummary(spec: PortManagementSlideSpec): string {
  const parts = [
    spec.lead,
    ...(spec.bullets ?? []),
    ...(spec.steps ?? []),
    spec.prompt
  ].filter((part): part is string => Boolean(part?.trim()));
  return parts.join("；").slice(0, 500) || spec.title;
}

export function buildStudySlideFrame(session: StudySession): SlideFrame {
  const spec = getPortManagementSlide(session.globalIndex);
  return {
    deckId: `deck-${session.courseId}-foundations`,
    versionId: session.deckVersion,
    slideId: spec.slideKey,
    index: session.globalIndex,
    total: session.slideTotal,
    logicalWidth: SLIDE_LOGICAL_WIDTH,
    logicalHeight: SLIDE_LOGICAL_HEIGHT,
    aspectRatio: SLIDE_ASPECT_RATIO,
    title: spec.title,
    lessonNumber: spec.lesson,
    lessonTitle: spec.lessonTitle,
    section: spec.section,
    summary: compactSlideSummary(spec)
  };
}

export function studySlidePosition(session: StudySession) {
  return getPortManagementLessonSlidePosition(session.globalIndex);
}

export function decodePcm16Base64(audioBase64: string): Float32Array {
  const binary = window.atob(audioBase64);
  const sampleCount = Math.floor(binary.length / 2);
  const samples = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    const low = binary.charCodeAt(index * 2);
    const high = binary.charCodeAt(index * 2 + 1);
    const unsigned = low | (high << 8);
    const signed = unsigned >= 0x8000 ? unsigned - 0x10000 : unsigned;
    samples[index] = Math.max(-1, signed / 0x8000);
  }
  return samples;
}

export function chooseAvatarCue(
  clips: readonly AvatarCueClip[],
  state: AvatarCueState,
  previousId?: string,
  random: () => number = Math.random
): AvatarCueClip | undefined {
  const candidates = clips.filter((clip) => clip.state === state);
  if (candidates.length === 0) return undefined;
  const nonRepeating = candidates.filter((clip) => clip.id !== previousId);
  const pool = nonRepeating.length > 0 ? nonRepeating : candidates;
  const totalWeight = pool.reduce((sum, clip) => sum + clip.weight, 0);
  let cursor = random() * totalWeight;
  for (const clip of pool) {
    cursor -= clip.weight;
    if (cursor <= 0) return clip;
  }
  return pool.at(-1);
}

export const IDLE_MICRO_MIN_DELAY_MS = 35_000;
export const IDLE_MICRO_MAX_DELAY_MS = 55_000;

export function idleMicroDelayMs(random: () => number = Math.random): number {
  const value = Math.min(0.999_999, Math.max(0, random()));
  return IDLE_MICRO_MIN_DELAY_MS + Math.floor(
    value * (IDLE_MICRO_MAX_DELAY_MS - IDLE_MICRO_MIN_DELAY_MS + 1)
  );
}

export function getIdleBaselineCue(
  clips: readonly AvatarCueClip[]
): AvatarCueClip | undefined {
  return clips.find((clip) => clip.id === "idle-still")
    ?? clips.find((clip) => clip.state === "idle" && clip.loop)
    ?? clips.find((clip) => clip.state === "idle");
}

export function chooseIdleMicroCue(
  clips: readonly AvatarCueClip[],
  previousId?: string,
  random: () => number = Math.random
): AvatarCueClip | undefined {
  const approvedMicroIds = new Set([
    "idle-blink",
    "idle-soft-smile"
  ]);
  const candidates = clips.filter(
    (clip) => clip.state === "idle" && !clip.loop && approvedMicroIds.has(clip.id)
  );
  return chooseAvatarCue(candidates, "idle", previousId, random);
}
