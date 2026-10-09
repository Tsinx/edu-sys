import { useMemo } from 'react';
import type { SlideInteractionState, SlideInteractionValues } from '@edu/contracts';
import { refinedNarration, merchantReadout, getEconomicMathematicsInteractionDefinition, getEconomicMathematicsPresentationStep, type EconomicMathematicsSlideSpec } from '@edu/course-content/economic-mathematics';
import { PageNarrator } from './PageNarrator';
import { lessonNarration, preludeNarration } from './narration-scripts';
import { economicLabReadout } from './EconomicMathematicsTeachingSlides';

export function EconomicPageNarrator({ spec, interaction, onInteractionPatch }: { spec: EconomicMathematicsSlideSpec; interaction: SlideInteractionState | null; onInteractionPatch?: (patch: SlideInteractionValues) => void }) {
  const def = getEconomicMathematicsInteractionDefinition(spec);
  const values = { ...def?.defaults, ...(interaction?.slideId === spec.slideKey ? interaction.values : {}) };
  const step = getEconomicMathematicsPresentationStep(spec, values);
  const base = refinedNarration[spec.slideKey] ?? (spec.preludeId ? preludeNarration[spec.preludeId] : lessonNarration[spec.sourceLesson ?? spec.lesson]?.[(spec.sourceLocalIndex ?? spec.localIndex) - 1]);
  const readout = spec.merchantLab ? merchantReadout(values).map(([k,v]) => `${k}：${v}。`).join('') : spec.interactionId === 'price-profit-lab' ? `当前为市场${values.segment === 'B' ? 'B' : 'A'}。${economicLabReadout(spec.interactionId, values).map(([label, value]) => `${label}：${value.replaceAll(',', '').replaceAll('元/件', '元每件')}。`).join('')}` : '';
  const paragraphs = useMemo(() => base ? readout ? [base[0] + readout, ...base.slice(1)] : base : [], [base, readout]);
  if (!base) return null;
  return <PageNarrator pageKey={spec.slideKey} paragraphs={paragraphs} step={step} onReveal={onInteractionPatch ? next => onInteractionPatch({ presentationStep: next }) : undefined}/>;
}
