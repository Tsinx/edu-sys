import { useEffect, useState } from "react";
import { PORT_COURSE_UNITS, type PortCourseSelection, type PortCourseUnit } from "@edu/port-simulation-core";
import { PortOperationsStudio, type PortOperationsProps } from "./PortOperationsStudio";

export interface PortCourseStudioProps extends PortOperationsProps {
  initialLearningStage?: PortCourseSelection;
  learningStageLocked?: boolean;
}
export function PortCourseStudio(props: PortCourseStudioProps) {
  const key = `edu-port-operations:curriculum:${props.storageScope}`;
  const [saved] = useState<{ selected?: PortCourseSelection; completed?: string[] }>(() => {
    try { return JSON.parse(props.storage?.getItem(key) ?? "{}"); } catch { return {}; }
  });
  const query = typeof window !== "undefined" ? new URLSearchParams(window.location?.search ?? "") : new URLSearchParams();
  const queryStage = !props.learningStageLocked && PORT_COURSE_UNITS.some(u => u.id === query.get("course")) ? query.get("course") as PortCourseSelection : undefined;
  const [selection, setSelection] = useState<PortCourseSelection>(() => props.initialLearningStage ?? queryStage ??
    (props.trainingModeLocked && props.initialTrainingMode === "battle" ? "full" : PORT_COURSE_UNITS.some(u => u.id === saved?.selected) ? saved.selected! : props.initialMode === "planning" || props.initialMode === "equipment" ? "planning" : "arrival"));
  const [demonstration, setDemonstration] = useState(!props.learningStageLocked && query.get("demo") === "1");
  const [completed, setCompleted] = useState<string[]>(Array.isArray(saved?.completed) ? saved.completed : []);
  const [saveError, setSaveError] = useState("");
  useEffect(() => {
    try {
      props.storage?.setItem(key, JSON.stringify({ selected: selection, completed }));
      void props.storage?.flush?.().catch(e => setSaveError(`课程进度尚未保存：${String(e)}`));
    } catch (e) { setSaveError(`课程进度尚未保存：${String(e)}`); }
  }, [selection, completed, key, props.storage]);
  const actual = demonstration && selection === "full" ? "arrival" : selection;
  return <PortOperationsStudio {...props} key={`${actual}:${demonstration}`} courseSelection={selection}
    courseUnit={actual === "full" ? undefined : actual} demonstration={demonstration}
    courseProgress={completed} courseSaveError={saveError}
    onSelectCourse={(id, demo = false) => { setSelection(id); setDemonstration(demo); }}
    onCourseComplete={(id: PortCourseUnit) => { if (!demonstration) setCompleted(old => old.includes(id) ? old : [...old, id]); }}/>;
}
