import { portSimulationChallengeIdSchema, type ClassroomSnapshot, type SlideFrame, type PortSimulationChallengeId } from "@edu/contracts";
import type { CourseDeckDescriptor } from "@edu/course-content/deck-registry";
import type { PortCourseSelection } from "@edu/port-simulation-core";

export interface StudentLocation {
  activity: ClassroomSnapshot["activeActivity"];
  index: number;
  unit?: PortCourseSelection;
  challenge?: { id: PortSimulationChallengeId; trainingMode: "practice" | "battle" };
}
export interface StudentNavigation { following: boolean; location: StudentLocation }
export const simulationUnitLabels: Record<PortCourseSelection, string> = {
  arrival: "入港作业", cargo: "装卸作业", yard: "堆场作业", planning: "港区规划", departure: "离港作业", full: "完整流程"
};
export function teacherLocation(snapshot: ClassroomSnapshot): StudentLocation {
  if (snapshot.simulationNavigation?.experiment === "l5-capacity") return {activity:"slides",index:snapshot.slide.index};
  if (snapshot.simulationNavigation) return { activity: "simulation", index: snapshot.slide.index, unit: snapshot.simulationNavigation.unit };
  return { activity: snapshot.activeActivity, index: snapshot.slide.index,
    ...(snapshot.activeActivity === "simulation" && snapshot.simulation ? {
      unit: snapshot.simulation.learningStage ?? "full",
      challenge: {id:snapshot.simulation.challengeId, trainingMode:snapshot.simulation.trainingMode ?? "practice"}
    } : {}) };
}
export function studentFrame(deck: CourseDeckDescriptor, index: number): SlideFrame {
  const slide = deck.getSlide(index);
  return { deckId: deck.deckId, versionId: deck.versionId, slideId: slide.slideKey, index: slide.index,
    total: deck.slideTotal, logicalWidth: 1600, logicalHeight: 1000, aspectRatio: "16:10",
    title: slide.title, lessonNumber: slide.lessonNumber, lessonTitle: slide.lessonTitle, section: slide.section, summary: slide.summary };
}
export function restoreStudentNavigation(raw: string | null, deck: CourseDeckDescriptor): StudentNavigation | null {
  try {
    const value = JSON.parse(raw ?? "null") as StudentNavigation | null;
    if (!value || typeof value.following !== "boolean" || !value.location) return null;
    const { index, activity, unit, challenge } = value.location;
    if (!Number.isInteger(index) || index < 1 || index > deck.slideTotal || !deck.allowedActivities.includes(activity)) return null;
    if (activity === "simulation" && (!unit || !Object.hasOwn(simulationUnitLabels, unit))) return null;
    if (challenge && (!portSimulationChallengeIdSchema.safeParse(challenge.id).success || !["practice","battle"].includes(challenge.trainingMode))) return null;
    return value;
  } catch { return null; }
}
