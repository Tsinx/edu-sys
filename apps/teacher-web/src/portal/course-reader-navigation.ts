import type { CourseDeckDescriptor } from "@edu/course-content/deck-registry";

/** Explicit lesson/hour links take priority over a saved, key-based position. */
export function resolveCourseReaderIndex(
  deck: CourseDeckDescriptor,
  destination: { lesson: string | null; hour: string | null },
  savedSlideKey?: string,
): number {
  const lessonNumber = Number(destination.lesson);
  const lesson = destination.lesson !== null && Number.isInteger(lessonNumber)
    ? deck.lessons.find(value => value.number === lessonNumber && value.status === "ready")
    : undefined;
  if (lesson) {
    const hourNumber = Number(destination.hour);
    const hour = destination.hour !== null && Number.isInteger(hourNumber)
      ? lesson.hourRanges?.find(value => value.number === hourNumber)
      : undefined;
    return hour?.slideStart ?? deck.getGlobalIndex(lesson.number) ?? 1;
  }
  return (savedSlideKey && deck.getSlideByKey(savedSlideKey)?.index) || 1;
}
