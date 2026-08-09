import type { ClassroomSnapshot } from "@edu/contracts";
import { LocalPortSimulationStage } from "./LocalPortSimulationStage";

export interface StudentLocalPortSimulationProps {
  participantId: string;
  participantDisplayName: string;
  classroomSnapshot: ClassroomSnapshot;
}

export function StudentLocalPortSimulation({
  participantId,
  participantDisplayName,
  classroomSnapshot
}: StudentLocalPortSimulationProps) {
  const simulation = classroomSnapshot.simulation;
  if (!simulation) {
    return (
      <section className="port-local-auth-state" role="status">
        <h1>等待教师发布本地挑战</h1>
        <p>挑战载入后，实时课堂连接会自动关闭，后续仿真将在当前浏览器独立运行。</p>
      </section>
    );
  }
  return (
    <LocalPortSimulationStage
      actorId={participantId}
      actorDisplayName={participantDisplayName}
      storageScope={`${classroomSnapshot.courseId}:${participantId}`}
      initialChallengeId={simulation.challengeId}
      challengeLocked
      sourceLabel={
        simulation.deliveryMode === "local_solo"
          ? "课堂挑战已在登录时载入"
          : "旧课堂挑战已复制为个人本机运行"
      }
    />
  );
}
