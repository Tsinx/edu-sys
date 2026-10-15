import type { SlideFrame } from '@edu/contracts';
import type { CourseDeckDescriptor, CourseDeckPosition } from '@edu/course-content/deck-registry';

/** Numeric page positions are meaningful only within the same course and release. */
export function classroomSlidePosition(
  courseId: string,
  frame: SlideFrame,
  deck: CourseDeckDescriptor | null | undefined
): CourseDeckPosition | null {
  if (!deck || deck.courseId !== courseId || frame.deckId !== deck.deckId || frame.versionId !== deck.versionId) return null;
  const slide = deck.getSlideByKey(frame.slideId);
  if (!slide || slide.index !== frame.index || slide.lessonNumber !== frame.lessonNumber) return null;
  return deck.getLessonPosition(frame.index);
}
