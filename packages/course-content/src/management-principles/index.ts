import pages from './pages.json' with {type:'json'};
import lessons from './lessons.json' with {type:'json'};
import manifest from './manifest.json' with {type:'json'};
import type { ManagementSlide } from './types.js';
export * from './types.js';
export * from './interactions.js';
export const MANAGEMENT_COURSE_ID='management-principles';
export const MANAGEMENT_DECK_ID='deck-management-principles';
export const MANAGEMENT_VERSION_ID=manifest.version;
export const MANAGEMENT_BUILD=manifest;
export const MANAGEMENT_SCOPE_LABEL=`${lessons.some(l=>l.number===0)?'绪论＋':''}第1—${Math.max(...lessons.map(l=>l.number))}讲`;
export const MANAGEMENT_CONSTRUCTION_SUMMARY=`管理学课程组 · 韦笑。${MANAGEMENT_SCOPE_LABEL}根据${manifest.sourcePageCount}个原页建立来源对照，课程代码与总学时待完善。`;
export const MANAGEMENT_ATTRIBUTION='管理学课程组 · 韦笑';
export const MANAGEMENT_SLIDES=pages as ManagementSlide[];
export const MANAGEMENT_LESSONS=lessons.map(l=>({...l,kind:l.number===0?'introduction' as const:'lecture' as const,status:'ready' as const}));
export const MANAGEMENT_PLAYBACK_ORDER=MANAGEMENT_LESSONS.flatMap(l=>MANAGEMENT_SLIDES.filter(p=>p.lessonNumber===l.number).map(p=>p.index));
const playbackPosition=new Map(MANAGEMENT_PLAYBACK_ORDER.map((index,position)=>[index,position]));
export function getManagementAdjacentIndex(index:number,direction:1|-1){const position=playbackPosition.get(index);return position===undefined?null:MANAGEMENT_PLAYBACK_ORDER[position+direction]??null;}
export function getManagementLessonLabel(number:number){return number===0?'绪论':`第${number}讲`;}
export function getManagementSlide(index:number):ManagementSlide {
  return MANAGEMENT_SLIDES[Math.max(1,Math.min(MANAGEMENT_SLIDES.length,Math.trunc(index)||1))-1]!;
}
export function getManagementSlideByKey(key:string){return MANAGEMENT_SLIDES.find(p=>p.slideKey===key);}
export function getManagementLessonPosition(index:number){
  if(!Number.isInteger(index)||index<1||index>MANAGEMENT_SLIDES.length)return null;
  const p=getManagementSlide(index),l=MANAGEMENT_LESSONS.find(l=>l.number===p.lessonNumber)!;
  return {globalIndex:index,lessonNumber:p.lessonNumber,lessonStart:l.slideStart,lessonEnd:l.slideEnd,localIndex:p.localIndex,localTotal:p.localTotal};
}
export function getManagementGlobalIndex(lesson:number,local=1){
  const l=MANAGEMENT_LESSONS.find(x=>x.number===lesson);
  return l&&Number.isInteger(local)&&local>=1&&local<=l.slideTotal?l.slideStart+local-1:null;
}
