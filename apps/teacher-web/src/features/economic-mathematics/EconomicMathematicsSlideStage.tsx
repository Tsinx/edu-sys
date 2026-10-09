import { ECONOMIC_MATHEMATICS_DECK_ID, ECONOMIC_MATHEMATICS_VERSION_ID, getEconomicMathematicsSlideByKey } from "@edu/course-content/economic-mathematics";
import type {
  SlideFrame,
  SlideInteractionState,
  SlideInteractionValues
} from "@edu/contracts";
import { SlideViewport } from "../classroom/SlideViewport";
import { EconomicMathematicsTeachingSlides, EconomicMathematicsControls } from "./EconomicMathematicsTeachingSlides";
import "katex/dist/katex.min.css";
import "./economic-mathematics.css";
import { EconomicPageNarrator } from './EconomicPageNarrator';

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
  const spec = getEconomicMathematicsSlideByKey(frame.slideId);
  if (!spec || frame.deckId !== ECONOMIC_MATHEMATICS_DECK_ID || frame.versionId !== ECONOMIC_MATHEMATICS_VERSION_ID) return <div role="status">此课堂使用的经济数学课件已归档。原版本、页码与实验状态保留，请新建课堂使用新版。</div>;
  return (
    <>
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
    {!readOnly&&<EconomicMathematicsControls spec={spec} interaction={interaction} onInteractionPatch={onInteractionPatch} onInteractionReset={onInteractionReset}/>}
    {!readOnly&&<EconomicPageNarrator spec={spec} interaction={interaction} onInteractionPatch={onInteractionPatch}/>}
    </>
  );
}
