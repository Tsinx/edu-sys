import {lesson07} from './v2/lesson-07.js';
import {refinedLesson04 as former,lesson04Narration as formerSpeech} from './lesson-04-refined.js';
import type {EconomicMathematicsAuthoredSlide as Slide} from './types.js';
/** These comparisons follow the derivative definition; no extra material enters the 90-minute core. */
const moved=[14,15,16,17].map((page,i):Slide=>{
  const s=former.slides[page-1]!;
  return {...s,slideKey:`em-l07-derivative-extension-20261016-p${i+1}`,compositionId:`em-l07-extrema-extension-${i+1}`,
    title:`导数拓展${i+1} · ${s.title}`,kicker:'经济数学 / 第七讲 / 导数拓展',section:'导数定义之后的条件辨析',
    classHour:2,routeRole:'optional',teachingSeconds:0,moduleId:'derivative-conditions-extension',exerciseActivityId:undefined,
    teachingCue:'原第四讲的局部极值内容移到导数定义之后；拓展另行安排，不占第四讲或第七讲90分钟主线。'};
});
export const lesson07WithDerivativeExtension={...lesson07,expectedSlides:lesson07.slides.length+moved.length,slides:[...lesson07.slides,...moved]};
export const derivativeAppendixNarration=Object.fromEntries(moved.map((s,i)=>[s.slideKey,formerSpeech[former.slides[[14,15,16,17][i]!-1]!.slideKey]!])) as Readonly<Record<string,readonly string[]>>;
