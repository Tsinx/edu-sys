import { getEconomicMathematicsSlide } from "@edu/course-content/economic-mathematics";
import type {
  SlideFrame,
  SlideInteractionState,
  SlideInteractionValues
} from "@edu/contracts";
import { SlideViewport } from "../classroom/SlideViewport";
import { EconomicMathematicsTeachingSlides } from "./EconomicMathematicsTeachingSlides";
import "katex/dist/katex.min.css";
import "./economic-mathematics.css";
import "./art-directed/lesson-01-art.css";
import "./art-directed/lesson-02-art.css";
import "./art-directed/lesson-03-art.css";
import "./art-directed/lesson-04-art.css";

interface EconomicMathematicsSlideStageProps {
  frame: SlideFrame;
  interaction: SlideInteractionState | null;
  readOnly: boolean;
  onInteractionPatch?: (patch: SlideInteractionValues) => void;
  onInteractionReset?: () => void;
}

export function EconomicMathematicsSlideStage({
  frame,
  interaction,
  readOnly,
  onInteractionPatch,
  onInteractionReset
}: EconomicMathematicsSlideStageProps) {
  const spec = getEconomicMathematicsSlide(frame.index);
  return (
    <SlideViewport
      label={`经济数学固定画布：${frame.title}，第${spec.lesson}讲第${spec.localIndex}页，共${spec.localTotal}页`}
    >
      <EconomicMathematicsTeachingSlides
        interaction={interaction}
        onInteractionPatch={onInteractionPatch}
        onInteractionReset={onInteractionReset}
        readOnly={readOnly}
        spec={spec}
      />
    </SlideViewport>
  );
}
