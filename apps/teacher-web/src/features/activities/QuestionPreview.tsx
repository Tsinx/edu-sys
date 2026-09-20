import { useState } from "react";
import { Eye } from "lucide-react";
import type { ClassroomExerciseInput } from "@edu/contracts";
export function QuestionPreview({
  exercise,
}: {
  exercise: ClassroomExerciseInput;
}) {
  const [revealed, setRevealed] = useState(false);
  return (
    <aside className="activity-preview">
      <div className="activity-section-title">
        <h3>
          <Eye size={17} />
          学生画面预览
        </h3>
        <span>不发布</span>
      </div>
      <div className="activity-segments">
        <button
          type="button"
          aria-pressed={!revealed}
          onClick={() => setRevealed(false)}
        >
          答题时
        </button>
        <button
          type="button"
          aria-pressed={revealed}
          onClick={() => setRevealed(true)}
        >
          公布后
        </button>
      </div>
      <div className="activity-student-card">
        <span className="activity-badge">
          {exercise.content.correctOptionIds.length
            ? exercise.content.mode === "single"
              ? "单选题"
              : "多选题"
            : "观点投票"}
        </span>
        <h3>{exercise.content.question}</h3>
        {exercise.content.options.map((o) => (
          <div className="activity-preview-option" key={o.id}>
            <span>{o.id}</span>
            {o.text}
          </div>
        ))}
        {revealed && (
          <div className="activity-explanation">
            <strong>
              {exercise.content.correctOptionIds.length
                ? `参考答案：${exercise.content.correctOptionIds.join("、")}`
                : "观点投票，无标准答案"}
            </strong>
            <p>{exercise.content.explanation || "暂无讲解"}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
