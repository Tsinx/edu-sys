import { ECONOMIC_MATHEMATICS_DECK_ID, ECONOMIC_MATHEMATICS_VERSION_ID, getEconomicMathematicsSlideByKey } from "@edu/course-content/economic-mathematics";
import type { ReactNode } from 'react';
import { getEconomicMathematicsInteractionDefinition } from '@edu/course-content/economic-mathematics';
import type {
  SlideFrame,
  SlideInteractionState,
  SlideInteractionValues
} from "@edu/contracts";
import { SlideViewport } from "../classroom/SlideViewport";
import { EconomicMathematicsTeachingSlides, EconomicMathematicsControls } from "./EconomicMathematicsTeachingSlides";
import "katex/dist/katex.min.css";
import "./economic-mathematics.css";
import './limits.css';
import { EconomicPageNarrator, hasEconomicPageNarration } from './EconomicPageNarrator';
import { HistoryFilmControls } from './LessonHistoryFilm';
import { PageToolsContribution } from '../classroom/PageTools';

interface EconomicMathematicsSlideStageProps {
  frame: SlideFrame;
  interaction: SlideInteractionState | null;
  readOnly: boolean;
  onInteractionPatch?: (patch: SlideInteractionValues) => void;
  onInteractionReset?: () => void;
  navigation?: ReactNode;
}

export function EconomicMathematicsSlideStage({
  frame,
  interaction,
  readOnly,
  onInteractionPatch,
  onInteractionReset,
  navigation
}: EconomicMathematicsSlideStageProps) {
  const spec = getEconomicMathematicsSlideByKey(frame.slideId);
  if (!spec || frame.deckId !== ECONOMIC_MATHEMATICS_DECK_ID || frame.versionId !== ECONOMIC_MATHEMATICS_VERSION_ID) return <div role="status">此课堂使用的经济数学课件已归档。原版本、页码与实验状态保留，请新建课堂使用新版。</div>;
  const narrated = hasEconomicPageNarration(spec);
  const def = getEconomicMathematicsInteractionDefinition(spec);
  const hasVariables = Boolean(def && Object.keys(def.rules).some(key => key !== 'presentationStep' && key !== 'revealStep'));
  const tools = spec.historyFilm ? <HistoryFilmControls pageKey={spec.slideKey} values={{...def?.defaults,...interaction?.values}} onPatch={onInteractionPatch}/> : hasVariables || spec.exerciseMinutes ? <EconomicMathematicsControls includeSteps={false} spec={spec} interaction={interaction} onInteractionPatch={onInteractionPatch} onInteractionReset={onInteractionReset}/> : undefined;
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
    {!readOnly && (narrated ? <EconomicPageNarrator spec={spec} interaction={interaction} onInteractionPatch={onInteractionPatch} onReset={onInteractionReset} navigation={navigation} tools={tools} toolsLabel={spec.historyFilm ? '短片播放' : hasVariables ? '实验参数' : '练习计时'}/> : def || spec.exerciseMinutes ? <PageToolsContribution pageKey={spec.slideKey} title={hasVariables ? '实验参数' : '本页步骤'}><EconomicMathematicsControls spec={spec} interaction={interaction} onInteractionPatch={onInteractionPatch} onInteractionReset={onInteractionReset}/></PageToolsContribution> : null)}
    </>
  );
}
